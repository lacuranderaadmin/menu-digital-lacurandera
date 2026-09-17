const fs = require('fs');
const path = require('path');

const cacheDir = path.join(process.env.LOCALAPPDATA, 'npm-cache', '_npx');
let fbToolsPath = null;
if (fs.existsSync(cacheDir)) {
  for (const dir of fs.readdirSync(cacheDir)) {
    const p = path.join(cacheDir, dir, 'node_modules', 'firebase-tools');
    if (fs.existsSync(p)) {
      fbToolsPath = p;
      break;
    }
  }
}

const authFile = fs.readFileSync(path.join(fbToolsPath, 'lib', 'auth.js'), 'utf8');
const lines = authFile.split('\n');
for (let i = 0; i < 40; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
