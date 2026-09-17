/**
 * LA CURANDERA — Menú Digital Público (Realtime Firestore Listener)
 */

import { 
  db, 
  collection, 
  doc,
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  isConfigured 
} from './firebase-init.js';
import { getLocalizedText, t, getLanguage } from './i18n.js';
import { 
  openProductModal, 
  setupReviewLinks, 
  setupWhatsAppFAB, 
  updateMealSwitchUI, 
  getInitialMealMode 
} from './ui.js';

let restaurantId = 'la-curandera';
let branchId = 'metepec';

let allCategories = [];
let allProducts = [];
let allOverrides = {};
let searchQuery = '';
let currentMealMode = 'desayunos'; // 'desayunos' | 'comida'

export function setMealMode(mode) {
  currentMealMode = (mode === 'desayuno' || mode === 'desayunos') ? 'desayunos' : 'comida';
  document.body.setAttribute('data-meal-mode', currentMealMode);
  renderCategoriesNav();
  renderMenu();
}

export function getActiveMealMode() {
  return currentMealMode;
}

export async function initMenu() {
  // Extraer branchId de la URL si se especifica: /menu/:branchId o ?branch=xxx
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('branch')) {
    branchId = urlParams.get('branch');
  }

  // Configurar buscador inteligente en tiempo real con micro-latencia (15ms), tecla ESC y botón de limpieza
  const searchInput = document.getElementById('menu-search-input');
  const clearBtn = document.getElementById('search-clear-btn');
  if (searchInput) {
    let searchDebounceTimer = null;
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      if (clearBtn) {
        clearBtn.style.display = searchQuery.length > 0 ? 'flex' : 'none';
      }
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        renderMenu();
      }, 15);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchQuery = '';
        if (clearBtn) clearBtn.style.display = 'none';
        renderMenu();
      }
    });
  }

  if (clearBtn && searchInput) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearBtn.style.display = 'none';
      searchInput.focus();
      renderMenu();
    });
  }

  // Sincronizar cambios de modo de servicio (Desayuno vs Comida)
  window.addEventListener('mealModeChanged', (e) => {
    if (e.detail && e.detail.mode) {
      setMealMode(e.detail.mode);
    }
  });

  // Listener para cambios de idioma
  window.addEventListener('langChanged', () => {
    renderCategoriesNav();
    renderMenu();
  });

  // 1. Carga instantánea del catálogo integrado (0ms de espera para el usuario en móvil y desktop)
  await loadLocalFallbackData();

  // Cargar overrides cacheados de sincronizaciones previas (0ms)
  try {
    const cachedSync = localStorage.getItem('lc_menu_sync_event');
    if (cachedSync) {
      const data = JSON.parse(cachedSync);
      if (data.overrides) {
        allOverrides = { ...allOverrides, ...data.overrides };
        renderCategoriesNav();
        renderMenu();
      }
    }
  } catch (e) {}

  // Sincronización en tiempo real ultra-rápida (BroadcastChannel nativo 0ms entre pestañas)
  try {
    const syncChannel = new BroadcastChannel('lc_menu_sync');
    syncChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'MENU_SYNC') {
        if (event.data.overrides) {
          allOverrides = { ...allOverrides, ...event.data.overrides };
        }
        renderCategoriesNav();
        renderMenu();
      } else if (event.data && event.data.type === 'SETTINGS_SYNC' && event.data.settings) {
        applyRestaurantSettings(event.data.settings);
      }
    };
  } catch (e) {}

  // Listener de Storage (respaldo cross-tab)
  window.addEventListener('storage', (e) => {
    if (e.key === 'lc_menu_sync_event' && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data.overrides) {
          allOverrides = { ...allOverrides, ...data.overrides };
        }
        renderCategoriesNav();
        renderMenu();
      } catch (err) {}
    } else if (e.key === 'lc_settings_sync_event' && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data.settings) {
          applyRestaurantSettings(data.settings);
        }
      } catch (err) {}
    }
  });

  // Sincronizar barra de anuncios en movimiento (Marquee Ticker)
  initMarqueeSync();

  // Sincronizar configuración general del restaurante (Horarios, WhatsApp, Reseñas, Hero)
  initRestaurantSettingsSync();

  // 2. Conexión a Firestore en tiempo real en segundo plano
  if (isConfigured && db) {
    setupRealtimeListeners();
  }
}

/**
 * Escucha cambios en tiempo real desde Firestore
 */
