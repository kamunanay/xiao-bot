require('./settings');
const fs = require('fs');
const pino = require('pino');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const readline = require('readline');
const { exec } = require('child_process');
const { say } = require('cfonts');
const os = require('os');
const { Boom } = require('@hapi/boom');

const {
  default: WAConnection, generateWAMessageFromContent,
  prepareWAMessageMedia, useMultiFileAuthState, Browsers, DisconnectReason, makeInMemoryStore, makeCacheableSignalKeyStore, fetchLatestWaWebVersion, proto, getAggregateVotesInPollMessage
} = require('@whiskeysockets/baileys');

const pairingCode = true;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
const database = new (require('./database.js'))();

(async () => {
  const loadData = await database.read();
  if (loadData && Object.keys(loadData).length === 0) {
    global.db = {
      users: {},
      groups: {},
      settings: {},
      battles: {},
      redeemCodes: { ...global.redeemCodes }
    };
    await database.write(global.db);
  } else {
    global.db = loadData;
  }
  setInterval(async () => {
    if (global.db) await database.write(global.db);
  }, 5000);
})();

const { MessagesUpsert, Solving } = require('./Xiao');
const { isUrl, generateMessageTag, getBuffer, sleep, randomToken } = require('./function');

async function startingBot() {
  try {
    const store = await makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const { version } = await axios.get("https://raw.githubusercontent.com/nstar-y/Bail/refs/heads/main/src/Defaults/baileys-version.json").then(res => res.data);

    const ganz = await WAConnection({
      version: version,
      printQRInTerminal: !pairingCode,
      logger: pino({ level: "silent" }),
      auth: state,
      browser: ["Ubuntu", "Chrome", "22.04.2"],
      generateHighQualityLinkPreview: true,
      getMessage: async (key) => {
        if (store) {
          const msg = await store.loadMessage(key.remoteJid, key.id, undefined);
          return msg?.message || undefined;
        }
        return {
          conversation: 'Bot'
        };
      }
    });

    if (pairingCode && !ganz.authState.creds.registered) {
      const correctAnswer = 'xiao';
      let attempts = 0;
      let maxAttempts = 3;
      let verified = false;
      
      while (attempts < maxAttempts && !verified) {
        const answer = await question(chalk.yellow.bold('Masukan Key Panel\n'));
        if (answer.toLowerCase() === correctAnswer) {
          verified = true;
          console.log(chalk.green.bold('Jawaban benar! Silahkan lanjutkan.'));
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            console.log(chalk.red.bold(`Jawaban salah! Kesempatan tersisa: ${maxAttempts - attempts}`));
          } else {
            console.log(chalk.red.bold('Jawaban salah! Kesempatan habis.'));
            return;
          }
        }
      }
      
      let phoneNumber = await question(chalk.yellow.bold('Masukkan Nomor WhatsApp :\n'));
      phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
      let code = await ganz.requestPairingCode(phoneNumber);
      code = code.match(/.{1,4}/g).join(" - ") || code;
      console.log(`${chalk.blue.bold('Kode Pairing')} : ${chalk.white.bold(code)}`);
    }

    ganz.ev.on('creds.update', saveCreds);

    ganz.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, receivedPendingNotifications } = update;
      if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        if (reason === DisconnectReason.connectionLost) {
          console.log('Connection to Server Lost, Attempting to Reconnect...');
          startingBot();
        } else if (reason === DisconnectReason.connectionClosed) {
          console.log('Connection closed, Attempting to Reconnect...');
          startingBot();
        } else if (reason === DisconnectReason.restartRequired) {
          console.log('Restart Required...');
          startingBot();
        } else if (reason === DisconnectReason.timedOut) {
          console.log('Connection Timed Out, Attempting to Reconnect...');
          startingBot();
        } else if (reason === DisconnectReason.badSession) {
          console.log('Delete Session and Scan again...');
          startingBot();
        } else if (reason === DisconnectReason.connectionReplaced) {
          console.log('Close current Session first...');
          startingBot();
        } else if (reason === DisconnectReason.loggedOut) {
          console.log('Scan again and Run...');
          exec('rm -rf ./session/*');
          process.exit(1);
        } else if (reason === DisconnectReason.Multidevicemismatch) {
          console.log('Scan again...');
          exec('rm -rf ./session/*');
          process.exit(0);
        } else {
          ganz.end(`Unknown DisconnectReason : ${reason}|${connection}`);
        }
      }
      
      if (connection == 'open') {
        ganz.newsletterFollow("120363400478690599@newsletter");
        ganz.newsletterFollow("120363402349014804@newsletter");
        
        ganz.sendMessage(ganz.user.id.split(":")[0] + "@s.whatsapp.net", {
          text: `*#- Botz Sudah Terhubung ...*\n\nDon't forget to follow to the Channel developer -> ${global.linkSaluran} so you can get the latest updates about this script :)`
        });
        
        const formatp = (bytes) => {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const runtime = (uptime) => {
          const hours = Math.floor(uptime / 3600);
          const minutes = Math.floor((uptime % 3600) / 60);
          const seconds = Math.floor(uptime % 60);
          return `${hours} jam ${minutes} menit ${seconds} detik`;
        };

        const tot = {
          totalGb: Math.floor(os.totalmem() / (1024 * 1024 * 1024)),
        };

        console.log(chalk.red.bold(`
INFORMATION SERVER
Platform : ${os.type()}
Total Ram : ${formatp(os.totalmem())}
Total Disk : ${tot.totalGb} GB
Total Cpu : ${os.cpus().length} Core
Runtime Vps : ${runtime(os.uptime())}
\n\n`));
        
        console.log(chalk.magenta.bold(`╔══╗....<💖
╚╗╔╝..('\../')
╔╝╚╗..( •.• )
╚══╝..(,,)(,,) .<💖
╔╗╔═╦╦╦═╗ ╔╗╔╗
║╚╣║║║║╩╣ ║╚╝║
╚═╩═╩═╩═╝ ╚══╝\n`));
        
        console.log(chalk.green.bold(`${global.namaOwner}\n${global.owner}\n\n`));
      } else if (receivedPendingNotifications == 'true') {
        console.log('Please wait About 1 Minute...');
      }
    });

    await store.bind(ganz.ev);
    await Solving(ganz, store);

    ganz.ev.on('messages.upsert', async (message) => {
      await MessagesUpsert(ganz, message, store);
    });

    ganz.ev.on('contacts.update', (update) => {
      for (let contact of update) {
        let id = ganz.decodeJid(contact.id);
        if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
      }
    });

    return ganz;

  } catch (error) {
    console.error('Error starting bot:', error);
    process.exit(1);
  }
}

startingBot();

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});
