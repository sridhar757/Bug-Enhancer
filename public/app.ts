// ─── Bug Report Enhancer — Frontend App ─────────────────────────────────────

interface BugReport {
    title: string;
    description: string;
    stepsToReproduce: string[];
    expectedBehavior: string;
    actualBehavior: string;
    severity: string;
    environment: string;
    additionalInfo: string;
}

// ─── DOM Elements ────────────────────────────────────────────────────────────

const dropZone = document.getElementById('dropZone') as HTMLDivElement;
const dropZoneContent = document.getElementById('dropZoneContent') as HTMLDivElement;
const previewContainer = document.getElementById('previewContainer') as HTMLDivElement;
const previewImage = document.getElementById('previewImage') as HTMLImageElement;
const previewFilename = document.getElementById('previewFilename') as HTMLDivElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const btnRemoveFile = document.getElementById('btnRemoveFile') as HTMLButtonElement;
const additionalNotes = document.getElementById('additionalNotes') as HTMLTextAreaElement;
const btnAnalyze = document.getElementById('btnAnalyze') as HTMLButtonElement;
const loadingState = document.getElementById('loadingState') as HTMLDivElement;
const loadingText = document.getElementById('loadingText') as HTMLParagraphElement;
const resultsSection = document.getElementById('resultsSection') as HTMLDivElement;
const btnPushJira = document.getElementById('btnPushJira') as HTMLButtonElement;
const jiraSuccess = document.getElementById('jiraSuccess') as HTMLDivElement;
const jiraIssueKey = document.getElementById('jiraIssueKey') as HTMLElement;
const jiraIssueLink = document.getElementById('jiraIssueLink') as HTMLAnchorElement;

// Settings Modal
const settingsModal = document.getElementById('settingsModal') as HTMLDivElement;
const btnOpenSettings = document.getElementById('btnOpenSettings') as HTMLButtonElement;
const btnCloseSettings = document.getElementById('btnCloseSettings') as HTMLButtonElement;
const btnCancelSettings = document.getElementById('btnCancelSettings') as HTMLButtonElement;
const btnSaveSettings = document.getElementById('btnSaveSettings') as HTMLButtonElement;
const btnTestJira = document.getElementById('btnTestJira') as HTMLButtonElement;
const btnTestGroq = document.getElementById('btnTestGroq') as HTMLButtonElement;
const jiraTestResult = document.getElementById('jiraTestResult') as HTMLDivElement;
const groqTestResult = document.getElementById('groqTestResult') as HTMLDivElement;

// Settings Inputs
const jiraUrlInput = document.getElementById('jiraUrl') as HTMLInputElement;
const jiraProjectInput = document.getElementById('jiraProject') as HTMLInputElement;
const jiraIssueTypeInput = document.getElementById('jiraIssueType') as HTMLInputElement;
const jiraEmailInput = document.getElementById('jiraEmail') as HTMLInputElement;
const jiraApiKeyInput = document.getElementById('jiraApiKey') as HTMLInputElement;
const groqApiKeyInput = document.getElementById('groqApiKey') as HTMLInputElement;

// HMIS 3.0 Custom Field Inputs
const hmisDefectTypeInput = document.getElementById('hmisDefectType') as HTMLInputElement;
const hmisPlatformDeviceInput = document.getElementById('hmisPlatformDevice') as HTMLInputElement;
const hmisBugRaisedTeamInput = document.getElementById('hmisBugRaisedTeam') as HTMLInputElement;
const hmisSourceOfBugInput = document.getElementById('hmisSourceOfBug') as HTMLInputElement;
const hmisSeverityInput = document.getElementById('hmisSeverity') as HTMLInputElement;
const hmisPriorityInput = document.getElementById('hmisPriority') as HTMLInputElement;
const hmisBuildVersionInput = document.getElementById('hmisBuildVersion') as HTMLInputElement;
const hmisPhaseInput = document.getElementById('hmisPhase') as HTMLInputElement;
const hmisSubPhaseInput = document.getElementById('hmisSubPhase') as HTMLInputElement;
const hmisAssigneeInput = document.getElementById('hmisAssignee') as HTMLSelectElement;
const hmisLinkedIssueInput = document.getElementById('hmisLinkedIssue') as HTMLSelectElement;
const hmisModuleParentInput = document.getElementById('hmisModuleParent') as HTMLSelectElement;
const hmisModuleChildInput = document.getElementById('hmisModuleChild') as HTMLSelectElement;

