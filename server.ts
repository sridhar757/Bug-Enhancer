import express, { Request, Response } from 'express';
import multer from 'multer';
import cors from 'cors';
import axios from 'axios';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Multer config for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PNG, JPEG, GIF, and WebP images are allowed'));
        }
    }
});

// ─── Config Helpers ──────────────────────────────────────────────────────────

interface HmisCustomFields {
    defectType: string;         // customfield_10313
    platformDevice: string;    // customfield_10368
    bugRaisedTeam: string;     // customfield_10326
    sourceOfBug: string;       // customfield_10315
    severity: string;          // customfield_10305
    priority: string;          // customfield_10306
    buildVersion: string;      // customfield_10319
    phase: string;             // customfield_10470
    subPhase: string;          // customfield_10471
    assignee: string;          // assignee accountId
    linkedIssue: string;       // issue key to link
    moduleParent: string;      // customfield_10321 parent
    moduleChild: string;       // customfield_10321 child
}

interface AppConfig {
    jira: {
        url: string;
        project: string;
        apiKey: string;
        email: string;
        issueType: string;
        hmisFields: HmisCustomFields;
    };
    groq: {
        apiKey: string;
    };
}

// ─── API Routes ──────────────────────────────────────────────────────────────

// POST /api/test-connection — test Jira connectivity
app.post('/api/test-connection', async (req: Request, res: Response) => {
    const config = req.body.config;
    if (!config?.jira?.url || !config?.jira?.apiKey || !config?.jira?.email) {
        res.status(400).json({ success: false, message: 'Jira settings are incomplete' });
        return;
    }

    try {
        const response = await axios.get(`${config.jira.url}/rest/api/3/myself`, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${config.jira.email}:${config.jira.apiKey}`).toString('base64')}`,
                'Content-Type': 'application/json'
            }
        });
        res.json({
            success: true,
            message: `Connected as ${response.data.displayName} (${response.data.emailAddress})`
        });
    } catch (error: any) {
        const msg = error.response?.data?.message || error.message || 'Connection failed';
        res.status(400).json({ success: false, message: msg });
    }
});

