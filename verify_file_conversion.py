
import os
import sys
from unittest.mock import MagicMock, patch

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Mock dependencies BEFORE importing api
sys.modules["streamlit"] = MagicMock()
sys.modules["nest_asyncio"] = MagicMock()
sys.modules["mcp_agent"] = MagicMock()
sys.modules["mcp_agent.app"] = MagicMock()
sys.modules["workflows"] = MagicMock()
sys.modules["workflows.agent_orchestration_engine"] = MagicMock()

# Mock ui.handlers
mock_handlers = MagicMock()
sys.modules["ui"] = MagicMock()
sys.modules["ui.handlers"] = mock_handlers

# Mock tools.pdf_converter
mock_converter_module = MagicMock()
mock_pdf_converter_class = MagicMock()
mock_converter_module.PDFConverter = mock_pdf_converter_class
sys.modules["tools"] = MagicMock()
sys.modules["tools.pdf_converter"] = mock_converter_module

# Now import api
try:
    from api import app
    from fastapi.testclient import TestClient
except ImportError as e:
    print(f"Failed to import api even with mocks: {e}")
    sys.exit(1)

client = TestClient(app)

def test_file_conversion():
    # Create a dummy text file
    test_filename = "test_conversion.txt"
    with open(test_filename, "w") as f:
        f.write("This is a test file for conversion.")

    try:
        # We need to patch process_input_async where it is imported in api.py
        # Since api.py does "from ui.handlers import process_input_async", 
        # we should patch "api.process_input_async"
        
        with patch("api.process_input_async") as mock_process:
            mock_process.return_value = {"status": "success", "result": "Mocked result"}
            
            # Configure the mock converter instance
            mock_instance = mock_pdf_converter_class.return_value
            mock_instance.convert_to_pdf.return_value = "test_conversion.pdf"
            
            # Send request
            with open(test_filename, "rb") as f:
                response = client.post(
                    "/process/file",
                    files={"file": (test_filename, f, "text/plain")},
                    data={"enable_indexing": "true"}
                )
            
            # Check if PDFConverter was initialized and called
            mock_pdf_converter_class.assert_called()
            mock_instance.convert_to_pdf.assert_called()
            
            # Check if process_input_async was called with the converted PDF path
            args, kwargs = mock_process.call_args
            input_source = kwargs.get("input_source")
            print(f"\nInput source passed to pipeline: {input_source}")
            
            assert str(input_source) == "test_conversion.pdf"
            assert response.status_code == 200
            print("\n✅ Verification Successful: Logic flow correctly handles non-PDF file.")

    finally:
        if os.path.exists(test_filename):
            os.remove(test_filename)

if __name__ == "__main__":
    # Run the test function directly
    try:
        test_file_conversion()
    except Exception as e:
        print(f"\n❌ Verification Failed: {e}")
        import traceback
        traceback.print_exc()
