// =====================================================================================
// GLOBAL STATE
// =====================================================================================

let allQuestions = [];
let customQuestions = [];
let answers = {};
let selectedQuestionIndex = 0;
let selectedLanguage = 'auto';

// Recording state
let mediaRecorder = null;
let audioChunks = [];
let recordedBlob = null;
let currentAudioFileId = null;

// Current question state
let currentTranscription = null;
let currentLanguageCode = null;
let currentConfidence = null;
let currentEnglishText = null;
let currentAnalysis = null;
let currentRelevancyScore = null;

// =====================================================================================
// INITIALIZATION
// =====================================================================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    setupEventListeners();
    renderQuestions();
    renderCurrentQuestion();
});

async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        allQuestions = [...config.predefined_questions];
        
        // Update API status
        if (config.has_api_keys) {
            document.getElementById('openaiStatus').innerHTML = '✅ OpenAI API Key Loaded';
            document.getElementById('assemblyaiStatus').innerHTML = '✅ AssemblyAI API Key Loaded';
        } else {
            document.getElementById('openaiStatus').innerHTML = '⚠️ OpenAI API Key Missing';
            document.getElementById('assemblyaiStatus').innerHTML = '⚠️ AssemblyAI API Key Missing';
        }
        
    } catch (error) {
        console.error('Error loading config:', error);
        alert('Failed to load configuration');
    }
}

function setupEventListeners() {
    document.getElementById('languageSelect').addEventListener('change', (e) => {
        selectedLanguage = e.target.value;
    });
    
    document.getElementById('addQuestionBtn').addEventListener('click', addCustomQuestion);
    document.getElementById('clearCustomBtn').addEventListener('click', clearCustomQuestions);
    
    // Recording workflow (simplified like form filler)
    document.getElementById('recordAnswerBtn').addEventListener('click', startRecording);
    document.getElementById('stopRecordingBtn').addEventListener('click', stopRecording);
    document.getElementById('confirmRecordBtn').addEventListener('click', confirmAndProcess);
    document.getElementById('reRecordBtn').addEventListener('click', reRecord);
    document.getElementById('reRecordAnswerBtn').addEventListener('click', reRecordFromAnalysis);
    document.getElementById('saveAnswerBtn').addEventListener('click', saveAnswer);
    
    // Saved answer actions
    document.getElementById('reRecordQuestionBtn').addEventListener('click', reRecordQuestion);
    document.getElementById('nextUnansweredBtn').addEventListener('click', goToNextUnanswered);
    document.getElementById('viewAllBtn').addEventListener('click', viewAllAnswers);
    
    // Complete section actions
    document.getElementById('saveQnABtn').addEventListener('click', saveQnAAnalysis);
    document.getElementById('newSessionBtn').addEventListener('click', startNewSession);
}

// =====================================================================================
// QUESTION MANAGEMENT
// =====================================================================================

function renderQuestions() {
    const container = document.getElementById('questionsList');
    container.innerHTML = '';
    
    allQuestions.forEach((question, index) => {
        const btn = document.createElement('button');
        btn.className = 'question-btn';
        
        const isPredefined = index < 3; // First 3 are predefined
        const icon = isPredefined ? '🔖' : '✨';
        const status = answers[index] ? '✅' : '⭕';
        
        btn.innerHTML = `${status} ${icon} ${question}`;
        
        if (answers[index]) {
            btn.classList.add('answered');
        }
        
        btn.addEventListener('click', () => selectQuestion(index));
        container.appendChild(btn);
    });
}

function selectQuestion(index) {
    selectedQuestionIndex = index;
    resetCurrentQuestionState();
    renderCurrentQuestion();
}

function resetCurrentQuestionState() {
    currentTranscription = null;
    currentLanguageCode = null;
    currentConfidence = null;
    currentEnglishText = null;
    currentAnalysis = null;
    currentRelevancyScore = null;
    recordedBlob = null;
    currentAudioFileId = null;
}

