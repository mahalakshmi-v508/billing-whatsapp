const config = require('../config');

function internalAuth(req, res, next) {

    const auth =
        req.headers.authorization;

    const headerToken =
        req.headers['x-internal-token'];

    if (
        auth !==
        `Bearer ${config.internalToken}` &&
        headerToken !== config.internalToken
    ) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    next();
}

module.exports = internalAuth;
