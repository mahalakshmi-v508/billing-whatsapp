const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    proto,
    WAMessageStubType,
    downloadMediaMessage
} = require('@whiskeysockets/baileys');

const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const axios = require('axios');
const pino = require('pino');

const config = require('../config');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const baileysLogger = pino({ level: process.env.BAILEYS_LOG_LEVEL || 'silent' });

const EXT_MIME = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.zip': 'application/zip',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4'
};

function mimeFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return EXT_MIME[ext] || 'application/octet-stream';
}

const MIME_EXT = {};
for (const ext of Object.keys(EXT_MIME)) {
    const mime = EXT_MIME[ext];
    if (!MIME_EXT[mime]) {
        MIME_EXT[mime] = ext;
    }
}

function mimeToExt(mime) {
    if (!mime) {
        return null;
    }
    const key = String(mime).toLowerCase().split(';')[0].trim();
    return MIME_EXT[key] || null;
}

function baileysStatusToAck(status) {
    if (status === proto.WebMessageInfo.Status.READ || status === proto.WebMessageInfo.Status.PLAYED) {
        return 3;
    }
    if (status === proto.WebMessageInfo.Status.DELIVERY_ACK) {
        return 2;
    }
    if (status === proto.WebMessageInfo.Status.SERVER_ACK) {
        return 1;
    }
    return null;
}

class WhatsAppManager {

    constructor() {
        this.clients = new Map();
        this.authStates = new Map();
        this.states = new Map();
        this.pendingAcks = new Map();
        this.reconnectTimers = new Map();
        this.reconnectAttempts = new Map();
        this.lidToPhone = new Map();
        this.removedSessions = new Set();
        this.creating = new Map();
        this.watchdog = null;
        this.syncInterval = null;
    }

    baileysSessionPath(sessionId) {
        return path.join(config.sessionPath, 'baileys', 'session-' + sessionId);
    }

    lidMapPath(sessionId) {
        return path.join(this.baileysSessionPath(sessionId), 'lid-map.json');
    }

    loadLidMap(sessionId) {
        try {
            const file = this.lidMapPath(sessionId);
            if (!fs.existsSync(file)) {
                return;
            }
            const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (!parsed || typeof parsed !== 'object') {
                return;
            }
            if (!this.lidToPhone.has(sessionId)) {
                this.lidToPhone.set(sessionId, new Map());
            }
            for (const [lid, phone] of Object.entries(parsed)) {
                this.lidToPhone.get(sessionId).set(lid, phone);
            }
            console.log(
                `[WA][${sessionId}] loaded ${Object.keys(parsed).length} LID mapping(s) from disk`
            );
        } catch (error) {
            console.error(
                `[WA][${sessionId}] failed to load LID map:`,
                error.message
            );
        }
    }

    saveLidMap(sessionId) {
        try {
            const cache = this.lidToPhone.get(sessionId);
            if (!cache || cache.size === 0) {
                return;
            }
            const dir = this.baileysSessionPath(sessionId);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const obj = {};
            for (const [lid, phone] of cache.entries()) {
                obj[lid] = phone;
            }
            fs.writeFileSync(
                this.lidMapPath(sessionId),
                JSON.stringify(obj, null, 2),
                'utf8'
            );
        } catch (error) {
            console.error(
                `[WA][${sessionId}] failed to save LID map:`,
                error.message
            );
        }
    }

    async createClient(sessionId) {

        if (this.clients.has(sessionId)) {
            return this.clients.get(sessionId);
        }

        if (this.creating.has(sessionId)) {
            return this.creating.get(sessionId);
        }

        const creation = this.buildClient(sessionId).finally(() => {
            this.creating.delete(sessionId);
        });

        this.creating.set(sessionId, creation);

        return creation;
    }

