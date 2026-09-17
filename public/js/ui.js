/**
 * LA CURANDERA — UI Interactions & Microanimations
 */

import { getLocalizedText, t, getLanguage } from './i18n.js';
import { firebaseConfig } from './firebase-config.js';

let activeMealMode = 'desayunos'; // 'desayunos' | 'comida'
let modalActive = false;

let currentScheduleConfig = null;

/**
 * Determina el modo de comida inicial según la hora local:
 * Respeta el corte configurado por el restaurante (por defecto 13:30 hrs).
 */
export function getInitialMealMode(lunchStartMinutes = null) {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Si se especifica corte dinámico en minutos (ej: 13:30 -> 810)
  const cutoff = (typeof lunchStartMinutes === 'number') ? lunchStartMinutes : 810;
  return totalMinutes < cutoff ? 'desayunos' : 'comida';
}

let onModeChangedCallback = null;

export function initUI(callback) {
  onModeChangedCallback = callback;
  // Inicializar modo según hora
  activeMealMode = getInitialMealMode();
  document.body.setAttribute('data-meal-mode', (activeMealMode === 'desayuno' || activeMealMode === 'desayunos') ? 'desayunos' : 'comida');
  updateMealSwitchUI();

  // Listener para el switch de horario
  const switchOptions = document.querySelectorAll('.meal-option');
  switchOptions.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.preventDefault();
      const mode = opt.getAttribute('data-mode');
      if (mode && mode !== activeMealMode) {
        setMealModeUI(mode);
      }
    });
  });

  // Header scroll blur effect
  window.addEventListener('scroll', () => {
    const header = document.querySelector('.site-header');
    if (header) {
      if (window.scrollY > 40) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  }, { passive: true });

  // Modal ESC handler
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalActive) {
      closeProductModal();
    }
  });

  // Configurar botón de reseña de Google
  setupReviewLinks();

  // Configurar botón flotante de WhatsApp
  setupWhatsAppFAB();

  // Actualizar indicador de horario al cambiar de idioma
  window.addEventListener('langChanged', () => {
    updateMealSwitchUI();
  });

  return activeMealMode;
}

export function setMealModeUI(mode) {
  activeMealMode = (mode === 'desayuno' || mode === 'desayunos') ? 'desayunos' : 'comida';
  document.body.setAttribute('data-meal-mode', activeMealMode);
  updateMealSwitchUI();
  if (onModeChangedCallback) {
    onModeChangedCallback(activeMealMode);
  }
  // Sincronización mediante evento en window
  window.dispatchEvent(new CustomEvent('mealModeChanged', { detail: { mode: activeMealMode } }));
}

export function getActiveMealMode() {
  return activeMealMode;
}

export function updateMealSwitchUI(customSchedule = null) {
  if (customSchedule) {
    currentScheduleConfig = customSchedule;
  }

  const options = document.querySelectorAll('.meal-option');
  options.forEach(opt => {
    const mode = opt.getAttribute('data-mode');
    const isSelected = (mode === activeMealMode) || 
                       (mode === 'desayunos' && activeMealMode === 'desayuno');

    if (isSelected) {
      opt.classList.add('active');
      opt.setAttribute('aria-selected', 'true');
      if (mode === 'comida') {
        opt.classList.add('mode-comida');
      } else {
        opt.classList.remove('mode-comida');
      }
    } else {
      opt.classList.remove('active', 'mode-comida');
      opt.setAttribute('aria-selected', 'false');
    }
  });

  // Micro-copy indicador de horario con dot pulsante
  const indicator = document.querySelector('.meal-switch-indicator');
  if (indicator) {
    const isMorning = activeMealMode === 'desayunos' || activeMealMode === 'desayuno';
    let notice = '';
    const sched = currentScheduleConfig;
    if (sched) {
      if (isMorning && sched.breakfast && sched.breakfast.label) {
        notice = `Servicio de Desayuno activo (${sched.breakfast.label})`;
      } else if (!isMorning && sched.lunch && sched.lunch.label) {
        notice = `Servicio de Comida y Cantina activo (${sched.lunch.label})`;
      }
    }
    if (!notice) {
      notice = isMorning
        ? t('mealSwitch.scheduleNoticeMorning', 'Servicio de Desayuno activo (9:00 AM - 1:30 PM)')
        : t('mealSwitch.scheduleNoticeAfternoon', 'Servicio de Comida y Cantina activo (1:30 PM - 7:30 PM)');
    }
    indicator.innerHTML = `<span class="status-pulse"></span> <span>${notice}</span>`;
  }
}

/**
 * Modal de Producto
 */