function addCustomQuestion() {
    const input = document.getElementById('customQuestionInput');
    const question = input.value.trim();
    
    if (!question) {
        alert('Please enter a question');
        return;
    }
    
    if (allQuestions.includes(question)) {
        alert('Question already exists!');
        return;
    }
    
    allQuestions.push(question);
    customQuestions.push(question);
    input.value = '';
    
    renderQuestions();
    alert('Question added successfully!');
}

function clearCustomQuestions() {
    if (!customQuestions.length) {
        return;
    }
    
    if (!confirm('Clear all custom questions?')) {
        return;
    }
    
    // Remove custom questions
    allQuestions = allQuestions.slice(0, 3); // Keep only predefined
    customQuestions = [];
    
    // Reset to first question if needed
    if (selectedQuestionIndex >= allQuestions.length) {
        selectedQuestionIndex = 0;
    }
    
    renderQuestions();
    renderCurrentQuestion();
    alert('Custom questions cleared!');
}

// =====================================================================================
// RENDER CURRENT QUESTION
// =====================================================================================

function renderCurrentQuestion() {
    const allComplete = allQuestions.length > 0 && 
                       Object.keys(answers).length === allQuestions.length;
    
    if (allComplete) {
        showCompleteSection();
        return;
    }
    
    document.getElementById('allCompleteSection').style.display = 'none';
    document.getElementById('questionSection').style.display = 'block';
    
    const question = allQuestions[selectedQuestionIndex];
    document.getElementById('questionNumber').textContent = 
        `Question ${selectedQuestionIndex + 1}/${allQuestions.length}`;
    document.getElementById('currentQuestion').textContent = question;
    
    if (answers[selectedQuestionIndex]) {
        showSavedAnswer();
    } else {
        showNewAnswerView();
    }
}

function showSavedAnswer() {
    document.getElementById('savedAnswerView').style.display = 'block';
    document.getElementById('newAnswerView').style.display = 'none';
    
    const answer = answers[selectedQuestionIndex];
    
    document.getElementById('savedTranscription').value = answer.transcription;
    document.getElementById('savedAnalysis').innerHTML = answer.ai_analysis;
    document.getElementById('savedScore').innerHTML = answer.relevancy_score;
    
    // Audio (if available)
    const audioEl = document.getElementById('savedAudio');
    if (answer.audio_file) {
        audioEl.src = answer.audio_file;
        audioEl.style.display = 'block';
    } else {
        audioEl.style.display = 'none';
    }
    
    // Show next unanswered button if applicable
    const nextUnanswered = findNextUnanswered();
    if (nextUnanswered !== null) {
        document.getElementById('nextUnansweredBtn').style.display = 'block';
    } else {
        document.getElementById('nextUnansweredBtn').style.display = 'none';
    }
}

function showNewAnswerView() {
    document.getElementById('savedAnswerView').style.display = 'none';
    document.getElementById('newAnswerView').style.display = 'block';
    
    // Reset answer display
    document.getElementById('answerText').value = '';
    document.getElementById('analysisSection').style.display = 'none';
}

function findNextUnanswered() {
    for (let i = 0; i < allQuestions.length; i++) {
        if (!answers[i]) {
            return i;
        }
    }
    return null;
}

// =====================================================================================
// AUDIO RECORDING
// =====================================================================================

async function startRecording() {
    audioChunks = [];
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            recordedBlob = new Blob(audioChunks, { type: 'audio/wav' });
            showConfirmModal();
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        showRecordingModal();
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Could not access microphone. Please check permissions.');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    hideRecordingModal();
}

function showRecordingModal() {
    const modal = document.getElementById('recordingModal');
    modal.classList.add('show');
}

function hideRecordingModal() {
    const modal = document.getElementById('recordingModal');
    modal.classList.remove('show');
}

