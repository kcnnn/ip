// Authenticated server-to-server bridge. No caller-selected URL, goal or tools.
const {timingSafeEqual} = require('node:crypto');
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && b.length >= 32 && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
function validate(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).sort().join(',') !== 'confirmed,manufacturer,model' || body.confirmed !== true) throw new Error('Confirm the manufacturer and model first.');
    const result = {confirmed:true};
    for (const key of ['manufacturer','model']) {
        if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > 150 || /[\x00-\x1f\x7f]/.test(body[key])) throw new Error('Enter a manufacturer and exact model.');
        result[key] = body[key].trim();
    }
    return result;
}
function workerURL() {
    const url = new URL(process.env.JEV_WORKER_URL);
    const local = process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['127.0.0.1','localhost'].includes(url.hostname);
    if ((!local && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash || url.pathname !== '/v1/equipment') throw new Error('Invalid worker URL');
    return url.href;
}
function validateResult(data, request) {
    if (data?.provider !== 'Jev Ultrafast' || data.manufacturer !== request.manufacturer || data.model !== request.model || !Number.isFinite(Date.parse(data.retrievedAt)) || !Array.isArray(data.findings) || !data.findings.length || data.findings.length > 6) throw new Error('Invalid findings');
    const findings = data.findings.map(f => {
        if (typeof f.text !== 'string' || f.text.length > 1200 || !f.text.includes(request.model) || typeof f.evidence !== 'string' || !f.evidence.trim() || f.evidence.length > 400 || !f.text.includes(f.evidence) || !Array.isArray(f.sources) || f.sources.length !== 1) throw new Error('Invalid evidence');
        const source = f.sources[0], url = new URL(source.url);
        if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2048 || typeof source.title !== 'string' || source.title.length > 250) throw new Error('Invalid source');
        return {text:f.text,evidence:f.evidence,sources:[{url:url.href,title:source.title}]};
    });
    return {provider:data.provider,manufacturer:data.manufacturer,model:data.model,retrievedAt:data.retrievedAt,findings};
}
module.exports = async function handler(req,res) {
    res.setHeader('Cache-Control','no-store');
    if (req.method !== 'POST') {res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST.'});}
    const access = process.env.APEX_JEV_ACCESS_TOKEN, service = process.env.JEV_WORKER_TOKEN;
    let url;
    try {url=workerURL();if (!access || access.length<32 || !service || service.length<32 || access===service) throw new Error();}
    catch {return res.status(503).json({error:'Jev browser research is not configured. Claude research remains available.'});}
    if (!equal(req.headers['x-apex-jev-access'],access)) return res.status(401).json({error:'Enter your APEX access code, not a provider API key.'});
    if (!(req.headers['content-type'] || '').startsWith('application/json')) return res.status(415).json({error:'Send JSON.'});
    let request;
    try {request=validate(req.body);} catch(error) {return res.status(400).json({error:error.message});}
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),125000);
    try {
        const response=await fetch(url,{method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${service}`},body:JSON.stringify(request)});
        if (!response.ok) {
            const status=[422,429].includes(response.status)?response.status:502;
            return res.status(status).json({error:status===429?'Browser worker busy. Wait and retry.':status===422?'Manufacturer is not configured for browser research. Use Claude research.':'Browser worker unavailable. Your inspection is unchanged.'});
        }
        // Bound the upstream stream, not just Content-Length (which may be absent).
        let size=0;const chunks=[];
        for await (const chunk of response.body) {size+=chunk.length;if(size>20000){controller.abort();throw new Error();}chunks.push(Buffer.from(chunk));}
        const data=validateResult(JSON.parse(Buffer.concat(chunks).toString()),request);
        return res.status(200).json(data);
    } catch {return res.status(502).json({error:'No verifiable browser findings returned in time. Your inspection is unchanged; use Claude research or retry.'});}
    finally {clearTimeout(timer);}
};
module.exports.validate=validate;
module.exports.validateResult=validateResult;
