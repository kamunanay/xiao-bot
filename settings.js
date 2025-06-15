const fs = require('fs');
const chalk = require('chalk');
const { version } = require("./package.json");

//~~~~~~~~~~~ Settings Bot ~~~~~~~~~~~//
global.owner = '6281295344364';
global.prefix = '.';
global.namaBot = "Xiao Bot";
global.namaOwner = "Ganz";
global.linkGrup = "https://chat.whatsapp.com/...";
global.linkSaluran = "https://t.me/...";
global.versi = "1.0";

//~~~~~~~~~~ Settings RPG ~~~~~~~~~~//
global.characters = {
  elements: ["Api", "Angin", "Air", "Es", "Tanah", "Petir", "Cahaya", "Kegelapan"],
  equipments: {
    armor: [
      { id: 1, name: "Jirah Kayu", defense: 10, price: 100 },
      { id: 2, name: "Jirah Besi", defense: 25, price: 300 },
      { id: 3, name: "Jirah Naga", defense: 50, price: 1000 }
    ],
    weapons: [
      { id: 4, name: "Pedang Bambu", attack: 15, price: 150 },
      { id: 5, name: "Pedang Besi", attack: 30, price: 450 },
      { id: 6, name: "Pedang Surgawi", attack: 60, price: 1500 }
    ],
    pills: [
      { id: 7, name: "Pil Qi", effect: "health", value: 50, price: 80 },
      { id: 8, name: "Pil Meridian", effect: "strength", value: 10, price: 120 },
      { id: 9, name: "Pil Jiuzhuan", effect: "health", value: 100, price: 200 }
    ]
  },
  monsters: [
    { name: "Slime", health: 50, strength: 5, exp: 10, coin: 20 },
    { name: "Goblin", health: 100, strength: 15, exp: 30, coin: 50 },
    { name: "Serigala Liar", health: 150, strength: 25, exp: 50, coin: 80 },
    { name: "Orc", health: 200, strength: 35, exp: 70, coin: 100 },
    { name: "Naga", health: 500, strength: 50, exp: 200, coin: 500 }
  ]
};

global.redeemCodes = {
  "DRAGON2024": { coin: 500, items: [9] },
  "CULTIVATOR": { coin: 300, items: [8] },
  "IMMORTAL": { coin: 1000, items: [6] }
};

//~~~~~~~~~~ Settings Message ~~~~~~~~//
global.mess = {
    owner: "*[ Akses Ditolak ]*\nFitur ini hanya Untuk Owner",
    botAdmin: "*[ Akses Ditolak ]*\nFitur ini hanya untuk ketika bot menjadi admin!",
    group: "*[ Akses Ditolak ]*\nFitur ini hanya untuk dalam grup!",
    private: "*[ Akses Ditolak ]*\nFitur ini hanya untuk dalam private chat!",
    wait: 'Loading...',
    error: 'Error!',
    done: 'Done'
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});