// Toast
const toast = document.getElementById('toast') as HTMLDivElement;
const toastIcon = document.getElementById('toastIcon') as HTMLSpanElement;
const toastText = document.getElementById('toastText') as HTMLSpanElement;

// ─── State ───────────────────────────────────────────────────────────────────

let selectedFile: File | null = null;
let currentBugReport: BugReport | null = null;

// ─── Toast Notification ─────────────────────────────────────────────────────

function showToast(message: string, type: 'success' | 'error' = 'success'): void {
    toastIcon.textContent = type === 'success' ? '✓' : '✕';
    toastText.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ─── Drag & Drop ─────────────────────────────────────────────────────────────

dropZone.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
        handleFile(files[0]);
    }
});

dropZone.addEventListener('click', (e: MouseEvent) => {
    // Don't trigger if clicking the remove button or preview
    if ((e.target as HTMLElement).closest('.btn-remove')) return;
    fileInput.click();
});

fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
        handleFile(fileInput.files[0]);
    }
});

btnRemoveFile.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    removeFile();
});

function handleFile(file: File): void {
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
        previewImage.src = e.target?.result as string;
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

function removeFile(): void {
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
    if (!selectedFile) return;

    // Show loading
    btnAnalyze.style.display = 'none';
    loadingState.style.display = '';
    loadingText.textContent = 'Analyzing screenshot with AI...';
    resultsSection.style.display = 'none';
    jiraSuccess.style.display = 'none';

    const formData = new FormData();
    formData.append('screenshot', selectedFile);
    formData.append('notes', additionalNotes.value);
    formData.append('config', JSON.stringify(getSavedConfig())); // Send config to Vercel backend

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

    } catch (error: any) {
        showToast(error.message || 'Failed to analyze screenshot', 'error');
    } finally {
        btnAnalyze.style.display = '';
        loadingState.style.display = 'none';
    }
});

