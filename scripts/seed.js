/**
 * LA CURANDERA — Script de Semilla Firestore (Poblado Automático)
 * Ejecuta con: node scripts/seed.js
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, writeBatch } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, "../public/data/catalog.json");
const { categories, products } = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

// Lee las credenciales de firebase-config.js
import { firebaseConfig } from "../public/js/firebase-config.js";

async function runSeed() {
  console.log("🌵 [La Curandera] Iniciando carga de catálogo a Firestore...");
  
  if (firebaseConfig.apiKey.includes("Placeholder")) {
    console.error("❌ Por favor configura primero tus credenciales reales en public/js/firebase-config.js");
    process.exit(1);
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const restaurantId = "la-curandera";

  // 1. Restaurante Base
  console.log("Configurando documento del restaurante...");
  await setDoc(doc(db, "restaurants", restaurantId), {
    name: "La Curandera",
    slug: "la-curandera",
    description: "Cocina tradicional con el auténtico sabor de nuestras raíces.",
    phone: "+52 714 140 0000",
    whatsapp: "527141400000",
    googleMapsUrl: "https://maps.app.goo.gl/RpGz3QzEo9cP7oiT8",
    googlePlaceId: firebaseConfig.googlePlaceId || "",
    brand: {
      colors: {
        rosa: "#C94E8F",
        terracota: "#E87850",
        turquesa: "#159F9B",
        crema: "#FDF6EC"
      }
    },
    updatedAt: new Date()
  }, { merge: true });

  // 2. Sucursal Inicial
  console.log("Configurando sucursal Metepec...");
  await setDoc(doc(db, `restaurants/${restaurantId}/branches`, "metepec"), {
    name: "La Curandera",
    address: "Tenancingo / Metepec, Edo. Méx.",
    phone: "+52 714 140 0000",
    whatsapp: "527141400000",
    isActive: true,
    hours: {
      desayuno: "9:00 AM - 1:30 PM",
      comida: "1:30 PM - 7:30 PM",
      cantina: "Todo el horario"
    }
  }, { merge: true });

  // 3. Categorías
  console.log("Cargando categorías (" + categories.length + ")...");
  for (const cat of categories) {
    await setDoc(doc(db, `restaurants/${restaurantId}/categories`, cat.id), {
      ...cat,
      updatedAt: new Date()
    }, { merge: true });
  }

  // 4. Productos
  console.log("Cargando productos (" + products.length + ")...");
  for (const prod of products) {
    await setDoc(doc(db, `restaurants/${restaurantId}/products`, prod.id), {
      ...prod,
      updatedAt: new Date()
    }, { merge: true });
  }

  console.log("🎉 ¡Catálogo completo de La Curandera sembrado con éxito en Firestore!");
  process.exit(0);
}

runSeed().catch(err => {
  console.error("Error sembrando Firestore:", err);
  process.exit(1);
});
