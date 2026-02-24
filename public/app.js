// ─── Bug Report Enhancer — Frontend App ─────────────────────────────────────
// ─── DOM Elements ────────────────────────────────────────────────────────────
const dropZone = document.getElementById('dropZone');
const dropZoneContent = document.getElementById('dropZoneContent');
const previewContainer = document.getElementById('previewContainer');
const previewImage = document.getElementById('previewImage');
const previewFilename = document.getElementById('previewFilename');
const fileInput = document.getElementById('fileInput');
const btnRemoveFile = document.getElementById('btnRemoveFile');
const additionalNotes = document.getElementById('additionalNotes');
const btnAnalyze = document.getElementById('btnAnalyze');
const loadingState = document.getElementById('loadingState');
const loadingText = document.getElementById('loadingText');
const resultsSection = document.getElementById('resultsSection');
const btnPushJira = document.getElementById('btnPushJira');
const jiraSuccess = document.getElementById('jiraSuccess');
const jiraIssueKey = document.getElementById('jiraIssueKey');
const jiraIssueLink = document.getElementById('jiraIssueLink');
// Settings Modal
const settingsModal = document.getElementById('settingsModal');
const btnOpenSettings = document.getElementById('btnOpenSettings');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const btnCancelSettings = document.getElementById('btnCancelSettings');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const btnTestJira = document.getElementById('btnTestJira');
const btnTestGroq = document.getElementById('btnTestGroq');
const jiraTestResult = document.getElementById('jiraTestResult');
const groqTestResult = document.getElementById('groqTestResult');
// Settings Inputs
const jiraUrlInput = document.getElementById('jiraUrl');
const jiraProjectInput = document.getElementById('jiraProject');
const jiraIssueTypeInput = document.getElementById('jiraIssueType');
const jiraEmailInput = document.getElementById('jiraEmail');
const jiraApiKeyInput = document.getElementById('jiraApiKey');
const groqApiKeyInput = document.getElementById('groqApiKey');
// HMIS 3.0 Custom Field Inputs
const hmisDefectTypeInput = document.getElementById('hmisDefectType');
const hmisPlatformDeviceInput = document.getElementById('hmisPlatformDevice');
const hmisBugRaisedTeamInput = document.getElementById('hmisBugRaisedTeam');
const hmisSourceOfBugInput = document.getElementById('hmisSourceOfBug');
const hmisSeverityInput = document.getElementById('hmisSeverity');
const hmisPriorityInput = document.getElementById('hmisPriority');
const hmisBuildVersionInput = document.getElementById('hmisBuildVersion');
const hmisPhaseInput = document.getElementById('hmisPhase');
const hmisSubPhaseInput = document.getElementById('hmisSubPhase');
const hmisAssigneeInput = document.getElementById('hmisAssignee');
const hmisLinkedIssueInput = document.getElementById('hmisLinkedIssue');
const hmisModuleParentInput = document.getElementById('hmisModuleParent');
const hmisModuleChildInput = document.getElementById('hmisModuleChild');
// Toast
const toast = document.getElementById('toast');
const toastIcon = document.getElementById('toastIcon');
const toastText = document.getElementById('toastText');
// ─── State ───────────────────────────────────────────────────────────────────
let selectedFile = null;
let currentBugReport = null;
// ─── Toast Notification ─────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    toastIcon.textContent = type === 'success' ? '✓' : '✕';
    toastText.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}
