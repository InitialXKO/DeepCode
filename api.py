import os
import sys
import uuid
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
import uvicorn

# Add the root directory to the Python path to allow for absolute imports
# This is crucial for the API script to find the 'ui' and 'workflows' modules
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Now, import the core logic
# It's in ui/handlers.py, which is not an ideal place.
# For this task, I'll import it directly. A future refactor could move it.
try:
    from ui.handlers import process_input_async
except ImportError as e:
    # Provide a helpful error message if the import fails
    raise ImportError(
        "Could not import 'process_input_async'. "
        "Ensure the script is run from the project root and all dependencies are installed. "
        f"Original error: {e}"
    )

# Create the FastAPI app
app = FastAPI(
    title="DeepCode API",
    description="An API to interact with the DeepCode multi-agent AI engine.",
    version="1.0.0",
)

# --- Pydantic Models for Request Bodies ---

class TaskRequest(BaseModel):
    """Request model for URL or chat-based tasks."""
    input_source: str
    input_type: str  # Should be 'url' or 'chat'
    enable_indexing: Optional[bool] = True

# --- Helper Functions ---

def save_upload_file_tmp(upload_file: UploadFile) -> str:
    """Saves an uploaded file to a temporary location and returns the path."""
    try:
        # Create a temporary directory if it doesn't exist
        tmp_dir = "temp_uploads"
        if not os.path.exists(tmp_dir):
            os.makedirs(tmp_dir)

        # Generate a unique filename to avoid collisions
        ext = os.path.splitext(upload_file.filename)[1]
        tmp_filename = f"{uuid.uuid4()}{ext}"
        tmp_filepath = os.path.join(tmp_dir, tmp_filename)

        # Write the file
        with open(tmp_filepath, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)

        return tmp_filepath
    finally:
        upload_file.file.close()

# --- API Endpoints ---

@app.get("/", summary="Health Check")
async def read_root():
    """A simple health check endpoint to confirm the API is running."""
    return {"status": "ok", "message": "Welcome to the DeepCode API"}

@app.post("/process/text", summary="Process Text or URL Input")
async def process_text_task(request: TaskRequest):
    """
    Processes a task based on a text input (like a chat message or a URL).
    """
    if request.input_type not in ["chat", "url"]:
        raise HTTPException(status_code=400, detail="Invalid input_type. Must be 'chat' or 'url'.")

    try:
        # We don't have a progress callback in this API context, so we pass None.
        result = await process_input_async(
            input_source=request.input_source,
            input_type=request.input_type,
            enable_indexing=request.enable_indexing,
            progress_callback=None,
        )
        return result
    except Exception as e:
        # Catch potential exceptions from the core logic
        raise HTTPException(status_code=500, detail=f"An error occurred during processing: {str(e)}")


@app.post("/process/file", summary="Process File Input")
async def process_file_task(
    enable_indexing: bool = Form(True),
    file: UploadFile = File(...)
):
    """
    Processes a task based on an uploaded file (e.g., PDF, DOCX).
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    temp_file_path = None
    try:
        # Save the uploaded file to a temporary path
        temp_file_path = save_upload_file_tmp(file)

        # Call the core logic with the path to the temporary file
        result = await process_input_async(
            input_source=temp_file_path,
            input_type="file",
            enable_indexing=enable_indexing,
            progress_callback=None,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during processing: {str(e)}")
    finally:
        # Clean up the temporary file after processing is complete
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

# --- Main entry point for running the server ---

if __name__ == "__main__":
    # This allows running the API directly for testing: `python api.py`
    uvicorn.run(app, host="0.0.0.0", port=8000)
