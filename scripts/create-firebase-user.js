import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "../public/js/firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const email = "lacurandera.admin@gmail.com";
const password = "L4Cur4nd3r4.admin";

async function main() {
  console.log(`Intentando autenticar/crear usuario administrador ${email}...`);
  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ Usuario ya existía en Firebase Auth. Sesión iniciada:", userCredential.user.uid);
  } catch (err) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      console.log("Creando nuevo usuario en Firebase Auth...");
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("✅ Usuario creado exitosamente con UID:", userCredential.user.uid);
    } else {
      console.error("Error al autenticar/crear:", err.code, err.message);
      return;
    }
  }

  const uid = userCredential.user.uid;
  console.log(`Configurando permisos de administrador en /admins/${uid}...`);
  await setDoc(doc(db, "admins", uid), {
    uid: uid,
    email: email,
    role: "owner",
    restaurantId: "la-curandera",
    branches: "all",
    name: "Administrador General",
    createdAt: new Date()
  }, { merge: true });

  console.log("🎉 ¡Administrador configurado con permisos totales en Firestore!");
  process.exit(0);
}

main().catch(console.error);