// ─── Drag & Drop ─────────────────────────────────────────────────────────────
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
        handleFile(files[0]);
    }
});
dropZone.addEventListener('click', (e) => {
    // Don't trigger if clicking the remove button or preview
    if (e.target.closest('.btn-remove'))
        return;
    fileInput.click();
});
fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
        handleFile(fileInput.files[0]);
    }
});
btnRemoveFile.addEventListener('click', (e) => {
    e.stopPropagation();
    removeFile();
});
function handleFile(file) {
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
        showToast('Please upload a PNG, JPEG, GIF, or WebP image', 'error');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be under 10MB', 'error');
        return;
    }
    selectedFile = file;
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target?.result;
        previewFilename.textContent = file.name;
        dropZoneContent.style.display = 'none';
        previewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
    btnAnalyze.disabled = false;
    // Hide previous results
    resultsSection.style.display = 'none';
    jiraSuccess.style.display = 'none';
}
function removeFile() {
    selectedFile = null;
    fileInput.value = '';
    previewImage.src = '';
    previewFilename.textContent = '';
    previewContainer.style.display = 'none';
    dropZoneContent.style.display = '';
    btnAnalyze.disabled = true;
    resultsSection.style.display = 'none';
    jiraSuccess.style.display = 'none';
}
// ─── Analyze ─────────────────────────────────────────────────────────────────
btnAnalyze.addEventListener('click', async () => {
    if (!selectedFile)
        return;
    // Show loading
    btnAnalyze.style.display = 'none';
    loadingState.style.display = '';
    loadingText.textContent = 'Analyzing screenshot with AI...';
    resultsSection.style.display = 'none';
    jiraSuccess.style.display = 'none';
    const formData = new FormData();
    formData.append('screenshot', selectedFile);
    formData.append('notes', additionalNotes.value);
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Analysis failed');
        }
        currentBugReport = data.bugReport;
        displayResults(data.bugReport);
        showToast('Screenshot analyzed successfully');
    }
    catch (error) {
        showToast(error.message || 'Failed to analyze screenshot', 'error');
    }
    finally {
        btnAnalyze.style.display = '';
        loadingState.style.display = 'none';
    }
});
function displayResults(report) {
    document.getElementById('resultTitle').textContent = report.title || '—';
    document.getElementById('resultDescription').textContent = report.description || '—';
    document.getElementById('resultExpected').textContent = report.expectedBehavior || '—';
    document.getElementById('resultActual').textContent = report.actualBehavior || '—';
    document.getElementById('resultEnvironment').textContent = report.environment || '—';
    document.getElementById('resultAdditional').textContent = report.additionalInfo || '—';
    // Severity badge
    const severityEl = document.getElementById('resultSeverity');
    const severity = (report.severity || 'Major').toLowerCase();
    severityEl.textContent = report.severity || 'Major';
    severityEl.className = `severity-badge ${severity}`;
    // Steps to reproduce
    const stepsEl = document.getElementById('resultSteps');
    stepsEl.innerHTML = '';
    if (report.stepsToReproduce && report.stepsToReproduce.length > 0) {
        report.stepsToReproduce.forEach((step) => {
            const li = document.createElement('li');
            li.textContent = step;
            stepsEl.appendChild(li);
        });
    }
    else {
        const li = document.createElement('li');
        li.textContent = 'No steps provided';
        stepsEl.appendChild(li);
    }
    resultsSection.style.display = '';
    btnPushJira.disabled = false;
}
// ─── Push to Jira ────────────────────────────────────────────────────────────
btnPushJira.addEventListener('click', async () => {
    if (!currentBugReport)
        return;
    btnPushJira.disabled = true;
    btnPushJira.querySelector('span').textContent = 'Pushing...';
    try {
        const response = await fetch('/api/push-to-jira', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bugReport: currentBugReport })
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to create Jira issue');
        }
        jiraIssueKey.textContent = `${data.issueKey} created successfully!`;
        jiraIssueLink.href = data.issueUrl;
        jiraSuccess.style.display = '';
        showToast(`Jira issue ${data.issueKey} created!`);
    }
    catch (error) {
        showToast(error.message || 'Failed to push to Jira', 'error');
        btnPushJira.disabled = false;
    }
    finally {
        btnPushJira.querySelector('span').textContent = 'Push to Jira';
    }
});
// ─── Settings Modal ──────────────────────────────────────────────────────────
btnOpenSettings.addEventListener('click', async () => {
    // Load current settings
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        jiraUrlInput.value = data.jira?.url || '';
        jiraProjectInput.value = data.jira?.project || '';
        jiraIssueTypeInput.value = data.jira?.issueType || 'Bug';
        jiraEmailInput.value = data.jira?.email || '';
        jiraApiKeyInput.value = data.jira?.apiKey || '';
        groqApiKeyInput.value = data.groq?.apiKey || '';
        // HMIS fields
        const hmis = data.jira?.hmisFields || {};
        hmisDefectTypeInput.value = hmis.defectType || '';
        hmisPlatformDeviceInput.value = hmis.platformDevice || '';
        hmisBugRaisedTeamInput.value = hmis.bugRaisedTeam || '';
        hmisSourceOfBugInput.value = hmis.sourceOfBug || '';
        hmisSeverityInput.value = hmis.severity || '';
        hmisPriorityInput.value = hmis.priority || '';
        hmisBuildVersionInput.value = hmis.buildVersion || '';
        hmisPhaseInput.value = hmis.phase || '';
        hmisSubPhaseInput.value = hmis.subPhase || '';
        // Pre-fill selects safely (before data loads)
        if (hmis.assignee)
            hmisAssigneeInput.innerHTML = `<option value="${hmis.assignee}">${hmis.assignee}</option>`;
        if (hmis.linkedIssue)
            hmisLinkedIssueInput.innerHTML = `<option value="${hmis.linkedIssue}">${hmis.linkedIssue}</option>`;
        if (hmis.moduleParent)
            hmisModuleParentInput.innerHTML = `<option value="${hmis.moduleParent}">${hmis.moduleParent}</option>`;
        if (hmis.moduleChild)
            hmisModuleChildInput.innerHTML = `<option value="${hmis.moduleChild}">${hmis.moduleChild}</option>`;
        // Fetch dynamic Jira field data if basic auth details exist
        if (data.jira?.url && data.jira?.apiKey && data.jira?.email) {
            hmisAssigneeInput.innerHTML = '<option value="">-- Loading users... --</option>';
            hmisLinkedIssueInput.innerHTML = '<option value="">-- Loading issues... --</option>';
            hmisModuleParentInput.innerHTML = '<option value="">-- Loading modules... --</option>';
            fetch('/api/dynamic-options').then(r => r.json()).then(dyn => {
                if (dyn.success) {
                    // Populate Assignees
                    hmisAssigneeInput.innerHTML = '<option value="">Unassigned</option>';
                    dyn.assignees.forEach((u) => {
                        const opt = document.createElement('option');
                        opt.value = u.accountId;
                        opt.textContent = u.displayName;
                        hmisAssigneeInput.appendChild(opt);
                    });
                    if (hmis.assignee)
                        hmisAssigneeInput.value = hmis.assignee;
                    // Populate Linked Issues
                    hmisLinkedIssueInput.innerHTML = '<option value="">None</option>';
                    dyn.recentIssues.forEach((i) => {
                        const opt = document.createElement('option');
                        opt.value = i.key;
                        opt.textContent = `${i.key}: ${i.summary}`;
                        hmisLinkedIssueInput.appendChild(opt);
                    });
                    if (hmis.linkedIssue)
                        hmisLinkedIssueInput.value = hmis.linkedIssue;
                    // Populate Modules (Cascading)
                    hmisModuleParentInput.innerHTML = '<option value="">Select a Module</option>';
                    Object.keys(dyn.modules).forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m;
                        opt.textContent = m;
                        hmisModuleParentInput.appendChild(opt);
                    });
                    if (hmis.moduleParent)
                        hmisModuleParentInput.value = hmis.moduleParent;
                    // Handle cascading Sub-Module logic
                    const updateSubModule = () => {
                        hmisModuleChildInput.innerHTML = '<option value="">Select Sub-Module</option>';
                        const p = hmisModuleParentInput.value;
                        if (p && dyn.modules[p]) {
                            dyn.modules[p].forEach((c) => {
                                const opt = document.createElement('option');
                                opt.value = c;
                                opt.textContent = c;
                                hmisModuleChildInput.appendChild(opt);
                            });
                        }
                    };
                    hmisModuleParentInput.addEventListener('change', updateSubModule);
                    updateSubModule(); // Initial population
                    if (hmis.moduleChild)
                        hmisModuleChildInput.value = hmis.moduleChild;
                }
            }).catch(e => console.error("Error fetching Jira dynamic options:", e));
        }
    }
    catch {
        // Use empty fields
    }
    // Clear previous test results
    jiraTestResult.className = 'test-result';
    jiraTestResult.style.display = 'none';
    groqTestResult.className = 'test-result';
    groqTestResult.style.display = 'none';
    settingsModal.style.display = '';
});
function closeSettings() {
    settingsModal.style.display = 'none';
}
btnCloseSettings.addEventListener('click', closeSettings);
btnCancelSettings.addEventListener('click', closeSettings);
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal)
        closeSettings();
});
// Helper to build settings payload
function getSettingsPayload() {
    return {
        jira: {
            url: jiraUrlInput.value.trim().replace(/\/$/, ''),
            project: jiraProjectInput.value.trim().toUpperCase(),
            issueType: jiraIssueTypeInput.value.trim() || 'Bug',
            email: jiraEmailInput.value.trim(),
            apiKey: jiraApiKeyInput.value,
            hmisFields: {
                defectType: hmisDefectTypeInput.value.trim(),
                platformDevice: hmisPlatformDeviceInput.value.trim(),
                bugRaisedTeam: hmisBugRaisedTeamInput.value.trim(),
                sourceOfBug: hmisSourceOfBugInput.value.trim(),
                severity: hmisSeverityInput.value.trim(),
                priority: hmisPriorityInput.value.trim(),
                buildVersion: hmisBuildVersionInput.value.trim(),
                phase: hmisPhaseInput.value.trim(),
                subPhase: hmisSubPhaseInput.value.trim(),
                assignee: hmisAssigneeInput.value.trim(),
                linkedIssue: hmisLinkedIssueInput.value.trim(),
                moduleParent: hmisModuleParentInput.value.trim(),
                moduleChild: hmisModuleChildInput.value.trim()
            }
        },
        groq: {
            apiKey: groqApiKeyInput.value
        }
    };
}
// Save Settings
btnSaveSettings.addEventListener('click', async () => {
    const settings = getSettingsPayload();
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        const data = await response.json();
        if (data.success) {
            showToast('Settings saved successfully');
            closeSettings();
        }
        else {
            showToast('Failed to save settings', 'error');
        }
    }
    catch {
        showToast('Failed to save settings', 'error');
    }
});
// Test Jira Connection
btnTestJira.addEventListener('click', async () => {
    const btnText = btnTestJira.querySelector('.btn-test-text');
    const btnSpinner = btnTestJira.querySelector('.btn-test-spinner');
    btnText.style.display = 'none';
    btnSpinner.style.display = '';
    btnTestJira.disabled = true;
    // Save first so we test the latest values
    const settings = getSettingsPayload();
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        const response = await fetch('/api/test-connection', { method: 'POST' });
        const data = await response.json();
        jiraTestResult.textContent = data.message;
        jiraTestResult.className = `test-result ${data.success ? 'success' : 'error'}`;
        jiraTestResult.style.display = '';
    }
    catch (error) {
        jiraTestResult.textContent = error.message || 'Connection test failed';
        jiraTestResult.className = 'test-result error';
        jiraTestResult.style.display = '';
    }
    finally {
        btnText.style.display = '';
        btnSpinner.style.display = 'none';
        btnTestJira.disabled = false;
    }
});
// Test Groq Connection
btnTestGroq.addEventListener('click', async () => {
    const btnText = btnTestGroq.querySelector('.btn-test-text');
    const btnSpinner = btnTestGroq.querySelector('.btn-test-spinner');
    btnText.style.display = 'none';
    btnSpinner.style.display = '';
    btnTestGroq.disabled = true;
    // Save first
    const settings = getSettingsPayload();
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        const response = await fetch('/api/test-groq', { method: 'POST' });
        const data = await response.json();
        groqTestResult.textContent = data.message;
        groqTestResult.className = `test-result ${data.success ? 'success' : 'error'}`;
        groqTestResult.style.display = '';
    }
    catch (error) {
        groqTestResult.textContent = error.message || 'Connection test failed';
        groqTestResult.className = 'test-result error';
        groqTestResult.style.display = '';
    }
    finally {
        btnText.style.display = '';
        btnSpinner.style.display = 'none';
        btnTestGroq.disabled = false;
    }
});
// ─── Keyboard Shortcuts ──────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal.style.display !== 'none') {
        closeSettings();
    }
});