export function openProductModal(product) {
  const modalBackdrop = document.getElementById('product-modal');
  if (!modalBackdrop) return;

  const titleEl = modalBackdrop.querySelector('.modal-title');
  const priceEl = modalBackdrop.querySelector('.modal-price');
  const descEl = modalBackdrop.querySelector('.modal-desc');
  const imgEl = modalBackdrop.querySelector('.modal-img');
  const videoBtn = modalBackdrop.querySelector('.btn-video-prep');
  const allergensContainer = modalBackdrop.querySelector('.modal-allergens-list');

  const lang = getLanguage();
  const title = getLocalizedText(product.name, lang);
  const desc = (product.description && typeof product.description === 'object')
    ? getLocalizedText(product.description, lang)
    : (product.effectiveDesc !== undefined ? product.effectiveDesc : getLocalizedText(product.description, lang));
  const price = product.effectivePrice !== undefined ? product.effectivePrice : product.price;
  const isAvailable = product.isAvailable !== false;
  const isPromo = product.isPromo === true;
  const promoPrice = (product.promoPrice !== undefined && product.promoPrice !== null && product.promoPrice !== '') ? Number(product.promoPrice) : null;
  const promoTag = product.promoTag || 'PROMO';

  if (titleEl) titleEl.textContent = title;

  // Actualizar precio con soporte de promoción
  if (priceEl) {
    if (isPromo && promoPrice !== null && !isNaN(promoPrice) && promoPrice < price) {
      priceEl.innerHTML = `
        <span class="modal-struck-price">$${price}</span>
        <span class="modal-promo-price">$${promoPrice} MXN</span>
        <span class="modal-promo-tag">🔥 ${promoTag}</span>
      `;
    } else {
      priceEl.textContent = `$${price} MXN`;
    }
  }

  if (descEl) descEl.textContent = desc || '';

  // Banner de producto agotado por hoy localizado
  let soldOutAlert = modalBackdrop.querySelector('.modal-sold-out-alert');
  if (!isAvailable) {
    if (!soldOutAlert) {
      soldOutAlert = document.createElement('div');
      soldOutAlert.className = 'modal-sold-out-alert';
      const body = modalBackdrop.querySelector('.modal-body');
      if (body) body.insertBefore(soldOutAlert, body.firstChild);
    }
    const soldOutTitle = t('product.soldOutNoticeTitle', 'Agotado por hoy');
    const soldOutDesc = t('product.soldOutNoticeDesc', 'Este platillo no se encuentra disponible temporalmente en esta sucursal.');
    soldOutAlert.innerHTML = `⚠️ <strong>${soldOutTitle}</strong> — ${soldOutDesc}`;
    soldOutAlert.style.display = 'block';
  } else if (soldOutAlert) {
    soldOutAlert.style.display = 'none';
  }

  if (imgEl) {
    imgEl.src = product.imageUrl || 'assets/logo/logo.png';
    imgEl.alt = title;
  }

  // Video de preparación opcional
  if (videoBtn) {
    if (product.videoUrl) {
      videoBtn.style.display = 'inline-flex';
      videoBtn.onclick = () => {
        window.open(product.videoUrl, '_blank');
      };
    } else {
      videoBtn.style.display = 'none';
    }
  }

  // Alérgenos y etiquetas
  if (allergensContainer) {
    allergensContainer.innerHTML = '';
    const allergens = product.allergens || [];
    const tags = product.tags || [];

    const badges = [...tags, ...allergens];
    if (badges.length > 0) {
      badges.forEach(badge => {
        const span = document.createElement('span');
        span.className = 'allergen-pill';
        span.textContent = formatBadgeName(badge);
        allergensContainer.appendChild(span);
      });
      modalBackdrop.querySelector('.modal-allergens-group').style.display = 'block';
    } else {
      modalBackdrop.querySelector('.modal-allergens-group').style.display = 'none';
    }
  }

  modalBackdrop.classList.add('open');
  modalActive = true;
  document.body.style.overflow = 'hidden';
}

export function closeProductModal() {
  const modalBackdrop = document.getElementById('product-modal');
  if (modalBackdrop) {
    modalBackdrop.classList.remove('open');
  }
  modalActive = false;
  document.body.style.overflow = '';
}

function formatBadgeName(badge) {
  const translated = t(`allergensFull.${badge}`);
  if (translated && translated !== `allergensFull.${badge}`) {
    return translated;
  }
  const fallbackMap = {
    gluten: '🌾 Contiene Gluten',
    lacteos: '🥛 Contiene Lácteos',
    picante: '🌶️ Nivel Picante',
    frutos_secos: '🥜 Frutos Secos',
    mariscos: '🦐 Mariscos / Crustáceos',
    huevo: '🥚 Contiene Huevo',
    vegetariano: '🌱 Apto para Vegetarianos',
    vegano: '🌿 Vegano (100% Vegetal)',
    hero: '👑 Especialidad de la Casa',
    recomendado: '⭐ Recomendación del Chef',
    chef: '👨‍🍳 Selección de Autor'
  };
  return fallbackMap[badge] || badge;
}

/**
 * Toast de Notificaciones
 */
export function showToast(message, duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Configurar enlaces de reseñas y mapas con soporte de Place ID o enlace directo de Google Maps
 */
export function setupReviewLinks(placeId = null, mapsUrl = null) {
  const effectiveMapsUrl = mapsUrl || 'https://maps.app.goo.gl/EKib5MFWwCC9paop9';
  const effectivePlaceId = placeId || firebaseConfig.googlePlaceId || 'ChIJu4FWH86_zYURzAbOmQ_PqTE';

  // Si hay Place ID válido que comience con ChIJ, usamos el link de escritura directa
  const reviewUrl = (effectivePlaceId && effectivePlaceId.startsWith('ChIJ'))
    ? `https://search.google.com/local/writereview?placeid=${effectivePlaceId}`
    : effectiveMapsUrl;

  const reviewBtns = document.querySelectorAll('.btn-review, [data-action="review"]');
  reviewBtns.forEach(btn => {
    btn.href = reviewUrl;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
  });

  const mapsLinks = document.querySelectorAll('[data-action="maps"]');
  mapsLinks.forEach(link => {
    link.href = effectiveMapsUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
}

/**
 * Configurar botón flotante de WhatsApp con número y mensaje dinámico
 */
export function setupWhatsAppFAB(phone = null, customMessage = null) {
  const fab = document.querySelector('.fab-whatsapp');
  if (!fab) return;

  const effectivePhone = phone || firebaseConfig.whatsappNumber || '527141400000';
  const defaultText = '¡Hola La Curandera! Me gustaría hacer una consulta sobre su menú y reservas.';
  const effectiveMessage = encodeURIComponent(customMessage || defaultText);
  fab.href = `https://wa.me/${effectivePhone}?text=${effectiveMessage}`;
  fab.target = '_blank';
  fab.rel = 'noopener noreferrer';
}