    async buildClient(sessionId) {

        console.log(`[WA][${sessionId}] initializing (baileys)`);

        this.setState(sessionId, {
            status: 'initializing',
            qr: null,
            phone: null,
            name: null
        });

        const dir = this.baileysSessionPath(sessionId);

        try {
            fs.mkdirSync(dir, { recursive: true });
        } catch (error) {
            console.error(`[WA][${sessionId}] cannot create session dir:`, error.message);
        }

        this.loadLidMap(sessionId);

        let auth;

        try {

            const { state, saveCreds } =
                await useMultiFileAuthState(dir);

            this.authStates.set(sessionId, { state, saveCreds });

            auth = this.authStates.get(sessionId);

        } catch (error) {

            console.error(
                `[WA][${sessionId}] failed to load auth state:`,
                error.message
            );

            this.setState(sessionId, {
                status: 'error',
                qr: null
            });

            throw error;
        }

        let version;

        try {

            const v = await fetchLatestBaileysVersion();

            version = v.version;

        } catch (error) {

            version = [2, 3000, 1015901307];
        }

        const sock = makeWASocket({
            version,
            logger: baileysLogger,
            printQRInTerminal: false,
            auth: auth.state,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            browser: ['WhatsApp Web Platform', 'Chrome', '124.0.0.0']
        });

        this.registerEvents(sock, sessionId);

        this.clients.set(sessionId, sock);

        console.log(`[WA][${sessionId}] socket created`);

        return sock;
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

                if (this.removedSessions.has(sessionId)) {
                    continue;
                }

                if (
                    state.status === 'ready' &&
                    !this.clients.has(sessionId)
                ) {

                    console.warn(
                        `[WA][${sessionId}] ready state without socket, attempting reconnect`
                    );

                    this.setState(sessionId, {
                        status: 'connecting',
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
            }

        }, 30000);
    }

