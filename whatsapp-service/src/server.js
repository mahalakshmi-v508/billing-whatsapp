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
app.get('/health', (req, res) => {
    return res.json({
        success: true,
        message: 'WhatsApp service is running'
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

            // respond immediately; QR arrives via events/polling
            manager.createClient(session_id)
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


// ── EDIT AN EXISTING TEXT MESSAGE ──
app.post(
    '/api/whatsapp/edit',
    internalAuth,
    async (req, res) => {

        try {

            const {
                session_id,
                phone,
                message: newText,
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
                await manager.editMessage(
                    session_id,
                    phone,
                    newText,
                    { id, from_me }
                );

            return res.json({
                success: true,
                result
            });

        } catch (error) {

            console.error('[edit] failed:', error.stack || error.message);

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
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


// ── DISCONNECT ──
app.post(
    '/api/whatsapp/disconnect',
    internalAuth,
    async (req, res) => {

        try {

            const {
                session_id
            } = req.body;

            if (!session_id) {

                return res.status(422).json({
                    success: false,
                    message: 'session_id is required'
                });
            }

            await manager.disconnect(
                session_id
            );

            return res.json({
                success: true,
                message:
                    'WhatsApp disconnected'
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


app.listen(
    config.port,
    () => {

        console.log(
            `WhatsApp service running on port ${config.port}`
        );

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