// POST /api/test-groq — test Groq API connectivity
app.post('/api/test-groq', async (req: Request, res: Response) => {
    const config = req.body.config;
    if (!config?.groq?.apiKey) {
        res.status(400).json({ success: false, message: 'Groq API key is not configured' });
        return;
    }

    try {
        const response = await axios.get('https://api.groq.com/openai/v1/models', {
            headers: {
                'Authorization': `Bearer ${config.groq.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        const models = response.data?.data?.map((m: any) => m.id) || [];
        res.json({
            success: true,
            message: `Groq connected successfully. ${models.length} models available.`
        });
    } catch (error: any) {
        const msg = error.response?.data?.error?.message || error.message || 'Connection failed';
        res.status(400).json({ success: false, message: msg });
    }
});

// POST /api/analyze — upload screenshot & analyze with Groq Vision
app.post('/api/analyze', upload.single('screenshot'), async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ success: false, message: 'No screenshot uploaded' });
        return;
    }

    let config: any = {};
    try {
        if (req.body.config) config = JSON.parse(req.body.config);
    } catch (e) {
        console.error("Failed to parse config from FormData", e);
    }

    if (!config?.groq?.apiKey) {
        res.status(400).json({ success: false, message: 'Groq API key is not configured. Please update Settings.' });
        return;
    }

    const additionalNotes = req.body.notes || '';
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    try {
        const groqResponse = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert QA engineer. Analyze the provided bug screenshot and generate a structured bug report in JSON format. Return ONLY valid JSON with these fields:
{
  "title": "Brief, descriptive bug title",
  "description": "Detailed description of the bug",
  "stepsToReproduce": ["Step 1", "Step 2", ...],
  "expectedBehavior": "What should happen",
  "actualBehavior": "What actually happens",
  "severity": "Critical | Major | Minor | Trivial",
  "environment": "Any detected environment details",
  "additionalInfo": "Any other relevant observations"
}`
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`
                                }
                            },
                            {
                                type: 'text',
                                text: additionalNotes
                                    ? `Analyze this bug screenshot. Additional context from QA: ${additionalNotes}`
                                    : 'Analyze this bug screenshot and generate a structured bug report.'
                            }
                        ]
                    }
                ],
                temperature: 0.3,
                max_tokens: 2048
            },
            {
                headers: {
                    'Authorization': `Bearer ${config.groq.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const content = groqResponse.data.choices?.[0]?.message?.content || '';

        // Try to parse JSON from the response
        let bugReport;
        try {
            // Try direct parse first
            bugReport = JSON.parse(content);
        } catch {
            // Try to extract JSON from markdown code block
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                bugReport = JSON.parse(jsonMatch[1].trim());
            } else {
                // fallback - return raw content
                bugReport = {
                    title: 'Bug Report',
                    description: content,
                    stepsToReproduce: [],
                    expectedBehavior: '',
                    actualBehavior: '',
                    severity: 'Major',
                    environment: '',
                    additionalInfo: ''
                };
            }
        }

        res.json({ success: true, bugReport });
    } catch (error: any) {
        const msg = error.response?.data?.error?.message || error.message || 'Analysis failed';
        console.error('Groq API error:', msg);
        res.status(500).json({ success: false, message: msg });
    }
});

// POST /api/dynamic-options — fetch assignees, recent issues, and cascading module options
app.post('/api/dynamic-options', async (req: Request, res: Response) => {
    const config = req.body.config;
    if (!config?.jira?.url || !config?.jira?.apiKey || !config?.jira?.email || !config?.jira?.project) {
        res.status(400).json({ success: false, message: 'Jira settings incomplete' });
        return;
    }

    const authHeader = `Basic ${Buffer.from(`${config.jira.email}:${config.jira.apiKey}`).toString('base64')}`;
    const headers = { 'Authorization': authHeader, 'Content-Type': 'application/json' };
    const maxRetries = 2; // Simple retry mechanism

    try {
        const fetchWithRetry = async (url: string, method = 'get', data?: any) => {
            for (let i = 0; i < maxRetries; i++) {
                try {
                    if (method === 'post') return await axios.post(url, data, { headers });
                    return await axios.get(url, { headers });
                } catch (e: any) {
                    if (i === maxRetries - 1) throw e;
                }
            }
        };

        // 1. Fetch Assignable Users
        const usersResp = await fetchWithRetry(`${config.jira.url}/rest/api/3/user/assignable/search?project=${config.jira.project}&maxResults=50`);
        const assignees = (usersResp?.data || []).map((u: any) => ({
            accountId: u.accountId,
            displayName: u.displayName,
            avatarUrl: u.avatarUrls?.['24x24']
        }));

        // 2. Fetch Recent Issues (for linking)
        const recentIssuesResp = await fetchWithRetry(`${config.jira.url}/rest/api/3/search/jql`, 'post', {
            jql: `project = ${config.jira.project} ORDER BY updated DESC`,
            maxResults: 50,
            fields: ['summary']
        });
        const recentIssues = (recentIssuesResp?.data?.issues || []).map((i: any) => ({
            key: i.key,
            summary: i.fields?.summary
        }));

        // 3. Fetch HMIS 3.0 Module cascading field values (customfield_10321)
        // Since /rest/api/3/field/customfield_10321/context requires Admin rights, we use createmeta instead
        let modules: Record<string, string[]> = {};
        try {
            const metaResp = await fetchWithRetry(`${config.jira.url}/rest/api/3/issue/createmeta/${config.jira.project}/issuetypes`);
            const issueType = metaResp?.data?.issueTypes?.find(
                (it: any) => it.name.toLowerCase() === (config.jira.issueType || 'Bug').toLowerCase()
            ) || metaResp?.data?.values?.find(
                (it: any) => it.name.toLowerCase() === (config.jira.issueType || 'Bug').toLowerCase()
            );

            if (issueType) {
                const fieldsResp = await fetchWithRetry(`${config.jira.url}/rest/api/3/issue/createmeta/${config.jira.project}/issuetypes/${issueType.id}`);
                const fields = fieldsResp?.data?.fields || fieldsResp?.data?.values || [];
                const targetField = Array.isArray(fields) ? fields.find(f => f.fieldId === 'customfield_10321') : fields['customfield_10321'];

                if (targetField && targetField.allowedValues) {
                    targetField.allowedValues.forEach((opt: any) => {
                        if (opt.value) {
                            modules[opt.value] = (opt.children || []).map((c: any) => c.value);
                        }
                    });
                }
            }
        } catch (moduleErr) {
            console.error("Could not fetch Module options via createmeta:", moduleErr);
        }

        res.json({
            success: true,
            assignees,
            recentIssues,
            modules
        });
    } catch (error: any) {
        console.error('Dynamic options error:', error.response?.status, error.response?.data);
        res.status(500).json({ success: false, message: 'Failed to fetch dynamic options' });
    }
});

// POST /api/push-to-jira — create Jira issue from bug report
app.post('/api/push-to-jira', async (req: Request, res: Response) => {
    const { bugReport, config } = req.body;

    if (!config?.jira?.url || !config?.jira?.apiKey || !config?.jira?.email || !config?.jira?.project) {
        res.status(400).json({ success: false, message: 'Jira settings are incomplete. Please update Settings.' });
        return;
    }

    if (!bugReport) {
        res.status(400).json({ success: false, message: 'No bug report data provided' });
        return;
    }

    // Build Jira description in ADF (Atlassian Document Format)
    const descriptionParts: string[] = [
        `*Description:* ${bugReport.description || ''}`,
        '',
        '*Steps to Reproduce:*',
        ...(bugReport.stepsToReproduce || []).map((s: string, i: number) => `${i + 1}. ${s}`),
        '',
        `*Expected Behavior:* ${bugReport.expectedBehavior || ''}`,
        `*Actual Behavior:* ${bugReport.actualBehavior || ''}`,
        `*Severity:* ${bugReport.severity || ''}`,
        `*Environment:* ${bugReport.environment || ''}`,
    ];

    if (bugReport.additionalInfo) {
        descriptionParts.push('', `*Additional Info:* ${bugReport.additionalInfo}`);
    }

    // Build custom fields from HMIS settings + AI analysis
    const hmis = config.jira.hmisFields || {} as HmisCustomFields;
    const customFields: Record<string, any> = {};

    // Helper to safely title-case strings to match Jira options
    const safeTitle = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
    const safeValue = (str: string) => str ? { value: str } : undefined;

    // customfield_10313 - Defect Type
    let dt = hmis.defectType?.trim();
    if (dt && dt.toLowerCase() === 'non functional') dt = 'Non Functional';
    else if (dt && dt.toLowerCase() === 'ui') dt = 'UI';
    else dt = 'Functional'; // Ultimate fallback guarantees valid value

    customFields['customfield_10313'] = { value: dt };

    // customfield_10368 - Platform & Device Type
    let platform = hmis.platformDevice;
    if (platform && platform.toLowerCase() === 'web') platform = 'Web';
    if (platform) customFields['customfield_10368'] = { value: platform };

    // customfield_10326 - Bug Raised Team
    let team = hmis.bugRaisedTeam;
    if (team && team.toLowerCase() === 'manual') team = 'Manual';
    if (team) customFields['customfield_10326'] = { value: team };

    // customfield_10315 - Source of Bug
    let source = hmis.sourceOfBug;
    if (source && source.toLowerCase() === 'internal') source = 'Internal';
    if (source) customFields['customfield_10315'] = { value: source };

    // customfield_10305 - Severity
    if (hmis.severity) customFields['customfield_10305'] = { value: safeTitle(hmis.severity) };

    // customfield_10306 - Priority
    if (hmis.priority) customFields['customfield_10306'] = { value: safeTitle(hmis.priority) };

    // customfield_10319 - Build Version
    if (hmis.buildVersion) customFields['customfield_10319'] = { value: hmis.buildVersion };

    // customfield_10470 - Phase
    let phase = hmis.phase;
    if (phase && phase.toLowerCase() === 'qa') phase = 'QA';
    if (phase) customFields['customfield_10470'] = { value: phase };

    // customfield_10471 - Sub-Phase
    let subPhase = hmis.subPhase;
    if (subPhase && subPhase.toLowerCase() === 'testing') subPhase = 'Testing';
    if (subPhase) customFields['customfield_10471'] = { value: subPhase };

    // customfield_10321 - HMIS 3.0 Module (Cascading)
    if (hmis.moduleParent) {
        customFields['customfield_10321'] = { value: hmis.moduleParent };
        if (hmis.moduleChild) {
            customFields['customfield_10321'].child = { value: hmis.moduleChild };
        }
    }

    // Build the request payload
    const issuePayload: any = {
        fields: {
            project: { key: config.jira.project },
            summary: bugReport.title || 'Bug Report',
            description: {
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: descriptionParts.join('\n')
                            }
                        ]
                    }
                ]
            },
            issuetype: { name: config.jira.issueType || 'Bug' },
            ...customFields
        }
    };

    // Add Assignee if present
    if (hmis.assignee) {
        issuePayload.fields.assignee = { accountId: hmis.assignee };
    }

    // Add Link Issue if present (updates array structure)
    if (hmis.linkedIssue) {
        issuePayload.update = {
            issuelinks: [
                {
                    add: {
                        type: { name: "Relates" }, // Generic, widely-supported relation
                        inwardIssue: { key: hmis.linkedIssue }
                    }
                }
            ]
        };
    }

    try {
        const response = await axios.post(
            `${config.jira.url}/rest/api/3/issue`,
            issuePayload,
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${config.jira.email}:${config.jira.apiKey}`).toString('base64')}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const issueKey = response.data.key;
        const issueUrl = `${config.jira.url}/browse/${issueKey}`;

        res.json({
            success: true,
            issueKey,
            issueUrl,
            message: `Issue ${issueKey} created successfully`
        });
    } catch (error: any) {
        let msg = 'Failed to create Jira issue';
        if (error.response?.data?.errors && Object.keys(error.response.data.errors).length > 0) {
            // Join all error values into a readable string instead of JSON
            msg = Object.values(error.response.data.errors).join(' | ');
        } else if (error.response?.data?.errorMessages?.length > 0) {
            msg = error.response.data.errorMessages.join(' | ');
        } else if (error.message) {
            msg = error.message;
        }

        console.error('Jira API error:', msg);
        res.status(500).json({ success: false, message: msg });
    }
});

// Start server for local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🐛 Bug Report Enhancer running at http://localhost:${PORT}`);
    });
}

// Export the Express API for Vercel serverless
export default app;
