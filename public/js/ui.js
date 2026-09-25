/**
 * LA CURANDERA — UI Interactions & Microanimations
 */

import { getLocalizedText, t, getLanguage } from './i18n.js';
import { firebaseConfig } from './firebase-config.js';

let modalActive = false;

function getStoredSchedule() {
  try {
    const cached = localStorage.getItem('lc_restaurant_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.schedule) return parsed.schedule;
    }
  } catch (e) {}
  return null;
}

let currentScheduleConfig = getStoredSchedule();

/**
 * Convierte formato HH:MM (24h) a formato legible 12h (AM/PM)
 */
export function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':').map(Number);
  if (isNaN(parts[0])) return timeStr;
  const h = parts[0];
  const m = isNaN(parts[1]) ? 0 : parts[1];
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/**
 * Obtiene la etiqueta amigable del horario asegurando que nunca sea vacía
 */
export function getScheduleLabel(shiftConfig, fallbackLabel) {
  if (!shiftConfig) return fallbackLabel;
  if (typeof shiftConfig.label === 'string' && shiftConfig.label.trim().length > 0) {
    return shiftConfig.label.trim();
  }
  if (shiftConfig.start && shiftConfig.end) {
    return `${formatTime12h(shiftConfig.start)} - ${formatTime12h(shiftConfig.end)}`;
  }
  return fallbackLabel;
}

export function getMexicoCityMinutes() {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Mexico_City',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const hourPart = parts.find(p => p.type === 'hour')?.value;
    const minPart = parts.find(p => p.type === 'minute')?.value;
    const h = parseInt(hourPart, 10);
    const m = parseInt(minPart, 10);
    if (!isNaN(h) && !isNaN(m)) {
      return (h % 24) * 60 + m;
    }
  } catch (e) {}
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Determina el modo de comida inicial según la hora oficial de La Curandera (Tenancingo / Metepec, Edo. Méx.):
 * Desayunos: 9:00 AM - 1:30 PM (hasta las 13:30 hrs).
 * Comida: 1:30 PM - 7:30 PM (a partir de las 13:30 hrs).
 */
export function getInitialMealMode(lunchStartMinutes = null) {
  const totalMinutes = getMexicoCityMinutes();

  let cutoff = (typeof lunchStartMinutes === 'number') ? lunchStartMinutes : 810;
  if (lunchStartMinutes === null && currentScheduleConfig?.lunch?.start) {
    const parts = currentScheduleConfig.lunch.start.split(':').map(Number);
    if (!isNaN(parts[0])) {
      cutoff = parts[0] * 60 + (parts[1] || 0);
    }
  }
  return totalMinutes < cutoff ? 'desayunos' : 'comida';
}

let activeMealMode = getInitialMealMode();
let onModeChangedCallback = null;