function displayResults(report: BugReport): void {
    (document.getElementById('resultTitle') as HTMLDivElement).textContent = report.title || '—';
    (document.getElementById('resultDescription') as HTMLDivElement).textContent = report.description || '—';
    (document.getElementById('resultExpected') as HTMLDivElement).textContent = report.expectedBehavior || '—';
    (document.getElementById('resultActual') as HTMLDivElement).textContent = report.actualBehavior || '—';
    (document.getElementById('resultEnvironment') as HTMLDivElement).textContent = report.environment || '—';
    (document.getElementById('resultAdditional') as HTMLDivElement).textContent = report.additionalInfo || '—';

    // Severity badge
    const severityEl = document.getElementById('resultSeverity') as HTMLSpanElement;
    const severity = (report.severity || 'Major').toLowerCase();
    severityEl.textContent = report.severity || 'Major';
    severityEl.className = `severity-badge ${severity}`;

    // Steps to reproduce
    const stepsEl = document.getElementById('resultSteps') as HTMLOListElement;
    stepsEl.innerHTML = '';
    if (report.stepsToReproduce && report.stepsToReproduce.length > 0) {
        report.stepsToReproduce.forEach((step: string) => {
            const li = document.createElement('li');
            li.textContent = step;
            stepsEl.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'No steps provided';
        stepsEl.appendChild(li);
    }

    resultsSection.style.display = '';
    btnPushJira.disabled = false;
}

// ─── Push to Jira ────────────────────────────────────────────────────────────

btnPushJira.addEventListener('click', async () => {
    if (!currentBugReport) return;

    btnPushJira.disabled = true;
    btnPushJira.querySelector('span')!.textContent = 'Pushing...';

    try {
        const payload = {
            bugReport: currentBugReport,
            config: getSavedConfig() // Send config to Vercel backend
        };
        const response = await fetch('/api/push-to-jira', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to create Jira issue');
        }

        jiraIssueKey.textContent = `${data.issueKey} created successfully!`;
        jiraIssueLink.href = data.issueUrl;
        jiraSuccess.style.display = '';
        showToast(`Jira issue ${data.issueKey} created!`);

    } catch (error: any) {
        showToast(error.message || 'Failed to push to Jira', 'error');
        btnPushJira.disabled = false;
    } finally {
        btnPushJira.querySelector('span')!.textContent = 'Push to Jira';
    }
});

// Helper to get saved config from localStorage
function getSavedConfig() {
    try {
        const saved = localStorage.getItem('bugEnhancerConfig');
        if (saved) return JSON.parse(saved);
    } catch (e) { console.error("Could not parse config", e); }
    return {};
}

btnOpenSettings.addEventListener('click', async () => {
    // Load current settings from localStorage
    try {
        const data = getSavedConfig();
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
        if (hmis.assignee) hmisAssigneeInput.innerHTML = `<option value="${hmis.assignee}">${hmis.assignee}</option>`;
        if (hmis.linkedIssue) hmisLinkedIssueInput.innerHTML = `<option value="${hmis.linkedIssue}">${hmis.linkedIssue}</option>`;
        if (hmis.moduleParent) hmisModuleParentInput.innerHTML = `<option value="${hmis.moduleParent}">${hmis.moduleParent}</option>`;
        if (hmis.moduleChild) hmisModuleChildInput.innerHTML = `<option value="${hmis.moduleChild}">${hmis.moduleChild}</option>`;

        // Fetch dynamic Jira field data if basic auth details exist
        if (data.jira?.url && data.jira?.apiKey && data.jira?.email) {
            hmisAssigneeInput.innerHTML = '<option value="">-- Loading users... --</option>';
            hmisLinkedIssueInput.innerHTML = '<option value="">-- Loading issues... --</option>';
            hmisModuleParentInput.innerHTML = '<option value="">-- Loading modules... --</option>';

            fetch('/api/dynamic-options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: data })
            }).then(r => r.json()).then(dyn => {
                if (dyn.success) {
                    // Populate Assignees
                    hmisAssigneeInput.innerHTML = '<option value="">Unassigned</option>';
                    dyn.assignees.forEach((u: any) => {
                        const opt = document.createElement('option');
                        opt.value = u.accountId;
                        opt.textContent = u.displayName;
                        hmisAssigneeInput.appendChild(opt);
                    });
                    if (hmis.assignee) hmisAssigneeInput.value = hmis.assignee;

                    // Populate Linked Issues
                    hmisLinkedIssueInput.innerHTML = '<option value="">None</option>';
                    dyn.recentIssues.forEach((i: any) => {
                        const opt = document.createElement('option');
                        opt.value = i.key;
                        opt.textContent = `${i.key}: ${i.summary}`;
                        hmisLinkedIssueInput.appendChild(opt);
                    });
                    if (hmis.linkedIssue) hmisLinkedIssueInput.value = hmis.linkedIssue;

                    // Populate Modules (Cascading)
                    hmisModuleParentInput.innerHTML = '<option value="">Select a Module</option>';
                    Object.keys(dyn.modules).forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m;
                        opt.textContent = m;
                        hmisModuleParentInput.appendChild(opt);
                    });
                    if (hmis.moduleParent) hmisModuleParentInput.value = hmis.moduleParent;

                    // Handle cascading Sub-Module logic
                    const updateSubModule = () => {
                        hmisModuleChildInput.innerHTML = '<option value="">Select Sub-Module</option>';
                        const p = hmisModuleParentInput.value;
                        if (p && dyn.modules[p]) {
                            dyn.modules[p].forEach((c: string) => {
                                const opt = document.createElement('option');
                                opt.value = c;
                                opt.textContent = c;
                                hmisModuleChildInput.appendChild(opt);
                            });
                        }
                    };

                    hmisModuleParentInput.addEventListener('change', updateSubModule);
                    updateSubModule(); // Initial population

                    if (hmis.moduleChild) hmisModuleChildInput.value = hmis.moduleChild;
                }
            }).catch(e => console.error("Error fetching Jira dynamic options:", e));
        }

    } catch {
        // Use empty fields
    }

    // Clear previous test results
    jiraTestResult.className = 'test-result';
    jiraTestResult.style.display = 'none';
    groqTestResult.className = 'test-result';
    groqTestResult.style.display = 'none';

    settingsModal.style.display = '';
});