function showConfirmModal() {
    const modal = document.getElementById('confirmModal');
    const audio = document.getElementById('audioPlayback');
    audio.src = URL.createObjectURL(recordedBlob);
    modal.classList.add('show');
}

function hideConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('show');
}

function reRecord() {
    hideConfirmModal();
    recordedBlob = null;
    audioChunks = [];
    startRecording();
}

function reRecordFromAnalysis() {
    // Reset everything and start over
    currentTranscription = null;
    currentLanguageCode = null;
    currentConfidence = null;
    currentEnglishText = null;
    currentAnalysis = null;
    currentRelevancyScore = null;
    recordedBlob = null;
    
    document.getElementById('answerText').value = '';
    document.getElementById('analysisSection').style.display = 'none';
    
    startRecording();
}

// =====================================================================================
// TRANSCRIPTION & PROCESSING
// =====================================================================================

async function confirmAndProcess() {
    hideConfirmModal();
    showProcessingModal('Transcribing audio...');
    
    try {
        const formData = new FormData();
        formData.append('audio_file', recordedBlob, 'recording.wav');
        formData.append('language', selectedLanguage);
        
        updateProcessingModal('Transcribing audio...');
        const transcribeResponse = await fetch('/api/transcribe-qna', {
            method: 'POST',
            body: formData
        });
        
        if (!transcribeResponse.ok) {
            const error = await transcribeResponse.json();
            throw new Error(error.detail || 'Transcription failed');
        }
        
        const transcribeResult = await transcribeResponse.json();
        
        currentTranscription = transcribeResult.transcription;
        currentLanguageCode = transcribeResult.language_code;
        currentConfidence = transcribeResult.confidence;
        currentEnglishText = transcribeResult.english_text;
        currentAudioFileId = transcribeResult.audio_file_id;
        
        // Show transcription in textarea
        document.getElementById('answerText').value = currentTranscription;
        
        // Now process with AI
        updateProcessingModal('Analyzing with AI...');
        const currentQuestion = allQuestions[selectedQuestionIndex];
        
        const processFormData = new FormData();
        processFormData.append('question', currentQuestion);
        processFormData.append('answer', currentEnglishText || currentTranscription);
        processFormData.append('language_code', currentLanguageCode || 'en');
        
        const processResponse = await fetch('/api/process-qna', {
            method: 'POST',
            body: processFormData
        });
        
        if (!processResponse.ok) {
            const error = await processResponse.json();
            throw new Error(error.detail || 'Processing failed');
        }
        
        const processResult = await processResponse.json();
        
        currentAnalysis = processResult.summary;
        currentRelevancyScore = processResult.relevancy_score;
        
        hideProcessingModal();
        
        // Show analysis section
        document.getElementById('aiAnalysis').innerHTML = currentAnalysis;
        document.getElementById('qualityScore').innerHTML = currentRelevancyScore;
        document.getElementById('analysisSection').style.display = 'block';
        
    } catch (error) {
        hideProcessingModal();
        console.error('Error processing recording:', error);
        alert('Error: ' + error.message);
    }
}

function showProcessingModal(text) {
    const modal = document.getElementById('processingModal');
    document.getElementById('processingText').textContent = text;
    modal.classList.add('show');
}

function updateProcessingModal(text) {
    document.getElementById('processingText').textContent = text;
}

function hideProcessingModal() {
    const modal = document.getElementById('processingModal');
    modal.classList.remove('show');
}

// =====================================================================================
// SAVE ANSWER
// =====================================================================================

function saveAnswer() {
    answers[selectedQuestionIndex] = {
        question: allQuestions[selectedQuestionIndex],
        transcription: currentTranscription,
        english_converted_text: currentEnglishText || currentTranscription,
        ai_analysis: currentAnalysis,
        relevancy_score: currentRelevancyScore,
        language_code: currentLanguageCode,
        transcription_confidence: currentConfidence,
        audio_file: recordedBlob ? URL.createObjectURL(recordedBlob) : null
    };
    
    renderQuestions();
    
    // Move to next question or show complete
    if (selectedQuestionIndex + 1 < allQuestions.length) {
        selectedQuestionIndex++;
        resetCurrentQuestionState();
        renderCurrentQuestion();
        alert('✅ Answer saved! Moving to next question...');
    } else {
        renderCurrentQuestion();
        alert('🎉 All questions completed!');
    }
}

