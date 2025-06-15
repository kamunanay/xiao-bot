const fs = require('fs');
const crypto = require('crypto');

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getItemById(id) {
  for (const category in global.characters.equipments) {
    for (const item of global.characters.equipments[category]) {
      if (item.id === id) return item;
    }
  }
  return null;
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000);
  return `${hours} jam ${minutes} menit ${seconds} detik`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isOwner(sender) {
  return sender === global.owner + '@s.whatsapp.net';
}

module.exports = {
  pickRandom,
  getItemById,
  formatDuration,
  randomInt,
  isOwner
};