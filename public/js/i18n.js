/**
 * LA CURANDERA — Multi-idioma (i18n)
 * Soporte para Español (ES), Inglés (EN) y Francés (FR)
 */

let currentLang = localStorage.getItem('lc-lang') || 'es';
const translations = {};
const availableLangs = ['es', 'en', 'fr'];

export async function initI18n() {
  if (!availableLangs.includes(currentLang)) {
    currentLang = 'es';
  }

  // 1. Carga instantánea desde caché local (0ms de latencia)
  for (const lang of availableLangs) {
    try {
      const cached = localStorage.getItem(`lc_i18n_${lang}`);
      if (cached) {
        translations[lang] = JSON.parse(cached);
      }
    } catch (e) {}
  }
  if (translations[currentLang]) {
    applyStaticTranslations();
  }

  // 2. Carga en paralelo (Promise.all) de los archivos de traducción para máxima velocidad
  const fetchPromises = availableLangs.map(async (lang) => {
    try {
      const res = await fetch(`i18n/${lang}.json`);
      if (res.ok) {
        const data = await res.json();
        translations[lang] = data;
        try {
          localStorage.setItem(`lc_i18n_${lang}`, JSON.stringify(data));
        } catch (e) {}
      } else {
        const fallbackRes = await fetch(`/i18n/${lang}.json`);
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          translations[lang] = data;
          try {
            localStorage.setItem(`lc_i18n_${lang}`, JSON.stringify(data));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn(`Could not load translations for ${lang}`, err);
    }
  });

  await Promise.all(fetchPromises);
  applyStaticTranslations();
  return currentLang;
}

export function getLanguage() {
  return currentLang || localStorage.getItem('lc-lang') || 'es';
}

export async function setLanguage(lang) {
  if (!availableLangs.includes(lang)) return;
  currentLang = lang;
  localStorage.setItem('lc-lang', lang);
  window.__LC_CURRENT_LANG__ = lang;

  // Animación rápida y limpia
  document.body.style.opacity = '0.92';
  document.body.style.transition = 'opacity 0.08s ease';

  setTimeout(() => {
    applyStaticTranslations();
    window.dispatchEvent(new CustomEvent('langChanged', { detail: { lang } }));
    document.body.style.opacity = '1';
  }, 40);
}

export function t(path, fallback = '') {
  const lang = getLanguage();
  if (!translations[lang]) return fallback || path;
  const keys = path.split('.');
  let current = translations[lang];

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      // Fallback a español si no existe en el idioma actual
      if (translations['es']) {
        let esVal = translations['es'];
        for (const k of keys) {
          if (esVal && typeof esVal === 'object' && k in esVal) {
            esVal = esVal[k];
          } else {
            return fallback || path;
          }
        }
        return esVal;
      }
      return fallback || path;
    }
  }
  return current;
}

/**
 * Traduce un campo políglota { es, en, fr } de Firestore
 */
export function getLocalizedText(field, lang = getLanguage()) {
  if (!field) return '';
  if (typeof field === 'string') return field;

  const targetLang = lang || getLanguage() || 'es';
  if (field[targetLang] && field[targetLang].trim() !== '') {
    return field[targetLang];
  }

  // Fallback a inglés si estamos en francés y falta traducción
  if (targetLang === 'fr' && field.en && field.en.trim() !== '') {
    return field.en;
  }

  // Fallback limpio a español si no existe en el idioma solicitado
  if (field.es && field.es.trim() !== '') {
    return field.es;
  }

  return '';
}

export function applyStaticTranslations() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (translation) {
      if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
        el.setAttribute('placeholder', translation);
      } else {
        el.textContent = translation;
      }
    }
  });

  // Actualizar estado activo en botones de idioma
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const btnLang = btn.getAttribute('data-lang');
    if (btnLang === currentLang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}