export function initUI(callback) {
  onModeChangedCallback = callback;
  if (!currentScheduleConfig) {
    currentScheduleConfig = getStoredSchedule();
  }
  // Inicializar modo según hora
  activeMealMode = getInitialMealMode();
  document.body.setAttribute('data-meal-mode', (activeMealMode === 'desayuno' || activeMealMode === 'desayunos') ? 'desayunos' : 'comida');
  updateMealSwitchUI();

  // Listener para el switch de horario
  let userManuallySelected = false;
  const switchOptions = document.querySelectorAll('.meal-option');
  switchOptions.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.preventDefault();
      userManuallySelected = true;
      const mode = opt.getAttribute('data-mode');
      if (mode && mode !== activeMealMode) {
        setMealModeUI(mode);
      }
    });
  });

  // Verificación periódica y reactivación de pestaña (detecta el cruce de las 1:30 PM en tiempo real)
  const checkScheduleShift = () => {
    if (userManuallySelected) return;
    const expectedMode = getInitialMealMode();
    if (expectedMode !== activeMealMode) {
      setMealModeUI(expectedMode);
    }
  };

  setInterval(checkScheduleShift, 20000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkScheduleShift();
    }
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
      closeProductModal(true);
    }
  });

  // Listener para el botón Atrás / Regresar del navegador y gestos en dispositivos móviles
  window.addEventListener('popstate', (e) => {
    if (modalActive) {
      // El usuario pulsó Atrás en su dispositivo: solo cerramos el modal de detalles SIN salir del menú web
      closeProductModal(false);
    }
  });

  // Cerrar modal al hacer clic en el backdrop oscuro
  const modalBackdrop = document.getElementById('product-modal');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) {
        closeProductModal(true);
      }
    });
  }

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
  } else if (!currentScheduleConfig) {
    currentScheduleConfig = getStoredSchedule();
  }

  const isMorning = activeMealMode === 'desayunos' || activeMealMode === 'desayuno';

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

  // Micro-copy indicador de horario con dot pulsante y tiempo destacado
  const indicator = document.querySelector('.meal-switch-indicator');
  if (indicator) {
    const sched = currentScheduleConfig;
    const breakfastLabel = getScheduleLabel(sched?.breakfast, '9:00 AM - 1:30 PM');
    const lunchLabel = getScheduleLabel(sched?.lunch, '1:30 PM - 7:30 PM');
    const currentLabel = isMorning ? breakfastLabel : lunchLabel;

    const serviceNameFull = isMorning
      ? t('mealSwitch.serviceMorning', 'Servicio de Desayuno activo')
      : t('mealSwitch.serviceAfternoon', 'Servicio de Comida y Cantina activo');
    const serviceNameShort = isMorning
      ? t('mealSwitch.serviceMorningShort', 'Desayuno activo')
      : t('mealSwitch.serviceAfternoonShort', 'Comida y Cantina');

    indicator.innerHTML = `
      <span class="status-pulse" aria-hidden="true"></span>
      <span class="meal-switch-notice-full">${serviceNameFull}</span>
      <span class="meal-switch-notice-short">${serviceNameShort}</span>
      <span class="meal-switch-time-badge">${currentLabel}</span>
    `;
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

  // Gramaje y Mililitros en el modal (sin emojis para máxima legibilidad y estética)
  const weight = product.weight || '';
  const volume = product.volume || '';
  const portionParts = [];
  if (weight && String(weight).trim()) {
    let w = String(weight).trim();
    if (/^\d+(\.\d+)?$/.test(w)) w += 'g';
    portionParts.push(w);
  }
  if (volume && String(volume).trim()) {
    let v = String(volume).trim();
    if (/^\d+(\.\d+)?$/.test(v)) v += 'ml';
    portionParts.push(v);
  }

  let portionEl = modalBackdrop.querySelector('.modal-portion-badge');
  if (portionParts.length > 0) {
    if (!portionEl) {
      portionEl = document.createElement('span');
      portionEl.className = 'modal-portion-badge';
      const priceContainer = modalBackdrop.querySelector('.modal-price-container');
      if (priceContainer) {
        priceContainer.appendChild(portionEl);
      } else if (priceEl && priceEl.parentNode) {
        priceEl.parentNode.insertBefore(portionEl, priceEl.nextSibling);
      }
    }
    portionEl.textContent = portionParts.join('  •  ');
    portionEl.style.display = 'inline-flex';
  } else if (portionEl) {
    portionEl.style.display = 'none';
  }

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

  // Media: Video o Imagen gastronómica
  const modalVideo = modalBackdrop.querySelector('.modal-video');
  const mediaWrapper = modalBackdrop.querySelector('.modal-media-wrapper');

  if (product.videoUrl) {
    if (modalVideo) {
      modalVideo.src = product.videoUrl;
      modalVideo.style.display = 'block';
      modalVideo.muted = true;
      modalVideo.play().catch(() => {});
    }
    if (imgEl) imgEl.style.display = 'none';
    if (mediaWrapper) {
      mediaWrapper.classList.add('has-dish-photo', 'has-modal-video');
    }
  } else {
    if (modalVideo) {
      modalVideo.pause();
      modalVideo.removeAttribute('src');
      modalVideo.load();
      modalVideo.style.display = 'none';
    }
    if (imgEl) {
      imgEl.style.display = 'block';
      const isLogo = (url) => typeof url === 'string' && (url.includes('logo/logo.png') || url.endsWith('/logo.png') || url === 'assets/logo/logo.png' || url === '../assets/logo/logo.png');
      const hasRealImg = Boolean(product.imageUrl && !isLogo(product.imageUrl));
      if (hasRealImg) {
        imgEl.alt = title;
        imgEl.onerror = function() {
          this.onerror = function() {
            this.onerror = null;
            this.src = 'assets/logo/logo.png';
            if (mediaWrapper) mediaWrapper.classList.remove('has-dish-photo', 'has-modal-video');
          };
          if (product.imageFallback && !isLogo(product.imageFallback)) {
            this.src = product.imageFallback;
          } else {
            this.src = 'assets/logo/logo.png';
            if (mediaWrapper) mediaWrapper.classList.remove('has-dish-photo', 'has-modal-video');
          }
        };
        imgEl.src = product.imageUrl;
        if (mediaWrapper) {
          mediaWrapper.classList.add('has-dish-photo');
          mediaWrapper.classList.remove('has-modal-video');
        }
      } else {
        imgEl.src = 'assets/logo/logo.png';
        imgEl.alt = title;
        imgEl.onerror = null;
        if (mediaWrapper) {
          mediaWrapper.classList.remove('has-dish-photo', 'has-modal-video');
        }
      }
    }
  }

  // Botón adicional de ver video / sonido si existe
  if (videoBtn) {
    if (product.videoUrl) {
      videoBtn.style.display = 'inline-flex';
      videoBtn.onclick = () => {
        if (modalVideo) {
          modalVideo.scrollIntoView({ behavior: 'smooth', block: 'center' });
          modalVideo.muted = false;
          modalVideo.play().catch(() => {});
        }
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

  // Push state en historial para que el botón "Regresar" del navegador o del teléfono cierre el modal sin salirse del menú
  const targetHash = '#platillo-' + (product.id || 'detalle');
  if (window.location.hash !== targetHash) {
    history.pushState({ modalDishId: product.id }, '', targetHash);
  }
}

export function closeProductModal(shouldHistoryBack = true) {
  const modalBackdrop = document.getElementById('product-modal');
  if (modalBackdrop) {
    modalBackdrop.classList.remove('open');
    const modalVideo = modalBackdrop.querySelector('.modal-video');
    if (modalVideo) {
      modalVideo.pause();
      modalVideo.removeAttribute('src');
      modalVideo.load();
      modalVideo.style.display = 'none';
    }
    const imgEl = modalBackdrop.querySelector('.modal-img');
    if (imgEl) imgEl.style.display = 'block';
  }
  modalActive = false;
  document.body.style.overflow = '';

  // Si se cerró mediante acción de usuario (botón regresar, X, o backdrop) y estamos en el hash del platillo, revertimos el historial
  if (shouldHistoryBack && window.location.hash.startsWith('#platillo-')) {
    history.back();
  }
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

  // Si no se pasaron parámetros explícitos, intentar leer de la configuración cacheada en localStorage
  if (!phone || !customMessage) {
    try {
      const cached = localStorage.getItem('lc_restaurant_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (!phone && parsed.whatsapp) phone = parsed.whatsapp;
        if (!customMessage && parsed.whatsappMessage) customMessage = parsed.whatsappMessage;
      }
    } catch (e) {}
  }

  // Sanitizar número: únicamente dígitos (WhatsApp API no acepta signos +, espacios ni guiones)
  let cleanPhone = String(phone || firebaseConfig.whatsappNumber || '527141400000').replace(/\D/g, '');
  // Si el usuario ingresó 10 dígitos (ej: 7141400000), anteponer el código de país de México (+52)
  if (cleanPhone.length === 10) {
    cleanPhone = '52' + cleanPhone;
  }
  if (!cleanPhone) cleanPhone = '527141400000';

  const defaultText = '¡Hola La Curandera! Me gustaría hacer una consulta sobre su menú y reservas.';
  const rawMessage = (customMessage !== undefined && customMessage !== null && String(customMessage).trim() !== '')
    ? String(customMessage).trim()
    : defaultText;
  const effectiveMessage = encodeURIComponent(rawMessage);

  fab.href = `https://wa.me/${cleanPhone}?text=${effectiveMessage}`;
  fab.target = '_blank';
  fab.rel = 'noopener noreferrer';
}
