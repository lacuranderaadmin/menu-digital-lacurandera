/**
 * LA CURANDERA — Firebase Configuration
 * Reemplaza los valores con las credenciales de tu proyecto Firebase Console
 */

export const firebaseConfig = {
  apiKey: "AIzaSyBkyz27AXmdweCV3Oleh-66aYhsxbFiNCc",
  authDomain: "lacurandera-97c3e.firebaseapp.com",
  projectId: "lacurandera-97c3e",
  storageBucket: "lacurandera-97c3e.firebasestorage.app",
  messagingSenderId: "551990276427",
  appId: "1:551990276427:web:9ea00382aceeb44bb978ce",
  measurementId: "G-NEN7QP4K7R",
  // Si tienes el Google Place ID para reseñas:
  googlePlaceId: "ChIJu4FWH86_zYURzAbOmQ_PqTE",
  // WhatsApp oficial del restaurante (formato internacional sin +)
  whatsappNumber: "527141400000"
};

// Permite sobreescribir desde localStorage o consola si estamos en navegador
if (typeof localStorage !== 'undefined') {
  const storedConfig = localStorage.getItem('lc_firebase_config');
  if (storedConfig) {
    try {
      Object.assign(firebaseConfig, JSON.parse(storedConfig));
    } catch (e) {
      console.warn("Could not parse stored Firebase config", e);
    }
  }
}

