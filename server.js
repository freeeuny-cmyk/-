const express = require('express');
const path = require('path');
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;
const DIRECTORY = path.join(__dirname, 'public');

function getSavedApiKey() {
    if (process.env.OPENAI_API_KEY) {
        return process.env.OPENAI_API_KEY.trim();
    }
    const possibleFiles = ['.env', 'key.txt', 'api_key.txt', 'secret.txt', 'openai_key.txt'];
    for (const fname of possibleFiles) {
        const fullPath = path.join(__dirname, fname);
        if (fs.existsSync(fullPath)) {
            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const lines = content.split('\n');
                for (let line of lines) {
                    let s = line.trim();
                    if (!s || s.startsWith('#')) continue;
                    if (s.startsWith('OPENAI_API_KEY=')) {
                        return s.split('=', 2)[1].trim().replace(/^["']|["']$/g, '');
                    } else if (s.startsWith('sk-')) {
                        return s;
                    }
                }
            } catch (e) {}
        }
    }
    return '';
}

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, POST');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, X-OpenAI-Key');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    next();
});

app.get('/api/check_key', (req, res) => {
    const key = getSavedApiKey();
    res.json({ has_key: !!key });
});

app.get('/api/tts', async (req, res) => {
    const text = req.query.text || '';
    const voice = req.query.voice || 'shimmer';
    const rawKey = (req.get('X-OpenAI-Key') || '').trim();
    const apiKey = (rawKey && rawKey.startsWith('sk-')) ? rawKey : getSavedApiKey();

    if (!text) {
        return res.status(400).send("Missing 'text' parameter");
    }

    let audioBuffer = null;
    let isOpenAiSuccess = false;

    // 1. Try OpenAI TTS API if voice is not 'google' and apiKey is available
    if (voice !== 'google' && apiKey) {
        try {
            audioBuffer = await new Promise((resolve) => {
                const postData = JSON.stringify({
                    model: 'tts-1',
                    input: text,
                    voice: voice
                });

                const options = {
                    hostname: 'api.openai.com',
                    path: '/v1/audio/speech',
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const request = https.request(options, (response) => {
                    if (response.statusCode === 200) {
                        isOpenAiSuccess = true;
                        const chunks = [];
                        response.on('data', (chunk) => chunks.push(chunk));
                        response.on('end', () => resolve(Buffer.concat(chunks)));
                    } else {
                        console.warn(`OpenAI TTS HTTP status: ${response.statusCode}`);
                        resolve(null);
                    }
                });

                request.on('error', (err) => {
                    console.warn('OpenAI TTS request error:', err);
                    resolve(null);
                });

                request.write(postData);
                request.end();
            });
        } catch (e) {
            console.warn('OpenAI TTS Exception:', e);
            audioBuffer = null;
        }
    }

    // 2. Server-side fallback to Google Translate TTS (No CORS issues because server performs request)
    if (!audioBuffer) {
        try {
            audioBuffer = await new Promise((resolve) => {
                const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ko&client=tw-ob&q=${encodeURIComponent(text)}`;
                const request = https.get(googleUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                }, (response) => {
                    if (response.statusCode === 200) {
                        const chunks = [];
                        response.on('data', (chunk) => chunks.push(chunk));
                        response.on('end', () => resolve(Buffer.concat(chunks)));
                    } else {
                        resolve(null);
                    }
                });
                request.on('error', () => resolve(null));
            });
        } catch (e) {
            audioBuffer = null;
        }
    }

    const provider = isOpenAiSuccess ? "openai" : "google_fallback";
    if (audioBuffer) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('X-TTS-Provider', provider);
        res.send(audioBuffer);
    } else {
        res.status(500).send("TTS fetch failed");
    }
});

app.use(express.static(DIRECTORY));

app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  GBAN Shorts Creator Node Express Server running!`);
    console.log(`  Port: ${PORT}`);
    console.log(`==================================================`);
});
