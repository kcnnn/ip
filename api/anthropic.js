module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: { message: 'Method not allowed' } });
    }

    const { apiKey, workspaceId, payload } = req.body || {};
    if (!apiKey || !payload || typeof payload !== 'object') {
        return res.status(400).json({ error: { message: 'Missing API configuration or request payload' } });
    }

    try {
        const upstream = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                ...(workspaceId ? { 'anthropic-workspace-id': workspaceId } : {}),
                'content-type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const responseBody = await upstream.json();
        return res.status(upstream.status).json(responseBody);
    } catch (error) {
        return res.status(502).json({ error: { message: 'Unable to reach the AI analysis service' } });
    }
};
