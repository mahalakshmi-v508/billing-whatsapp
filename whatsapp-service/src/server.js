const express = require('express');
const cors = require('cors');

const WhatsAppManager =
    require('./services/WhatsAppManager');

const internalAuth =
    require('./middleware/internalAuth');

const config = require('./config');

// keep the service alive on unexpected puppeteer/whatsapp-web errors
process.on('uncaughtException', (error) => {
    console.error('[uncaughtException]', error.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason?.message || reason);
});

const app = express();

app.use(cors());

app.use(express.json({
    limit: '50mb'
}));

const manager =
    new WhatsAppManager();


// ── HEALTH ──
// Unauthenticated on purpose: this is the reachability probe. It reports only
// the SERVICE's own liveness and configuration — never a WhatsApp connection
// state. "service running" must never be mistaken for "account connected".
app.get('/health', (req, res) => {
    return res.json({
        success: true,
        service: 'whatsapp-service',
        status: 'running',
        message: 'WhatsApp service is running',
        port: config.port,
        token_configured: config.internalTokenConfigured,
        sessions: manager.clients.size,
        uptime_seconds: Math.round(process.uptime())
    });
});


// ── CONNECT (GENERATE QR) ──
app.post(
    '/api/whatsapp/connect',
    internalAuth,
    async (req, res) => {

        try {

            const {
                session_id
            } = req.body;

            if (!session_id) {

                return res.status(422).json({
                    success: false,
                    message:
                        'session_id is required'
                });
            }

            console.log('[WHATSAPP CONNECT] connect requested');
            console.log(`[WHATSAPP CONNECT] sessionId=${session_id}`);

            // respond immediately; QR arrives via events/polling.
            // explicit:true — a human asked to connect, so any previous manual
            // logout is cleared and a fresh QR pairing flow may start.
            manager.createClient(session_id, { explicit: true })
                .catch(error => {
                    console.error(
                        `[${session_id}] init failed`,
                        error.message
                    );
                });

            return res.json({
                success: true,
                state:
                    manager.getState(session_id)
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);


// ── QR / STATUS ──
app.get(
    '/api/whatsapp/status/:sessionId',
    internalAuth,
    async (req, res) => {

        const sessionId =
            req.params.sessionId;

        return res.json({
            success: true,
            state:
                manager.getState(sessionId)
        });
    }
);


// ── SEND TEXT MESSAGE ──
app.post(
    '/api/whatsapp/send',
    internalAuth,
    async (req, res) => {

        try {

            const {
                session_id,
                phone,
                message,
                reply_to
            } = req.body;

            const result =
                await manager.sendText(
                    session_id,
                    phone,
                    message,
                    reply_to || null
                );

            return res.json({
                success: true,
                result
            });

        } catch (error) {

            console.error('[send] failed:', error.stack || error.message);

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);


// ── SEND DOCUMENT FROM FILE PATH ──
app.post(
    '/api/whatsapp/send-document-file',
    internalAuth,
    async (req, res) => {

        try {

            const {
                session_id,
                phone,
                file_path,
                filename,
                caption
            } = req.body;

            const result =
                await manager.sendDocument(
                    session_id,
                    phone,
                    file_path,
                    caption || '',
                    filename || null
                );

            return res.json({
                success: true,
                result
            });

        } catch (error) {

            console.error(error.message);

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);


// ── SEND DOCUMENT FROM BASE64 (PDF FROM FRONTEND) ──
app.post(
    '/api/whatsapp/send-document',
    internalAuth,
    async (req, res) => {

        try {

            const {
                session_id,
                phone,
                base64,
                mimetype,
                filename,
                caption
            } = req.body;

            if (!base64) {

                return res.status(422).json({
                    success: false,
                    message: 'base64 is required'
                });
            }

            const result =
                await manager.sendDocumentBase64(
                    session_id,
                    phone,
                    base64,
                    mimetype || 'application/pdf',
                    filename || 'document.pdf',
                    caption || ''
                );

            return res.json({
                success: true,
                result
            });

        } catch (error) {

            console.error(error.message);

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);


// ── SEND IMAGE FROM BASE64 (PHOTO FROM FRONTEND) ──
app.post(
    '/api/whatsapp/send-image',
    internalAuth,
    async (req, res) => {

        try {

            const {
                session_id,
                phone,
                base64,
                mimetype,
                caption
            } = req.body;

            if (!base64) {

                return res.status(422).json({
                    success: false,
                    message: 'base64 is required'
                });
            }

            const result =
                await manager.sendImageBase64(
                    session_id,
                    phone,
                    base64,
                    mimetype || 'image/jpeg',
                    caption || ''
                );

            return res.json({
                success: true,
                result
            });

        } catch (error) {

            console.error(error.message);

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);


// ── MESSAGE EDIT DISABLED ──
// WhatsApp message editing is intentionally not supported in this application.
// If an old client still calls this endpoint, respond 404 so the request can
// never reach Baileys or modify any message.
app.post(
    '/api/whatsapp/edit',
    internalAuth,
    async (req, res) => {
        return res.status(404).json({
            success: false,
            message: 'Message editing is not supported'
        });
    }
);


// ── DELETE A MESSAGE ──
app.post(
    '/api/whatsapp/delete',
    internalAuth,
    async (req, res) => {

        try {

            const {
                session_id,
                phone,
                id,
                from_me = true
            } = req.body;

            if (!id) {

                return res.status(422).json({
                    success: false,
                    message: 'Original message id is required'
                });
            }

            const result =
                await manager.deleteMessage(
                    session_id,
                    phone,
                    { id, from_me }
                );

            return res.json({
                success: true,
                result
            });

        } catch (error) {

            console.error('[delete] failed:', error.stack || error.message);

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);


// ── GET CONTACT PROFILE PICTURE (DP VIA BAILEYS) ──
app.post(
    '/api/whatsapp/profile-picture',
    internalAuth,
    async (req, res) => {

        try {

            const {
                session_id,
                phone
            } = req.body;

            if (!session_id) {

                return res.status(422).json({
                    success: false,
                    profile_picture: null,
                    message:
                        'session_id is required'
                });
            }

            if (!phone) {

                return res.status(422).json({
                    success: false,
                    profile_picture: null,
                    message:
                        'phone is required'
                });
            }

            const url =
                await manager.getProfilePicture(
                    session_id,
                    phone
                );

            if (url) {

                return res.json({
                    success: true,
                    profile_picture: url
                });
            }

            // No DP available / private profile — never an error for the caller.
            return res.json({
                success: false,
                profile_picture: null
            });

        } catch (error) {

            console.error('[profile-picture] failed:', error.stack || error.message);

            return res.status(500).json({
                success: false,
                profile_picture: null,
                message: error.message
            });
        }
    }
);


// ── SEND REAL WHATSAPP READ RECEIPTS (BLUE TICKS FOR THE OPPONENT) ──
app.post(
    '/api/whatsapp/read-receipts',
    internalAuth,
    async (req, res) => {

        try {

            const {
                session_id,
                phone,
                ids
            } = req.body;

            if (!session_id) {

                return res.status(422).json({
                    success: false,
                    message: 'session_id is required'
                });
            }

            if (!phone || !Array.isArray(ids) || ids.length === 0) {

                return res.status(422).json({
                    success: false,
                    message: 'phone and a non-empty ids array are required'
                });
            }

            const result =
                await manager.markMessagesRead(
                    session_id,
                    phone,
                    ids
                );

            return res.json({
                success: true,
                result
            });

        } catch (error) {

            console.error('[read-receipts] failed:', error.stack || error.message);

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);


// ── LOGOUT (TERMINATE BAILEYS SESSION + UNLINK THE DEVICE) ──
// This is the real teardown. It must never be a no-op that only flips a flag:
// the manager calls sock.logout() (remove-companion-device), ends the socket,
// drops the persisted auth state and suppresses every auto-reconnect path.
async function handleLogout(req, res) {

    try {

        const { session_id } = req.body;

        if (!session_id) {
            return res.status(422).json({
                success: false,
                status: 'error',
                message: 'session_id is required'
            });
        }

        const result = await manager.logout(session_id);

        // Never report success unless the device really was unlinked. The
        // "already logged out" no-op legitimately has unlinked:false.
        const unlinked = Boolean(result.unlinked);
        const already = Boolean(result.already);

        if (!unlinked && !already) {
            return res.status(502).json({
                success: false,
                status: 'logout_failed',
                service: 'whatsapp-service',
                message: 'WhatsApp device could not be unlinked. The session is still active.',
                result
            });
        }

        return res.json({
            success: true,
            status: 'logged_out',
            service: 'whatsapp-service',
            result
        });

    } catch (error) {

        console.error('[logout] failed:', error.stack || error.message);

        // 502 when the failure is "could not unlink an existing session": the
        // caller must keep the session marked as active rather than assume the
        // device was logged out.
        const statusCode = error.statusCode || 500;

        return res.status(statusCode).json({
            success: false,
            status: error.unlinked === false ? 'logout_failed' : 'error',
            service: 'whatsapp-service',
            message: error.message
        });
    }
}


app.post('/api/whatsapp/logout', internalAuth, handleLogout);


// Same handler for the pre-existing endpoint name so no client regresses.
app.post('/api/whatsapp/disconnect', internalAuth, handleLogout);



app.listen(
    config.port,
    () => {

        console.log(
            `WhatsApp service running on port ${config.port}`
        );

        if (!config.internalTokenConfigured) {

            console.error(
                '[FATAL] No internal token configured — every /api/whatsapp/* ' +
                'request will be refused with 503. Set LARAVEL_API_KEY in ' +
                'whatsapp-service/.env to match WHATSAPP_INTERNAL_TOKEN in the ' +
                'Laravel .env.'
            );

        } else {
            console.log('Internal auth token loaded from .env');
        }

        manager.startSyncInterval();

        manager.restoreSessions()
            .then(() => {
                manager.startWatchdog();
            })
            .catch(error => {
                console.error(
                    'Session restore failed:',
                    error.message
                );
            });
    }
);
