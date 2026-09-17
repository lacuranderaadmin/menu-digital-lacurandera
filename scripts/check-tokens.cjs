const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
console.log('Top level keys:', Object.keys(data));
console.log('User field:', data.user);
