# Real Estate Inspection Assistant - FastAPI Version

This is a FastAPI + HTML/CSS version of the Real Estate Inspection Assistant, converted from the original Streamlit application. It provides the same functionality with a modern web interface.

## Features

### 🏠 Real Estate Inspection Form Filler
- Voice-powered form filling for property inspections
- Predefined inspection fields (Inspector Name, Company, Property Address, Inspection Date)
- Add custom fields as needed
- Multi-language support with automatic translation
- AI-powered field extraction from voice input
- Export to JSON format

### 🎙️ Property Q&A Analysis
- Answer predefined real estate questions using voice
- Add custom questions
- AI-powered answer analysis and relevancy scoring
- Quality assessment of responses
- Comprehensive Q&A reports

## Installation

1. Install the required dependencies:
```powershell
pip install -r requirements.txt
```

## Running the Application

### Option 1: Run with Python directly
```powershell
python app_fastapi.py
```

### Option 2: Run with Uvicorn
```powershell
uvicorn app_fastapi:app --reload --host 0.0.0.0 --port 8000
```

The application will be available at:
- **Local**: http://localhost:8000
- **Network**: http://0.0.0.0:8000

## Application Structure

```
voice2text/
├── app.py                      # Original Streamlit app (unchanged)
├── app_fastapi.py             # FastAPI backend (NEW)
├── requirements.txt           # Updated with FastAPI dependencies
├── templates/                 # HTML templates (NEW)
│   ├── index.html            # Home page
│   ├── form_filler.html      # Form filler page
│   └── qna_analysis.html     # Q&A analysis page
├── static/                    # Static assets (NEW)
│   ├── css/
│   │   └── styles.css        # Main stylesheet
│   └── js/
│       ├── form_filler.js    # Form filler functionality
│       └── qna_analysis.js   # Q&A analysis functionality
└── temp_audio/               # Temporary audio files (auto-created)
```

## API Endpoints

### Configuration
- `GET /` - Home page
- `GET /form-filler` - Form filler page
- `GET /qna-analysis` - Q&A analysis page
- `GET /api/config` - Get application configuration

### Form Filler
- `POST /api/transcribe-form` - Transcribe audio and extract field information
- `POST /api/save-form` - Save form data as JSON

### Q&A Analysis
- `POST /api/transcribe-qna` - Transcribe audio for Q&A
- `POST /api/process-qna` - Process answer with AI analysis
- `POST /api/save-qna` - Save Q&A analysis as JSON

### Utilities
- `GET /api/download/{filename}` - Download generated files
- `POST /api/update-keys` - Update API keys

## Browser Requirements

- Modern browser with Web Audio API support (Chrome, Firefox, Edge, Safari)
- Microphone access permission required
- JavaScript enabled

## API Keys

The application uses the following API keys (configured in `app_fastapi.py` or via environment variables):

- **AssemblyAI API Key**: For audio transcription
- **OpenAI API Key**: For AI analysis and translation

You can set these via environment variables:
```powershell
$env:ASSEMBLYAI_API_KEY="your_key_here"
$env:OPENAI_API_KEY="your_key_here"
```

Or create a `.env` file:
```
ASSEMBLYAI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

## Features Comparison

| Feature | Streamlit (app.py) | FastAPI (app_fastapi.py) |
|---------|-------------------|-------------------------|
| Voice Recording | ✅ WebRTC | ✅ MediaRecorder API |
| Form Filling | ✅ | ✅ |
| Q&A Analysis | ✅ | ✅ |
| Multi-language | ✅ | ✅ |
| AI Processing | ✅ CrewAI | ✅ CrewAI |
| Export to JSON | ✅ | ✅ |
| Custom Fields | ✅ | ✅ |
| Custom Questions | ✅ | ✅ |

## Usage

### Form Filler
1. Navigate to the Form Filler page
2. Click the microphone button for any field
3. Speak your answer clearly
4. Confirm the recording
5. Wait for AI to extract and fill the field
6. Export the completed form as JSON

### Q&A Analysis
1. Navigate to the Q&A Analysis page
2. Select a question from the sidebar
3. Click "Start Recording" and answer the question
4. Confirm and transcribe the recording
5. Process with AI agents for analysis
6. Save the answer and move to the next question
7. Export all Q&A data when complete

## Troubleshooting

### Microphone Access Issues
- Ensure your browser has permission to access the microphone
- Check browser settings for microphone permissions
- Try using HTTPS if microphone access is blocked

### Audio Recording Issues
- Check if your microphone is working in other applications
- Try a different browser
- Ensure no other application is using the microphone

### API Errors
- Verify your API keys are correct
- Check your internet connection
- Review the console logs for detailed error messages

## Development

To run in development mode with auto-reload:
```powershell
uvicorn app_fastapi:app --reload
```

## Notes

- The original `app.py` (Streamlit version) remains unchanged
- All new FastAPI functionality is in separate files
- Both versions use the same AI processing logic
- Audio files are temporarily stored in `temp_audio/` directory
- Generated JSON files are saved in the root directory

## License

Same as the original application.
