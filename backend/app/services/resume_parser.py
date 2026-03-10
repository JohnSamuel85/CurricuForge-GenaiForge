import io
import docx
from pypdf import PdfReader

def extract_text_from_pdf(file_stream) -> str:
    try:
        reader = PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""

def extract_text_from_docx(file_stream) -> str:
    try:
        doc = docx.Document(file_stream)
        text = "\n".join([para.text for para in doc.paragraphs])
        return text
    except Exception as e:
        print(f"Error reading DOCX: {e}")
        return ""

def extract_resume_text(file_storage) -> str:
    """Extracts text from a Flask FileStorage object (PDF or DOCX)."""
    if not file_storage:
        return ""
        
    filename = file_storage.filename.lower()
    
    # Read the file data into a BytesIO stream
    file_bytes = file_storage.read()
    file_stream = io.BytesIO(file_bytes)
    
    # Reset file pointer so it can be read again if needed
    file_storage.seek(0)
    
    if filename.endswith(".pdf"):
        return extract_text_from_pdf(file_stream)
    elif filename.endswith(".docx"):
        return extract_text_from_docx(file_stream)
    
    return ""
