const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'player-profiles.json');
const MAX_BODY_SIZE = 2 * 1024 * 1024;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-3.1-flash-lite';
const CHAT_MAX_MESSAGES = 20;
const CHAT_MAX_MESSAGE_LENGTH = 4000;
const CHAT_MAX_TOTAL_LENGTH = 30000;
const CHAT_TIMEOUT_MS = 60_000;
const CHAT_RATE_LIMIT = 20;
const CHAT_RATE_WINDOW_MS = 10 * 60 * 1000;
const chatRateLimits = new Map();

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

let writeQueue = Promise.resolve();

async function readProfiles() {
    try {
        return JSON.parse(await fs.readFile(PROFILES_FILE, 'utf8'));
    } catch (error) {
        if (error.code === 'ENOENT') return {};
        throw error;
    }
}

function saveProfile(playerId, profile) {
    writeQueue = writeQueue.then(async () => {
        const profiles = await readProfiles();
        const existing = profiles[playerId];
        const savedProfile = {
            ...profile,
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        profiles[playerId] = savedProfile;
        await fs.mkdir(DATA_DIR, { recursive: true });
        const temporaryFile = `${PROFILES_FILE}.tmp`;
        await fs.writeFile(temporaryFile, JSON.stringify(profiles, null, 2));
        await fs.rename(temporaryFile, PROFILES_FILE);
        return { profile: savedProfile, existed: Boolean(existing) };
    });
    return writeQueue;
}

function sendJson(response, status, payload) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(payload));
}

async function readJson(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_BODY_SIZE) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
        chunks.push(chunk);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        throw Object.assign(new Error('Invalid JSON body.'), { status: 400 });
    }
}

function checkChatRateLimit(request) {
    const clientId = request.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const recentRequests = (chatRateLimits.get(clientId) || []).filter(timestamp => now - timestamp < CHAT_RATE_WINDOW_MS);
    if (recentRequests.length >= CHAT_RATE_LIMIT) {
        chatRateLimits.set(clientId, recentRequests);
        return false;
    }
    recentRequests.push(now);
    chatRateLimits.set(clientId, recentRequests);
    return true;
}

function validateChatMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > CHAT_MAX_MESSAGES) {
        throw Object.assign(new Error(`Chat must contain between 1 and ${CHAT_MAX_MESSAGES} messages.`), { status: 400 });
    }

    let totalLength = 0;
    const validated = messages.map(message => {
        const role = message && (message.role === 'user' || message.role === 'assistant') ? message.role : '';
        const content = message && typeof message.content === 'string' ? message.content.trim() : '';
        if (!role || !content || content.length > CHAT_MAX_MESSAGE_LENGTH) {
            throw Object.assign(new Error(`Each chat message needs a valid role and 1-${CHAT_MAX_MESSAGE_LENGTH} characters.`), { status: 400 });
        }
        totalLength += content.length;
        return { role, content };
    });

    if (totalLength > CHAT_MAX_TOTAL_LENGTH) {
        throw Object.assign(new Error('Chat history is too long. Clear the chat and try again.'), { status: 400 });
    }
    if (validated[validated.length - 1].role !== 'user') {
        throw Object.assign(new Error('The final chat message must be from the user.'), { status: 400 });
    }
    return validated;
}

async function createChatReply(request) {
    const body = await readJson(request);
    const messages = validateChatMessages(body?.messages);
    if (!process.env.OPENROUTER_API_KEY) {
        throw Object.assign(new Error('Chatbot is not configured. Set OPENROUTER_API_KEY on the server.'), { status: 503 });
    }
    if (!checkChatRateLimit(request)) {
        throw Object.assign(new Error('Too many chat requests. Please try again in a few minutes.'), { status: 429 });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

    try {
        const headers = {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'X-OpenRouter-Title': 'Geometry Dash Tracker'
        };
        if (process.env.OPENROUTER_SITE_URL) headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL;

        const upstream = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                    { role: 'system', content: 'Your name is The GD Chatbot. You are a helpful general-purpose assistant. Give clear, accurate, concise answers and say when you are uncertain.' },
                    ...messages
                ]
            }),
            signal: controller.signal
        });
        const result = await upstream.json().catch(() => null);

        if (!upstream.ok) {
            const status = upstream.status === 429 ? 429 : upstream.status === 401 || upstream.status === 403 ? 503 : 502;
            const message = upstream.status === 429
                ? 'OpenRouter is rate-limited. Please try again shortly.'
                : upstream.status === 401 || upstream.status === 403
                    ? 'OpenRouter authentication failed. Check the server API key.'
                    : 'OpenRouter could not complete the request. Please try again.';
            throw Object.assign(new Error(message), { status });
        }

        const reply = result?.choices?.[0]?.message?.content;
        if (typeof reply !== 'string' || !reply.trim()) {
            throw Object.assign(new Error('OpenRouter returned an empty response. Please try again.'), { status: 502 });
        }
        return reply.trim();
    } catch (error) {
        if (error.name === 'AbortError') {
            throw Object.assign(new Error('The chatbot took too long to respond. Please try again.'), { status: 504 });
        }
        if (error.status) throw error;
        throw Object.assign(new Error('Could not connect to OpenRouter. Please try again.'), { status: 502 });
    } finally {
        clearTimeout(timeout);
    }
}

async function handleApi(request, response, pathname) {
    if (request.method === 'POST' && pathname === '/api/chat') {
        const reply = await createChatReply(request);
        return sendJson(response, 200, { reply });
    }

    if (request.method === 'GET' && pathname.startsWith('/api/profiles/')) {
        const playerId = decodeURIComponent(pathname.slice('/api/profiles/'.length));
        const profile = (await readProfiles())[playerId];
        return profile
            ? sendJson(response, 200, profile)
            : sendJson(response, 404, { error: 'Player profile not found.' });
    }

    if (request.method === 'PUT' && pathname === '/api/profiles') {
        const body = await readJson(request);
        const playerId = typeof body.playerId === 'string' ? body.playerId.trim() : '';
        const username = typeof body.username === 'string' ? body.username.trim().slice(0, 30) : '';
        const pfpImage = typeof body.pfpImage === 'string' ? body.pfpImage : '';

        if (!/^[a-zA-Z0-9-]{16,80}$/.test(playerId) || !username) {
            return sendJson(response, 400, { error: 'A valid player ID and username are required.' });
        }
        if (pfpImage && !/^data:image\/(png|jpeg|webp|gif);base64,/i.test(pfpImage)) {
            return sendJson(response, 400, { error: 'Invalid profile picture.' });
        }

        const saved = await saveProfile(playerId, {
            playerId,
            username,
            pfpImage
        });
        return sendJson(response, saved.existed ? 200 : 201, saved.profile);
    }

    sendJson(response, 404, { error: 'API route not found.' });
}

async function serveStatic(response, pathname) {
    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.resolve(ROOT, `.${requestedPath}`);
    if (!filePath.startsWith(`${ROOT}${path.sep}`) || filePath.startsWith(`${DATA_DIR}${path.sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
    }
    try {
        const content = await fs.readFile(filePath);
        response.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
        response.end(content);
    } catch (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
    }
}

const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;
    try {
        if (pathname.startsWith('/api/')) await handleApi(request, response, pathname);
        else await serveStatic(response, pathname);
    } catch (error) {
        console.error(error);
        sendJson(response, error.status || 500, { error: error.status ? error.message : 'Server error.' });
    }
});

server.listen(PORT, HOST, () => {
    console.log(`Geometry Dash Tracker is live at http://localhost:${PORT}`);
});
