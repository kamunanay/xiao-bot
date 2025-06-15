module.exports = {
    isOwner: (sender) => sender === global.owner + '@s.whatsapp.net',
    
    pickRandom: (arr) => {
        return arr[Math.floor(Math.random() * arr.length)];
    },
    
    formatDuration: (ms) => {
        const seconds = Math.floor(ms / 1000) % 60;
        const minutes = Math.floor(ms / (1000 * 60)) % 60;
        const hours = Math.floor(ms / (1000 * 60 * 60));
        return `${hours}h ${minutes}m ${seconds}s`;
    },
    
    getItem: (type, id) => {
        return global.shopItems[type].find(item => item.id === id);
    }
};
