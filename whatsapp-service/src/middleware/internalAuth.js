const crypto = require('crypto');

const config = require('../config');

// Length-safe, timing-safe string comparison. Returns false for different
// lengths without leaking length information through an early return.
function safeEqual(a, b) {

    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }

    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    if (bufA.length !== bufB.length) {
        return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
}

function internalAuth(req, res, next) {

    // Fail closed. An unconfigured shared token must never degrade into an
    // API that accepts `Authorization: Bearer ` (empty token) — that would look
    // like a working service while Laravel can never authenticate against it.
    if (!config.internalTokenConfigured) {

        return res.status(503).json({
            success: false,
            code: 'service_token_not_configured',
            message:
                'WhatsApp service is not configured: no internal token. Set ' +
                'LARAVEL_API_KEY in whatsapp-service/.env to the same value as ' +
                'WHATSAPP_INTERNAL_TOKEN in the Laravel .env.'
        });
    }

    const auth = req.headers.authorization;
    const headerToken = req.headers['x-internal-token'];

    const bearer =
        typeof auth === 'string' && auth.startsWith('Bearer ')
            ? auth.slice(7)
            : null;

    const authorized =
        (bearer !== null && safeEqual(bearer, config.internalToken)) ||
        (typeof headerToken === 'string' && safeEqual(headerToken, config.internalToken));

    if (!authorized) {
        return res.status(401).json({
            success: false,
            code: 'unauthorized',
            message: 'Unauthorized'
        });
    }

    next();
}

module.exports = internalAuth;
