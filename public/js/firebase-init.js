/**
 * LA CURANDERA — Firebase Initialization (Modular ES6 CDN)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import { firebaseConfig } from "./firebase-config.js";

let app, auth, db, storage;
let isConfigured = false;

try {
  // Comprobar si la API key es válida o placeholder
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("Placeholder")) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    isConfigured = true;
    console.log("🌵 [La Curandera] Firebase conectado correctamente.");
  } else {
    console.warn("⚠️ [La Curandera] Usando configuración de demostración local. Reemplaza firebase-config.js con tus credenciales.");
  }
} catch (error) {
  console.error("Error al inicializar Firebase:", error);
}

export { 
  app, 
  auth, 
  db, 
  storage, 
  isConfigured,
  // Auth exports
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  // Firestore exports
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  // Storage exports
  ref, 
  uploadBytes, 
  getDownloadURL 
};