// =====================================================================================
// SAVED ANSWER ACTIONS
// =====================================================================================

function reRecordQuestion() {
    if (!confirm('Re-record this answer? Your current answer will be deleted.')) {
        return;
    }
    
    delete answers[selectedQuestionIndex];
    resetCurrentQuestionState();
    renderQuestions();
    renderCurrentQuestion();
    alert('🔄 Ready to re-record!');
}

function goToNextUnanswered() {
    const next = findNextUnanswered();
    if (next !== null) {
        selectedQuestionIndex = next;
        resetCurrentQuestionState();
        renderCurrentQuestion();
    }
}

function viewAllAnswers() {
    selectedQuestionIndex = 0;
    renderCurrentQuestion();
}

// =====================================================================================
// COMPLETE SECTION
// =====================================================================================

function showCompleteSection() {
    document.getElementById('allCompleteSection').style.display = 'block';
    document.getElementById('questionSection').style.display = 'none';
    
    const summaryDiv = document.getElementById('completeSummary');
    summaryDiv.innerHTML = '';
    
    Object.entries(answers).forEach(([index, data]) => {
        const questionNum = parseInt(index) + 1;
        const expandable = createExpandable(
            `Question ${questionNum}: ${data.question}`,
            `
                <p><strong>Transcription:</strong></p>
                <p>${data.transcription}</p>
                <br>
                <p><strong>AI Analysis:</strong></p>
                <div class="success-box">${data.ai_analysis}</div>
                <br>
                <p><strong>Quality Score:</strong></p>
                <div class="info-box">${data.relevancy_score}</div>
                ${data.audio_file ? `<br><audio controls src="${data.audio_file}" style="width: 100%"></audio>` : ''}
            `
        );
        summaryDiv.appendChild(expandable);
    });
}

function createExpandable(title, content) {
    const div = document.createElement('div');
    div.className = 'expandable';
    
    const header = document.createElement('div');
    header.className = 'expandable-header';
    header.innerHTML = `<strong>${title}</strong><span>▼</span>`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'expandable-content';
    contentDiv.innerHTML = content;
    
    header.addEventListener('click', () => {
        div.classList.toggle('open');
        header.querySelector('span').textContent = div.classList.contains('open') ? '▲' : '▼';
    });
    
    div.appendChild(header);
    div.appendChild(contentDiv);
    
    return div;
}

async function saveQnAAnalysis() {
    const qnaData = {
        questions_and_answers: []
    };
    
    Object.entries(answers).forEach(([index, data]) => {
        qnaData.questions_and_answers.push({
            question_number: parseInt(index) + 1,
            question: data.question,
            transcribed_text: data.transcription,
            english_converted_text: data.english_converted_text,
            ai_analysis: data.ai_analysis,
            relevancy_score: data.relevancy_score,
            language_detected: data.language_code,
            transcription_confidence: data.transcription_confidence
        });
    });
    
    try {
        const response = await fetch('/api/save-qna', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(qnaData)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            alert(`✅ Q&A Analysis saved successfully as: ${result.filename}`);
            window.location.href = `/api/download/${result.filename}`;
        }
    } catch (error) {
        console.error('Error saving Q&A:', error);
        alert('Failed to save Q&A analysis');
    }
}

function startNewSession() {
    if (!confirm('Start a new Q&A session? All current answers will be cleared.')) {
        return;
    }
    
    answers = {};
    selectedQuestionIndex = 0;
    resetCurrentQuestionState();
    
    renderQuestions();
    renderCurrentQuestion();
    
    alert('🔄 New Q&A session started!');
}