function setupRealtimeListeners() {
  try {
    // 1. Categorías en tiempo real
    const catCol = collection(db, `restaurants/${restaurantId}/categories`);
    onSnapshot(catCol, (snapshot) => {
      if (!snapshot.empty) {
        const loadedCats = [];
        snapshot.forEach(doc => {
          loadedCats.push({ id: doc.id, ...doc.data() });
        });
        loadedCats.sort((a, b) => (a.order !== undefined ? a.order : 999) - (b.order !== undefined ? b.order : 999));
        allCategories = loadedCats;
        renderCategoriesNav();
        renderMenu();
      }
    }, (err) => {
      console.warn("Firestore categories realtime error:", err);
    });

    // 2. Productos en tiempo real (todos los productos sin exclusión por índice)
    const prodCol = collection(db, `restaurants/${restaurantId}/products`);
    onSnapshot(prodCol, (snapshot) => {
      if (!snapshot.empty) {
        const loadedProds = [];
        snapshot.forEach(doc => {
          loadedProds.push({ id: doc.id, ...doc.data() });
        });
        loadedProds.sort((a, b) => (a.order !== undefined ? a.order : 999) - (b.order !== undefined ? b.order : 999));
        allProducts = loadedProds;
        renderCategoriesNav();
        renderMenu();
      }
    }, (err) => {
      console.warn("Firestore products realtime error:", err);
    });

    // 3. Menu Overrides por sucursal en tiempo real ("palomear", precios, stock, promos)
    const overrideCol = collection(db, `restaurants/${restaurantId}/branches/${branchId}/menuOverrides`);
    onSnapshot(overrideCol, (snapshot) => {
      allOverrides = {};
      snapshot.forEach(doc => {
        allOverrides[doc.id] = doc.data();
      });
      renderCategoriesNav();
      renderMenu();
    }, (err) => {
      console.warn("Firestore overrides realtime error:", err);
    });

  } catch (error) {
    console.error("Error setting up Firestore listeners:", error);
    loadLocalFallbackData();
  }
}

/**
 * Carga de datos locales de respaldo con el catálogo completo de La Curandera
 */
async function loadLocalFallbackData() {
  try {
    const res = await fetch('data/catalog.json');
    if (res.ok) {
      const data = await res.json();
      allCategories = data.categories || [];
      allProducts = data.products || [];
      allOverrides = {};
      renderCategoriesNav();
      renderMenu();
    }
  } catch (e) {
    console.warn("No fallback catalog found yet", e);
  }
}

/**
 * Renderiza la barra de navegación horizontal por categorías
 */
export function renderCategoriesNav() {
  const navContainer = document.getElementById('categories-bar');
  if (!navContainer) return;

  const isBreakfast = (currentMealMode === 'desayunos' || currentMealMode === 'desayuno');
  
  // Filtrar categorías según la sección activa
  const filteredCats = allCategories.filter(cat => {
    if (cat.section === 'ambos') return true;
    if (isBreakfast) {
      return cat.section === 'desayuno';
    } else {
      return cat.section === 'comida' || cat.section === 'cantina';
    }
  });

  navContainer.innerHTML = '';

  filteredCats.forEach((cat, index) => {
    const btn = document.createElement('button');
    btn.className = `category-tab ${index === 0 ? 'active' : ''}`;
    btn.setAttribute('data-target', `cat-${cat.id || cat.slug}`);

    const iconSrc = cat.iconSvg || `assets/icons/${cat.icon || 'maguey'}.svg`;
    const catName = getLocalizedText(cat.name);

    btn.innerHTML = `
      <img src="${iconSrc}" class="cat-icon" alt="" onerror="this.src='assets/icons/maguey.svg'"/>
      <span>${catName}</span>
    `;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetId = `cat-${cat.id || cat.slug}`;
      let targetEl = document.getElementById(targetId);

      if (!targetEl && searchQuery) {
        const searchInput = document.getElementById('menu-search-input');
        const clearBtn = document.getElementById('search-clear-btn');
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';
        searchQuery = '';
        renderMenu();
        targetEl = document.getElementById(targetId);
      }

      if (targetEl) {
        const siteHeader = document.querySelector('.site-header');
        const stickyNav = document.querySelector('.categories-nav-wrapper');
        const headerH = siteHeader ? siteHeader.getBoundingClientRect().height : 70;
        const navH = stickyNav ? stickyNav.getBoundingClientRect().height : 52;
        const totalOffset = headerH + navH + 12;
        const rect = targetEl.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetPos = Math.round(rect.top + scrollTop - totalOffset);
        window.scrollTo({ top: Math.max(0, targetPos), behavior: 'smooth' });
      }

      // Sincronizar dock vertical
      const dockBtns = document.querySelectorAll('.dock-emoji-btn');
      dockBtns.forEach(b => {
        if (b.getAttribute('data-target') === targetId) {
          dockBtns.forEach(d => d.classList.remove('active'));
          b.classList.add('active');
        }
      });

      // Desplazar la barra horizontal de categorías
      const bar = document.getElementById('categories-bar');
      if (bar) {
        bar.scrollTo({
          left: btn.offsetLeft - (bar.clientWidth / 2) + (btn.offsetWidth / 2),
          behavior: 'smooth'
        });
      }
    });

    navContainer.appendChild(btn);
  });

  // Renderizar simultáneamente el Dock Flotante Vertical Lateral con Emojis
  renderVerticalCategoriesDock(filteredCats);

  window.dispatchEvent(new CustomEvent('categoriesRendered'));
}