    registerEvents(sock, sessionId) {

        sock.ev.on('creds.update', () => {
            const auth = this.authStates.get(sessionId);
            if (auth) {
                auth.saveCreds();
            }
        });

        sock.ev.on('connection.update', async (update) => {

            const { connection, lastDisconnect, qr } = update;

            if (qr) {

                console.log(`[WA][${sessionId}] qr_ready`);

                const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });

                this.setState(sessionId, {
                    status: 'qr_ready',
                    qr: qrDataUrl
                });

                await this.updateLaravel(sessionId, {
                    status: 'qr_ready'
                });
            }

            if (connection === 'connecting') {

                this.setState(sessionId, {
                    status: 'connecting',
                    qr: null
                });
            }

            if (connection === 'open') {

                console.log(`[WA][${sessionId}] ready`);

                this.reconnectAttempts.set(sessionId, 0);

                const phone = sock?.user?.id
                    ? String(sock.user.id).split(':')[0].replace(/[^0-9]/g, '')
                    : null;

                const name = sock?.user?.name || null;

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

                await this.flushPendingAcks(sessionId);
            }

            if (connection === 'close') {

                const err = lastDisconnect?.error;
                const statusCode = err?.output?.statusCode ?? null;
                const loggedOut = statusCode === DisconnectReason.loggedOut;

                console.log(
                    `[WA][${sessionId}] connection closed (statusCode=${statusCode}, loggedOut=${loggedOut})`
                );

                this.clients.delete(sessionId);

                if (this.removedSessions.has(sessionId)) {

                    this.removedSessions.delete(sessionId);

                    return;
                }

                if (loggedOut) {

                    this.setState(sessionId, {
                        status: 'disconnected',
                        qr: null
                    });

                    await this.updateLaravel(sessionId, {
                        status: 'logged_out'
                    });

                    return;
                }

                const attempts =
                    (this.reconnectAttempts.get(sessionId) || 0) + 1;

                this.reconnectAttempts.set(sessionId, attempts);

                const waitMs = Math.min(
                    Math.pow(2, attempts) * 1000,
                    30000
                );

                console.log(
                    `[WA][${sessionId}] will reconnect in ${waitMs}ms (attempt ${attempts})`
                );

                this.setState(sessionId, {
                    status: 'connecting',
                    qr: null
                });

                await this.updateLaravel(sessionId, {
                    status: 'reconnecting'
                });

                if (this.reconnectTimers.has(sessionId)) {
                    clearTimeout(this.reconnectTimers.get(sessionId));
                }

                const timer = setTimeout(async () => {

                    this.reconnectTimers.delete(sessionId);

                    if (this.clients.has(sessionId)) {
                        return;
                    }

                    await this.createClient(sessionId).catch(err => {
                        console.error(`[WA][${sessionId}] reconnect failed:`, err.message);
                    });

                }, waitMs);

                this.reconnectTimers.set(sessionId, timer);
            }
        });

        sock.ev.on('contacts.upsert', (contacts) => {
            for (const contact of contacts) {
                if (contact?.lid && contact?.id) {
                    this.registerLidMapping(
                        sessionId,
                        String(contact.lid),
                        String(contact.id)
                    );
                }
            }
        });

        sock.ev.on('contacts.update', (contacts) => {
            for (const contact of contacts) {
                if (contact?.lid && contact?.id) {
                    this.registerLidMapping(
                        sessionId,
                        String(contact.lid),
                        String(contact.id)
                    );
                }
            }
        });

        sock.ev.on('messaging-history.set', ({ contacts }) => {
            if (!Array.isArray(contacts)) {
                return;
            }
            for (const contact of contacts) {
                if (contact?.lid && contact?.id) {
                    this.registerLidMapping(
                        sessionId,
                        String(contact.lid),
                        String(contact.id)
                    );
                }
            }
        });

        sock.ev.on('chats.phoneNumberShare', (share) => {
            if (share?.lid && share?.jid) {
                this.registerLidMapping(
                    sessionId,
                    String(share.lid),
                    String(share.jid)
                );
            }
        });

        sock.ev.on('messages.upsert', async ({ messages, type }) => {

            if (type !== 'notify' && type !== 'append') {
                return;
            }

            for (const rawMessage of messages) {
                await this.handleIncomingMessage(sessionId, rawMessage, sock);
            }
        });

        sock.ev.on('messages.update', async (updates) => {

            for (const { key, update } of updates) {

                if (!key) {
                    continue;
                }

                const msgId = key.id;

                if (!msgId) {
                    continue;
                }

                // ── OPPONENT (OR A LINKED DEVICE) DELETED A MESSAGE FOR EVERYONE ──
                // Baileys surfaces a protocol REVOKE as a messages.update where key.id
                // already carries the ORIGINAL message id (protocolMsg.key.id) and the
                // update carries messageStubType = REVOKE. Map that delete straight to
                // the original message — Laravel only marks the existing row deleted.
                const stubTypeUpper = String(update?.messageStubType ?? '').toUpperCase();
                const isRevoke =
                    typeof WAMessageStubType?.REVOKE !== 'undefined' &&
                    update?.messageStubType === WAMessageStubType.REVOKE ||
                    (
                        (typeof proto?.Message?.ProtocolMessage?.Type?.REVOKE !== 'undefined') &&
                        update?.protocolMessage?.type === proto.Message.ProtocolMessage.Type.REVOKE
                    ) ||
                    stubTypeUpper.includes('REVOKE');

                if (isRevoke) {

                    console.log(
                        `[WA][REVOKE] originalMessageId=${msgId} ` +
                        `remoteJid=${key?.remoteJid || ''} fromMe=${!!key?.fromMe}`
                    );

                    await this.updateLaravel(sessionId, {
                        event: 'delete',
                        message: {
                            id: msgId,
                            remoteJid: key?.remoteJid || null
                        }
                    });

                    continue;
                }

                // Everything below is delivery/read status tracking for our own messages.
                if (key.fromMe !== true) {
                    continue;
                }

                const ack = baileysStatusToAck(update?.status);

                if (ack == null) {
                    continue;
                }

                console.log(
                    `[WA][ACK] messageId=${msgId} status=${update.status} ack=${ack}`
                );

                await this.forwardAckToLaravel(sessionId, {
                    event: 'message_ack',
                    message: {
                        id: msgId,
                        ack
                    }
                });

                if (this.pendingAcks.has(sessionId)) {

                    const pending = this.pendingAcks.get(sessionId);

                    if (ack >= 3) {
                        pending.delete(msgId);
                    } else {
                        const meta = pending.get(msgId);
                        if (meta) {
                            meta.ack = ack;
                        }
                    }
                }
            }
        });
    }

    registerLidMapping(sessionId, lidJid, phoneJid) {

        if (!lidJid || !phoneJid) {
            return;
        }

        const cleanLid = String(lidJid).includes('@')
            ? String(lidJid)
            : String(lidJid) + '@lid';

        const cleanPhone = String(phoneJid).includes('@')
            ? String(phoneJid)
            : String(phoneJid) + '@s.whatsapp.net';

        if (!String(cleanLid).endsWith('@lid')) {
            return;
        }

        if (!this.lidToPhone.has(sessionId)) {
            this.lidToPhone.set(sessionId, new Map());
        }

        const previous = this.lidToPhone.get(sessionId).get(cleanLid);

        this.lidToPhone.get(sessionId).set(cleanLid, cleanPhone);

        if (previous !== cleanPhone) {
            this.saveLidMap(sessionId);
        }
    }

    resolveIdentity(sessionId, key) {

        const remoteJid = key?.remoteJid || '';

        if (String(remoteJid).endsWith('@s.whatsapp.net') || String(remoteJid).endsWith('@c.us')) {
            return { phoneJid: remoteJid };
        }

        const candidates = [
            key?.senderPn,
            key?.remoteJidAlt,
            key?.participantPn,
            key?.participant,
            key?.participantAlt
        ];

        for (const candidate of candidates) {
            if (candidate && String(candidate).endsWith('@s.whatsapp.net')) {
                if (String(remoteJid).endsWith('@lid')) {
                    this.registerLidMapping(sessionId, remoteJid, candidate);
                }
                return { phoneJid: candidate };
            }
        }

        const cache = this.lidToPhone.get(sessionId);

        if (cache && cache.has(remoteJid)) {
            return { phoneJid: cache.get(remoteJid) };
        }

        return { phoneJid: null };
    }

    async handleIncomingMessage(sessionId, rawMessage, sock) {

        try {

            const key = rawMessage?.key || {};

            const remoteJid = key.remoteJid || '';

            console.log(
                `[WA][INCOMING-EVENT] sessionId=${sessionId} ` +
                `messageId=${key?.id || ''} remoteJid=${remoteJid} ` +
                `fromMe=${!!key?.fromMe} type=${rawMessage?.message ? Object.keys(rawMessage.message).join(',') : ''}`
            );

            if (!remoteJid) {
                return;
            }

            if (
                remoteJid === 'status@broadcast' ||
                remoteJid.endsWith('@broadcast') ||
                remoteJid.endsWith('@g.us') ||
                remoteJid.endsWith('@newsletter')
            ) {
                return;
            }

            if (key.fromMe) {
                return;
            }

            const msgId = key.id;

            if (!msgId) {
                return;
            }

            const message = rawMessage?.message;

            if (!message) {
                return;
            }

            // Protocol messages (message revokes = "delete for everyone", message edits,
            // ephemeral settings, etc.) are NOT real chat bubbles. They are resolved
            // against their ORIGINAL message id via the messages.update event instead.
            // Never create a blank/new message row or bubble for them.
            if (message.protocolMessage) {

                console.log(
                    `[WA][SKIP-PROTOCOL] sessionId=${sessionId} ` +
                    `protocolMessageId=${msgId} type=${message.protocolMessage.type ?? 'unknown'}`
                );

                return;
            }

            const identity = this.resolveIdentity(sessionId, key);

            const lidJid = String(remoteJid).endsWith('@lid') ? remoteJid : null;

            const from = identity.phoneJid || lidJid || remoteJid;

            // Only report a real resolved phone number (from a @s.whatsapp.net / @c.us
            // identity or a resolved LID map entry). Never fabricate a phone from LID
            // digits — LID numbers are NOT the customer's phone.
            const phoneDigits = identity.phoneJid
                ? String(identity.phoneJid).split('@')[0].replace(/\D/g, '')
                : null;

            let messageType = 'text';
            let body = null;
            let mediaName = null;

            if (message.conversation) {
                messageType = 'text';
                body = message.conversation;
            } else if (message.extendedTextMessage?.text) {
                messageType = 'text';
                body = message.extendedTextMessage.text;
            } else if (message.imageMessage) {
                messageType = 'image';
                body = message.imageMessage.caption || null;
            } else if (message.videoMessage) {
                messageType = 'video';
                body = message.videoMessage.caption || null;
            } else if (message.audioMessage) {
                messageType = 'audio';
                body = null;
            } else if (message.documentMessage) {
                messageType = 'document';
                mediaName = message.documentMessage.fileName || null;
                body = message.documentMessage.caption || null;
            } else if (message.stickerMessage) {
                messageType = 'sticker';
                body = null;
            } else if (message.contactMessage) {
                messageType = 'contact';
                body = message.contactMessage.displayName || 'Contact Card';
            } else if (message.locationMessage) {
                messageType = 'location';
                body = `Location: ${message.locationMessage.degreesLatitude}, ${message.locationMessage.degreesLongitude}`;
            }

            // Download incoming media (image/video/document) so Laravel can store
            // it and serve a real preview URL to the dashboard. Only meaningful
            // media types are downloaded; downloads that fail are non-fatal.
            let mediaMime = null;
            let mediaBase64 = null;
            let mediaExt = null;

            if (
                (messageType === 'image' || messageType === 'video' || messageType === 'document') &&
                sock
            ) {
                try {
                    const buf = await downloadMediaMessage(
                        rawMessage,
                        'buffer',
                        {},
                        {
                            reuploadRequest: sock.updateMediaMessage
                        }
                    );

                    if (buf && buf.length > 0) {
                        mediaMime =
                            message.imageMessage?.mimetype ||
                            message.videoMessage?.mimetype ||
                            message.documentMessage?.mimetype ||
                            null;
                        mediaExt =
                            (message.imageMessage?.fileName && path.extname(message.imageMessage.fileName)) ||
                            (message.videoMessage?.fileName && path.extname(message.videoMessage.fileName)) ||
                            (message.documentMessage?.fileName && path.extname(message.documentMessage.fileName)) ||
                            (mediaMime ? mimeToExt(mediaMime) : null) ||
                            (messageType === 'image' ? '.jpg' : null);
                        mediaBase64 = buf.toString('base64');
                        console.log(
                            `[WA][MEDIA] id=${msgId} type=${messageType} mime=${mediaMime} bytes=${buf.length}`
                        );
                    }
                } catch (mediaError) {
                    console.error(
                        `[WA][${sessionId}] media download failed type=${messageType}:`,
                        mediaError.message
                    );
                }
            }

            const timestamp = rawMessage.messageTimestamp
                ? new Date(Number(rawMessage.messageTimestamp) * 1000).toISOString()
                : new Date().toISOString();

            console.log(
                `[WA][MSG] id=${msgId} from=${from} phone=${phoneDigits} type=${messageType}`
            );

            const msgPayload = {
                id: msgId,
                from,
                phone: phoneDigits,
                lid_from: lidJid,
                body,
                timestamp,
                type: messageType,
                fromMe: false,
                media_name: mediaName
            };

            if (mediaBase64) {
                msgPayload.media_base64 = mediaBase64;
                msgPayload.media_mimetype = mediaMime;
                msgPayload.media_ext = mediaExt;
            }

            await this.updateLaravel(sessionId, {
                event: 'message',
                message: msgPayload
            });

        } catch (error) {

            console.error(
                `[${sessionId}] Incoming message error:`,
                error.message
            );
        }
    }

    resolveJid(sessionId, phone) {

        const digits = String(phone).replace(/\D/g, '');

        if (!digits) {
            throw new Error('Invalid phone number');
        }

        let num = digits;

        if (/^\d{10}$/.test(num)) {
            num = '91' + num;
        }

        return `${num}@s.whatsapp.net`;
    }

    async sendText(
        sessionId,
        phone,
        message,
        replyTo = null
    ) {

        const sock = this.clients.get(sessionId);

        if (!sock) {
            throw new Error('WhatsApp client not found');
        }

        const state = this.getState(sessionId);

        if (state.status !== 'ready') {
            throw new Error('WhatsApp is not connected');
        }

        const jid = this.resolveJid(sessionId, phone);

        try {

            const content = { text: message };

            const options = {};

            // Real WhatsApp quoted reply: pass the original message's key so
            // Baileys builds the contextInfo / quoted banner for the recipient.
            if (replyTo && replyTo.id) {

                const quotedRemoteJid =
                    typeof replyTo.remote_jid === 'string' &&
                    /@s\.whatsapp\.net$/i.test(replyTo.remote_jid)
                        ? replyTo.remote_jid
                        : jid;

                options.quoted = {
                    key: {
                        remoteJid: quotedRemoteJid,
                        fromMe: Boolean(replyTo.from_me),
                        id: String(replyTo.id)
                    },
                    message: {
                        conversation: String(replyTo.text || message || '')
                    }
                };
            }

            const sentMsg = await sock.sendMessage(jid, content, options);

            const msgId = sentMsg?.key?.id || null;

            console.log(`[WA][SEND] to=${jid} id=${msgId}`);

            if (msgId) {
                this.trackSentMessage(sessionId, msgId);
            }

            return {
                id: msgId,
                status: 'sent'
            };

        } catch (error) {

            console.error(
                `[WA][${sessionId}] send text failed:`,
                error.message
            );

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

        const sock = this.clients.get(sessionId);

        if (!sock) {
            throw new Error('WhatsApp client not found');
        }

        const state = this.getState(sessionId);

        if (state.status !== 'ready') {
            throw new Error('WhatsApp is not connected');
        }

        const jid = this.resolveJid(sessionId, phone);

        try {

            const buffer = fs.readFileSync(filePath);

            const sentMsg = await sock.sendMessage(jid, {
                document: buffer,
                fileName: filename || path.basename(filePath),
                mimetype: mimeFromPath(filePath),
                caption: caption || undefined
            });

            const docMsgId = sentMsg?.key?.id || null;

            console.log(`[WA][SEND-DOC] to=${jid} id=${docMsgId}`);

            if (docMsgId) {
                this.trackSentMessage(sessionId, docMsgId);
            }

            return {
                id: docMsgId,
                status: 'sent'
            };

        } catch (error) {

            console.error(
                `[WA][${sessionId}] send document failed:`,
                error.message
            );

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

        const sock = this.clients.get(sessionId);

        if (!sock) {
            throw new Error('WhatsApp client not found');
        }

        const state = this.getState(sessionId);

        if (state.status !== 'ready') {
            throw new Error('WhatsApp is not connected');
        }

        const cleanBase64 = String(base64Data).includes(',')
            ? String(base64Data).split(',')[1]
            : String(base64Data);

        const jid = this.resolveJid(sessionId, phone);

        try {

            const buffer = Buffer.from(cleanBase64, 'base64');

            const sentMsg = await sock.sendMessage(jid, {
                document: buffer,
                fileName: filename,
                mimetype,
                caption: caption || undefined
            });

            const b64MsgId = sentMsg?.key?.id || null;

            console.log(`[WA][SEND-B64] to=${jid} id=${b64MsgId}`);

            if (b64MsgId) {
                this.trackSentMessage(sessionId, b64MsgId);
            }

            return {
                id: b64MsgId,
                status: 'sent'
            };

        } catch (error) {

            console.error(
                `[WA][${sessionId}] send base64 document failed:`,
                error.message
            );

            throw error;
        }
    }

    async sendImageBase64(
        sessionId,
        phone,
        base64Data,
        mimetype = 'image/jpeg',
        caption = ''
    ) {

        const sock = this.clients.get(sessionId);

        if (!sock) {
            throw new Error('WhatsApp client not found');
        }

        const state = this.getState(sessionId);

        if (state.status !== 'ready') {
            throw new Error('WhatsApp is not connected');
        }

        const cleanBase64 = String(base64Data).includes(',')
            ? String(base64Data).split(',')[1]
            : String(base64Data);

        const jid = this.resolveJid(sessionId, phone);

        try {

            const buffer = Buffer.from(cleanBase64, 'base64');

            const sentMsg = await sock.sendMessage(jid, {
                image: buffer,
                mimetype,
                caption: caption || undefined
            });

            const imgMsgId = sentMsg?.key?.id || null;

            console.log(`[WA][SEND-IMG] to=${jid} id=${imgMsgId}`);

            if (imgMsgId) {
                this.trackSentMessage(sessionId, imgMsgId);
            }

            return {
                id: imgMsgId,
                status: 'sent'
            };

        } catch (error) {

            console.error(
                `[WA][${sessionId}] send image failed:`,
                error.message
            );

            throw error;
        }
    }

    // Delete a message for both parties (if within WhatsApp's window) or at
    // least from our own side. Pass the original message key.
    async deleteMessage(
        sessionId,
        phone,
        { id, from_me = true } = {}
    ) {

        const sock = this.clients.get(sessionId);

        if (!sock) {
            throw new Error('WhatsApp client not found');
        }

        const state = this.getState(sessionId);

        if (state.status !== 'ready') {
            throw new Error('WhatsApp is not connected');
        }

        const jid = this.resolveJid(sessionId, phone);

        if (!id) {
            throw new Error('Original message id is required to delete');
        }

        try {

            await sock.sendMessage(
                jid,
                {
                    delete: {
                        remoteJid: jid,
                        fromMe: Boolean(from_me),
                        id: String(id),
                        participant: undefined
                    }
                }
            );

            console.log(
                `[WA][${sessionId}] deleted message id=${id} to=${jid}`
            );

            return { id, status: 'deleted' };

        } catch (error) {

            console.error(
                `[WA][${sessionId}] delete message failed:`,
                error.message
            );

            throw error;
        }
    }

    async disconnect(sessionId) {

        console.log(`[WA][${sessionId}] explicit disconnect requested`);

        const sock = this.clients.get(sessionId);

        const timer = this.reconnectTimers.get(sessionId);

        if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(sessionId);
        }

        this.reconnectAttempts.delete(sessionId);

        this.removedSessions.add(sessionId);

        if (sock) {

            try {
                await sock.logout();
            } catch (error) {
                try {
                    sock.end(new Error('Manual disconnect'));
                } catch (endError) {
                    // ignore
                }
            }

            this.clients.delete(sessionId);
        }

        this.authStates.delete(sessionId);

        try {
            fs.rmSync(this.baileysSessionPath(sessionId), { recursive: true, force: true });
        } catch (error) {
            // ignore
        }

        this.lidToPhone.delete(sessionId);
        this.pendingAcks.delete(sessionId);

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

        const sock = this.clients.get(sessionId);

        const timer = this.reconnectTimers.get(sessionId);

        if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(sessionId);
        }

        if (sock) {

            this.removedSessions.add(sessionId);

            try {
                sock.end(new Error('Client removed'));
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
            path.join(path.resolve(config.sessionPath), 'baileys');

        if (!fs.existsSync(basePath)) {
            return;
        }

        const candidates = [];

        for (const folder of fs.readdirSync(basePath)) {

            const full = path.join(basePath, folder);

            if (
                folder.startsWith('session-') &&
                fs.statSync(full).isDirectory()
            ) {

                if (fs.existsSync(path.join(full, 'creds.json'))) {
                    candidates.push(folder.replace('session-', ''));
                }
            }
        }

        if (candidates.length === 0) {
            return;
        }

        let validIds = candidates;

        try {

            const resp = await axios.post(
                `${config.laravelUrl}/api/internal/whatsapp/validate_sessions`,
                { session_ids: candidates },
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
            // Laravel unreachable — restore all as fallback
        }

        const skipped = candidates.length - validIds.length;

        if (skipped > 0) {
            console.log(`[WA] Skipped ${skipped} orphaned session(s) (no DB row)`);
        }

        if (validIds.length === 0) {
            return;
        }

        console.log(`[WA] Restoring ${validIds.length} session(s) in parallel...`);

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

    async flushPendingAcks(sessionId) {

        const pending = this.pendingAcks.get(sessionId);

        if (!pending || pending.size === 0) {
            return;
        }

        for (const [msgId, meta] of pending.entries()) {

            if (meta.ack >= 1) {

                await this.forwardAckToLaravel(sessionId, {
                    event: 'message_ack',
                    message: {
                        id: msgId,
                        ack: meta.ack
                    }
                });
            }
        }
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

        if (this.syncInterval) {
            return;
        }

        this.syncInterval = setInterval(async () => {

            for (const [sessionId, state] of this.states.entries()) {

                if (this.removedSessions.has(sessionId)) {
                    continue;
                }

                if (this.clients.has(sessionId)) {
                    continue;
                }

                if (
                    (state.status === 'initializing' || state.status === 'connecting' || state.status === 'qr_ready') &&
                    Date.now() - (state.updatedAt || 0) > 120000
                ) {

                    console.warn(
                        `[WA][${sessionId}] stuck without socket, re-creating`
                    );

                    this.createClient(sessionId).catch(err => {
                        console.error(`[WA][${sessionId}] recreate failed:`, err.message);
                    });
                }
            }

        }, 15000);
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