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
if (!fbToolsPath) fbToolsPath = 'firebase-tools';

const openPath = require.resolve('open', { paths: [fbToolsPath] });

// Intercept open to save URL to file and not open unwanted windows
require.cache[openPath] = {
  id: openPath,
  filename: openPath,
  loaded: true,
  exports: function(target) {
    fs.writeFileSync(path.join(__dirname, 'auth_url.txt'), target, 'utf8');
    fs.writeFileSync(path.join(__dirname, 'login_status.json'), JSON.stringify({ status: 'waiting_for_login', url: target }, null, 2), 'utf8');
    console.log('\n================================================================');
    console.log('🌵 [LA CURANDERA] URL DE AUTENTICACIÓN:');
    console.log(target);
    console.log('================================================================\n');
    return Promise.resolve();
  }
};

const auth = require(path.join(fbToolsPath, 'lib', 'auth'));
const targetEmail = 'lacurandera.admin@gmail.com';
const projectDir = path.resolve(__dirname, '..');

console.log(`Starting Firebase login for ${targetEmail}...`);

auth.loginAdditionalAccount(true, targetEmail).then((res) => {
  console.log('✅ Autenticación exitosa en Firebase:', res.user.email);
  auth.setProjectAccount(projectDir, targetEmail);
  fs.writeFileSync(path.join(__dirname, 'login_status.json'), JSON.stringify({ status: 'success', email: res.user.email, timestamp: new Date().toISOString() }, null, 2), 'utf8');
  console.log(`✅ Proyecto asociado exitosamente a ${targetEmail} en ${projectDir}`);
  setTimeout(() => process.exit(0), 1000);
}).catch((err) => {
  console.error('❌ Error de autenticación:', err);
  fs.writeFileSync(path.join(__dirname, 'login_status.json'), JSON.stringify({ status: 'error', error: err.message }, null, 2), 'utf8');
  process.exit(1);
});
