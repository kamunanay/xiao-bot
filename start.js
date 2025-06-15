require('./settings');
const { Boom } = require('@hapi/boom');
const { makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

// Initialize database
if (!fs.existsSync('./database.json')) {
    fs.writeFileSync('./database.json', JSON.stringify({
        users: {},
        groups: {},
        redeemCodes: {}
    }));
}
global.db = require('./database.json');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    
    const ganz = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'error' }),
        browser: ['Xiao Bot', 'Safari', '1.0.0']
    });

    // Connection update handler
    ganz.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = new Boom(lastDisconnect.error).output.statusCode !== 401;
            console.log(shouldReconnect ? 'Reconnecting...' : 'Connection closed');
            if (shouldReconnect) {
                setTimeout(startBot, 2000);
            }
        } else if (connection === 'open') {
            console.log('Bot connected successfully!');
        }
    });

    // Save credentials
    ganz.ev.on('creds.update', saveCreds);

    // Message handler
    ganz.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        try {
            const { handleMessage } = require('./Xiao');
            await handleMessage(ganz, m);
        } catch (error) {
            console.error('Message handling error:', error);
        }
    });

    // Auto-save database every 30 seconds
    setInterval(() => {
        fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));
    }, 30000);
}

startBot().catch(err => console.error('Fatal error:', err));
