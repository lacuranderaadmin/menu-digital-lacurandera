/**
 * LA CURANDERA — Creación y Asignación de Permisos de Administrador
 * Ejecuta con: node scripts/create-admin.js <ADMIN_UID>
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "../public/js/firebase-config.js";

async function createAdmin() {
  const uid = process.argv[2];
  const email = process.argv[3] || "lacurandera.admin@gmail.com";

  if (!uid) {
    console.log(`
ℹ️ USO DEL SCRIPT:
   node scripts/create-admin.js <UID_DEL_USUARIO> [EMAIL]

PASOS PARA OBTENER EL UID:
1. Entra a Firebase Console > Authentication > Users.
2. Crea el usuario con el correo: ${email}
3. Copia el 'Identificador de usuario' (UID) que Firebase le asigna.
4. Ejecuta: node scripts/create-admin.js <EL_UID_COPIADO>
    `);
    process.exit(0);
  }

  if (firebaseConfig.apiKey.includes("Placeholder")) {
    console.error("❌ Por favor configura primero tus credenciales reales en public/js/firebase-config.js");
    process.exit(1);
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log(`Asignando rol 'owner' al usuario ${email} (UID: ${uid})...`);

  await setDoc(doc(db, "admins", uid), {
    email: email,
    restaurantId: "la-curandera",
    role: "owner",
    branches: "all",
    createdAt: new Date()
  }, { merge: true });

  console.log(`✅ ¡Permisos de administrador concedidos exitosamente en Firestore (/admins/${uid})!`);
  process.exit(0);
}

createAdmin().catch(err => {
  console.error("Error al crear administrador:", err);
  process.exit(1);
});
