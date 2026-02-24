const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CONFIG_PATH = path.join(__dirname, 'config.json');

async function debug() {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.log("No config.json found");
        return;
    }
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const authHeader = `Basic ${Buffer.from(`${config.jira.email}:${config.jira.apiKey}`).toString('base64')}`;
    const headers = { 'Authorization': authHeader, 'Content-Type': 'application/json' };

    console.log(`Fetching metadata for project ${config.jira.project}, issuetype ${config.jira.issueType}...`);

    try {
        const metaUrl = `${config.jira.url.replace(/\/$/, '')}/rest/api/3/issue/createmeta/${config.jira.project}/issuetypes`;
        const metaResponse = await axios.get(metaUrl, { headers });

        const issueType = metaResponse.data?.issueTypes?.find(
            it => it.name.toLowerCase() === (config.jira.issueType || 'Bug').toLowerCase()
        ) || metaResponse.data?.values?.find(
            it => it.name.toLowerCase() === (config.jira.issueType || 'Bug').toLowerCase()
        );

        if (!issueType) {
            console.log("Issue type not found!");
            return;
        }

        const fieldsUrl = `${config.jira.url.replace(/\/$/, '')}/rest/api/3/issue/createmeta/${config.jira.project}/issuetypes/${issueType.id}`;
        const fieldsResponse = await axios.get(fieldsUrl, { headers });

        const fields = fieldsResponse.data?.fields || fieldsResponse.data?.values || [];
        const targetFields = ['customfield_10313', 'customfield_10319'];

        for (const fieldId of targetFields) {
            const field = Array.isArray(fields) ? fields.find(f => f.fieldId === fieldId) : fields[fieldId];
            if (field) {
                console.log(`\n=== FIELD: ${fieldId} (${field.name}) ===`);
                console.log(`Schema type: ${field.schema?.type}, custom: ${field.schema?.custom}`);
                if (field.allowedValues) {
                    console.log(`Allowed values:`);
                    field.allowedValues.forEach(v => {
                        console.log(`  - name: "${v.name || v.value}", id: "${v.id}"`);
                    });
                } else {
                    console.log(`No allowed values returned by createmeta.`);
                }
            } else {
                console.log(`\nField ${fieldId} not found in createmeta.`);
            }
        }
    } catch (err) {
        console.error("API error:", err.response?.data || err.message);
    }
}

debug();
