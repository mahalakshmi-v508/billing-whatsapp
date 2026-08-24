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

class WhatsAppManager {

    constructor() {
        this.clients = new Map();
        this.states = new Map();
        this.watchdog = null;
    }

    async createClient(sessionId) {

        if (this.clients.has(sessionId)) {
            return this.clients.get(sessionId);
        }

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
                        `[${sessionId}] stuck in authenticated, restarting client`
                    );

                    try {

                        await this.removeClient(sessionId);

                        await new Promise(
                            resolve => setTimeout(resolve, 5000)
                        );

                        await this.createClient(sessionId);

                    } catch (error) {

                        console.error(
                            `[${sessionId}] watchdog restart failed`,
                            error.message
                        );
                    }
                }
            }

        }, 30000);
    }

    registerEvents(client, sessionId) {

        client.on('qr', async (qr) => {

            console.log(`[${sessionId}] QR received`);

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

            console.log(`[${sessionId}] authenticated`);

            this.setState(sessionId, {
                status: 'authenticated',
                qr: null
            });

            await this.updateLaravel(sessionId, {
                status: 'authenticated'
            });
        });


        client.on('ready', async () => {

            console.log(`[${sessionId}] WhatsApp ready`);

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
                `[${sessionId}] Authentication failure`,
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
                `[${sessionId}] disconnected`,
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


        // delivery / read receipts: ack 2 = delivered, 3 = read, 4 = played
        client.on('message_ack', async (message, ack) => {

            if (message.from === 'status@broadcast') {
                return;
            }

            try {

                await this.updateLaravel(sessionId, {
                    event: 'message_ack',
                    message: {
                        id: message.id?._serialized,
                        ack
                    }
                });

            } catch (error) {
                console.error(
                    'Ack forward error:',
                    error.message
                );
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

        const chatId = await this.resolveChatId(client, phone);

        const result = await client.sendMessage(
            chatId,
            message
        );

        return {
            id: result?.id?._serialized ?? null,
            status: 'sent'
        };
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

        return {
            id: result?.id?._serialized ?? null,
            status: 'sent'
        };
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

        return {
            id: result?.id?._serialized ?? null,
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

        for (const sessionId of candidates) {

            try {

                console.log(
                    `Restoring ${sessionId}`
                );

                await this.createClient(
                    sessionId
                );

            } catch (error) {

                console.error(
                    `Failed restoring ${sessionId}`,
                    error.message
                );
            }
        }
    }


    async updateLaravel(sessionId, payload) {

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
                    timeout: 10000
                }
            );

        } catch (error) {

            console.error(
                'Laravel update failed:',
                error.response?.data ||
                error.message
            );
        }
    }
}

module.exports = WhatsAppManager;