/**
 * Mapeo oficial de emojis representativos para cada categoría de La Curandera
 */
export const CATEGORY_EMOJIS = {
  // Desayunos & Ambos
  'pa-curar-el-alma': '🍳',
  'lo-enchi-loso': '🌶️',
  'tacos-dorados': '🌮',
  'pa-caldear': '🥣',
  'sandwich-y-algo-mas': '🥪',
  'pa-los-peques': '🥞',
  'dulce-remedio': '🍰',
  'pa-calentar-el-espiritu': '☕',
  'jugueria-la-curandera': '🧃',
  'bebidas-sin-alcohol': '🥤',
  'mockteleria': '🍹',

  // Comidas & Cantina
  'sabores-de-cuaresma': '🦐',
  'pa-empezar': '🥑',
  'pa-cuidarte': '🥗',
  'sopas-y-pastas': '🍲',
  'snacks': '🍟',
  'platos-fuertes': '🥘',
  'taqueria-la-curandera': '🌮',
  'cortes': '🥩',
  'burritos': '🌯',
  'burguers-y-jocho': '🍔',
  'pa-los-morrillos': '👶',
  'cantina-la-curandera': '🥃',
};

export function getCategoryEmoji(cat) {
  const slug = (cat.slug || cat.id || '').toLowerCase();
  if (CATEGORY_EMOJIS[slug]) return CATEGORY_EMOJIS[slug];

  const name = typeof cat.name === 'object' ? (cat.name.es || '').toLowerCase() : (cat.name || '').toLowerCase();
  if (name.includes('huevo') || name.includes('curar')) return '🍳';
  if (name.includes('chilaquile') || name.includes('enchi') || name.includes('picante')) return '🌶️';
  if (name.includes('taco')) return '🌮';
  if (name.includes('caldo') || name.includes('sopa') || name.includes('pasta')) return '🍲';
  if (name.includes('corte') || name.includes('carne')) return '🥩';
  if (name.includes('marisco') || name.includes('pescado') || name.includes('cuaresma') || name.includes('camar')) return '🦐';
  if (name.includes('ensalada') || name.includes('cuidarte')) return '🥗';
  if (name.includes('snack') || name.includes('alita') || name.includes('papa')) return '🍟';
  if (name.includes('postre') || name.includes('dulce')) return '🍰';
  if (name.includes('café') || name.includes('espíritu')) return '☕';
  if (name.includes('jugo') || name.includes('juguería')) return '🧃';
  if (name.includes('bebida') || name.includes('refresco')) return '🥤';
  if (name.includes('coctel') || name.includes('mocktail')) return '🍹';
  if (name.includes('mezcal') || name.includes('cantina') || name.includes('trago')) return '🥃';
  if (name.includes('burger') || name.includes('jocho')) return '🍔';
  if (name.includes('burrito')) return '🌯';
  if (name.includes('infantil') || name.includes('peque') || name.includes('morrillo')) return '👶';
  return '🍽️';
}

/**
 * Renderiza el Dock Flotante Vertical Lateral de Categorías con Emojis
 */
