process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

require('./settings');
const { pickRandom, getItemById, formatDuration, randomInt, isOwner } = require('./function');

const totalfitur = () => {
  const commands = [
    'daftar', 'profile', 'inventory', 'shop', 'beli', 'pakai', 'daily', 'redeem', 
    'battle', 'leaderboard', 'menu', 'owner', 'addredeem', 'delredeem', 'listredeem',
    'setcharacter'
  ];
  return commands.length;
};

module.exports.Solving = async (ganz, store) => {
  ganz.ev.on('messages.upsert', async (message) => {
    const msg = message.messages[0];
    if (!msg.message) return;
    
    const body = msg.message.conversation || (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) || '';
    const sender = msg.key.remoteJid;
    const from = msg.key.remoteJid;
    const pushName = msg.pushName;
    const isGroup = from.endsWith('@g.us');
    const groupId = isGroup ? from : sender;
    const command = body.startsWith(global.prefix) ? body.slice(global.prefix.length).trim().split(' ')[0].toLowerCase() : '';
    const args = body.startsWith(global.prefix) ? body.slice(global.prefix.length).trim().split(' ').slice(1) : [];
    
    const reply = async (text, options = {}) => {
      await ganz.sendMessage(from, { text }, { quoted: msg, ...options });
    };

    // Inisialisasi user
    if (!global.db.users[sender]) {
      global.db.users[sender] = {
        name: pushName,
        registered: false,
        lastDaily: 0,
        battleCooldown: 0
      };
    }
    const user = global.db.users[sender];
    
    try {
      switch (command) {
        case 'menu':
        case 'help': {
          const totalFitur = totalfitur();
          const menuText = `
🌌 *${global.namaBot} RPG Menu* 🌌
Dibuat oleh: ${global.namaOwner}
Versi: ${global.versi}
Total Fitur: ${totalFitur}

🗡️ *Karakter:*
.daftar - Daftarkan karakter
.profile - Lihat profil karakter
.inventory - Lihat inventory

🏪 *Ekonomi:*
.shop - Lihat toko
.beli [item] - Beli item
.pakai [item] - Pakai item
.daily - Klaim hadiah harian
.redeem [kode] - Tukar kode

⚔️ *Battle:*
.battle - Lawan monster
.leaderboard - Peringkat pemain

👑 *Owner Only:*
.addredeem - Tambah kode redeem
.delredeem - Hapus kode redeem
.listredeem - List kode redeem
.setcharacter - Set karakter user

📚 *Lainnya:*
.menu - Tampilkan menu ini
.owner - Info pemilik bot

Contoh: .daftar Ganz
          `.trim();
          await reply(menuText);
          break;
        }

        case 'daftar': {
          if (user.registered) return reply("Anda sudah terdaftar!");
          
          const name = body.slice(7).trim();
          if (!name) return reply("Format: .daftar <nama_karakter>");
          
          // Karakter khusus untuk owner
          let element, strength, health;
          
          if (isOwner(sender)) {
            element = "Dewa Langit";
            strength = randomInt(80, 100);
            health = randomInt(400, 500);
          } else {
            element = pickRandom(global.characters.elements);
            strength = randomInt(30, 50);
            health = randomInt(200, 300);
          }
          
          user.registered = true;
          user.name = name;
          user.element = element;
          user.strength = strength;
          user.health = health;
          user.maxHealth = health;
          user.level = 1;
          user.exp = 0;
          user.coin = isOwner(sender) ? 5000 : 1000;
          user.equipment = { armor: null, weapon: null };
          user.inventory = [];
          user.lastDaily = 0;
          user.battleCount = 0;
          user.victoryCount = 0;
          
          reply(`✨ *Pendaftaran Berhasil!*
          
📛 Nama: ${name}
⚡ Element: ${element}
💪 Kekuatan: ${strength}
❤️ Darah: ${health}
💰 Koin: ${user.coin}

Gunakan *.profile* untuk melihat statmu!`);
          break;
        }

        case 'profile': {
          if (!user.registered) return reply("Anda belum terdaftar! Ketik *.daftar*");
          
          const armor = user.equipment.armor ? user.equipment.armor.name : "Tidak ada";
          const weapon = user.equipment.weapon ? user.equipment.weapon.name : "Tidak ada";
          const expNeeded = user.level * 100 - user.exp;
          
          const profileText = `
📛 *${user.name}* - Lv.${user.level}
⚡ Element: ${user.element}
💪 Kekuatan: ${user.strength} ${user.equipment.weapon ? `(+${user.equipment.weapon.attack})` : ''}
❤️ Darah: ${user.health}/${user.maxHealth} ${user.equipment.armor ? `(+${user.equipment.armor.defense})` : ''}
✨ EXP: ${user.exp}/${user.level * 100} (Butuh ${expNeeded} EXP untuk naik level)
💰 Koin: ${user.coin}
🎖️ Kemenangan: ${user.victoryCount}/10

🛡️ Armor: ${armor}
🗡️ Senjata: ${weapon}

📦 Inventory: ${user.inventory.length} item
⏰ Daily: ${user.lastDaily > 0 ? "Sudah diambil" : "Belum diambil"}
          `.trim();
          
          await reply(profileText);
          break;
        }

        case 'inventory': {
          if (!user.registered) return reply("Anda belum terdaftar!");
          
          if (user.inventory.length === 0) return reply("Inventory Anda kosong!");
          
          let invText = "📦 *Inventory Anda:*\n";
          const itemsCount = {};
          
          user.inventory.forEach(itemId => {
            itemsCount[itemId] = (itemsCount[itemId] || 0) + 1;
          });
          
          Object.keys(itemsCount).forEach(itemId => {
            const item = getItemById(parseInt(itemId));
            if (item) {
              invText += `- ${item.name} (x${itemsCount[itemId]})\n`;
            }
          });
          
          invText += "\nGunakan *.pakai [nama item]* untuk menggunakan item";
          await reply(invText);
          break;
        }

        case 'shop': {
          let shopText = "🏪 *TOKO PERALATAN*\n\n";
          
          // Armor
          shopText += "🛡️ *JIRAH:*\n";
          global.characters.equipments.armor.forEach(item => {
            shopText += `- ${item.name} (Def:${item.defense}) : ${item.price} koin\n`;
          });
          
          // Weapons
          shopText += "\n🗡️ *SENJATA:*\n";
          global.characters.equipments.weapons.forEach(item => {
            shopText += `- ${item.name} (Atk:${item.attack}) : ${item.price} koin\n`;
          });
          
          // Pills
          shopText += "\n💊 *PIL AJAIB:*\n";
          global.characters.equipments.pills.forEach(item => {
            let effect = "";
            if (item.effect === "health") effect = `+${item.value} Darah`;
            else if (item.effect === "strength") effect = `+${item.value} Kekuatan`;
            shopText += `- ${item.name} (${effect}) : ${item.price} koin\n`;
          });
          
          shopText += "\nBeli dengan: *.beli [nama item]*";
          await reply(shopText);
          break;
        }

        case 'beli': {
          if (!user.registered) return reply("Anda belum terdaftar!");
          
          const itemName = args.join(' ');
          if (!itemName) return reply("Format: .beli [nama item]");
          
          let foundItem = null;
          let category = null;
          
          // Cari item di semua kategori
          for (const [cat, items] of Object.entries(global.characters.equipments)) {
            const item = items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
            if (item) {
              foundItem = item;
              category = cat;
              break;
            }
          }
          
          if (!foundItem) return reply("Item tidak ditemukan!");
          if (user.coin < foundItem.price) return reply(`Koin tidak cukup! Dibutuhkan ${foundItem.price} koin, Anda memiliki ${user.coin} koin.`);
          
          user.coin -= foundItem.price;
          
          if (category === 'pills') {
            user.inventory.push(foundItem.id);
            reply(`Berhasil membeli ${foundItem.name}! Gunakan dengan *.pakai ${foundItem.name}*`);
          } else {
            user.equipment[category] = foundItem;
            reply(`Berhasil membeli dan memakai ${foundItem.name}!`);
          }
          break;
        }

        case 'pakai': {
          if (!user.registered) return reply("Anda belum terdaftar!");
          
          const itemName = args.join(' ');
          if (!itemName) return reply("Format: .pakai [nama item]");
          
          // Cari item di inventory
          let itemIndex = -1;
          let foundItem = null;
          
          for (let i = 0; i < user.inventory.length; i++) {
            const itemId = user.inventory[i];
            const item = getItemById(itemId);
            if (item && item.name.toLowerCase() === itemName.toLowerCase()) {
              foundItem = item;
              itemIndex = i;
              break;
            }
          }
          
          if (!foundItem) return reply("Item tidak ditemukan di inventory!");
          if (foundItem.effect !== "health" && foundItem.effect !== "strength") return reply("Item ini tidak bisa digunakan!");
          
          // Gunakan item
          if (foundItem.effect === "health") {
            user.health = Math.min(user.health + foundItem.value, user.maxHealth);
            reply(`❤️ Darah pulih +${foundItem.value}! (Sekarang: ${user.health}/${user.maxHealth})`);
          } else if (foundItem.effect === "strength") {
            user.strength += foundItem.value;
            reply(`💪 Kekuatan meningkat +${foundItem.value}! (Sekarang: ${user.strength})`);
          }
          
          // Hapus dari inventory
          user.inventory.splice(itemIndex, 1);
          break;
        }

        case 'daily': {
          if (!user.registered) return reply("Anda belum terdaftar!");
          
          const now = Date.now();
          const lastDaily = user.lastDaily || 0;
          const oneDay = 24 * 60 * 60 * 1000; // 24 jam
          
          if (now - lastDaily < oneDay) {
            const nextDaily = lastDaily + oneDay;
            const remaining = formatDuration(nextDaily - now);
            return reply(`Anda sudah mengambil hadiah harian hari ini. Silakan kembali dalam ${remaining}.`);
          }
          
          user.coin += isOwner(sender) ? 500 : 100;
          user.lastDaily = now;
          
          // Tambahkan pil Qi
          const pilQi = global.characters.equipments.pills.find(p => p.name === "Pil Qi");
          if (pilQi) user.inventory.push(pilQi.id);
          
          reply(`🎁 *Hadiah Harian*
💰 +${isOwner(sender) ? "500" : "100"} Koin
💊 +1 Pil Qi

Jangan lupa mengambil lagi besok!`);
          break;
        }

        case 'redeem': {
          if (!user.registered) return reply("Anda belum terdaftar!");
          
          const code = args[0];
          if (!code) return reply("Format: .redeem [kode]");
          
          const reward = global.db.redeemCodes[code.toUpperCase()];
          if (!reward) return reply("Kode tidak valid atau sudah kadaluarsa!");
          
          user.coin += reward.coin;
          let rewardText = `🎉 Kode berhasil ditebus!\n💰 +${reward.coin} Koin`;
          
          if (reward.items && reward.items.length > 0) {
            reward.items.forEach(itemId => {
              user.inventory.push(itemId);
              const item = getItemById(itemId);
              if (item) rewardText += `\n📦 +1 ${item.name}`;
            });
          }
          
          reply(rewardText);
          
          // Hapus kode setelah dipakai
          delete global.db.redeemCodes[code.toUpperCase()];
          break;
        }

        case 'battle': {
          if (!user.registered) return reply("Anda belum terdaftar!");
          
          const now = Date.now();
          if (now - user.battleCooldown < 30000) {
            const remaining = formatDuration(30000 - (now - user.battleCooldown));
            return reply(`Anda masih dalam cooldown! Silakan tunggu ${remaining} lagi.`);
          }
          
          const monster = pickRandom(global.characters.monsters);
          const userAttack = user.strength + (user.equipment.weapon ? user.equipment.weapon.attack : 0);
          const userDefense = user.equipment.armor ? user.equipment.armor.defense : 0;
          
          const monsterDamage = Math.max(0, monster.strength - userDefense);
          const userDamage = Math.max(1, userAttack);
          
          // Hitung hasil pertarungan
          const userHits = Math.ceil(monster.health / userDamage);
          const monsterHits = Math.ceil(user.health / monsterDamage);
          
          let resultText = "";
          let victory = false;
          
          if (userHits <= monsterHits) {
            // Player menang
            victory = true;
            const expGain = monster.exp;
            const coinGain = monster.coin;
            
            user.exp += expGain;
            user.coin += coinGain;
            user.battleCount++;
            user.victoryCount++;
            resultText = `🎉 *Anda Menang!*
            
Anda mengalahkan ${monster.name}!
✨ EXP +${expGain}
💰 Koin +${coinGain}`;
            
            // Cek level up
            const expNeeded = user.level * 100;
            if (user.exp >= expNeeded) {
              user.level++;
              user.strength += 5;
              user.maxHealth += 20;
              user.health = user.maxHealth; // Pulihkan darah penuh
              resultText += `\n\n✨ *LEVEL UP!* Sekarang level ${user.level}!`;
            }
          } else {
            // Player kalah
            user.health = Math.floor(user.maxHealth * 0.5); // Kehilangan 50% darah
            resultText = `😭 *Anda Kalah!*
            
${monster.name} terlalu kuat!
❤️ Darah tersisa: ${user.health}/${user.maxHealth}
⚠️ Pulihkan darah dengan Pil Qi`;
          }
          
          user.battleCooldown = now;
          await reply(resultText);
          
          // Berikan hadiah kemenangan ke-10
          if (victory && user.victoryCount >= 10) {
            user.victoryCount = 0;
            const rareItem = pickRandom([3, 6, 9]); // ID item langka
            const item = getItemById(rareItem);
            if (item) {
              user.inventory.push(rareItem);
              await sleep(2000);
              reply(`🎁 *Hadiah Kemenangan ke-10!*
Anda mendapatkan: ${item.name}!
Gunakan dengan bijak!`);
            }
          }
          break;
        }

        case 'leaderboard': {
          const users = Object.entries(global.db.users)
            .filter(([id, u]) => u.registered)
            .map(([id, u]) => u)
            .sort((a, b) => b.level - a.level || b.exp - a.exp)
            .slice(0, 10);
          
          if (users.length === 0) return reply("Belum ada pemain yang terdaftar!");
          
          let leaderboardText = "🏆 *TOP 10 PEMAIN* 🏆\n\n";
          
          users.forEach((player, index) => {
            leaderboardText += `${index + 1}. ${player.name} - Lv.${player.level} (EXP: ${player.exp})\n`;
          });
          
          await reply(leaderboardText);
          break;
        }

        case 'owner': {
          await reply(`👑 *Owner Bot:* ${global.namaOwner}\n📞 Nomor: ${global.owner}\n📢 Channel: ${global.linkSaluran}`);
          break;
        }

        // PERINTAH KHUSUS OWNER
        case 'addredeem': {
          if (!isOwner(sender)) return reply(global.mess.owner);
          if (args.length < 2) return reply("Format: .addredeem <kode> <jumlah koin> [item1,item2,...]");
          
          const code = args[0].toUpperCase();
          const coin = parseInt(args[1]);
          const items = args.slice(2).map(id => parseInt(id));
          
          if (isNaN(coin)) return reply("Jumlah koin harus angka!");
          
          global.db.redeemCodes[code] = { coin, items };
          reply(`✅ Kode redeem "${code}" berhasil ditambahkan!\n💰 Koin: ${coin}\n📦 Items: ${items.join(', ') || 'Tidak ada'}`);
          break;
        }

        case 'delredeem': {
          if (!isOwner(sender)) return reply(global.mess.owner);
          if (args.length < 1) return reply("Format: .delredeem <kode>");
          
          const code = args[0].toUpperCase();
          if (!global.db.redeemCodes[code]) return reply("Kode tidak ditemukan!");
          
          delete global.db.redeemCodes[code];
          reply(`✅ Kode redeem "${code}" berhasil dihapus!`);
          break;
        }

        case 'listredeem': {
          if (!isOwner(sender)) return reply(global.mess.owner);
          
          let list = "📋 *Daftar Kode Redeem:*\n\n";
          for (const [code, data] of Object.entries(global.db.redeemCodes)) {
            list += `- ${code}: ${data.coin} koin`;
            if (data.items && data.items.length > 0) {
              list += `, Items: ${data.items.join(', ')}`;
            }
            list += '\n';
          }
          reply(list);
          break;
        }

        case 'setcharacter': {
          if (!isOwner(sender)) return reply(global.mess.owner);
          if (args.length < 3) return reply("Format: .setcharacter <@user> <atribut> <nilai>");
          
          const mention = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
          if (!mention) return reply("Tag pengguna!");
          
          const targetUser = global.db.users[mention];
          if (!targetUser || !targetUser.registered) return reply("Pengguna belum terdaftar!");
          
          const attribute = args[1].toLowerCase();
          const value = parseInt(args[2]);
          if (isNaN(value)) return reply("Nilai harus angka!");
          
          switch (attribute) {
            case 'level':
              targetUser.level = value;
              break;
            case 'strength':
              targetUser.strength = value;
              break;
            case 'health':
              targetUser.health = value;
              targetUser.maxHealth = value;
              break;
            case 'coin':
              targetUser.coin = value;
              break;
            default:
              return reply("Atribut yang valid: level, strength, health, coin");
          }
          
          reply(`✅ Atribut ${attribute} untuk @${mention.split('@')[0]} diubah menjadi ${value}`, {
            mentions: [mention]
          });
          break;
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
      reply(global.mess.error);
    }
  });
};

module.exports.MessagesUpsert = async (ganz, message, store) => {
  // Implementasi jika diperlukan
};