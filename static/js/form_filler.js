// =====================================================================================
// GLOBAL STATE
// =====================================================================================

let formFields = [];
let customFields = [];
let fieldValues = {};
let currentRecordingField = null;
let mediaRecorder = null;
let audioChunks = [];
let recordedBlob = null;
let selectedLanguage = 'auto';

// =====================================================================================
// INITIALIZATION
// =====================================================================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    setupEventListeners();
    renderFields();
    updatePreview();
});

async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        formFields = config.predefined_fields;
        
        // Update API status
        if (config.has_api_keys) {
            document.getElementById('openaiStatus').innerHTML = '✅ OpenAI API Key Loaded';
            document.getElementById('assemblyaiStatus').innerHTML = '✅ AssemblyAI API Key Loaded';
        } else {
            document.getElementById('openaiStatus').innerHTML = '⚠️ OpenAI API Key Missing';
            document.getElementById('assemblyaiStatus').innerHTML = '⚠️ AssemblyAI API Key Missing';
        }
        
        updateFieldCounts();
    } catch (error) {
        console.error('Error loading config:', error);
        alert('Failed to load configuration');
    }
}

function setupEventListeners() {
    document.getElementById('languageSelect').addEventListener('change', (e) => {
        selectedLanguage = e.target.value;
    });
    
    document.getElementById('addCustomFieldBtn').addEventListener('click', addCustomField);
    document.getElementById('resetFieldsBtn').addEventListener('click', resetFields);
    document.getElementById('saveFormBtn').addEventListener('click', saveForm);
    document.getElementById('clearFormBtn').addEventListener('click', clearForm);
    
    // Modal event listeners
    document.getElementById('stopRecordingBtn').addEventListener('click', stopRecording);
    document.getElementById('confirmRecordBtn').addEventListener('click', confirmRecording);
    document.getElementById('reRecordBtn').addEventListener('click', reRecord);
}

// =====================================================================================
// FIELD MANAGEMENT
// =====================================================================================

function updateFieldCounts() {
    const predefinedCount = formFields.filter(f => !f.custom).length;
    const customCount = customFields.length;
    const totalCount = formFields.length;
    
    document.getElementById('predefinedCount').textContent = predefinedCount;
    document.getElementById('customCount').textContent = customCount;
    document.getElementById('totalCount').textContent = totalCount;
    
    if (customCount > 0) {
        document.getElementById('customCountSection').style.display = 'block';
        document.getElementById('resetFieldsBtn').style.display = 'block';
    } else {
        document.getElementById('customCountSection').style.display = 'none';
        document.getElementById('resetFieldsBtn').style.display = 'none';
    }
}

function addCustomField() {
    const nameInput = document.getElementById('customFieldName');
    const fieldName = nameInput.value.trim();
    
    if (!fieldName) {
        alert('Please enter a field name');
        return;
    }
    
    const newField = {
        id: 'custom_' + Date.now(),
        name: fieldName,
        custom: true
    };
    
    formFields.push(newField);
    customFields.push(newField);
    nameInput.value = '';
    
    updateFieldCounts();
    renderFields();
    updatePreview();
}

function resetFields() {
    if (!confirm('Remove all custom fields? This will clear their values too.')) {
        return;
    }
    
    // Remove custom fields
    formFields = formFields.filter(f => !f.custom);
    customFields = [];
    
    // Remove custom field values
    const customFieldIds = Object.keys(fieldValues).filter(id => id.startsWith('custom_'));
    customFieldIds.forEach(id => delete fieldValues[id]);
    
    updateFieldCounts();
    renderFields();
    updatePreview();
}

// =====================================================================================
// RENDERING
// =====================================================================================

function renderFields() {
    const container = document.getElementById('formFields');
    container.innerHTML = '';
    
    formFields.forEach(field => {
        const fieldCard = createFieldCard(field);
        container.appendChild(fieldCard);
    });
}

function createFieldCard(field) {
    const card = document.createElement('div');
    card.className = 'field-card';
    
    const title = document.createElement('h4');
    title.textContent = field.name;
    card.appendChild(title);
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input';
    input.placeholder = `Value for ${field.name}`;
    input.value = fieldValues[field.id] || '';
    input.addEventListener('input', (e) => {
        fieldValues[field.id] = e.target.value;
        updatePreview();
    });
    card.appendChild(input);
    
    const recordBtn = document.createElement('button');
    recordBtn.className = 'btn-record btn-full';
    recordBtn.innerHTML = `🎙️ Record Answer for ${field.name}`;
    recordBtn.addEventListener('click', () => startRecording(field));
    card.appendChild(recordBtn);
    
    return card;
}

function updatePreview() {
    const previewDiv = document.getElementById('formPreview');
    const exportDiv = document.getElementById('exportOptions');
    
    const hasValues = Object.values(fieldValues).some(v => v && v.trim());
    
    if (hasValues) {
        let html = '';
        formFields.forEach(field => {
            const value = fieldValues[field.id] || '';
            if (value) {
                html += `<p><strong>${field.name}:</strong> ${value}</p>`;
            }
        });
        previewDiv.innerHTML = html;
        exportDiv.style.display = 'block';
    } else {
        previewDiv.innerHTML = '<p class="info-text">Your completed form fields will appear here.</p>';
        exportDiv.style.display = 'none';
    }
}

// =====================================================================================
// AUDIO RECORDING
// =====================================================================================

async function startRecording(field) {
    currentRecordingField = field;
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
    startRecording(currentRecordingField);
}

// =====================================================================================
// API CALLS
// =====================================================================================

async function confirmRecording() {
    hideConfirmModal();
    showProcessingModal('Transcribing audio...');
    
    try {
        const formData = new FormData();
        formData.append('audio_file', recordedBlob, 'recording.wav');
        formData.append('field_name', currentRecordingField.name);
        formData.append('language', selectedLanguage);
        
        const response = await fetch('/api/transcribe-form', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Transcription failed');
        }
        
        const result = await response.json();
        
        updateProcessingModal('Translating and extracting...');
        
        // Update field value
        fieldValues[currentRecordingField.id] = result.field_value;
        
        hideProcessingModal();
        
        // Show success message
        alert(`✅ Field "${currentRecordingField.name}" filled successfully!\n\nTranscribed: "${result.transcription}"\nExtracted: "${result.field_value}"`);
        
        // Re-render
        renderFields();
        updatePreview();
        
    } catch (error) {
        hideProcessingModal();
        console.error('Error processing recording:', error);
        alert('Error: ' + error.message);
    }
    
    currentRecordingField = null;
    recordedBlob = null;
}

// =====================================================================================
// PROCESSING MODAL
// =====================================================================================

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
// SAVE & EXPORT
// =====================================================================================

async function saveForm() {
    const formData = {};
    formFields.forEach(field => {
        formData[field.name] = fieldValues[field.id] || '';
    });
    
    try {
        const response = await fetch('/api/save-form', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            alert(`✅ Form saved successfully as: ${result.filename}`);
            
            // Trigger download
            window.location.href = `/api/download/${result.filename}`;
        }
    } catch (error) {
        console.error('Error saving form:', error);
        alert('Failed to save form');
    }
}

function clearForm() {
    if (!confirm('Clear all form data?')) {
        return;
    }
    
    fieldValues = {};
    renderFields();
    updatePreview();
}
