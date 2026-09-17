const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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

const openPath = require.resolve('open', { paths: [fbToolsPath] });
let capturedUrl = null;

// Intercept open
require.cache[openPath] = {
  id: openPath,
  filename: openPath,
  loaded: true,
  exports: function(target, options) {
    capturedUrl = target;
    console.log('\n================================================================');
    console.log('🌵 [LA CURANDERA] URL DE AUTENTICACIÓN GENERADA:');
    console.log(target);
    console.log('================================================================\n');

    // Intentar abrir directamente en modo incógnito con Chrome o Edge
    exec(`start chrome --incognito "${target}"`, (err1) => {
      if (err1) {
        exec(`start msedge --inprivate "${target}"`, (err2) => {
          if (err2) {
            console.log('Abre la URL manualmente en tu ventana privada/incógnito.');
          } else {
            console.log('🚀 Abierto automáticamente en Edge InPrivate');
          }
        });
      } else {
        console.log('🚀 Abierto automáticamente en Chrome Incógnito');
      }
    });

    return Promise.resolve();
  }
};

const auth = require(path.join(fbToolsPath, 'lib', 'auth'));
console.log('Auth loaded with intercepted open.');

// Test loginAdditionalAccount
const targetEmail = 'lacurandera.admin@gmail.com';
console.log(`Starting login for ${targetEmail}...`);

auth.loginAdditionalAccount(true, targetEmail).then((res) => {
  console.log('✅ Success! User:', res.user.email);
  auth.setGlobalDefaultAccount(targetEmail);
  console.log('✅ Global default account set to:', targetEmail);
  process.exit(0);
}).catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
