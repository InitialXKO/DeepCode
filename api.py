import os
import sys
import uuid
import shutil
import json
import asyncio
from datetime import datetime
from typing import List, Dict, Optional, Any
from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
)
from pydantic import BaseModel
import uvicorn

# Add the root directory to the Python path to allow for absolute imports
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Import core logic
try:
    from ui.handlers import (
        process_input_async,
        handle_requirement_analysis_workflow,
        handle_requirement_modification_workflow,
    )
except ImportError as e:
    raise ImportError(
        "Could not import core handlers. "
        "Ensure the script is run from the project root and all dependencies are installed. "
        f"Original error: {e}"
    )

# Import PDF Converter
try:
    from tools.pdf_converter import PDFConverter
except ImportError:
    print(
        "Warning: PDFConverter could not be imported. File conversion will not be available."
    )
    PDFConverter = None

# Create the FastAPI app
app = FastAPI(
    title="DeepCode API",
    description="An API to interact with the DeepCode multi-agent AI engine.",
    version="1.0.0",
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)


manager = ConnectionManager()


@app.websocket("/ws/progress")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# --- Data Persistence (Simple JSON for History) ---
HISTORY_FILE = "processing_history.json"


def load_history() -> List[Dict[str, Any]]:
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_history(history: List[Dict[str, Any]]):
    try:
        with open(HISTORY_FILE, "w") as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        print(f"Failed to save history: {e}")


def add_to_history(entry: Dict[str, Any]):
    history = load_history()
    history.append(entry)
    # Keep last 50 entries
    if len(history) > 50:
        history = history[-50:]
    save_history(history)


def clear_history_file():
    if os.path.exists(HISTORY_FILE):
        try:
            os.remove(HISTORY_FILE)
        except Exception:
            pass


# --- Pydantic Models ---


class TaskRequest(BaseModel):
    input_source: str
    input_type: str  # 'url' or 'chat'
    enable_indexing: Optional[bool] = True


class GenerateQuestionsRequest(BaseModel):
    initial_requirement: str


class GenerateRequirementsRequest(BaseModel):
    initial_requirement: str
    answers: Dict[str, str]


class EditRequirementsRequest(BaseModel):
    current_requirements: str
    feedback: str


# --- Helper Functions ---


def save_upload_file_tmp(upload_file: UploadFile) -> str:
    try:
        tmp_dir = "temp_uploads"
        if not os.path.exists(tmp_dir):
            os.makedirs(tmp_dir)
        ext = os.path.splitext(upload_file.filename)[1]
        tmp_filename = f"{uuid.uuid4()}{ext}"
        tmp_filepath = os.path.join(tmp_dir, tmp_filename)
        with open(tmp_filepath, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        return tmp_filepath
    finally:
        upload_file.file.close()


# --- API Endpoints ---


@app.get("/", summary="Health Check")
async def read_root():
    return {"status": "ok", "message": "Welcome to the DeepCode API"}


@app.post("/process/text", summary="Process Text or URL Input")
async def process_text_task(request: TaskRequest):
    if request.input_type not in ["chat", "url"]:
        raise HTTPException(
            status_code=400, detail="Invalid input_type. Must be 'chat' or 'url'."
        )

    async def progress_callback(progress: int, message: str):
        await manager.broadcast(json.dumps({"progress": progress, "message": message}))

    try:
        result = await process_input_async(
            input_source=request.input_source,
            input_type=request.input_type,
            enable_indexing=request.enable_indexing,
            progress_callback=progress_callback,
        )

        # Add to history
        status = result.get("status", "error")
        entry = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": status,
            "input_type": request.input_type,
            "input_source": request.input_source,
            "result": str(result) if status == "success" else None,
            "error": result.get("error") if status == "error" else None,
        }
        add_to_history(entry)

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@app.post("/process/file", summary="Process File Input")
async def process_file_task(
    enable_indexing: bool = Form(True), file: UploadFile = File(...)
):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    async def progress_callback(progress: int, message: str):
        await manager.broadcast(json.dumps({"progress": progress, "message": message}))

    temp_file_path = None
    converted_pdf_path = None
    try:
        temp_file_path = save_upload_file_tmp(file)

        # Check if conversion is needed
        file_ext = os.path.splitext(file.filename)[1].lower()
        processing_path = temp_file_path

        if file_ext != ".pdf" and PDFConverter:
            try:
                converter = PDFConverter()
                # Create a specific output directory for conversions to avoid clutter
                conversion_dir = os.path.join(
                    os.path.dirname(temp_file_path), "converted_pdfs"
                )
                os.makedirs(conversion_dir, exist_ok=True)

                converted_pdf_path = converter.convert_to_pdf(
                    temp_file_path, output_dir=conversion_dir
                )
                processing_path = str(converted_pdf_path)
                print(
                    f"Successfully converted {file.filename} to PDF: {processing_path}"
                )
            except Exception as e:
                print(f"File conversion failed: {e}")
                # If conversion fails, we'll try to process the original file if it's text-based,
                # otherwise we'll let the downstream processor handle (or fail) it.
                # But typically the pipeline expects PDF for "file" input type unless it's raw text.
                # For now, we proceed with original and let it fail if unsupported.
                pass

        result = await process_input_async(
            input_source=processing_path,
            input_type="file",
            enable_indexing=enable_indexing,
            progress_callback=progress_callback,
        )

        # Add to history
        status = result.get("status", "error")
        entry = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": status,
            "input_type": "file",
            "input_source": file.filename,
            "result": str(result) if status == "success" else None,
            "error": result.get("error") if status == "error" else None,
        }
        add_to_history(entry)

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    finally:
        # Cleanup temporary files
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass

        if converted_pdf_path and os.path.exists(converted_pdf_path):
            try:
                os.remove(converted_pdf_path)
            except Exception:
                pass


