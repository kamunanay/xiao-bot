const fs = require('fs');

class DataBase {
  constructor() {
    this.path = './database.json';
    this.initialize();
  }

  initialize() {
    if (!fs.existsSync(this.path)) {
      fs.writeFileSync(this.path, '{}', 'utf-8');
    }
  }

  read() {
    return new Promise((resolve, reject) => {
      fs.readFile(this.path, 'utf-8', (err, data) => {
        if (err) return reject(err);
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({});
        }
      });
    });
  }

  write(data) {
    return new Promise((resolve, reject) => {
      fs.writeFile(this.path, JSON.stringify(data, null, 2), 'utf-8', (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  }
}

module.exports = DataBase;