export function renderVerticalCategoriesDock(filteredCats) {
  const dockContainer = document.getElementById('dock-emojis-container');
  const dock = document.getElementById('vertical-categories-dock');
  const tooltip = document.getElementById('dock-tooltip');
  if (!dockContainer || !dock) return;

  dockContainer.innerHTML = '';

  let hideTooltipTimer = null;
  const showTooltip = (btn, text) => {
    if (!tooltip) return;
    clearTimeout(hideTooltipTimer);
    tooltip.textContent = text;
    const btnRect = btn.getBoundingClientRect();
    const dockRect = dock.getBoundingClientRect();
    const topOffset = (btnRect.top - dockRect.top) + (btnRect.height / 2);
    tooltip.style.top = `${topOffset}px`;
    tooltip.classList.add('visible');
    tooltip.setAttribute('aria-hidden', 'false');

    hideTooltipTimer = setTimeout(() => {
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden', 'true');
    }, 2400);
  };

  filteredCats.forEach((cat, index) => {
    const btn = document.createElement('button');
    btn.className = `dock-emoji-btn ${index === 0 ? 'active' : ''}`;
    const targetId = `cat-${cat.id || cat.slug}`;
    btn.setAttribute('data-target', targetId);
    const catName = getLocalizedText(cat.name);
    const emoji = getCategoryEmoji(cat);
    btn.setAttribute('aria-label', catName);
    btn.setAttribute('title', catName);

    btn.innerHTML = `<span class="dock-emoji">${emoji}</span>`;

    // Tooltip en hover (desktop)
    btn.addEventListener('mouseenter', () => {
      showTooltip(btn, `${emoji} ${catName}`);
    });
    btn.addEventListener('mouseleave', () => {
      if (tooltip) tooltip.classList.remove('visible');
    });

    // Clic / Tap
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.dock-emoji-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      showTooltip(btn, `${emoji} ${catName}`);

      let targetEl = document.getElementById(targetId);

      // Si la categoría no está visible por un término de búsqueda activo, limpiar el buscador
      if (!targetEl && searchQuery) {
        const searchInput = document.getElementById('menu-search-input');
        const clearBtn = document.getElementById('search-clear-btn');
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';
        searchQuery = '';
        renderMenu();
        targetEl = document.getElementById(targetId);
      }

      if (targetEl) {
        const siteHeader = document.querySelector('.site-header');
        const stickyNav = document.querySelector('.categories-nav-wrapper');
        const headerH = siteHeader ? siteHeader.getBoundingClientRect().height : 70;
        const navH = stickyNav ? stickyNav.getBoundingClientRect().height : 52;
        const totalOffset = headerH + navH + 12;
        const rect = targetEl.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetPos = Math.round(rect.top + scrollTop - totalOffset);
        window.scrollTo({ top: Math.max(0, targetPos), behavior: 'smooth' });
      }

      // Sincronizar pestaña activa en la barra horizontal
      const catTabs = document.querySelectorAll('.category-tab');
      catTabs.forEach(tab => {
        if (tab.getAttribute('data-target') === targetId) {
          catTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const bar = document.getElementById('categories-bar');
          if (bar) {
            bar.scrollTo({
              left: tab.offsetLeft - (bar.clientWidth / 2) + (tab.offsetWidth / 2),
              behavior: 'smooth'
            });
          }
        }
      });
    });

    dockContainer.appendChild(btn);
  });

  // Configurar toggle de colapso si aún no se ha enlazado
  const toggleBtn = document.getElementById('dock-toggle-btn');
  if (toggleBtn && !toggleBtn.dataset.bound) {
    toggleBtn.dataset.bound = 'true';
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isCollapsed = dock.classList.toggle('collapsed');
      const icon = toggleBtn.querySelector('.dock-toggle-icon');
      if (icon) {
        icon.textContent = isCollapsed ? '‹' : '›';
      }
      toggleBtn.setAttribute('title', isCollapsed ? 'Mostrar categorías' : 'Ocultar categorías');
      toggleBtn.setAttribute('aria-label', isCollapsed ? 'Mostrar categorías' : 'Ocultar categorías');
      if (isCollapsed && tooltip) {
        tooltip.classList.remove('visible');
      }
    });
  }
}

/**
 * Escapa caracteres especiales de HTML para prevenir inyecciones XSS
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Normaliza una cadena eliminando diacríticos/acentos y convirtiéndola a minúsculas
 */
function removeAccents(str) {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Resalta y subraya visualmente las coincidencias de búsqueda en un texto original,
 * preservando acentos y mayúsculas/minúsculas originales con protección contra inyecciones HTML.
 */
function highlightMatches(text, query) {
  if (!text) return '';
  if (!query || !query.trim()) return escapeHtml(text);

  const normText = removeAccents(text);
  const tokens = query.trim().split(/\s+/).map(removeAccents).filter(t => t.length > 0);
  if (tokens.length === 0) return escapeHtml(text);

  const intervals = [];
  tokens.forEach(tok => {
    let startIdx = 0;
    while ((startIdx = normText.indexOf(tok, startIdx)) !== -1) {
      intervals.push([startIdx, startIdx + tok.length]);
      startIdx += tok.length;
    }
  });

  if (intervals.length === 0) return escapeHtml(text);

  // Fusionar intervalos solapados
  intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const curr = intervals[i];
    const prev = merged[merged.length - 1];
    if (curr[0] <= prev[1]) {
      prev[1] = Math.max(prev[1], curr[1]);
    } else {
      merged.push(curr);
    }
  }

  // Generar HTML seguro con <mark class="search-highlight">
  let result = '';
  let lastIdx = 0;
  for (const [start, end] of merged) {
    result += escapeHtml(text.slice(lastIdx, start));
    result += `<mark class="search-highlight">${escapeHtml(text.slice(start, end))}</mark>`;
    lastIdx = end;
  }
  result += escapeHtml(text.slice(lastIdx));
  return result;
}

/**
 * Evalúa si un platillo coincide con los términos del buscador inteligente
 * y calcula su puntaje de relevancia (score) para ordenamiento prioritario.
 */