function closeSettings(): void {
    settingsModal.style.display = 'none';
}

btnCloseSettings.addEventListener('click', closeSettings);
btnCancelSettings.addEventListener('click', closeSettings);

settingsModal.addEventListener('click', (e: MouseEvent) => {
    if (e.target === settingsModal) closeSettings();
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
btnSaveSettings.addEventListener('click', () => {
    const settings = getSettingsPayload();
    try {
        localStorage.setItem('bugEnhancerConfig', JSON.stringify(settings));
        showToast('Settings saved successfully');
        closeSettings();
    } catch {
        showToast('Failed to save settings', 'error');
    }
});

// Test Jira Connection
btnTestJira.addEventListener('click', async () => {
    const btnText = btnTestJira.querySelector('.btn-test-text') as HTMLSpanElement;
    const btnSpinner = btnTestJira.querySelector('.btn-test-spinner') as HTMLSpanElement;
    btnText.style.display = 'none';
    btnSpinner.style.display = '';
    btnTestJira.disabled = true;

    // Save first to localStorage so we test the latest values
    const settings = getSettingsPayload();
    localStorage.setItem('bugEnhancerConfig', JSON.stringify(settings));

    try {
        const response = await fetch('/api/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: settings })
        });
        const data = await response.json();

        jiraTestResult.textContent = data.message;
        jiraTestResult.className = `test-result ${data.success ? 'success' : 'error'}`;
        jiraTestResult.style.display = '';
    } catch (error: any) {
        jiraTestResult.textContent = error.message || 'Connection test failed';
        jiraTestResult.className = 'test-result error';
        jiraTestResult.style.display = '';
    } finally {
        btnText.style.display = '';
        btnSpinner.style.display = 'none';
        btnTestJira.disabled = false;
    }
});

// Test Groq Connection
btnTestGroq.addEventListener('click', async () => {
    const btnText = btnTestGroq.querySelector('.btn-test-text') as HTMLSpanElement;
    const btnSpinner = btnTestGroq.querySelector('.btn-test-spinner') as HTMLSpanElement;
    btnText.style.display = 'none';
    btnSpinner.style.display = '';
    btnTestGroq.disabled = true;

    // Save first to localStorage
    const settings = getSettingsPayload();
    localStorage.setItem('bugEnhancerConfig', JSON.stringify(settings));

    try {
        const response = await fetch('/api/test-groq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: settings })
        });
        const data = await response.json();

        groqTestResult.textContent = data.message;
        groqTestResult.className = `test-result ${data.success ? 'success' : 'error'}`;
        groqTestResult.style.display = '';
    } catch (error: any) {
        groqTestResult.textContent = error.message || 'Connection test failed';
        groqTestResult.className = 'test-result error';
        groqTestResult.style.display = '';
    } finally {
        btnText.style.display = '';
        btnSpinner.style.display = 'none';
        btnTestGroq.disabled = false;
    }
});

// ─── Keyboard Shortcuts ──────────────────────────────────────────────────────

document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && settingsModal.style.display !== 'none') {
        closeSettings();
    }
});
