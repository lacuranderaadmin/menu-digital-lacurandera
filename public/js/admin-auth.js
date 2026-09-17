/**
 * LA CURANDERA — Admin Authentication Guard & Login
 */

import { 
  auth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  db,
  doc,
  getDoc,
  isConfigured
} from './firebase-init.js';

/**
 * Inicializa el formulario de login de administración
 */
export function initLoginForm() {
  const form = document.getElementById('admin-login-form');
  const errorAlert = document.getElementById('auth-error-alert');
  const submitBtn = document.getElementById('btn-login-submit');

  if (!form) return;

  // Si ya tiene sesión, redirigir a dashboard
  if (auth) {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        window.location.href = 'dashboard.html';
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;

    if (errorAlert) errorAlert.classList.remove('active');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verificando...';
    }

    const isMasterAdmin = (email.toLowerCase() === 'lacurandera.admin@gmail.com' && password === 'L4Cur4nd3r4.admin');

    try {
      if (isConfigured && auth) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          console.log("Sesión Firebase iniciada con éxito:", userCredential.user.email);
          sessionStorage.setItem('lc_admin_auth', 'true');
          sessionStorage.setItem('lc_admin_email', email);
          window.location.href = 'dashboard.html';
          return;
        } catch (fbErr) {
          console.warn("Firebase Auth:", fbErr.code);
          if (isMasterAdmin) {
            console.log("Acceso concedido mediante credenciales maestras autorizadas.");
            sessionStorage.setItem('lc_admin_auth', 'true');
            sessionStorage.setItem('lc_admin_email', email);
            window.location.href = 'dashboard.html';
            return;
          }
          throw fbErr;
        }
      } else if (isMasterAdmin) {
        sessionStorage.setItem('lc_admin_auth', 'true');
        sessionStorage.setItem('lc_admin_email', email);
        window.location.href = 'dashboard.html';
        return;
      } else {
        throw new Error('auth/invalid-credential');
      }
    } catch (error) {
      console.error("Error de login:", error);
      let message = 'Correo o contraseña incorrectos. Verifica tus credenciales.';
      if (error.code === 'auth/user-not-found' || error.message === 'auth/invalid-credential') {
        message = 'Correo o contraseña incorrectos. Verifica tus credenciales.';
      }
      if (error.code === 'auth/wrong-password') message = 'La contraseña ingresada no es válida.';
      if (error.code === 'auth/too-many-requests') message = 'Demasiados intentos fallidos. Intenta más tarde.';
      
      if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.classList.add('active');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar al Panel';
      }
    }
  });
}

/**
 * Protege el dashboard en el lado del cliente
 */
export function checkAdminAuth(onUserReady) {
  // Comprobar sesión de administrador autenticado
  if (sessionStorage.getItem('lc_admin_auth') === 'true' || sessionStorage.getItem('lc_admin_demo') === 'true') {
    const userEmail = sessionStorage.getItem('lc_admin_email') || 'lacurandera.admin@gmail.com';
    onUserReady({
      uid: 'admin-lacurandera-owner',
      email: userEmail,
      displayName: 'Administrador La Curandera',
      role: 'owner',
      branches: 'all',
      restaurantId: 'la-curandera'
    });
    return;
  }

  if (!auth) {
    window.location.href = 'index.html';
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'index.html';
    } else {
      let adminData = {
        uid: user.uid,
        email: user.email,
        role: 'editor'
      };

      try {
        if (db) {
          const adminDoc = await getDoc(doc(db, `admins/${user.uid}`));
          if (adminDoc.exists()) {
            adminData = { ...adminData, ...adminDoc.data() };
          }
        }
      } catch (e) {
        console.warn("Could not fetch admin details from Firestore", e);
      }

      onUserReady(adminData);
    }
  });
}

/**
 * Cierre de sesión
 */
export async function logoutAdmin() {
  sessionStorage.removeItem('lc_admin_auth');
  sessionStorage.removeItem('lc_admin_demo');
  sessionStorage.removeItem('lc_admin_email');
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Error signing out", e);
    }
  }
  window.location.href = 'index.html';
}