function evaluateProductMatch(product, categoryName, query) {
  if (!query || !query.trim()) return { matches: true, score: 0 };

  const tokens = query.trim().split(/\s+/).map(removeAccents).filter(t => t.length > 0);
  if (tokens.length === 0) return { matches: true, score: 0 };

  const currentName = removeAccents(getLocalizedText(product.name));
  const nameEs = removeAccents(getLocalizedText(product.name, 'es'));
  const nameEn = removeAccents(getLocalizedText(product.name, 'en'));
  const nameFr = removeAccents(getLocalizedText(product.name, 'fr'));

  const currentDesc = removeAccents(getLocalizedText(product.description));
  const descEs = removeAccents(getLocalizedText(product.description, 'es'));
  const descEn = removeAccents(getLocalizedText(product.description, 'en'));
  const descFr = removeAccents(getLocalizedText(product.description, 'fr'));

  const catStr = removeAccents(categoryName || '');
  const tagsStr = (product.tags || []).map(removeAccents).join(' ');
  const allergensStr = (product.allergens || []).map(removeAccents).join(' ');

  let totalScore = 0;

  for (const token of tokens) {
    let tokenScore = 0;

    // 1. Coincidencia en Nombre del platillo (máxima prioridad)
    if (currentName.includes(token)) {
      tokenScore += 100;
      if (currentName.startsWith(token) || currentName.split(/\s+/).some(w => w.startsWith(token))) {
        tokenScore += 50; // Prefijo de palabra
      }
      if (currentName === token) {
        tokenScore += 100; // Coincidencia exacta
      }
    } else if (nameEs.includes(token) || nameEn.includes(token) || nameFr.includes(token)) {
      tokenScore += 80;
    }

    // 2. Coincidencia en Descripción del platillo
    if (currentDesc.includes(token)) {
      tokenScore += 35;
    } else if (descEs.includes(token) || descEn.includes(token) || descFr.includes(token)) {
      tokenScore += 25;
    }

    // 3. Coincidencia en Categoría
    if (catStr.includes(token)) {
      tokenScore += 30;
    }

    // 4. Coincidencia en Etiquetas o Alérgenos
    if (tagsStr.includes(token)) {
      tokenScore += 20;
    }
    if (allergensStr.includes(token)) {
      tokenScore += 15;
    }

    // Si algún token no se encuentra en ningún campo, el platillo no coincide
    if (tokenScore === 0) {
      return { matches: false, score: 0 };
    }

    totalScore += tokenScore;
  }

  return { matches: true, score: totalScore };
}

/**
 * Renderiza el menú completo filtrado por modo y búsqueda
 */
