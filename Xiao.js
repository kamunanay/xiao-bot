const { isOwner, pickRandom, formatDuration } = require('./function');

module.exports = {
    async handleMessage(ganz, m) {
        const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
        const sender = m.key.remoteJid;
        const pushName = m.pushName || 'User';
        const isCmd = body.startsWith(global.prefix);
        
        if (!isCmd) return;

        const command = body.slice(global.prefix.length).trim().split(' ')[0].toLowerCase();
        const args = body.slice(global.prefix.length).trim().split(' ').slice(1);

        const reply = async (text, options = {}) => {
            await ganz.sendMessage(sender, { text }, { quoted: m, ...options });
        };

        try {
            switch(command) {
                case 'menu':
                case 'help':
                    const menuText = `
🌌 *${global.namaBot} Menu* 🌌
╭─────────────────
├ ${global.prefix}daftar <nama> - Buat karakter
├ ${global.prefix}profile - Lihat stat
├ ${global.prefix}shop - Buka toko
├ ${global.prefix}battle - Lawan monster
╰─────────────────
🛠️ *Owner Commands:*
╭─────────────────
├ ${global.prefix}addredeem <kode> <koin>
├ ${global.prefix}setuser @tag <atribut> <nilai>
╰─────────────────
                    `.trim();
                    await reply(menuText);
                    break;

                case 'daftar':
                    if (global.db.users[sender]?.registered) {
                        return reply('Kamu sudah terdaftar!');
                    }
                    
                    const name = args.join(' ');
                    if (!name) return reply('Format: .daftar <nama>');
                    
                    global.db.users[sender] = {
                        name,
                        element: pickRandom(global.characters.elements),
                        level: 1,
                        strength: isOwner(sender) ? 100 : Math.floor(Math.random() * 50) + 30,
                        health: 300,
                        maxHealth: 300,
                        coin: isOwner(sender) ? 5000 : 1000,
                        inventory: [],
                        equipment: {},
                        registered: true,
                        lastDaily: 0
                    };
                    
                    await reply(`✨ *Pendaftaran Berhasil!*\nNama: ${name}\nElement: ${global.db.users[sender].element}`);
                    break;

                case 'profile':
                    if (!global.db.users[sender]?.registered) {
                        return reply('Kamu belum terdaftar! Ketik .daftar <nama>');
                    }
                    
                    const user = global.db.users[sender];
                    const profileText = `
📛 *${user.name}* [Lv.${user.level}]
⚡ Element: ${user.element}
❤️ Health: ${user.health}/${user.maxHealth}
💪 Strength: ${user.strength}
💰 Coin: ${user.coin}
                    `.trim();
                    await reply(profileText);
                    break;

                // Add other commands here...

                default:
                    await reply('Command tidak dikenali. Ketik .menu untuk bantuan');
            }
        } catch (error) {
            console.error('Command error:', error);
            await reply(global.mess.error);
        }
    }
};
