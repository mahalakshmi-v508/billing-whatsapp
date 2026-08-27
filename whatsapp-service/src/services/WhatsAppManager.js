const {
    Client,
    LocalAuth,
    MessageMedia
} = require('whatsapp-web.js');

const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const axios = require('axios');

const config = require('../config');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class WhatsAppManager {

    constructor() {
        this.clients = new Map();
        this.states = new Map();
        this.pendingAcks = new Map(); // sessionId -> Map<msgId, {ack, lastChecked}>
        this.watchdog = null;
        this.syncInterval = null;
    }

    async createClient(sessionId) {

        if (this.clients.has(sessionId)) {
            return this.clients.get(sessionId);
        }

        console.log(`[WA][${sessionId}] initializing`);

        this.setState(sessionId, {
            status: 'initializing',
            qr: null,
            phone: null,
            name: null
        });

        const puppeteerOptions = {
            headless: true,

            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        };

        if (config.chromePath) {
            puppeteerOptions.executablePath = config.chromePath;
        }

        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: sessionId,
                dataPath: path.resolve(config.sessionPath)
            }),

            puppeteer: puppeteerOptions
        });

        this.registerEvents(client, sessionId);

        this.clients.set(sessionId, client);

        await client.initialize();

        return client;
    }

    setState(sessionId, state) {

        const previous = this.states.get(sessionId) || {};

        this.states.set(sessionId, {
            ...previous,
            ...state,
            updatedAt: Date.now()
        });
    }

    getState(sessionId) {

        return this.states.get(sessionId) || {
            status: 'disconnected',
            qr: null,
            phone: null,
            name: null
        };
    }

    startWatchdog() {

        if (this.watchdog) {
            return;
        }

        this.watchdog = setInterval(async () => {

            for (const [sessionId, state] of this.states.entries()) {

                if (
                    state.status === 'authenticated' &&
                    Date.now() - (state.updatedAt || 0) > 120000
                ) {

                    console.warn(
                        `[WA][${sessionId}] stuck in authenticated, restarting client`
                    );

                    try {

                        await this.removeClient(sessionId);

                        await delay(5000);

                        await this.createClient(sessionId);

                    } catch (error) {

                        console.error(
                            `[WA][${sessionId}] watchdog restart failed:`,
                            error.message
                        );
                    }
                }

                if (state.status === 'ready') {

                    const client = this.clients.get(sessionId);

                    if (!client) {

                        console.warn(
                            `[WA][${sessionId}] ready state without client, attempting reconnect`
                        );

                        this.setState(sessionId, {
                            status: 'reconnecting',
                            qr: null
                        });

                        await this.updateLaravel(sessionId, {
                            status: 'reconnecting'
                        });

                        this.createClient(sessionId).catch(err => {
                            console.error(`[WA][${sessionId}] reconnect failed:`, err.message);
                        });

                        continue;
                    }

                    try {

                        const page = client?.pupPage;

                        if (page && typeof page.isClosed === 'function' && page.isClosed()) {

                            console.warn(
                                `[WA][${sessionId}] puppeteer page is closed, attempting reconnect`
                            );

                            this.setState(sessionId, {
                                status: 'reconnecting',
                                qr: null
                            });

                            await this.updateLaravel(sessionId, {
                                status: 'reconnecting'
                            });

                            this.clients.delete(sessionId);

                            try {
                                await client.destroy();
                            } catch (e) {
                                // ignore
                            }

                            this.createClient(sessionId).catch(err => {
                                console.error(`[WA][${sessionId}] reconnect failed:`, err.message);
                            });
                        }

                    } catch (e) {
                        // ignore health check errors
                    }
                }
            }

        }, 30000);
    }

    registerEvents(client, sessionId) {

        client.on('qr', async (qr) => {

            console.log(`[WA][${sessionId}] qr_ready`);

            const qrDataUrl = await QRCode.toDataURL(qr);

            this.setState(sessionId, {
                status: 'qr_ready',
                qr: qrDataUrl
            });

            await this.updateLaravel(sessionId, {
                status: 'qr_ready'
            });
        });


        client.on('authenticated', async () => {

            console.log(`[WA][${sessionId}] authenticated`);

            this.setState(sessionId, {
                status: 'authenticated',
                qr: null
            });

            await this.updateLaravel(sessionId, {
                status: 'authenticated'
            });
        });


        client.on('ready', async () => {

            console.log(`[WA][${sessionId}] ready`);

            const info = client.info;

            const phone = info?.wid?.user || null;
            const name = info?.pushname || null;

            this.setState(sessionId, {
                status: 'ready',
                qr: null,
                phone,
                name
            });

            await this.updateLaravel(sessionId, {
                status: 'ready',
                phone_number: phone,
                display_name: name
            });
        });


        client.on('auth_failure', async (message) => {

            console.error(
                `[WA][${sessionId}] auth_failure`,
                message
            );

            this.setState(sessionId, {
                status: 'auth_failure',
                qr: null
            });

            await this.updateLaravel(sessionId, {
                status: 'auth_failure'
            });
        });


        client.on('disconnected', async (reason) => {

            console.log(
                `[WA][${sessionId}] disconnected`,
                reason
            );

            this.setState(sessionId, {
                status: 'disconnected',
                qr: null
            });

            await this.updateLaravel(sessionId, {
                status: 'disconnected'
            });

            try {
                await client.destroy();
            } catch (error) {
                // ignore destroy errors
            }

            this.clients.delete(sessionId);
        });


        client.on('message', async (message) => {

            if (message.from === 'status@broadcast') {
                return;
            }

            await this.handleIncomingMessage(
                sessionId,
                message
            );
        });


        // delivery / read receipts: ack 1 = sent, 2 = delivered, 3 = read, 4 = played
        // Only process OUTGOING message acks — incoming acks are irrelevant
        client.on('message_ack', async (message, ack) => {

            if (message.from === 'status@broadcast') {
                return;
            }

            if (!message.fromMe) {
                return;
            }

            const msgId = message.id?._serialized || null;
            if (!msgId) return;

            const mappedStatus = ack >= 3 ? 'read' : (ack >= 2 ? 'delivered' : (ack >= 1 ? 'sent' : 'pending'));

            console.log(
                `[WA][ACK] messageId=${msgId} ack=${ack} mappedStatus=${mappedStatus}`
            );

            // Forward to Laravel (Single authoritative path — updates DB and triggers Reverb broadcast)
            await this.forwardAckToLaravel(sessionId, {
                event: 'message_ack',
                message: {
                    id: msgId,
                    ack
                }
            });

            // Track for sync recovery (in case ACK events are missed)
            if (this.pendingAcks.has(sessionId)) {
                const pending = this.pendingAcks.get(sessionId);
                if (ack >= 3) {
                    pending.delete(msgId);
                } else {
                    const meta = pending.get(msgId);
                    if (meta) meta.ack = ack;
                }
            }
        });
    }

    async handleIncomingMessage(sessionId, message) {

        try {

            let fromJid = message.from ?? '';
            let lidFrom = null;

            // WhatsApp's newer accounts may message from a private "LID"
            // address (<digits>@lid) instead of their phone number.
            // Resolve it back to the real phone number so the reply lands
            // in the SAME conversation as the invoices/messages sent to
            // that customer - otherwise ghost chats appear under the raw
            // lid digits and replies to them are never delivered.
            if (String(fromJid).endsWith('@lid')) {

                lidFrom = fromJid;

                try {

                    const contact = await message.getContact();

                    const resolved = contact?.id?._serialized;

                    if (resolved && !String(resolved).endsWith('@lid')) {
                        fromJid = resolved;
                    }

                } catch (error) {

                    console.error(
                        `[${sessionId}] LID resolution failed:`,
                        error.message
                    );
                }
            }

            const phoneDigits =
                String(fromJid).split('@')[0].replace(/\D/g, '') || null;

            await this.updateLaravel(
                sessionId,
                {
                    event: 'message',
                    message: {
                        id: message.id?._serialized,
                        from: fromJid,
                        phone: phoneDigits,
                        lid_from: lidFrom,
                        body: message.body,
                        timestamp: message.timestamp,
                        type: message.type,
                        fromMe: message.fromMe,
                        media_name: message._data?.filename || null
                    }
                }
            );

        } catch (error) {

            console.error(
                'Incoming message error:',
                error.message
            );
        }
    }

    async handleDeadSession(sessionId, error) {

        const msg = String(error?.message || '');

        if (
            msg.includes('detached') ||
            msg.includes('Detached') ||
            msg.includes('Target closed') ||
            msg.includes('Session closed') ||
            msg.includes('Connection closed')
        ) {

            console.warn(
                `[WA][${sessionId}] transient browser error detected: ${msg}, attempting reconnect`
            );

            this.setState(sessionId, {
                status: 'reconnecting',
                qr: null
            });

            this.updateLaravel(sessionId, {
                status: 'reconnecting'
            }).catch(() => {});

            const client = this.clients.get(sessionId);

            if (client) {
                this.clients.delete(sessionId);
                try {
                    client.destroy().catch(() => {});
                } catch (e) {
                    // ignore
                }
            }

            this.createClient(sessionId).catch(err => {
                console.error(`[WA][${sessionId}] reconnect after error failed:`, err.message);
            });

            return true;
        }

        return false;
    }

    async sendText(
        sessionId,
        phone,
        message
    ) {

        const client = this.clients.get(sessionId);

        if (!client) {
            throw new Error('WhatsApp client not found');
        }

        const state = this.getState(sessionId);

        if (state.status !== 'ready') {
            throw new Error('WhatsApp is not connected');
        }

        try {

            const chatId = await this.resolveChatId(client, phone);

            const result = await client.sendMessage(
                chatId,
                message
            );

            const msgId = result?.id?._serialized ?? null;
            if (msgId) this.trackSentMessage(sessionId, msgId);

            return {
                id: msgId,
                status: 'sent'
            };

        } catch (error) {

            const isDead = await this.handleDeadSession(sessionId, error);

            if (isDead) {
                throw new Error(
                    'WhatsApp session lost. Please reconnect from Settings > WhatsApp.'
                );
            }

            throw error;
        }
    }

    async sendDocument(
        sessionId,
        phone,
        filePath,
        caption = '',
        filename = null
    ) {

        const client = this.clients.get(sessionId);

        if (!client) {
            throw new Error('WhatsApp client not found');
        }

        const state = this.getState(sessionId);

        if (state.status !== 'ready') {
            throw new Error('WhatsApp is not connected');
        }

        try {

            const media =
                MessageMedia.fromFilePath(filePath);

            if (filename) {
                media.filename = filename;
            }

            const chatId = await this.resolveChatId(client, phone);

            const result =
                await client.sendMessage(
                    chatId,
                    media,
                    {
                        caption
                    }
                );

            const docMsgId = result?.id?._serialized ?? null;
            if (docMsgId) this.trackSentMessage(sessionId, docMsgId);

            return {
                id: docMsgId,
                status: 'sent'
            };

        } catch (error) {

            const isDead = await this.handleDeadSession(sessionId, error);

            if (isDead) {
                throw new Error(
                    'WhatsApp session lost. Please reconnect from Settings > WhatsApp.'
                );
            }

            throw error;
        }
    }

    async sendDocumentBase64(
        sessionId,
        phone,
        base64Data,
        mimetype = 'application/pdf',
        filename = 'document.pdf',
        caption = ''
    ) {

        const client = this.clients.get(sessionId);

        if (!client) {
            throw new Error('WhatsApp client not found');
        }

        const state = this.getState(sessionId);

        if (state.status !== 'ready') {
            throw new Error('WhatsApp is not connected');
        }

        const cleanBase64 = String(base64Data).includes(',')
            ? String(base64Data).split(',')[1]
            : String(base64Data);

        const media = new MessageMedia(
            mimetype,
            cleanBase64,
            filename
        );

        const chatId = await this.resolveChatId(client, phone);

        const result =
            await client.sendMessage(
                chatId,
                media,
                {
                    caption
                }
            );

        const b64MsgId = result?.id?._serialized ?? null;
        if (b64MsgId) this.trackSentMessage(sessionId, b64MsgId);

        return {
            id: b64MsgId,
            status: 'sent'
        };
    }

    async resolveChatId(client, phone) {

        const digits = String(phone).replace(/\D/g, '');

        if (!digits) {
            throw new Error('Invalid phone number');
        }

        // resolve the correct JID (required for WhatsApp's new LID system)
        try {
            const numberId = await client.getNumberId(digits);

            if (numberId && numberId._serialized) {
                return numberId._serialized;
            }

            throw new Error('This number is not registered on WhatsApp');
        } catch (error) {

            if (String(error.message).includes('not registered')) {
                throw error;
            }

            // resolution failed - fall back to plain jid
            return `${digits}@c.us`;
        }
    }

    normalizePhone(phone) {

        let value = String(phone)
            .replace(/\D/g, '');

        if (!value) {
            throw new Error('Invalid phone number');
        }

        return `${value}@c.us`;
    }

    async disconnect(sessionId) {

        console.log(`[WA][${sessionId}] explicit disconnect requested`);

        const client =
            this.clients.get(sessionId);

        if (client) {
            try {
                await client.logout();
            } catch (error) {
                try {
                    await client.destroy();
                } catch (destroyError) {
                    // ignore
                }
            }

            this.clients.delete(sessionId);
        }

        this.setState(sessionId, {
            status: 'disconnected',
            qr: null,
            phone: null,
            name: null
        });

        await this.updateLaravel(sessionId, {
            status: 'disconnected'
        });
    }

    async removeClient(sessionId) {

        const client =
            this.clients.get(sessionId);

        if (client) {
            try {
                await client.destroy();
            } catch (error) {
                // ignore
            }

            this.clients.delete(sessionId);
        }
    }

    async restoreSingleSession(sessionId) {

        const maxAttempts = 3;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {

            console.log(`[WA][${sessionId}] restore attempt ${attempt}/${maxAttempts}`);

            try {

                await this.createClient(sessionId);

                console.log(`[WA][${sessionId}] restore success`);

                return true;

            } catch (error) {

                console.error(
                    `[WA][${sessionId}] restore attempt ${attempt} failed:`,
                    error.message
                );

                if (attempt < maxAttempts) {
                    await delay(attempt * 2000);
                }
            }
        }

        console.error(
            `[WA][${sessionId}] restore failure after ${maxAttempts} attempts`
        );

        return false;
    }

    async restoreSessions() {

        const basePath =
            path.resolve(config.sessionPath);

        const candidates = new Set();

        // 1. standard LocalAuth extracted sessions
        const authPath =
            path.join(basePath, '.wwebjs_auth');

        if (fs.existsSync(authPath)) {
            for (const folder of fs.readdirSync(authPath)) {
                if (folder.startsWith('session-')) {
                    candidates.add(folder.replace('session-', ''));
                }
            }
        }

        // 2. persistent puppeteer browser profiles (auto-login via localStorage)
        if (fs.existsSync(basePath)) {
            for (const folder of fs.readdirSync(basePath)) {
                const full = path.join(basePath, folder);
                if (folder.startsWith('session-') && fs.statSync(full).isDirectory()) {
                    candidates.add(folder.replace('session-', ''));
                }
            }
        }

        if (candidates.size === 0) return;

        // Only restore sessions that have a live DB row (skip orphaned folders)
        const allIds = [...candidates];
        let validIds = allIds;
        try {
            const resp = await axios.post(
                `${config.laravelUrl}/api/internal/whatsapp/validate_sessions`,
                { session_ids: allIds },
                {
                    headers: {
                        Authorization: `Bearer ${config.internalToken}`,
                        'X-Internal-Token': config.internalToken
                    },
                    timeout: 8000
                }
            );
            if (resp.data?.valid_sessions) {
                validIds = resp.data.valid_sessions;
            }
        } catch (err) {
            // Endpoint may not exist yet — restore all as fallback
        }

        const skipped = allIds.length - validIds.length;
        if (skipped > 0) {
            console.log(`[WA] Skipped ${skipped} orphaned session(s) (no DB row)`);
        }

        if (validIds.length === 0) return;

        console.log(`[WA] Restoring ${validIds.length} session(s) in parallel...`);

        // Set all candidate sessions in state as initializing so status calls see restoring/initializing
        for (const sessionId of validIds) {
            this.setState(sessionId, {
                status: 'initializing',
                qr: null,
                phone: null,
                name: null
            });
        }

        const results = await Promise.allSettled(
            validIds.map((sessionId) => this.restoreSingleSession(sessionId))
        );

        const restored = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
        console.log(`[WA] Sessions restored: ${restored}/${validIds.length}`);
    }

    async forwardAckToLaravel(sessionId, payload) {

        const maxRetries = 3;
        const baseDelay = 1000;
        const msgId = payload?.message?.id;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {

            try {

                await axios.post(
                    `${config.laravelUrl}/api/internal/whatsapp/events`,
                    {
                        session_id: sessionId,
                        ...payload
                    },
                    {
                        headers: {
                            Authorization:
                                `Bearer ${config.internalToken}`,
                            'X-Internal-Token':
                                config.internalToken
                        },
                        timeout: 8000
                    }
                );

                if (attempt > 0) {
                    console.log(
                        `[WA][ACK] Laravel update success after ` +
                        `${attempt} retry attempt(s) for msgId=${msgId}`
                    );
                }

                return true;

            } catch (error) {

                if (attempt < maxRetries) {

                    const waitMs = Math.min(
                        baseDelay * Math.pow(2, attempt),
                        10000
                    );

                    console.warn(
                        `[WA][ACK] Laravel update retry in ${waitMs}ms ` +
                        `(attempt ${attempt + 1}/${maxRetries + 1}) for msgId=${msgId}: ` +
                        `${error.message}`
                    );

                    await delay(waitMs);

                } else {

                    console.error(
                        `[WA][ACK] Laravel update permanently failed ` +
                        `for msgId=${msgId} after ${maxRetries + 1} attempts: ` +
                        `${error.response?.data?.message || error.message}`
                    );

                    return false;
                }
            }
        }
    }

    async notifyMessageStatus(messageId, status) {

        try {

            await axios.post(
                `${config.laravelUrl}/api/whatsapp/message-status`,
                {
                    message_id: messageId,
                    status: status
                },
                {
                    headers: {
                        Authorization:
                            `Bearer ${config.internalToken}`,
                        'X-Internal-Token':
                            config.internalToken
                    },
                    timeout: 8000
                }
            );

        } catch (error) {

            console.warn(
                `[message-status] POST failed for ` +
                `msgId=${messageId}: ` +
                `${error.response?.data?.message || error.message}`
            );
        }
    }

    trackSentMessage(sessionId, msgId) {
        if (!this.pendingAcks.has(sessionId)) {
            this.pendingAcks.set(sessionId, new Map());
        }
        this.pendingAcks.get(sessionId).set(msgId, {
            ack: 1,
            lastChecked: Date.now()
        });
    }

    startSyncInterval() {
        if (this.syncInterval) return;

        this.syncInterval = setInterval(async () => {
            for (const [sessionId, client] of this.clients.entries()) {
                const state = this.getState(sessionId);
                if (state.status !== 'ready') continue;

                const pending = this.pendingAcks.get(sessionId);
                if (!pending || pending.size === 0) continue;

                const now = Date.now();
                const toCheck = [];
                for (const [msgId, meta] of pending.entries()) {
                    if (now - meta.lastChecked > 15000) {
                        toCheck.push(msgId);
                    }
                }
                if (toCheck.length === 0) continue;

                const batch = toCheck.slice(0, 10);
                for (const msgId of batch) {
                    const meta = pending.get(msgId);
                    if (!meta) continue;
                    meta.lastChecked = now;

                    try {
                        const msg = await client.getMessageById(msgId);
                        if (msg && typeof msg.ack === 'number' && msg.ack > meta.ack) {
                            meta.ack = msg.ack;

                            if (msg.ack >= 3) {
                                pending.delete(msgId);
                            }

                            await this.forwardAckToLaravel(sessionId, {
                                event: 'message_ack',
                                message: {
                                    id: msgId,
                                    ack: msg.ack
                                }
                            });
                        }
                    } catch (error) {
                        if (String(error.message).includes('not found') || String(error.message).includes('404')) {
                            pending.delete(msgId);
                        }
                    }
                }
            }
        }, 10000);
    }

    async updateLaravel(sessionId, payload) {

        const maxRetries = 3;
        const baseDelay = 1000;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {

            try {

                await axios.post(
                    `${config.laravelUrl}/api/internal/whatsapp/events`,
                    {
                        session_id: sessionId,
                        ...payload
                    },
                    {
                        headers: {
                            Authorization:
                                `Bearer ${config.internalToken}`,
                            'X-Internal-Token':
                                config.internalToken
                        },
                        timeout: 8000
                    }
                );

                return true;

            } catch (error) {

                if (attempt < maxRetries) {

                    const waitMs = Math.min(
                        baseDelay * Math.pow(2, attempt),
                        10000
                    );

                    console.warn(
                        `[WA][${sessionId}] Laravel update failed ` +
                        `(attempt ${attempt + 1}/${maxRetries + 1}), ` +
                        `retrying in ${waitMs}ms: ${error.message}`
                    );

                    await delay(waitMs);

                } else {

                    console.error(
                        `[WA][${sessionId}] Laravel update permanently failed ` +
                        `after ${maxRetries + 1} attempts: ` +
                        `${error.response?.data?.message || error.message}`
                    );

                    return false;
                }
            }
        }
    }
}

module.exports = WhatsAppManager;