export function renderMenu() {
  const container = document.getElementById('menu-sections-container');
  if (!container) return;

  const isBreakfast = (currentMealMode === 'desayunos' || currentMealMode === 'desayuno');
  const currentLang = getLanguage();

  // Filtrar categorías para este modo
  const activeCategories = allCategories.filter(cat => {
    if (cat.section === 'ambos') return true;
    if (isBreakfast) {
      return cat.section === 'desayuno';
    } else {
      return cat.section === 'comida' || cat.section === 'cantina';
    }
  });

  const fragment = document.createDocumentFragment();
  let visibleProductCount = 0;

  activeCategories.forEach(category => {
    const catName = getLocalizedText(category.name);

    // Obtener y filtrar productos de esta categoría con el buscador inteligente
    const categoryProducts = allProducts.filter(p => {
      const matchCat = p.categoryId === category.id || p.categoryId === category.slug;
      if (!matchCat) return false;

      // Aplicar fórmula producto_final = product ⨯ menuOverride
      const override = allOverrides[p.id];
      const isVisible = (override && override.isVisible !== undefined)
        ? override.isVisible
        : (p.isActive !== false);

      if (!isVisible) {
        return false; // El admin lo despalomeó u ocultó
      }

      // Filtro de búsqueda inteligente
      if (searchQuery) {
        const evalResult = evaluateProductMatch(p, catName, searchQuery);
        if (!evalResult.matches) return false;
        p._searchScore = evalResult.score;
      }

      return true;
    });

    if (categoryProducts.length === 0) return;

    // Si hay búsqueda activa, ordenar los platillos por puntaje de relevancia
    if (searchQuery) {
      categoryProducts.sort((a, b) => (b._searchScore || 0) - (a._searchScore || 0));
    }

    visibleProductCount += categoryProducts.length;

    // Crear sección de categoría
    const section = document.createElement('section');
    section.className = 'category-section';
    section.id = `cat-${category.id || category.slug}`;

    const iconSrc = category.iconSvg || `assets/icons/${category.icon || 'maguey'}.svg`;

    section.innerHTML = `
      <div class="category-header">
        <h2 class="category-header-title">
          <img src="${iconSrc}" class="section-brand-icon" alt="" onerror="this.src='assets/icons/maguey.svg'"/>
          <span>${escapeHtml(catName)}</span>
        </h2>
        <span class="category-count">${categoryProducts.length} ${t('status.itemsCount', 'platillos')}</span>
      </div>
      <div class="products-grid"></div>
    `;

    const grid = section.querySelector('.products-grid');

    categoryProducts.forEach(product => {
      // Aplicar overrides de precio y descripción
      const override = allOverrides[product.id];
      const effectivePrice = (override && override.priceOverride !== null && override.priceOverride !== undefined) 
        ? override.priceOverride 
        : product.price;

      const rawProductDesc = (override && override.descriptionOverride)
        ? getLocalizedText(override.descriptionOverride)
        : getLocalizedText(product.description);

      // Nombre efectivo (permite override del admin o nombre maestro)
      const rawProductName = (override && override.nameOverride)
        ? getLocalizedText(override.nameOverride)
        : getLocalizedText(product.name);

      // Subrayado y resaltado inteligente de coincidencias de búsqueda
      const productNameHtml = searchQuery 
        ? highlightMatches(rawProductName, searchQuery) 
        : escapeHtml(rawProductName);

      const productDescHtml = searchQuery 
        ? highlightMatches(rawProductDesc || '', searchQuery) 
        : escapeHtml(rawProductDesc || '');

      // Control de disponibilidad (stock)
      const isAvailable = (override && override.isAvailable !== undefined)
        ? override.isAvailable
        : (product.isAvailable !== false);

      // Control de promociones
      const isPromo = (override && override.isPromo !== undefined)
        ? override.isPromo
        : (product.isPromo === true);

      const rawPromoPrice = (override && override.promoPrice !== undefined && override.promoPrice !== null && override.promoPrice !== '')
        ? override.promoPrice
        : product.promoPrice;
      const promoPrice = (rawPromoPrice !== undefined && rawPromoPrice !== null && rawPromoPrice !== '')
        ? Number(rawPromoPrice)
        : null;

      const promoTag = (override && override.promoTag) || product.promoTag || 'PROMO';

      // Alérgenos y etiquetas
      const productAllergens = (override && override.allergens) ? override.allergens : (product.allergens || []);
      const productTags = (override && override.tags) ? override.tags : (product.tags || []);

      const card = document.createElement('article');
      card.className = `product-card ${!isAvailable ? 'is-sold-out' : ''}`;

      // Precio con soporte de promoción
      let priceHtml = '';
      if (isPromo && promoPrice !== null && !isNaN(promoPrice) && promoPrice < effectivePrice) {
        priceHtml = `
          <div class="product-price-wrap promo-active">
            <span class="price-original-struck">$${effectivePrice}</span>
            <span class="product-price-pill is-promo">$${promoPrice}</span>
          </div>
        `;
      } else {
        priceHtml = `<span class="product-price-pill">$${effectivePrice}</span>`;
      }

      // Badges dinámicos según el idioma activo
      let badgesHtml = '';
      if (!isAvailable) {
        badgesHtml += `<span class="product-badge badge-agotado">⚠️ ${t('badges.soldOut', 'Agotado')}</span>`;
      }
      if (isPromo) {
        badgesHtml += `<span class="product-badge badge-promo">🔥 ${escapeHtml(promoTag)}</span>`;
      }
      if (productTags.includes('picante')) {
        badgesHtml += `<span class="product-badge badge-picante">🌶️ ${t('badges.spicy', 'Picante')}</span>`;
      }
      if (productTags.includes('vegetariano')) {
        badgesHtml += `<span class="product-badge badge-vegetariano">🌱 ${t('badges.vegetarian', 'Veg')}</span>`;
      }
      if (productTags.includes('vegano')) {
        badgesHtml += `<span class="product-badge badge-vegano">🌿 ${t('badges.vegan', 'Vegano')}</span>`;
      }
      if (productTags.includes('recomendado')) {
        badgesHtml += `<span class="product-badge badge-recomendado">⭐ ${t('badges.chef', 'Chef')}</span>`;
      }
      if (productTags.includes('hero')) {
        badgesHtml += `<span class="product-badge badge-especialidad">👑 ${t('badges.specialty', 'Especialidad')}</span>`;
      }

      // Alérgenos compactos traducidos
      const ALLERGEN_SHORT_ICONS = {
        gluten: '🌾',
        lacteos: '🥛',
        frutos_secos: '🥜',
        mariscos: '🦐',
        huevo: '🥚'
      };
      productAllergens.forEach(allId => {
        if (ALLERGEN_SHORT_ICONS[allId]) {
          const label = t(`allergensShort.${allId}`, allId);
          badgesHtml += `<span class="product-badge badge-allergen">${ALLERGEN_SHORT_ICONS[allId]} ${escapeHtml(label)}</span>`;
        }
      });

      card.innerHTML = `
        <div class="product-card-body">
          <div class="product-header-line">
            <h3 class="product-name">${productNameHtml}</h3>
            ${priceHtml}
          </div>
          <p class="product-desc">${productDescHtml}</p>
          <div class="product-card-footer">
            <div class="product-tag-badges">${badgesHtml}</div>
            <span class="view-details-prompt">${t('product.viewDetails', 'Detalles')} &rarr;</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        openProductModal({
          ...product,
          name: rawProductName,
          effectivePrice,
          effectiveDesc: rawProductDesc,
          isAvailable,
          isPromo,
          promoPrice,
          promoTag,
          allergens: productAllergens,
          tags: productTags
        });
      });

      grid.appendChild(card);
    });

    fragment.appendChild(section);
  });

  container.innerHTML = '';
  container.appendChild(fragment);

  // Actualizar píldora de estado de búsqueda en tiempo real
  const statusEl = document.getElementById('search-live-status');
  if (statusEl) {
    if (searchQuery && searchQuery.length > 0) {
      statusEl.style.display = 'flex';
      const countText = visibleProductCount === 1 ? '1 platillo' : `${visibleProductCount} platillos`;
      statusEl.innerHTML = `
        <div class="search-live-status-text">
          <span>🔎</span>
          <span>Resultados para <span class="search-status-query">"${escapeHtml(searchQuery)}"</span></span>
          <span class="search-status-count">${countText}</span>
        </div>
        <button type="button" class="search-status-reset-btn" id="search-status-reset-btn" title="Limpiar búsqueda">✕ Limpiar</button>
      `;
      const resetBtn = document.getElementById('search-status-reset-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          const searchInput = document.getElementById('menu-search-input');
          const clearBtn = document.getElementById('search-clear-btn');
          if (searchInput) searchInput.value = '';
          searchQuery = '';
          if (clearBtn) clearBtn.style.display = 'none';
          statusEl.style.display = 'none';
          renderMenu();
        });
      }
    } else {
      statusEl.style.display = 'none';
      statusEl.innerHTML = '';
    }
  }

  // Si no hay productos visibles
  if (visibleProductCount === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3">
          <circle cx="32" cy="32" r="28"/>
          <path d="M22 38C26 34 38 34 42 38M24 26H24.02M40 26H40.02"/>
        </svg>
        <h3 class="empty-state-title">${searchQuery ? 'No encontramos coincidencias' : t('status.empty', 'Estamos actualizando la carta')}</h3>
        <p class="empty-state-desc">${searchQuery ? `No hay platillos que coincidan con "${escapeHtml(searchQuery)}". Intenta buscar por ingrediente, corte, mezcal o categoría.` : 'Regresa en un momento.'}</p>
        ${searchQuery ? `<button type="button" class="btn-admin-primary" id="empty-clear-search-btn" style="margin-top: 1.25rem; font-size: 0.88rem; padding: 0.6rem 1.4rem; cursor: pointer;">Ver toda la carta</button>` : ''}
      </div>
    `;

    const emptyClear = document.getElementById('empty-clear-search-btn');
    if (emptyClear) {
      emptyClear.addEventListener('click', () => {
        const searchInput = document.getElementById('menu-search-input');
        const clearBtn = document.getElementById('search-clear-btn');
        if (searchInput) searchInput.value = '';
        searchQuery = '';
        if (clearBtn) clearBtn.style.display = 'none';
        renderMenu();
      });
    }
  }
}

/* --------------------------------------------------------------------------
   Sincronización en Tiempo Real de la Barra de Anuncios (Marquee Ticker)
   -------------------------------------------------------------------------- */
let defaultMarqueeTrackHtml = null;

function applyMarqueeConfig(config) {
  const marqueeTrack = document.getElementById('marquee-track');
  if (!marqueeTrack) return;

  // Guardar HTML inicial por defecto de index.html
  if (defaultMarqueeTrackHtml === null) {
    defaultMarqueeTrackHtml = marqueeTrack.innerHTML;
  }

  // 1. Aplicar clase de color (rosa | verde | blanco)
  marqueeTrack.classList.remove('color-rosa', 'color-verde', 'color-blanco');
  const validColors = ['rosa', 'verde', 'blanco'];
  const color = (config && validColors.includes(config.color)) ? config.color : 'rosa';
  marqueeTrack.classList.add(`color-${color}`);

  // 2. Contenido personalizado vs frases de marca
  const isCustom = config && config.mode !== 'default' && config.text && config.text.trim().length > 0;

  if (isCustom) {
    const textUpper = config.text.trim().toUpperCase();
    const icons = ['maguey.svg', 'pocima.svg', 'corazon.svg', 'sol.svg', 'hierbas.svg', 'limon.svg'];
    let halfHtml = '';
    const repeats = 6;
    for (let i = 0; i < repeats; i++) {
      const icon = icons[i % icons.length];
      halfHtml += `
        <div class="marquee-item">
          <span>${escapeHtml(textUpper)}</span>
          <img src="assets/icons/${icon}" class="marquee-sep" alt="" />
        </div>
      `;
    }
    // Duplicamos exactamente la mitad para mantener el desplazamiento continuo al -50%
    marqueeTrack.innerHTML = halfHtml + halfHtml;
  } else {
    // Restaurar frases default conservando la animación
    marqueeTrack.innerHTML = defaultMarqueeTrackHtml;
  }
}

function initMarqueeSync() {
  // 1. Carga instantánea desde localStorage
  try {
    const cached = localStorage.getItem('lc_marquee_config');
    if (cached) {
      applyMarqueeConfig(JSON.parse(cached));
    }
  } catch (e) {
    console.warn('Error leyendo lc_marquee_config:', e);
  }

  // Escuchar eventos de storage (cambios en otras pestañas en la misma sesión)
  window.addEventListener('storage', (e) => {
    if (e.key === 'lc_marquee_config' && e.newValue) {
      try {
        applyMarqueeConfig(JSON.parse(e.newValue));
      } catch (err) {}
    }
  });

  // 2. Listener en tiempo real desde Firestore
  if (isConfigured && db) {
    try {
      const marqueeDocRef = doc(db, `restaurants/${restaurantId}/settings/marquee`);
      onSnapshot(marqueeDocRef, (snap) => {
        if (snap.exists()) {
          const config = snap.data();
          localStorage.setItem('lc_marquee_config', JSON.stringify(config));
          applyMarqueeConfig(config);
        }
      }, (err) => {
        console.warn('Error en realtime listener de marquee:', err);
      });
    } catch (err) {
      console.warn('Error inicializando realtime listener de marquee:', err);
    }
  }
}

/**
 * Inicializa la sincronización de la configuración general del restaurante en tiempo real
 */
export function initRestaurantSettingsSync() {
  try {
    const cached = localStorage.getItem('lc_restaurant_settings');
    if (cached) {
      applyRestaurantSettings(JSON.parse(cached));
    }
  } catch (e) {
    console.warn('Error leyendo lc_restaurant_settings:', e);
  }

  if (isConfigured && db) {
    try {
      const settingsDocRef = doc(db, `restaurants/${restaurantId}/settings/general`);
      onSnapshot(settingsDocRef, (snap) => {
        if (snap.exists()) {
          const settings = snap.data();
          localStorage.setItem('lc_restaurant_settings', JSON.stringify(settings));
          applyRestaurantSettings(settings);
        }
      }, (err) => {
        console.warn('Error en realtime listener de restaurant settings:', err);
      });
    } catch (err) {
      console.warn('Error inicializando realtime listener de settings:', err);
    }
  }
}

/**
 * Aplica en el DOM del menú digital los cambios de configuración del restaurante
 */
export function applyRestaurantSettings(settings) {
  if (!settings) return;

  // 1. WhatsApp flotante
  setupWhatsAppFAB(settings.whatsapp, settings.whatsappMessage);

  // 2. Google Reviews y Mapas
  setupReviewLinks(settings.googlePlaceId, settings.mapsUrl);

  // 3. Horarios y Píldora de Turno
  if (settings.schedule) {
    updateMealSwitchUI(settings.schedule);
    if (settings.schedule.breakfast && settings.schedule.breakfast.label) {
      document.querySelectorAll('.footer-hours-desayuno').forEach(el => {
        el.textContent = `Desayunos: ${settings.schedule.breakfast.label}`;
      });
    }
    if (settings.schedule.lunch && settings.schedule.lunch.label) {
      document.querySelectorAll('.footer-hours-comida').forEach(el => {
        el.textContent = `Comida y Cantina: ${settings.schedule.lunch.label}`;
      });
    }
    if (settings.schedule.days) {
      document.querySelectorAll('.footer-hours-days').forEach(el => {
        el.textContent = `Abierto de ${settings.schedule.days}`;
      });
    }
  }

  // 4. Hero Subtitle / Eslogan
  if (settings.tagline) {
    document.querySelectorAll('.hero-subtitle').forEach(el => {
      el.textContent = settings.tagline;
    });
  }

  // 5. Hero Quote / Frase mística
  if (settings.quote) {
    document.querySelectorAll('.hero-quote, .footer-handwritten-closing').forEach(el => {
      el.textContent = settings.quote.startsWith('“') ? settings.quote : `“${settings.quote}”`;
    });
  }

  // 6. Nombre del Restaurante
  if (settings.name) {
    document.querySelectorAll('.header-title, .hero-title').forEach(el => {
      el.textContent = settings.name;
    });
  }

  // 7. Dirección física y Teléfono
  if (settings.address) {
    document.querySelectorAll('.branch-address, .footer-address').forEach(el => {
      el.textContent = settings.address;
    });
  }
  if (settings.phone) {
    document.querySelectorAll('.footer-phone').forEach(el => {
      el.textContent = `Tel: ${settings.phone}`;
    });
  }

  // 8. Instagram
  if (settings.instagram) {
    document.querySelectorAll('a[href*="instagram"]').forEach(a => {
      a.href = settings.instagram;
    });
  }

  // 9. Mapa embebido de Google Maps en el footer
  const mapIframe = document.querySelector('.footer-map-iframe');
  if (mapIframe) {
    let embedSrc = '';
    const effectivePlaceId = settings.googlePlaceId || 'ChIJu4FWH86_zYURzAbOmQ_PqTE';
    if (effectivePlaceId && effectivePlaceId.startsWith('ChIJ')) {
      embedSrc = `https://maps.google.com/maps?q=place_id:${encodeURIComponent(effectivePlaceId)}&output=embed`;
    } else if (settings.mapsUrl) {
      const coordsMatch = settings.mapsUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
                          settings.mapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordsMatch) {
        embedSrc = `https://maps.google.com/maps?q=${coordsMatch[1]},${coordsMatch[2]}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
      } else if (settings.address) {
        embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
      }
    } else if (settings.address) {
      embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
    }
    if (embedSrc && mapIframe.src !== embedSrc) {
      mapIframe.src = embedSrc;
    }
  }
}
