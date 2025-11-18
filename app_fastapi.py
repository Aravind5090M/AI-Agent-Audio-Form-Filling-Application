from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import requests
import time
import os
import uuid
import json
from datetime import datetime
from dotenv import load_dotenv

# Import CrewAI components
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

# =====================================================================================
# CONFIGURATION
# =====================================================================================

load_dotenv()

# Disable CrewAI tracing prompts
os.environ["CREWAI_TRACING_ENABLED"] = "false"

app = FastAPI(title="AI Voice Assistant API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
os.makedirs("static", exist_ok=True)
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)
os.makedirs("templates", exist_ok=True)
os.makedirs("temp_audio", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

# API Keys (load from environment or use defaults from app.py)
#2. Fetch Keys
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# 3. CRITICAL FIX: Explicitly set os.environ for CrewAI/LiteLLM
# CrewAI strictly checks os.environ, not just the argument passed to the Agent
if OPENAI_API_KEY:
    os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
    # Set default model name for CrewAI to avoid fallback errors
    os.environ["OPENAI_MODEL_NAME"] = "gpt-4o"
else:
    print("⚠️ WARNING: OPENAI_API_KEY not found in environment variables.")

if not ASSEMBLYAI_API_KEY:
    print("⚠️ WARNING: ASSEMBLYAI_API_KEY not found in environment variables.")

# Predefined fields for Real Estate House Inspections
PREDEFINED_INSPECTION_FIELDS = [
    {"id": "inspector_name", "name": "Inspector Name"},
    {"id": "inspection_company", "name": "Inspection Company"},
    {"id": "property_address", "name": "Property Address"},
    {"id": "inspection_date", "name": "Inspection Date"},
]

# Predefined questions for Q&A
PREDEFINED_QUESTIONS = [
    "Can you describe the key features of the property, including size, layout, and notable upgrades?",
    "What is the current asking price and how was that price determined or justified?",
    "Are there any outstanding liens, easements, or legal issues affecting the property?",
]

# =====================================================================================
# PYDANTIC MODELS
# =====================================================================================

class APIKeysUpdate(BaseModel):
    assemblyai_key: Optional[str] = None
    openai_key: Optional[str] = None

class CustomField(BaseModel):
    name: str

class CustomQuestion(BaseModel):
    question: str

class TranscriptionResponse(BaseModel):
    text: str
    language_code: str
    confidence: float

class ExtractionResponse(BaseModel):
    field_value: str
    translated_text: str

class QnAProcessResponse(BaseModel):
    summary: str
    relevancy_score: str

# =====================================================================================
# HELPER FUNCTIONS
# =====================================================================================

def poll_assemblyai_for_result(transcript_id: str, headers: dict):
    """Poll AssemblyAI for transcription result"""
    polling_endpoint = f'https://api.assemblyai.com/v2/transcript/{transcript_id}'
    while True:
        try:
            polling_response = requests.get(polling_endpoint, headers=headers)
            polling_response.raise_for_status()
            polling_result = polling_response.json()
            if polling_result['status'] in ['completed', 'error']:
                return polling_result
            time.sleep(1)  # Reduced from 3 to 1 second for faster checking
        except requests.exceptions.RequestException as e:
            return None

def transcribe_audio(api_key: str, audio_file_path: str, language_preference: str = "auto", 
                     speaker_labels: bool = False):
    """Transcribe audio using AssemblyAI"""
    headers = {'authorization': api_key}
    
    try:
        with open(audio_file_path, 'rb') as f:
            upload_response = requests.post('https://api.assemblyai.com/v2/upload', 
                                           headers=headers, data=f)
        upload_response.raise_for_status()
        upload_url = upload_response.json()['upload_url']
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

    json_data = {
        'audio_url': upload_url,
        'punctuate': True,
        'format_text': True,
        'speech_model': 'nano'  # Fastest model (nano < best). Use 'best' for higher accuracy
    }
    
    if speaker_labels:
        json_data['speaker_labels'] = True
        json_data['disfluencies'] = True
    
    if language_preference == 'auto':
        json_data['language_detection'] = True
    else:
        json_data['language_code'] = language_preference

    try:
        transcript_response = requests.post('https://api.assemblyai.com/v2/transcript', 
                                           json=json_data, headers=headers)
        transcript_response.raise_for_status()
        transcript_id = transcript_response.json().get('id')
        if not transcript_id:
            raise HTTPException(status_code=500, detail="AssemblyAI did not return a transcript ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error requesting transcription: {str(e)}")

    polling_result = poll_assemblyai_for_result(transcript_id, headers)
    
    if polling_result and polling_result['status'] == 'completed':
        text = polling_result.get('text', '').strip()
        if not text:
            raise HTTPException(status_code=400, 
                              detail="No speech detected in the audio. Please ensure you speak clearly.")
        return {
            "text": text,
            "language_code": polling_result.get('language_code', 'en'),
            "confidence": polling_result.get('confidence', 0.0)
        }
    elif polling_result:
        error_msg = polling_result.get('error', 'Unknown transcription error')
        raise HTTPException(status_code=500, detail=f"Transcription failed: {error_msg}")
    else:
        raise HTTPException(status_code=500, detail="Failed to get transcription result")

def convert_to_english(text: str, language_code: str):
    """Convert text to English using CrewAI translator agent"""
    try:
        llm = ChatOpenAI(api_key=OPENAI_API_KEY, model_name="gpt-4o", temperature=0.1)
        translator_agent = Agent(
            role='Expert Language Translator',
            goal='Translate text to English, but first verify if it is already English.',
            backstory='An expert linguist who trusts text content over potentially incorrect language codes.',
            llm=llm,
            verbose=False,
            allow_delegation=False
        )
        translation_task = Task(
            description=f"Text: '{text}'. Detected language: '{language_code}'. If the text content is English, return it as is. Otherwise, translate to English.",
            agent=translator_agent,
            expected_output="The text in English."
        )
        translation_crew = Crew(
            agents=[translator_agent],
            tasks=[translation_task],
            process=Process.sequential
        )
        english_text = translation_crew.kickoff()
        return str(english_text).strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"English conversion error: {str(e)}")

