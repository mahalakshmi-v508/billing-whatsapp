require('dotenv').config();

const fs = require('fs');
const path = require('path');

// always resolve session storage relative to the service folder (not cwd)
function resolveSessionPath() {

    const configured = process.env.SESSION_PATH || './sessions';

    if (path.isAbsolute(configured)) {
        return configured;
    }

    return path.resolve(__dirname, '..', configured);
}

// auto-detect a Chromium browser on the machine (can be overridden with CHROME_PATH)
function detectChromePath() {

    if (process.env.CHROME_PATH) {
        return process.env.CHROME_PATH;
    }

    const candidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
    ];

    for (const candidate of candidates) {
        try {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        } catch (error) {
            // ignore
        }
    }

    return null;
}

const internalToken =
    process.env.LARAVEL_API_KEY ||
    process.env.WHATSAPP_INTERNAL_TOKEN ||
    '';

if (!internalToken) {

    console.error(
        '\n[CONFIG] No shared internal token configured.\n' +
        '         Set LARAVEL_API_KEY (or WHATSAPP_INTERNAL_TOKEN) in ' +
        'whatsapp-service/.env to the SAME value as WHATSAPP_INTERNAL_TOKEN in ' +
        'billing_software_backend/.env.\n' +
        '         Without it every /api/whatsapp/* request is rejected with 401 ' +
        'and Laravel reports "WhatsApp service is not reachable".\n'
    );
}

module.exports = {
    port: process.env.PORT || 3001,

    // Laravel backend URL (LARAVEL_API_URL preferred; LARAVEL_URL kept as legacy alias)
    laravelUrl: process.env.LARAVEL_API_URL || process.env.LARAVEL_URL || 'http://localhost:8000',

    // Shared internal token (LARAVEL_API_KEY preferred; WHATSAPP_INTERNAL_TOKEN kept as legacy alias)
    internalToken,

    // True only when a usable shared token is present. The service refuses every
    // authenticated call when this is false, so a missing .env can never look
    // like a silently-open API.
    internalTokenConfigured: internalToken.length > 0,

    sessionPath: resolveSessionPath(),

    chromePath: detectChromePath()
};
