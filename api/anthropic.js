module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: { message: 'Method not allowed' } });
    }

    const { payload } = req.body || {};
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
    if (!apiKey) {
        return res.status(503).json({ error: { message: 'AI analysis is not configured on this deployment' } });
    }
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.messages)) {
        return res.status(400).json({ error: { message: 'Invalid AI analysis request' } });
    }

    const safePayload = {
        model: process.env.ANTHROPIC_MODEL || payload.model,
        max_tokens: Math.min(Math.max(Number(payload.max_tokens) || 1024, 1), 2000),
        ...(typeof payload.temperature === 'number' ? { temperature: Math.min(Math.max(payload.temperature, 0), 1) } : {}),
        messages: payload.messages
    };

    try {
        const upstream = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                ...(workspaceId ? { 'anthropic-workspace-id': workspaceId } : {}),
                'content-type': 'application/json'
            },
            body: JSON.stringify(safePayload)
        });
        const responseBody = await upstream.json();
        return res.status(upstream.status).json(responseBody);
    } catch (error) {
        return res.status(502).json({ error: { message: 'Unable to reach the AI analysis service' } });
    }
};
