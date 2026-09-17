const fs = require('fs');
const path = require('path');

// Localizar paquete firebase-tools
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

if (!fbToolsPath) {
  fbToolsPath = 'firebase-tools';
}

console.log('Using firebase-tools from:', fbToolsPath);

const { logger, useConsoleLoggers } = require(path.join(fbToolsPath, 'lib', 'logger'));
if (useConsoleLoggers) useConsoleLoggers();

const auth = require(path.join(fbToolsPath, 'lib', 'auth'));

async function main() {
  const targetEmail = 'lacurandera.admin@gmail.com';
  console.log(`\n========================================================`);
  console.log(`🌵 [La Curandera] Preparando autenticación para ${targetEmail}`);
  console.log(`========================================================\n`);

  try {
    const result = await auth.loginAdditionalAccount(true, targetEmail);
    console.log(`\n✅ ¡Autenticación exitosa para: ${result.user.email}!`);

    // Establecer como cuenta activa predeterminada
    auth.setGlobalDefaultAccount(targetEmail);
    console.log(`✅ Cuenta activa predeterminada configurada: ${targetEmail}`);
    console.log(`\n🎉 Firebase CLI ahora está 100% conectado a ${targetEmail}.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error durante la autenticación:', err);
    process.exit(1);
  }
}

main();