# --- New Endpoints for Guided Analysis ---


@app.post("/generate_questions", summary="Generate Requirement Questions")
async def generate_questions(request: GenerateQuestionsRequest):
    try:
        result = await handle_requirement_analysis_workflow(
            user_input=request.initial_requirement, analysis_mode="generate_questions"
        )

        if result["status"] == "success":
            # The result is a JSON string, parse it
            import json

            questions = json.loads(result["result"])
            return questions
        else:
            raise HTTPException(
                status_code=500, detail=result.get("error", "Unknown error")
            )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating questions: {str(e)}"
        )


@app.post("/generate_requirements", summary="Generate Detailed Requirements")
async def generate_requirements(request: GenerateRequirementsRequest):
    try:
        result = await handle_requirement_analysis_workflow(
            user_input=request.initial_requirement,
            analysis_mode="summarize_requirements",
            user_answers=request.answers,
        )

        if result["status"] == "success":
            return result["result"]  # This is the markdown string
        else:
            raise HTTPException(
                status_code=500, detail=result.get("error", "Unknown error")
            )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating requirements: {str(e)}"
        )


@app.post("/edit_requirements", summary="Edit Requirements")
async def edit_requirements(request: EditRequirementsRequest):
    try:
        result = await handle_requirement_modification_workflow(
            current_requirements=request.current_requirements,
            modification_feedback=request.feedback,
        )

        if result["status"] == "success":
            return result["result"]
        else:
            raise HTTPException(
                status_code=500, detail=result.get("error", "Unknown error")
            )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error editing requirements: {str(e)}"
        )


# --- History and Diagnostics ---


@app.get("/processing_history", summary="Get Processing History")
async def get_processing_history():
    return load_history()


@app.delete("/processing_history", summary="Clear Processing History")
async def clear_processing_history():
    clear_history_file()
    return {"status": "success"}


@app.get("/system_diagnostics", summary="Get System Diagnostics")
async def get_system_diagnostics():
    import sys

    modules_status = {}
    for module in ["streamlit", "asyncio", "nest_asyncio", "concurrent.futures"]:
        try:
            __import__(module)
            modules_status[module] = True
        except ImportError:
            modules_status[module] = False

    loop_status = "Unknown"
    try:
        loop = asyncio.get_event_loop()
        loop_status = "Running" if loop.is_running() else "Not Running"
    except RuntimeError:
        loop_status = "No Event Loop"

    return {
        "python_version": sys.version.split()[0],
        "platform": sys.platform,
        "modules": modules_status,
        "event_loop_status": loop_status,
    }


@app.post("/reset_state", summary="Reset Application State")
async def reset_state():
    # In the API context, this mostly means clearing history or resetting agents
    # For now, we'll just clear history as a proxy for "reset"
    clear_history_file()
    return {"status": "success", "message": "Application state reset"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