def extract_field_info_with_crewai(field_name: str, transcript: str, language_code: str):
    """Extract field information using CrewAI"""
    try:
        llm = ChatOpenAI(api_key=OPENAI_API_KEY, model_name="gpt-4o", temperature=0.1)
        
        # Translation
        translator_agent = Agent(
            role='Expert Language Translator',
            goal=f'Translate the text to English. If it is already English ({language_code}), return it unchanged.',
            backstory='A skilled translator ensuring accuracy.',
            verbose=False, llm=llm, allow_delegation=False
        )
        translation_task = Task(
            description=f"Translate to English: '{transcript}'. Source language code: '{language_code}'.",
            expected_output="The English translation.",
            agent=translator_agent
        )
        translation_crew = Crew(
            agents=[translator_agent],
            tasks=[translation_task],
            process=Process.sequential
        )
        english_transcript = translation_crew.kickoff()
        
        # Extraction
        extractor_agent = Agent(
            role='Information Extractor Agent',
            goal=f"Extract the specific information for the form field: '{field_name}'. Output ONLY the value.",
            backstory=f"An AI expert at parsing English text to fill forms accurately.",
            verbose=False, llm=llm, allow_delegation=False
        )
        extraction_task = Task(
            description=f"From the text: '{english_transcript}', extract the value for the field '{field_name}'.",
            expected_output=f"The precise value for '{field_name}'.",
            agent=extractor_agent
        )
        extraction_crew = Crew(
            agents=[extractor_agent],
            tasks=[extraction_task],
            process=Process.sequential
        )
        extracted_value = extraction_crew.kickoff()
        
        return {
            "field_value": str(extracted_value).strip(),
            "translated_text": str(english_transcript).strip()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CrewAI Error: {str(e)}")

def process_answer_with_crewai(question: str, answer: str, language_code: str):
    """Process Q&A answer with CrewAI"""
    if not answer:
        return {"summary": "No answer provided.", "relevancy_score": "N/A"}
    
    try:
        llm = ChatOpenAI(api_key=OPENAI_API_KEY, model_name="gpt-4o", temperature=0.2)
        
        translator_agent = Agent(
            role='Expert Language Translator',
            goal='Translate text to English, but first verify if it is already English.',
            backstory='An expert linguist who trusts text content over potentially incorrect language codes.',
            llm=llm
        )
        analyzer_agent = Agent(
            role='Answer Relevance Analyzer',
            goal='Analyze ENGLISH text for relevance to the question.',
            backstory='Expert in linguistic analysis.',
            llm=llm
        )
        relevancy_agent = Agent(
            role='Answer Quality Scorer',
            goal='Provide numerical scores (1-10) for answer quality.',
            backstory='Professional evaluator.',
            llm=llm
        )
        summarizer_agent = Agent(
            role='Concise Summarizer',
            goal='Summarize the key points of the ENGLISH answer.',
            backstory='Professional editor.',
            llm=llm
        )
        
        translation_task = Task(
            description=f"Text: '{answer}'. Detected language: '{language_code}'. If the text content is English, return it as is. Otherwise, translate to English.",
            agent=translator_agent,
            expected_output="The text in English."
        )
        analysis_task = Task(
            description=f"Analyze this ENGLISH answer for the question: '{question}'.",
            agent=analyzer_agent,
            context=[translation_task],
            expected_output="Key points and a conclusion on relevance."
        )
        relevancy_task = Task(
            description="""Based on the analysis, score the answer's relevance, content match, completeness, and specificity from 1-10. 
            
            Format your response EXACTLY as bullet points like this:
            • Relevance: [score] - [brief one-line explanation]
            • Content Match: [score] - [brief one-line explanation]
            • Completeness: [score] - [brief one-line explanation]
            • Specificity: [score] - [brief one-line explanation]
            
            Example format:
            • Relevance: 10 - The answer directly addresses the key features of the property.
            • Content Match: 10 - The answer matches the expected content by providing details on bedrooms, washrooms, and upgrades.
            • Completeness: 10 - The answer covers all necessary aspects such as size, layout, and upgrades.
            • Specificity: 10 - The answer is specific, providing exact numbers and detailed information.
            """,
            agent=relevancy_agent,
            context=[analysis_task],
            expected_output="A bullet-point list with scores (1-10) for Relevance, Content Match, Completeness, and Specificity, each with a one-line explanation."
        )
        summary_task = Task(
            description="Create a concise, two-sentence summary of the user's response.",
            agent=summarizer_agent,
            context=[analysis_task],
            expected_output="A polished two-sentence summary."
        )
        
        qa_crew = Crew(
            agents=[translator_agent, analyzer_agent, relevancy_agent, summarizer_agent],
            tasks=[translation_task, analysis_task, relevancy_task, summary_task],
            process=Process.sequential
        )
        crew_results = qa_crew.kickoff()
        task_outputs = crew_results.tasks_output
        
        relevancy_result = task_outputs[2].raw if len(task_outputs) > 2 else "Scoring unavailable."
        summary_result = task_outputs[3].raw if len(task_outputs) > 3 else "Summary unavailable."
        
        return {"summary": summary_result, "relevancy_score": relevancy_result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CrewAI processing error: {str(e)}")

# =====================================================================================
# ROUTES
# =====================================================================================

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve the main page"""
    with open("templates/index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/form-filler", response_class=HTMLResponse)
async def form_filler_page():
    """Serve the form filler page"""
    with open("templates/form_filler.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/qna-analysis", response_class=HTMLResponse)
async def qna_analysis_page():
    """Serve the Q&A analysis page"""
    with open("templates/qna_analysis.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/api/config")
async def get_config():
    """Get initial configuration"""
    return {
        "predefined_fields": PREDEFINED_INSPECTION_FIELDS,
        "predefined_questions": PREDEFINED_QUESTIONS,
        "has_api_keys": bool(ASSEMBLYAI_API_KEY and OPENAI_API_KEY)
    }

@app.post("/api/update-keys")
async def update_api_keys(keys: APIKeysUpdate):
    """Update API keys"""
    global ASSEMBLYAI_API_KEY, OPENAI_API_KEY
    if keys.assemblyai_key:
        ASSEMBLYAI_API_KEY = keys.assemblyai_key
    if keys.openai_key:
        OPENAI_API_KEY = keys.openai_key
    return {"status": "success", "message": "API keys updated"}

@app.post("/api/transcribe-form")
async def transcribe_for_form(
    audio_file: UploadFile = File(...),
    field_name: str = Form(...),
    language: str = Form("auto")
):
    """Transcribe audio and extract field information"""
    # Save uploaded file
    file_path = f"temp_audio/{uuid.uuid4()}.wav"
    try:
        content = await audio_file.read()
        print(f"Received audio file: {len(content)} bytes for field: {field_name}")
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Transcribe
        print(f"Transcribing audio with language: {language}")
        result = transcribe_audio(ASSEMBLYAI_API_KEY, file_path, language)
        print(f"Transcription result: {result['text'][:100]}...")
        
        # Extract field information
        print(f"Extracting field info for: {field_name}")
        extraction = extract_field_info_with_crewai(
            field_name,
            result["text"],
            result["language_code"]
        )
        print(f"Extracted value: {extraction['field_value']}")
        
        return {
            "transcription": result["text"],
            "language_code": result["language_code"],
            "confidence": result["confidence"],
            "translated_text": extraction["translated_text"],
            "field_value": extraction["field_value"]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in transcribe_for_form: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    finally:
        # Clean up
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/api/transcribe-qna")
async def transcribe_for_qna(
    audio_file: UploadFile = File(...),
    language: str = Form("auto")
):
    """Transcribe audio for Q&A"""
    # Save uploaded file
    file_id = str(uuid.uuid4())
    file_path = f"temp_audio/qna_{file_id}.wav"
    try:
        content = await audio_file.read()
        print(f"Received Q&A audio file: {len(content)} bytes")
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Transcribe
        print(f"Transcribing Q&A audio with language: {language}")
        result = transcribe_audio(ASSEMBLYAI_API_KEY, file_path, language, speaker_labels=True)
        print(f"Q&A Transcription result: {result['text'][:100]}...")
        
        # Convert to English if needed
        english_text = result["text"]
        if result["language_code"] and result["language_code"].lower() != 'en':
            print(f"Converting from {result['language_code']} to English")
            english_text = convert_to_english(result["text"], result["language_code"])
        
        return {
            "transcription": result["text"],
            "language_code": result["language_code"],
            "confidence": result["confidence"],
            "english_text": english_text,
            "audio_file_id": file_id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in transcribe_for_qna: {str(e)}")
        import traceback
        traceback.print_exc()
        # Don't delete file on error - user may want to retry
        raise HTTPException(status_code=500, detail=f"Error processing Q&A audio: {str(e)}")

@app.post("/api/process-qna")
async def process_qna(
    question: str = Form(...),
    answer: str = Form(...),
    language_code: str = Form("en")
):
    """Process Q&A answer with AI analysis"""
    result = process_answer_with_crewai(question, answer, language_code)
    return result

@app.post("/api/save-form")
async def save_form(form_data: Dict):
    """Save form data as JSON"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"form_data_{timestamp}.json"
    
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(form_data, f, indent=4)
    
    return {"status": "success", "filename": filename}

@app.post("/api/save-qna")
async def save_qna(qna_data: Dict):
    """Save Q&A analysis as JSON"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"qna_analysis_{timestamp}.json"
    
    # Add session info
    full_data = {
        "session_info": {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_questions": len(qna_data.get("questions_and_answers", [])),
            "analysis_type": "Property Q&A Analysis"
        },
        "questions_and_answers": qna_data.get("questions_and_answers", [])
    }
    
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(full_data, f, indent=2, ensure_ascii=False)
    
    return {"status": "success", "filename": filename}

@app.get("/api/download/{filename}")
async def download_file(filename: str):
    """Download generated file"""
    if os.path.exists(filename):
        return FileResponse(filename, filename=filename)
    raise HTTPException(status_code=404, detail="File not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
