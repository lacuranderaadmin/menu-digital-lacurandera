# 🌵 La Curandera — Menú Digital + Panel Administrador
### *Mezcal · Cortes · Snacks* — Cocina tradicional con el auténtico sabor de nuestras raíces

Plataforma completa de carta digital para comensales y panel de administración en tiempo real, desarrollada con **HTML5 semántico, Vanilla CSS moderno, ES Modules** y backend serverless en **Firebase (Firestore, Storage, Auth y Hosting)**.

---

## 🎨 Identidad Visual y Esencia

Inspirada directamente en el restaurante físico (patio al aire libre, sombrillas rosas y coral, muros de ladrillo, tapetes otomí, agaves y ristras de listones de colores colgando del barandal) y su manual de marca:

- **Colores Oficiales:**
  - Rosa Curandera: `#C94E8F`
  - Terracota: `#E87850`
  - Coral: `#E89078`
  - Durazno: `#F8D0B0`
  - Arena: `#C8A890`
  - Turquesa: `#159F9B`
  - Azul Profundo: `#176A78`
  - Crema de Fondo: `#FDF6EC`
- **Tipografías:**
  - Títulos: **Montserrat 900** (Gotham Bold)
  - Frases Manuscritas: **Caveat Brush / Kalam 700** (Hansief)
  - Recetario y Descripciones: **JetBrains Mono**
- **Iconografía y Patrones:** SVGs artesanales de maguey, chile, limón, hierbas, tortilla, calavera, sol, luna, pócima, corazón, estrella y maíz.

---

## 🏗️ Estructura del Proyecto

```
/
├── public/
│   ├── index.html                  # Menú público del comensal
│   ├── admin/
│   │   ├── index.html              # Login de administración
│   │   └── dashboard.html          # Dashboard multi-sucursal y editor de carta
│   ├── assets/
│   │   ├── logo/logo.png           # Logo oficial de La Curandera
│   │   ├── patterns/               # Patrones SVG (maguey, rombos, ondas)
│   │   └── icons/                  # 12 iconos de marca artesanales
│   ├── css/
│   │   ├── tokens.css              # Variables de color, fuentes y elevaciones
│   │   ├── base.css                # Reset tipográfico y utilidades
│   │   ├── components.css          # Cards, modales, badges, switches, cintas
│   │   ├── menu.css                # Layout del menú, hero y esencia
│   │   └── admin.css               # Estilos del panel de control
│   ├── js/
│   │   ├── firebase-config.js      # Credenciales de tu proyecto Firebase
│   │   ├── firebase-init.js        # Inicialización modular (v10 CDN)
│   │   ├── menu.js                 # Lógica de comensal (onSnapshot realtime)
│   │   ├── admin-auth.js           # Flujo de login y protección de rutas
│   │   ├── admin-dashboard.js      # Editor multi-sucursal, palomeo y batch save
│   │   ├── i18n.js                 # Sistema multi-idioma (ES / EN / FR)
│   │   └── ui.js                   # Interacciones, modal, horario inteligente
│   ├── i18n/
│   │   ├── es.json                 # Textos en español
│   │   ├── en.json                 # Textos en inglés
│   │   └── fr.json                 # Textos en francés
│   └── data/
│       └── catalog.json            # Catálogo completo precargado (89 platillos)
├── scripts/
│   ├── build-catalog.js            # Generador del catálogo
│   ├── seed.js                     # Poblador a Firestore
│   ├── create-admin.js             # Asignación de rol owner en Firestore
│   └── generate-assets.js          # Generador de SVGs de marca
├── firebase.json                   # Hosting rewrites (/menu/:id, /admin, /admin/dashboard)
├── firestore.rules                 # Reglas restrictivas para Firestore
├── storage.rules                   # Reglas de seguridad para Storage
├── firestore.indexes.json          # Índices compuestos
└── package.json                    # Scripts auxiliares
```

---

## ⚡ Conexión y Configuración de Firebase

### 1. Configurar Credenciales Web
Abre `public/js/firebase-config.js` y reemplaza con los valores de tu Web App de Firebase Console:

```javascript
export const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT_ID.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT_ID.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
  googlePlaceId: "TU_GOOGLE_PLACE_ID",
  whatsappNumber: "527141400000"
};
```

### 2. Habilitar Servicios en Firebase Console
1. **Authentication:** Ve a *Authentication* > *Sign-in method* y habilita **Correo electrónico/Contraseña**.
2. **Firestore Database:** Ve a *Firestore Database* y pulsa **Crear base de datos**.
3. **Storage:** Ve a *Storage* y pulsa **Comenzar**.

---

## 🚀 Despliegue y Comandos

### Probar Localmente
```bash
npm run dev
```
Abre en tu navegador:
- Menú comensal: `http://localhost:3000`
- Panel administrador: `http://localhost:3000/admin`

### Sembrar el Catálogo a Firestore (Ejecutar una sola vez)
Una vez colocadas tus credenciales en `firebase-config.js`:
```bash
node scripts/seed.js
```
Este script sube automáticamente las 23 categorías y los 89 platillos oficiales a Firestore.

### Crear y Habilitar el Administrador
1. En Firebase Console > Authentication > Users, crea el usuario con:
   - Correo: `lacurandera.admin@gmail.com`
   - Contraseña: la deseada (ej. `L4Cur4nd3r4.admin`)
2. Copia el **UID** que Firebase le asigna.
3. Ejecuta:
```bash
node scripts/create-admin.js <UID_COPIADO> lacurandera.admin@gmail.com
```

### Desplegar a Firebase Hosting
```bash
npx firebase-tools deploy
```

---

## 📱 Características Clave del Menú

1. **Navegación Inteligente por Horario:**
   - Detecta la hora del comensal: antes de las 13:30 muestra automáticamente **Desayunos**; de 13:30 en adelante muestra **Comida y Cantina**.
   - Permite al comensal cambiar manualmente mediante un switch interactivo.
2. **Sincronización en Tiempo Real:**
   - Con `onSnapshot` de Firestore, cualquier cambio que el administrador realice en el panel se actualiza en las mesas en **< 2 segundos sin recargar la página**.
3. **Multi-idioma con Identidad (ES / EN / FR):**
   - Traducción instantánea conservando intactos términos culturales mexicanos como *aguachile, cochinita pibil, chilaquiles, tampiqueña, mezcal*, etc., acompañados de descripción culinaria.
4. **Cintas de Colores:**
   - Recreación en CSS de las cintas decorativas del restaurante con animación de balanceo continuo (`sway`).
5. **WhatsApp Flotante y Reseñas de Google:**
   - Botón directo para reservar con mensaje prellenado y botón para calificar con 5 estrellas en Google Maps.
