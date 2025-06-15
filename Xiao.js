process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

require('./settings');
const { pickRandom, getItemById, formatDuration, randomInt, isOwner, sleep } = require('./function');

const totalfitur = () => {
  const commands = [
    'daftar', 'profile', 'inventory', 'shop', 'beli', 'pakai', 'daily', 'redeem', 
    'battle', 'leaderboard', 'menu', 'owner', 'addredeem', 'delredeem', 'listredeem',
    'setcharacter'
  ];
  return commands.length;
};

const createBox = (title, content) => {
  const lines = content.split('\n');
  const titleLength = title.length;
  const contentLength = Math.max(...lines.map(line => line.length));
  const maxLength = Math.max(titleLength, contentLength);
  
  const topBorder = '╔' + '═'.repeat(maxLength + 4) + '╗';
  const bottomBorder = '╚' + '═'.repeat(maxLength + 4) + '╝';
  const separator = '╠' + '═'.repeat(maxLength + 4) + '╣';
  
  let box = `${topBorder}\n║  ${title.padEnd(maxLength)}  ║\n${separator}\n`;
  
  lines.forEach(line => {
    box += `║  ${line.padEnd(maxLength)}  ║\n`;
  });
  
  box += bottomBorder;
  return box;
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

    // Initialize user
    if (!global.db.users[sender]) {
      global.db.users[sender] = {
        name: pushName,
        registered: false,
        lastDaily: 0,
        battleCooldown: 0,
        victoryCount: 0
      };
    }
    const user = global.db.users[sender];
    
    try {
      switch (command) {
        case 'menu':
        case 'help': {
          const totalFitur = totalfitur();
          const menuText = createBox(
            `🏮 ${global.namaBot} 🏮`, 
            `📜 *Profil Karakter:*\n` +
            `• ${global.prefix}daftar <nama> - Daftarkan karakter\n` +
            `• ${global.prefix}profile - Lihat profilmu\n` +
            `• ${global.prefix}inventory - Item inventory\n\n` +
            `🏪 *Toko & Ekonomi:*\n` +
            `• ${global.prefix}shop - Lihat toko\n` +
            `• ${global.prefix}beli <item> - Beli item\n` +
            `• ${global.prefix}pakai <item> - Pakai item\n` +
            `• ${global.prefix}daily - Hadiah harian\n` +
            `• ${global.prefix}redeem <kode> - Tukar kode\n\n` +
            `⚔️ *Pertarungan:*\n` +
            `• ${global.prefix}battle - Lawan monster\n` +
            `• ${global.prefix}leaderboard - Peringkat pemain\n\n` +
            `👑 *Perintah Owner:*\n` +
            `• ${global.prefix}addredeem - Tambah kode\n` +
            `• ${global.prefix}delredeem - Hapus kode\n` +
            `• ${global.prefix}listredeem - Daftar kode\n` +
            `• ${global.prefix}setcharacter - Edit karakter\n\n` +
            `ℹ️ *Lainnya:*\n` +
            `• ${global.prefix}owner - Info pemilik\n` +
            `• ${global.prefix}menu - Tampilkan ini\n\n` +
            `🔢 Total Fitur: ${totalFitur}\n` +
            `👤 Owner: ${global.namaOwner}\n` +
            `📱 Versi: ${global.versi}`
          );
          await reply(menuText);
          break;
        }

        case 'daftar': {
          if (user.registered) return reply(createBox('⚠️ Peringatan', 'Anda sudah terdaftar!'));
          
          const name = body.slice(7).trim();
          if (!name) return reply(createBox('❌ Error', `Format: ${global.prefix}daftar <nama_karakter>`));
          
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
          
          const successText = createBox(
            '✨ Pendaftaran Berhasil!',
            `📛 Nama: ${name}\n` +
            `⚡ Element: ${element}\n` +
            `💪 Kekuatan: ${strength}\n` +
            `❤️ Darah: ${health}\n` +
            `💰 Koin: ${user.coin}\n\n` +
            `Gunakan ${global.prefix}profile untuk melihat statmu!`
          );
          reply(successText);
          break;
        }

        case 'profile': {
          if (!user.registered) return reply(createBox('⚠️ Peringatan', `Anda belum terdaftar! Ketik ${global.prefix}daftar`));
          
          const armor = user.equipment.armor ? user.equipment.armor.name : "Tidak ada";
          const weapon = user.equipment.weapon ? user.equipment.weapon.name : "Tidak ada";
          const expNeeded = user.level * 100 - user.exp;
          const attackBonus = user.equipment.weapon ? `(+${user.equipment.weapon.attack})` : '';
          const defenseBonus = user.equipment.armor ? `(+${user.equipment.armor.defense})` : '';
          
          const profileText = createBox(
            `📊 ${user.name} - Level ${user.level}`,
            `⚡ Element: ${user.element}\n` +
            `💪 Kekuatan: ${user.strength} ${attackBonus}\n` +
            `❤️ HP: ${user.health}/${user.maxHealth} ${defenseBonus}\n` +
            `✨ EXP: ${user.exp}/${user.level * 100} (Butuh ${expNeeded} EXP)\n` +
            `💰 Koin: ${user.coin}\n` +
            `🏆 Kemenangan: ${user.victoryCount}/10\n\n` +
            `🛡️ Armor: ${armor}\n` +
            `⚔️ Senjata: ${weapon}\n` +
            `📦 Inventory: ${user.inventory.length} item\n` +
            `⏳ Daily: ${user.lastDaily > 0 ? "Sudah diambil" : "Belum diambil"}`
          );
          
          await reply(profileText);
          break;
        }

        case 'inventory': {
          if (!user.registered) return reply(createBox('⚠️ Peringatan', `Anda belum terdaftar! Ketik ${global.prefix}daftar`));
          
          if (user.inventory.length === 0) return reply(createBox('📦 Inventory', 'Inventory Anda kosong!'));
          
          let invText = "";
          const itemsCount = {};
          
          user.inventory.forEach(itemId => {
            itemsCount[itemId] = (itemsCount[itemId] || 0) + 1;
          });
          
          Object.keys(itemsCount).forEach(itemId => {
            const item = getItemById(parseInt(itemId));
            if (item) {
              invText += `• ${item.name} (x${itemsCount[itemId]})\n`;
            }
          });
          
          await reply(createBox(
            '📦 Inventory Anda',
            invText + `\nGunakan ${global.prefix}pakai [nama item] untuk menggunakan item`
          ));
          break;
        }

        case 'shop': {
          let shopText = `💰 Koin Anda: ${user.coin}\n\n`;
          
          // Armor
          shopText += "🛡️ *JIRAH:*\n";
          global.characters.equipments.armor.forEach(item => {
            shopText += `• ${item.name} (🛡️${item.defense}) : ${item.price} koin\n`;
          });
          
          // Weapons
          shopText += "\n⚔️ *SENJATA:*\n";
          global.characters.equipments.weapons.forEach(item => {
            shopText += `• ${item.name} (⚔️${item.attack}) : ${item.price} koin\n`;
          });
          
          // Pills
          shopText += "\n💊 *PIL AJAIB:*\n";
          global.characters.equipments.pills.forEach(item => {
            let effect = "";
            if (item.effect === "health") effect = `❤️+${item.value}HP`;
            else if (item.effect === "strength") effect = `💪+${item.value}ATK`;
            shopText += `• ${item.name} (${effect}) : ${item.price} koin\n`;
          });
          
          await reply(createBox(
            '🏪 Toko Peralatan',
            shopText + `\nBeli dengan: ${global.prefix}beli [nama item]`
          ));
          break;
        }

        case 'beli': {
          if (!user.registered) return reply(createBox('⚠️ Peringatan', `Anda belum terdaftar! Ketik ${global.prefix}daftar`));
          
          const itemName = args.join(' ');
          if (!itemName) return reply(createBox('❌ Error', `Format: ${global.prefix}beli [nama item]`));
          
          let foundItem = null;
          let category = null;
          
          // Search item
          for (const [cat, items] of Object.entries(global.characters.equipments)) {
            const item = items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
            if (item) {
              foundItem = item;
              category = cat;
              break;
            }
          }
          
          if (!foundItem) return reply(createBox('❌ Error', 'Item tidak ditemukan!'));
          if (user.coin < foundItem.price) {
            return reply(createBox(
              '⚠️ Koin Tidak Cukup',
              `Dibutuhkan: ${foundItem.price} koin\n` +
              `Anda memiliki: ${user.coin} koin`
            ));
          }
          
          user.coin -= foundItem.price;
          
          if (category === 'pills') {
            user.inventory.push(foundItem.id);
            reply(createBox(
              '✅ Pembelian Berhasil',
              `Anda membeli: ${foundItem.name}\n` +
              `Gunakan dengan: ${global.prefix}pakai ${foundItem.name}`
            ));
          } else {
            user.equipment[category] = foundItem;
            reply(createBox(
              '✅ Pembelian Berhasil',
              `Anda membeli dan memakai: ${foundItem.name}\n` +
              `Koin tersisa: ${user.coin}`
            ));
          }
          break;
        }

        case 'pakai': {
          if (!user.registered) return reply(createBox('⚠️ Peringatan', `Anda belum terdaftar! Ketik ${global.prefix}daftar`));
          
          const itemName = args.join(' ');
          if (!itemName) return reply(createBox('❌ Error', `Format: ${global.prefix}pakai [nama item]`));
          
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
          
          if (!foundItem) return reply(createBox('❌ Error', 'Item tidak ditemukan di inventory!'));
          if (foundItem.effect !== "health" && foundItem.effect !== "strength") {
            return reply(createBox('⚠️ Peringatan', 'Item ini tidak bisa digunakan!'));
          }
          
          // Use item
          let effectText = '';
          if (foundItem.effect === "health") {
            user.health = Math.min(user.health + foundItem.value, user.maxHealth);
            effectText = `❤️ Darah pulih +${foundItem.value}! (Sekarang: ${user.health}/${user.maxHealth})`;
          } else if (foundItem.effect === "strength") {
            user.strength += foundItem.value;
            effectText = `💪 Kekuatan meningkat +${foundItem.value}! (Sekarang: ${user.strength})`;
          }
          
          // Remove from inventory
          user.inventory.splice(itemIndex, 1);
          
          reply(createBox(
            '✅ Item Digunakan',
            `${foundItem.name} telah digunakan!\n\n${effectText}`
          ));
          break;
        }

        case 'daily': {
          if (!user.registered) return reply(createBox('⚠️ Peringatan', `Anda belum terdaftar! Ketik ${global.prefix}daftar`));
          
          const now = Date.now();
          const lastDaily = user.lastDaily || 0;
          const oneDay = 24 * 60 * 60 * 1000;
          
          if (now - lastDaily < oneDay) {
            const nextDaily = lastDaily + oneDay;
            const remaining = formatDuration(nextDaily - now);
            return reply(createBox(
              '⏳ Cooldown',
              `Anda sudah mengambil hadiah harian hari ini.\nSilakan kembali dalam ${remaining}.`
            ));
          }
          
          const coinReward = isOwner(sender) ? 500 : 100;
          user.coin += coinReward;
          user.lastDaily = now;
          
          // Add Qi Pill
          const pilQi = global.characters.equipments.pills.find(p => p.name === "Pil Qi");
          if (pilQi) user.inventory.push(pilQi.id);
          
          reply(createBox(
            '🎁 Hadiah Harian',
            `💰 +${coinReward} Koin\n` +
            `💊 +1 Pil Qi\n\n` +
            `Jangan lupa mengambil lagi besok!`
          ));
          break;
        }

        case 'redeem': {
          if (!user.registered) return reply(createBox('⚠️ Peringatan', `Anda belum terdaftar! Ketik ${global.prefix}daftar`));
          
          const code = args[0];
          if (!code) return reply(createBox('❌ Error', `Format: ${global.prefix}redeem [kode]`));
          
          const reward = global.db.redeemCodes[code.toUpperCase()];
          if (!reward) return reply(createBox('❌ Error', 'Kode tidak valid atau sudah kadaluarsa!'));
          
          user.coin += reward.coin;
          let rewardText = `🎉 Kode berhasil ditebus!\n💰 +${reward.coin} Koin`;
          
          if (reward.items && reward.items.length > 0) {
            reward.items.forEach(itemId => {
              user.inventory.push(itemId);
              const item = getItemById(itemId);
              if (item) rewardText += `\n📦 +1 ${item.name}`;
            });
          }
          
          reply(createBox('✅ Redeem Berhasil', rewardText));
          
          // Delete code after use
          delete global.db.redeemCodes[code.toUpperCase()];
          break;
        }

        case 'battle': {
          if (!user.registered) return reply(createBox('⚠️ Peringatan', `Anda belum terdaftar! Ketik ${global.prefix}daftar`));
          
          const now = Date.now();
          if (now - user.battleCooldown < 30000) {
            const remaining = formatDuration(30000 - (now - user.battleCooldown));
            return reply(createBox(
              '⏳ Cooldown',
              `Anda masih dalam cooldown!\nSilakan tunggu ${remaining} lagi.`
            ));
          }
          
          const monster = pickRandom(global.characters.monsters);
          const userAttack = user.strength + (user.equipment.weapon ? user.equipment.weapon.attack : 0);
          const userDefense = user.equipment.armor ? user.equipment.armor.defense : 0;
          
          const monsterDamage = Math.max(0, monster.strength - userDefense);
          const userDamage = Math.max(1, userAttack);
          
          // Calculate battle result
          const userHits = Math.ceil(monster.health / userDamage);
          const monsterHits = Math.ceil(user.health / monsterDamage);
          
          let resultText = "";
          let victory = false;
          
          if (userHits <= monsterHits) {
            // Player wins
            victory = true;
            const expGain = monster.exp;
            const coinGain = monster.coin;
            
            user.exp += expGain;
            user.coin += coinGain;
            user.battleCount++;
            user.victoryCount++;
            resultText = `🎉 *Anda Menang!*\n\n` +
              `Anda mengalahkan ${monster.name}!\n` +
              `✨ EXP +${expGain}\n` +
              `💰 Koin +${coinGain}`;
            
            // Check level up
            const expNeeded = user.level * 100;
            if (user.exp >= expNeeded) {
              user.level++;
              user.strength += 5;
              user.maxHealth += 20;
              user.health = user.maxHealth;
              resultText += `\n\n✨ *LEVEL UP!*\nSekarang level ${user.level}!`;
            }
          } else {
            // Player loses
            user.health = Math.floor(user.maxHealth * 0.5);
            resultText = `😭 *Anda Kalah!*\n\n` +
              `${monster.name} terlalu kuat!\n` +
              `❤️ Darah tersisa: ${user.health}/${user.maxHealth}\n` +
              `⚠️ Pulihkan darah dengan Pil Qi`;
          }
          
          user.battleCooldown = now;
          await reply(createBox(
            `⚔️ Battle vs ${monster.name}`,
            resultText
          ));
          
          // Give 10th victory reward
          if (victory && user.victoryCount >= 10) {
            user.victoryCount = 0;
            const rareItem = pickRandom([3, 6, 9]); // Rare item IDs
            const item = getItemById(rareItem);
            if (item) {
              user.inventory.push(rareItem);
              await sleep(2000);
              reply(createBox(
                '🎁 Hadiah Kemenangan!',
                `Anda mendapatkan: ${item.name}!\n` +
                `Gunakan dengan bijak!`
              ));
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
          
          if (users.length === 0) return reply(createBox('🏆 Leaderboard', 'Belum ada pemain yang terdaftar!'));
          
          let leaderboardText = "";
          users.forEach((player, index) => {
            leaderboardText += `${index + 1}. ${player.name} - Lv.${player.level} (EXP: ${player.exp})\n`;
          });
          
          await reply(createBox(
            '🏆 TOP 10 PEMAIN',
            leaderboardText
          ));
          break;
        }

        case 'owner': {
          await reply(createBox(
            '👑 Owner Bot',
            `Nama: ${global.namaOwner}\n` +
            `Nomor: ${global.owner}\n` +
            `Channel: ${global.linkSaluran}`
          ));
          break;
        }

        // OWNER COMMANDS
        case 'addredeem': {
          if (!isOwner(sender)) return reply(createBox('⚠️ Akses Ditolak', 'Hanya owner yang bisa menggunakan perintah ini!'));
          if (args.length < 2) return reply(createBox('❌ Error', `Format: ${global.prefix}addredeem <kode> <jumlah koin> [item1,item2,...]`));
          
          const code = args[0].toUpperCase();
          const coin = parseInt(args[1]);
          const items = args.slice(2).map(id => parseInt(id));
          
          if (isNaN(coin)) return reply(createBox('❌ Error', 'Jumlah koin harus angka!'));
          
          global.db.redeemCodes[code] = { coin, items };
          reply(createBox(
            '✅ Kode Redeem Ditambahkan',
            `Kode: ${code}\n` +
            `💰 Koin: ${coin}\n` +
            `📦 Items: ${items.join(', ') || 'Tidak ada'}`
          ));
          break;
        }

        case 'delredeem': {
          if (!isOwner(sender)) return reply(createBox('⚠️ Akses Ditolak', 'Hanya owner yang bisa menggunakan perintah ini!'));
          if (args.length < 1) return reply(createBox('❌ Error', `Format: ${global.prefix}delredeem <kode>`));
          
          const code = args[0].toUpperCase();
          if (!global.db.redeemCodes[code]) return reply(createBox('❌ Error', 'Kode tidak ditemukan!'));
          
          delete global.db.redeemCodes[code];
          reply(createBox('✅ Berhasil', `Kode redeem "${code}" telah dihapus!`));
          break;
        }

        case 'listredeem': {
          if (!isOwner(sender)) return reply(createBox('⚠️ Akses Ditolak', 'Hanya owner yang bisa menggunakan perintah ini!'));
          
          let list = "";
          for (const [code, data] of Object.entries(global.db.redeemCodes)) {
            list += `- ${code}: ${data.coin} koin`;
            if (data.items && data.items.length > 0) {
              list += `, Items: ${data.items.join(', ')}`;
            }
            list += '\n';
          }
          
          if (!list) list = "Tidak ada kode redeem yang tersedia";
          reply(createBox('📋 Daftar Kode Redeem', list));
          break;
        }

        case 'setcharacter': {
          if (!isOwner(sender)) return reply(createBox('⚠️ Akses Ditolak', 'Hanya owner yang bisa menggunakan perintah ini!'));
          if (args.length < 3) return reply(createBox('❌ Error', `Format: ${global.prefix}setcharacter <@user> <atribut> <nilai>`));
          
          const mention = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
          if (!mention) return reply(createBox('❌ Error', 'Tag pengguna!'));
          
          const targetUser = global.db.users[mention];
          if (!targetUser || !targetUser.registered) return reply(createBox('❌ Error', 'Pengguna belum terdaftar!'));
          
          const attribute = args[1].toLowerCase();
          const value = parseInt(args[2]);
          if (isNaN(value)) return reply(createBox('❌ Error', 'Nilai harus angka!'));
          
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
              return reply(createBox('❌ Error', 'Atribut yang valid: level, strength, health, coin'));
          }
          
          reply(createBox(
            '✅ Atribut Diubah',
            `Atribut ${attribute} untuk @${mention.split('@')[0]}\n` +
            `Diubah menjadi: ${value}`
          ), {
            mentions: [mention]
          });
          break;
        }

        default:
          if (body.startsWith(global.prefix)) {
            await reply(createBox(
              '❌ Command Tidak Dikenali',
              `Ketik ${global.prefix}menu untuk melihat daftar command yang tersedia.`
            ));
          }
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      reply(createBox(
        '⚠️ Error',
        'Terjadi kesalahan saat memproses permintaan.\nSilakan coba lagi atau hubungi owner.'
      ));
    }
  });
};

module.exports.MessagesUpsert = async (ganz, message, store) => {
  // Implementation if needed
};
