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

module.exports = {
    port: process.env.PORT || 3001,

    laravelUrl: process.env.LARAVEL_URL || 'http://localhost:8000',

    internalToken: process.env.WHATSAPP_INTERNAL_TOKEN || 'change-this-secret-token',

    sessionPath: resolveSessionPath(),

    chromePath: detectChromePath()
};
