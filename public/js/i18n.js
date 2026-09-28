/**
 * LA CURANDERA — Multi-idioma (i18n)
 * Soporte para Español (ES), Inglés (EN) y Francés (FR)
 */

const globalScope = typeof window !== 'undefined' ? window : globalThis;
globalScope.__LC_TRANSLATIONS__ = globalScope.__LC_TRANSLATIONS__ || {};
const translations = globalScope.__LC_TRANSLATIONS__;
let currentLang = globalScope.__LC_CURRENT_LANG__ || (typeof localStorage !== 'undefined' ? localStorage.getItem('lc-lang') : null) || 'es';
globalScope.__LC_CURRENT_LANG__ = currentLang;
const availableLangs = ['es', 'en', 'fr'];

export async function initI18n() {
  if (!availableLangs.includes(currentLang)) {
    currentLang = 'es';
    globalScope.__LC_CURRENT_LANG__ = 'es';
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
      const res = await fetch(`i18n/${lang}.json?v=35.0`);
      if (res.ok) {
        const data = await res.json();
        translations[lang] = data;
        try {
          localStorage.setItem(`lc_i18n_${lang}`, JSON.stringify(data));
        } catch (e) {}
      } else {
        const fallbackRes = await fetch(`/i18n/${lang}.json?v=35.0`);
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
  return globalScope.__LC_CURRENT_LANG__ || currentLang || (typeof localStorage !== 'undefined' ? localStorage.getItem('lc-lang') : null) || 'es';
}

export async function setLanguage(lang) {
  if (!availableLangs.includes(lang)) return;
  currentLang = lang;
  globalScope.__LC_CURRENT_LANG__ = lang;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('lc-lang', lang);
  }

  // Actualizar inmediatamente estado visual de botones para retroalimentación instantánea (0ms)
  if (typeof document !== 'undefined') {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      const btnLang = btn.getAttribute('data-lang');
      if (btnLang === currentLang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Asegurar que las traducciones del idioma seleccionado estén cargadas
  if (!translations[lang]) {
    try {
      const res = await fetch(`i18n/${lang}.json?v=30.0`);
      if (res.ok) {
        translations[lang] = await res.json();
        try {
          localStorage.setItem(`lc_i18n_${lang}`, JSON.stringify(translations[lang]));
        } catch (e) {}
      } else {
        const fallbackRes = await fetch(`/i18n/${lang}.json?v=30.0`);
        if (fallbackRes.ok) {
          translations[lang] = await fallbackRes.json();
        }
      }
    } catch (e) {}
  }

  // Animación rápida y limpia
  if (typeof document !== 'undefined' && document.body) {
    document.body.style.opacity = '0.94';
    document.body.style.transition = 'opacity 0.08s ease';
  }

  setTimeout(() => {
    applyStaticTranslations();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('langChanged', { detail: { lang } }));
    }
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.opacity = '1';
    }
  }, 35);
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
  if (typeof document === 'undefined') return;
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (translation) {
      if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
        el.setAttribute('placeholder', translation);
      } else if (el.hasAttribute('data-i18n-html') || (typeof translation === 'string' && translation.includes('<a '))) {
        el.innerHTML = translation;
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
