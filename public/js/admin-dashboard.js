/**
 * LA CURANDERA — Admin Dashboard
 * Gestión de Carta: Agregar, Quitar, Ocultar, Editar Nombre, Categoría, Precio y Descripción.
 * (Sin multimedia, fotos ni videos).
 */

import { 
  db, 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  serverTimestamp, 
  isConfigured
} from './firebase-init.js';
import { checkAdminAuth, logoutAdmin } from './admin-auth.js';
import { showToast } from './ui.js';
import { initPhysicalMenuAdmin } from './physical-menu-editor.js';
import { translateCulinaryText } from './culinary-translator.js?v=30.0';

let restaurantId = 'la-curandera';
let activeBranchId = 'metepec';
let activeView = 'branches'; // 'branches' | 'menu-editor' | 'settings'
let adminMealMode = 'desayuno'; // 'desayuno' | 'comida'

let branches = [
  { id: 'metepec', name: 'La Curandera', address: 'Tenancingo / Metepec, Edo. Méx.', phone: '+52 714 140 0000', isActive: true }
];
let categories = [];
let products = [];
let menuOverrides = {}; // { productId: { isVisible, isAvailable, isPromo, promoPrice, promoTag, allergens, tags, priceOverride, descriptionOverride } }
let pendingChanges = {}; // { productId: { ...changes } }

let searchFilter = '';
let categoryFilter = 'all';
let visibilityFilter = 'all'; // 'all' | 'visible' | 'hidden'
let stockFilter = 'all'; // 'all' | 'in_stock' | 'out_of_stock'
let promoFilter = 'all'; // 'all' | 'promo_only'
let selectedModalAllergens = new Set();

// Configuración de la Barra de Anuncios en Movimiento (Marquee Ticker)
let marqueeConfig = {
  enabled: true,
  mode: 'custom', // 'custom' | 'default'
  text: 'PÁ TODO MAL, MEZCAL; Y PÁ TODO BIEN, TAMBIÉN',
  color: 'rosa' // 'rosa' | 'verde' | 'blanco'
};

const MARQUEE_COLORS = {
  rosa: '#C94E8F',
  verde: '#159F9B',
  blanco: '#FFFFFF'
};

// Canal de Sincronización en Tiempo Real (BroadcastChannel nativo + LocalStorage event)
let syncChannel = null;
try {
  syncChannel = new BroadcastChannel('lc_menu_sync');
} catch (e) {}

function broadcastMenuSync(extraData = {}) {
  try {
    const payload = {
      type: 'MENU_SYNC',
      timestamp: Date.now(),
      restaurantId: restaurantId,
      branchId: activeBranchId,
      overrides: menuOverrides,
      categories: categories,
      productsCount: products.length,
      products: products,
      ...extraData
    };

    // 1. Canal BroadcastChannel nativo (0ms entre pestañas)
    if (syncChannel) {
      try {
        syncChannel.postMessage(payload);
      } catch (err) {}
    }

    // 2. LocalStorage Event (respaldo 0ms cross-tab y recarga rápida)
    localStorage.setItem('lc_menu_sync_event', JSON.stringify(payload));
  } catch (err) {
    console.warn("Error en broadcastMenuSync:", err);
  }
}

const ALLERGEN_OPTIONS = [
  { id: 'gluten', label: 'Gluten', icon: '🌾', isDiet: false },
  { id: 'lacteos', label: 'Lácteos', icon: '🥛', isDiet: false },
  { id: 'frutos_secos', label: 'Frutos Secos', icon: '🥜', isDiet: false },
  { id: 'mariscos', label: 'Mariscos', icon: '🦐', isDiet: false },
  { id: 'huevo', label: 'Huevo', icon: '🥚', isDiet: false },
  { id: 'picante', label: 'Picante', icon: '🌶️', isDiet: false },
  { id: 'vegetariano', label: 'Vegetariano', icon: '🌱', isDiet: true },
  { id: 'vegano', label: 'Vegano', icon: '🌿', isDiet: true },
  { id: 'recomendado', label: 'Chef', icon: '⭐', isDiet: true },
  { id: 'hero', label: 'Especialidad', icon: '👑', isDiet: true }
];

let isDashboardUISetup = false;

export function initAdminDashboard() {
  // 1. Configuración de UI inmediata (0ms de espera)
  setupDashboardUI();

  // 2. Carga inicial instantánea desde catálogo local para que NUNCA esté en blanco
  loadLocalFallback().then(() => {
    populateCategoryDropdowns();
    updateShiftStats();
    renderBranchesList();
    renderMenuEditorTable();
  });

  // 3. Autenticación y carga de datos en segundo plano
  checkAdminAuth((user) => {
    if (user) {
      setupDashboardUI(user);
    }
    loadData();
  });
}

function setupDashboardUI(user) {
  if (user) {
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) {
      const emailName = user.email ? user.email.split('@')[0] : (user.displayName || 'Administrador');
      greetingEl.textContent = `Hola, ${emailName}`;
    }
  }

  // Evitar registrar listeners duplicados si se llama dos veces
  if (isDashboardUISetup) return;
  isDashboardUISetup = true;

  // Navegación Sidebar
  document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = btn.getAttribute('data-view');
      if (view) {
        e.preventDefault();
        switchView(view);
      }
    });
  });

  // Logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => logoutAdmin());
  }

  // Guardar Cambios por Lote (Batch Save)
  const saveBatchBtn = document.getElementById('btn-save-batch');
  if (saveBatchBtn) {
    saveBatchBtn.addEventListener('click', savePendingChanges);
  }

  // Volver a sucursales
  const backToBranchesBtn = document.getElementById('btn-back-to-branches');
  if (backToBranchesBtn) {
    backToBranchesBtn.addEventListener('click', () => switchView('branches'));
  }

  // Filtros del editor
  const searchInput = document.getElementById('admin-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchFilter = e.target.value.toLowerCase().trim();
      renderMenuEditorTable();
    });
  }

  const catSelect = document.getElementById('admin-cat-filter');
  if (catSelect) {
    catSelect.addEventListener('change', (e) => {
      categoryFilter = e.target.value;
      renderMenuEditorTable();
    });
  }

  const visSelect = document.getElementById('admin-vis-filter');
  if (visSelect) {
    visSelect.addEventListener('change', (e) => {
      visibilityFilter = e.target.value;
      renderMenuEditorTable();
    });
  }

  const stockSelect = document.getElementById('admin-stock-filter');
  if (stockSelect) {
    stockSelect.addEventListener('change', (e) => {
      stockFilter = e.target.value;
      renderMenuEditorTable();
    });
  }

  const promoSelect = document.getElementById('admin-promo-filter');
  if (promoSelect) {
    promoSelect.addEventListener('change', (e) => {
      promoFilter = e.target.value;
      renderMenuEditorTable();
    });
  }

  // Botón "+ Agregar Platillo"
  const addBtn = document.getElementById('btn-open-add-modal');
  if (addBtn) {
    addBtn.addEventListener('click', () => openAddProductModal());
  }

  // Modal para agregar/editar producto
  setupProductModal();

  // Configurador de Barra de Anuncios (Marquee Ticker)
  setupMarqueeAdmin();

  // Configuración del Restaurante (Horarios, Google Maps, Contacto, Identidad)
  setupRestaurantSettingsAdmin();

  // Selector de Menú (Desayunos vs Comida)
  setupShiftSelector();

  // Gestor de Categorías (Agregar, Editar, Eliminar)
  setupCategoriesAdmin();

  // Renderizado inicial inmediato de sucursales
  renderBranchesList();
}

function switchView(viewName) {
  activeView = viewName;
  document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
    if (btn.getAttribute('data-view') === viewName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const views = ['view-branches', 'view-menu-editor', 'view-settings', 'view-physical-menu'];
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.style.display = 'none';
  });

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.style.display = 'block';

  if (viewName === 'branches') renderBranchesList();
  if (viewName === 'menu-editor') renderMenuEditorTable();
  if (viewName === 'settings') loadRestaurantSettings();
  if (viewName === 'physical-menu') initPhysicalMenuAdmin();
}

async function loadData() {
  // Asegurar que categories y products tengan datos base de inmediato si están vacíos
  if (categories.length === 0 || products.length === 0) {
    await loadLocalFallback();
    populateCategoryDropdowns();
    updateShiftStats();
    renderBranchesList();
    renderMenuEditorTable();
  }

  if (isConfigured && db) {
    try {
      // 1. Cargar Categorías
      const catSnap = await getDocs(collection(db, `restaurants/${restaurantId}/categories`));
      if (!catSnap.empty) {
        const loadedCats = [];
        catSnap.forEach(d => loadedCats.push({ id: d.id, ...d.data() }));
        loadedCats.sort((a, b) => (a.order !== undefined ? a.order : 999) - (b.order !== undefined ? b.order : 999));
        categories = loadedCats;
      }

      // 2. Cargar Productos
      const prodSnap = await getDocs(collection(db, `restaurants/${restaurantId}/products`));
      if (!prodSnap.empty) {
        const loadedProds = [];
        prodSnap.forEach(d => loadedProds.push({ id: d.id, ...d.data() }));
        loadedProds.sort((a, b) => (a.order !== undefined ? a.order : 999) - (b.order !== undefined ? b.order : 999));
        products = loadedProds;
      }

      // 3. Cargar Overrides de Sucursal
      const overSnap = await getDocs(collection(db, `restaurants/${restaurantId}/branches/${activeBranchId}/menuOverrides`));
      menuOverrides = {};
      overSnap.forEach(d => menuOverrides[d.id] = d.data());

      populateCategoryDropdowns();
      updateShiftStats();
      renderBranchesList();
      renderMenuEditorTable();
    } catch (e) {
      console.warn("Error loading Firestore data, using fallback data:", e);
      if (categories.length === 0 || products.length === 0) {
        await loadLocalFallback();
        populateCategoryDropdowns();
        updateShiftStats();
        renderBranchesList();
        renderMenuEditorTable();
      }
    }
  }

  // Cargar configuración de la barra en movimiento (Marquee)
  await loadMarqueeConfig();

  // Cargar configuración general del restaurante (Horarios, Reseñas, Contacto)
  await loadRestaurantSettings();
}

async function loadLocalFallback() {
  try {
    const res = await fetch('../data/catalog.json');
    if (res.ok) {
      const data = await res.json();
      categories = data.categories || [];
      products = data.products || [];
      menuOverrides = {};
    }
  } catch (e) {
    console.warn("Fallback load error", e);
  }
}

/* --------------------------------------------------------------------------
   Helpers para Filtrado por Menú (Desayunos vs Comida)
   -------------------------------------------------------------------------- */
export function isCategoryInMealMode(cat, mode) {
  if (!cat) return false;
  const section = (cat.section || '').toLowerCase();
  if (section === 'ambos') return true;
  if (mode === 'desayuno' || mode === 'desayunos') {
    return section === 'desayuno';
  } else {
    return section === 'comida' || section === 'cantina';
  }
}

export function getCategoryEmoji(cat) {
  if (cat && cat.emoji) return cat.emoji;
  const slug = (cat.slug || cat.id || '').toLowerCase();
  const emojis = {
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
  if (emojis[slug]) return emojis[slug];
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

function updateShiftStats() {
  const desCats = categories.filter(c => isCategoryInMealMode(c, 'desayuno'));
  const comCats = categories.filter(c => isCategoryInMealMode(c, 'comida'));

  const desCatIds = new Set();
  desCats.forEach(c => { if (c.id) desCatIds.add(c.id); if (c.slug) desCatIds.add(c.slug); });

  const comCatIds = new Set();
  comCats.forEach(c => { if (c.id) comCatIds.add(c.id); if (c.slug) comCatIds.add(c.slug); });

  const desProds = products.filter(p => desCatIds.has(p.categoryId)).length;
  const comProds = products.filter(p => comCatIds.has(p.categoryId)).length;

  const desStatsEl = document.getElementById('shift-desayuno-stats');
  if (desStatsEl) {
    desStatsEl.textContent = `${desCats.length} categorías · ${desProds} platillos`;
  }

  const comStatsEl = document.getElementById('shift-comida-stats');
  if (comStatsEl) {
    comStatsEl.textContent = `${comCats.length} categorías · ${comProds} platillos`;
  }
}

function setupShiftSelector() {
  const btnDesayuno = document.getElementById('btn-shift-desayuno');
  const btnComida = document.getElementById('btn-shift-comida');

  if (btnDesayuno) {
    btnDesayuno.addEventListener('click', () => {
      setAdminMealMode('desayuno');
    });
  }

  if (btnComida) {
    btnComida.addEventListener('click', () => {
      setAdminMealMode('comida');
    });
  }
}

function setAdminMealMode(mode) {
  adminMealMode = mode;
  categoryFilter = 'all';

  const btnDesayuno = document.getElementById('btn-shift-desayuno');
  const btnComida = document.getElementById('btn-shift-comida');

  if (btnDesayuno && btnComida) {
    if (mode === 'desayuno') {
      btnDesayuno.classList.add('active');
      btnDesayuno.setAttribute('aria-selected', 'true');
      btnComida.classList.remove('active');
      btnComida.setAttribute('aria-selected', 'false');
    } else {
      btnComida.classList.add('active');
      btnComida.setAttribute('aria-selected', 'true');
      btnDesayuno.classList.remove('active');
      btnDesayuno.setAttribute('aria-selected', 'false');
    }
  }

  populateCategoryDropdowns();
  updateShiftStats();
  renderMenuEditorTable();
}

function populateCategoryDropdowns() {
  const catFilter = document.getElementById('admin-cat-filter');
  const catSelect = document.getElementById('prod-category-select');

  // Filtrar categorías según el menú actualmente seleccionado (Desayunos vs Comida)
  const filteredCats = categories.filter(c => isCategoryInMealMode(c, adminMealMode));

  if (catFilter) {
    const modeLabel = adminMealMode === 'desayuno' ? 'Desayunos' : 'Comida';
    catFilter.innerHTML = `<option value="all">Todas las Categorías (${modeLabel})</option>`;
    filteredCats.forEach(cat => {
      const name = cat.name?.es || cat.name || cat.id;
      const emoji = cat.emoji || getCategoryEmoji(cat);
      catFilter.innerHTML += `<option value="${cat.id || cat.slug}">${emoji} ${name}</option>`;
    });

    if (categoryFilter !== 'all' && !filteredCats.some(c => (c.id === categoryFilter || c.slug === categoryFilter))) {
      categoryFilter = 'all';
      catFilter.value = 'all';
    } else {
      catFilter.value = categoryFilter;
    }
  }

  if (catSelect) {
    catSelect.innerHTML = '';
    filteredCats.forEach(cat => {
      const name = cat.name?.es || cat.name || cat.id;
      const emoji = cat.emoji || getCategoryEmoji(cat);
      catSelect.innerHTML += `<option value="${cat.id || cat.slug}">${emoji} ${name}</option>`;
    });
  }
}

function renderBranchesList() {
  const container = document.getElementById('branches-grid');
  if (!container) return;

  container.innerHTML = '';
  branches.forEach(branch => {
    const card = document.createElement('div');
    card.className = 'branch-card';
    card.innerHTML = `
      <div class="branch-card-header">
        <h3 class="branch-name">${branch.name}</h3>
        <span class="branch-status-badge branch-status-active">Activa</span>
      </div>
      <div class="branch-card-body">
        <p><strong>Ubicación:</strong> ${branch.address}</p>
        <p><strong>Teléfono:</strong> ${branch.phone}</p>
        <p><strong>Catálogo:</strong> ${products.length} platillos en la carta</p>
      </div>
      <div class="branch-card-actions">
        <button class="btn-admin-primary btn-edit-branch-menu" data-id="${branch.id}">
          Editar Carta Digital &rarr;
        </button>
      </div>
    `;

    card.querySelector('.btn-edit-branch-menu').addEventListener('click', () => {
      activeBranchId = branch.id;
      const titleEl = document.getElementById('current-branch-title');
      if (titleEl) titleEl.textContent = `Menú de ${branch.name}`;
      switchView('menu-editor');
    });

    container.appendChild(card);
  });
}

function renderMenuEditorTable() {
  const tbody = document.getElementById('admin-products-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  // 1. Conjunto de categorías válidas para el menú seleccionado (Desayunos vs Comida)
  const validCatIds = new Set();
  categories.filter(c => isCategoryInMealMode(c, adminMealMode)).forEach(c => {
    if (c.id) validCatIds.add(c.id);
    if (c.slug) validCatIds.add(c.slug);
  });

  const filtered = products.filter(product => {
    // Filtrar estrictamente por el menú activo seleccionado
    if (!validCatIds.has(product.categoryId)) return false;

    // Filtro categoría
    if (categoryFilter !== 'all' && product.categoryId !== categoryFilter) return false;

    const override = pendingChanges[product.id] || menuOverrides[product.id] || {};
    const isVisible = override.isVisible !== undefined ? override.isVisible : (product.isActive !== false);
    const isAvailable = override.isAvailable !== undefined ? override.isAvailable : (product.isAvailable !== false);
    const isPromo = override.isPromo !== undefined ? override.isPromo : (product.isPromo === true);

    // Filtro visibilidad
    if (visibilityFilter === 'visible' && !isVisible) return false;
    if (visibilityFilter === 'hidden' && isVisible) return false;

    // Filtro stock (disponibilidad)
    if (stockFilter === 'in_stock' && !isAvailable) return false;
    if (stockFilter === 'out_of_stock' && isAvailable) return false;

    // Filtro promociones
    if (promoFilter === 'promo_only' && !isPromo) return false;

    // Filtro búsqueda
    if (searchFilter) {
      const name = (product.name?.es || '').toLowerCase();
      const desc = (product.description?.es || '').toLowerCase();
      return name.includes(searchFilter) || desc.includes(searchFilter);
    }

    return true;
  });

  if (filtered.length === 0) {
    const modeLabel = adminMealMode === 'desayuno' ? 'Menú de Desayunos' : 'Menú de Comida';
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding:3rem 1rem; color:var(--lc-gray-500); font-family:var(--font-mono);">
          No se encontraron platillos en el <strong>${modeLabel}</strong> con los filtros seleccionados.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(product => {
    const override = pendingChanges[product.id] || menuOverrides[product.id] || {};
    const isVisible = override.isVisible !== undefined ? override.isVisible : (product.isActive !== false);
    const isAvailable = override.isAvailable !== undefined ? override.isAvailable : (product.isAvailable !== false);
    const isPromo = override.isPromo !== undefined ? override.isPromo : (product.isPromo === true);
    const promoPrice = override.promoPrice !== undefined ? override.promoPrice : (product.promoPrice !== undefined ? product.promoPrice : null);
    const promoTag = override.promoTag || product.promoTag || 'PROMO';

    const currentPrice = override.priceOverride !== undefined && override.priceOverride !== null ? override.priceOverride : product.price;
    const currentName = override.nameOverride || product.name?.es || '';
    const currentDesc = override.descriptionOverride?.es || product.description?.es || '';
    const currentCat = override.categoryOverride || product.categoryId || '';
    const currentWeight = override.weight !== undefined ? override.weight : (product.weight || '');
    const currentVolume = override.volume !== undefined ? override.volume : (product.volume || '');

    const allergens = override.allergens || product.allergens || [];
    const tags = override.tags || product.tags || [];

    // Generar opciones de categoría para el selector en fila (del menú activo)
    let catOptionsHtml = '';
    const activeMenuCats = categories.filter(c => isCategoryInMealMode(c, adminMealMode));
    activeMenuCats.forEach(cat => {
      const cId = cat.id || cat.slug;
      const cName = cat.name?.es || cat.name || cId;
      const emoji = cat.emoji || getCategoryEmoji(cat);
      const selected = cId === currentCat ? 'selected' : '';
      catOptionsHtml += `<option value="${cId}" ${selected}>${emoji} ${cName}</option>`;
    });

    // Badges de alérgenos y etiquetas
    let badgesHtml = '';
    if (isPromo) {
      badgesHtml += `<span class="table-tag-pill tag-promo">🔥 ${escapeHtml(promoTag)}</span>`;
    }
    tags.forEach(t => {
      const opt = ALLERGEN_OPTIONS.find(o => o.id === t);
      if (opt) badgesHtml += `<span class="table-tag-pill">${opt.icon} ${opt.label}</span>`;
    });
    allergens.forEach(a => {
      const opt = ALLERGEN_OPTIONS.find(o => o.id === a);
      if (opt) badgesHtml += `<span class="table-tag-pill">${opt.icon} ${opt.label}</span>`;
    });

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center;">
        <label class="checkbox-toggle-wrapper" title="${isVisible ? 'Visible en mesas' : 'Oculto en mesas'}">
          <input type="checkbox" class="checkbox-toggle toggle-visibility" data-id="${product.id}" ${isVisible ? 'checked' : ''}/>
        </label>
      </td>
      <td style="text-align:center;">
        <button class="btn-stock-toggle ${isAvailable ? 'in-stock' : 'out-of-stock'} toggle-stock" data-id="${product.id}" title="Clic para alternar disponibilidad (Agotado vs En Stock)">
          ${isAvailable ? 'En Stock ✅' : 'Agotado ⚠️'}
        </button>
      </td>
      <td>
        <input type="text" class="input-inline input-inline-name" data-id="${product.id}" value="${escapeHtml(currentName)}" title="Haz clic para cambiar el nombre del platillo" />
      </td>
      <td>
        <select class="input-inline select-inline-category" data-id="${product.id}" title="Haz clic para cambiar de categoría">
          ${catOptionsHtml}
        </select>
      </td>
      <td>
        <div class="table-price-group">
          <div class="price-row-input">
            <span class="price-label">Base:</span>
            <input type="number" min="0" step="any" class="input-inline input-inline-price" data-id="${product.id}" value="${currentPrice}" title="Precio regular base" />
          </div>
          <div class="price-row-input">
            <span class="price-label">Promo:</span>
            <input type="number" min="0" step="any" class="input-inline input-inline-promo-price" data-id="${product.id}" value="${promoPrice !== null && promoPrice !== undefined ? promoPrice : ''}" placeholder="Sin promo" title="Precio promocional de oferta" />
          </div>
        </div>
      </td>
      <td>
        <div class="table-portion-group">
          <div class="portion-row-input">
            <span class="portion-label">g:</span>
            <input type="text" class="input-inline input-inline-weight" data-id="${product.id}" value="${escapeHtml(currentWeight)}" placeholder="350g" title="Gramaje (ej: 350g)" />
          </div>
          <div class="portion-row-input">
            <span class="portion-label">ml:</span>
            <input type="text" class="input-inline input-inline-volume" data-id="${product.id}" value="${escapeHtml(currentVolume)}" placeholder="355ml" title="Mililitros (ej: 355ml)" />
          </div>
        </div>
      </td>
      <td style="text-align:center;">
        <button class="btn-promo-toggle ${isPromo ? 'active' : ''} toggle-promo" data-id="${product.id}" title="Clic para activar/desactivar promoción">
          ${isPromo ? `🔥 ${escapeHtml(promoTag)}` : 'Sin Promo'}
        </button>
      </td>
      <td>
        <div class="table-allergens-list">
          ${badgesHtml || '<span style="color:var(--lc-gray-400); font-size:0.7rem;">Sin etiquetas</span>'}
        </div>
      </td>
      <td style="text-align:center;">
        <div style="display:flex; justify-content:center; gap:0.4rem;">
          <button class="btn-edit-inline btn-edit-details" data-id="${product.id}" title="Editar detalles completos (alérgenos, descripción, promos)">
            ✏️
          </button>
          <button class="btn-delete-inline btn-delete-product" data-id="${product.id}" title="Eliminar de la carta">
            🗑️
          </button>
        </div>
      </td>
    `;

    // 1. Ocultar / Mostrar (Toggle "Palomear")
    const checkbox = tr.querySelector('.toggle-visibility');
    checkbox.addEventListener('change', (e) => {
      markPendingChange(product.id, { isVisible: e.target.checked });
    });

    // 2. Disponibilidad Inmediata (En Stock / Agotado)
    const stockBtn = tr.querySelector('.toggle-stock');
    stockBtn.addEventListener('click', () => {
      const nextStock = !isAvailable;
      markPendingChange(product.id, { isAvailable: nextStock });
      renderMenuEditorTable();
    });

    // 3. Cambiar Nombre del Platillo
    const nameInput = tr.querySelector('.input-inline-name');
    nameInput.addEventListener('change', (e) => {
      const val = e.target.value.trim();
      if (val) markPendingChange(product.id, { nameOverride: val });
    });

    // 4. Cambiar Categoría
    const catDropdown = tr.querySelector('.select-inline-category');
    catDropdown.addEventListener('change', (e) => {
      markPendingChange(product.id, { categoryOverride: e.target.value });
    });

    // 5. Cambiar Precio Base
    const priceInput = tr.querySelector('.input-inline-price');
    priceInput.addEventListener('change', (e) => {
      const val = Number(e.target.value);
      if (!isNaN(val) && val >= 0) {
        markPendingChange(product.id, { priceOverride: val });
      }
    });

    // 6. Cambiar Precio Promo
    const promoPriceInput = tr.querySelector('.input-inline-promo-price');
    promoPriceInput.addEventListener('change', (e) => {
      const raw = e.target.value.trim();
      if (raw === '') {
        markPendingChange(product.id, { promoPrice: null, isPromo: false });
      } else {
        const val = Number(raw);
        if (!isNaN(val) && val >= 0) {
          markPendingChange(product.id, { promoPrice: val, isPromo: true, promoTag: promoTag || 'PROMO' });
        }
      }
      renderMenuEditorTable();
    });

    // 7. Cambiar Gramaje (g)
    const weightInput = tr.querySelector('.input-inline-weight');
    if (weightInput) {
      weightInput.addEventListener('change', (e) => {
        markPendingChange(product.id, { weight: e.target.value.trim() });
      });
    }

    // 8. Cambiar Mililitros (ml)
    const volumeInput = tr.querySelector('.input-inline-volume');
    if (volumeInput) {
      volumeInput.addEventListener('change', (e) => {
        markPendingChange(product.id, { volume: e.target.value.trim() });
      });
    }

    // 9. Toggle Promo
    const promoBtn = tr.querySelector('.toggle-promo');
    promoBtn.addEventListener('click', () => {
      const nextPromo = !isPromo;
      const nextPrice = nextPromo ? (promoPrice || Math.round(currentPrice * 0.85)) : null;
      markPendingChange(product.id, {
        isPromo: nextPromo,
        promoPrice: nextPrice,
        promoTag: promoTag || 'PROMO'
      });
      renderMenuEditorTable();
    });

    // 10. Botón Editar en Modal
    const editBtn = tr.querySelector('.btn-edit-details');
    editBtn.addEventListener('click', () => openEditProductModal(product));

    // 11. Botón Quitar / Eliminar Platillo
    const deleteBtn = tr.querySelector('.btn-delete-product');
    deleteBtn.addEventListener('click', () => deleteProduct(product.id, currentName));

    tbody.appendChild(tr);
  });
}

function getCategoryName(categoryId) {
  const cat = categories.find(c => c.id === categoryId || c.slug === categoryId);
  return cat ? (cat.name?.es || cat.name || categoryId) : categoryId;
}

function markPendingChange(productId, partialChange) {
  if (!pendingChanges[productId]) {
    pendingChanges[productId] = {
      ...(menuOverrides[productId] || {})
    };
  }

  Object.assign(pendingChanges[productId], partialChange);
  updatePendingBarUI();
}

function updatePendingBarUI() {
  const bar = document.getElementById('pending-changes-bar');
  const countBadge = document.getElementById('pending-count-badge');
  const count = Object.keys(pendingChanges).length;

  if (bar && countBadge) {
    if (count > 0) {
      countBadge.textContent = `${count} cambios pendientes`;
      bar.classList.add('visible');
    } else {
      bar.classList.remove('visible');
    }
  }
}

async function savePendingChanges() {
  const count = Object.keys(pendingChanges).length;
  if (count === 0) return;

  const saveBtn = document.getElementById('btn-save-batch');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando en mesas...';
  }

  try {
    if (isConfigured && db) {
      const batch = writeBatch(db);

      for (const [productId, changes] of Object.entries(pendingChanges)) {
        // 1. Guardar override de sucursal
        const overrideRef = doc(db, `restaurants/${restaurantId}/branches/${activeBranchId}/menuOverrides/${productId}`);
        const overrideData = {
          updatedAt: serverTimestamp()
        };
        if (changes.isVisible !== undefined) overrideData.isVisible = changes.isVisible;
        if (changes.isAvailable !== undefined) overrideData.isAvailable = changes.isAvailable;
        if (changes.isPromo !== undefined) overrideData.isPromo = changes.isPromo;
        if (changes.promoPrice !== undefined) overrideData.promoPrice = changes.promoPrice;
        if (changes.promoTag !== undefined) overrideData.promoTag = changes.promoTag;
        if (changes.allergens !== undefined) overrideData.allergens = changes.allergens;
        if (changes.tags !== undefined) overrideData.tags = changes.tags;
        if (changes.priceOverride !== undefined) overrideData.priceOverride = changes.priceOverride;
        if (changes.descriptionOverride !== undefined) overrideData.descriptionOverride = changes.descriptionOverride;
        if (changes.weight !== undefined) overrideData.weight = changes.weight;
        if (changes.volume !== undefined) overrideData.volume = changes.volume;
        batch.set(overrideRef, overrideData, { merge: true });

        // 2. Si se cambiaron atributos maestros, actualizar el producto
        const prodRef = doc(db, `restaurants/${restaurantId}/products/${productId}`);
        const masterData = { updatedAt: serverTimestamp() };
        if (changes.nameOverride) {
          masterData.name = { es: changes.nameOverride, en: changes.nameOverride, fr: '' };
        }
        if (changes.categoryOverride) {
          masterData.categoryId = changes.categoryOverride;
        }
        if (changes.priceOverride !== undefined && changes.priceOverride !== null) {
          masterData.price = changes.priceOverride;
        }
        if (changes.descriptionOverride) {
          masterData.description = changes.descriptionOverride;
        }
        if (changes.isVisible !== undefined) {
          masterData.isActive = changes.isVisible;
        }
        if (changes.isAvailable !== undefined) {
          masterData.isAvailable = changes.isAvailable;
        }
        if (changes.isPromo !== undefined) {
          masterData.isPromo = changes.isPromo;
        }
        if (changes.promoPrice !== undefined) {
          masterData.promoPrice = changes.promoPrice;
        }
        if (changes.promoTag !== undefined) {
          masterData.promoTag = changes.promoTag;
        }
        if (changes.allergens !== undefined) {
          masterData.allergens = changes.allergens;
        }
        if (changes.tags !== undefined) {
          masterData.tags = changes.tags;
        }
        if (changes.weight !== undefined) {
          masterData.weight = changes.weight;
        }
        if (changes.volume !== undefined) {
          masterData.volume = changes.volume;
        }
        batch.set(prodRef, masterData, { merge: true });

        // Actualizar en el array local de productos
        const pIdx = products.findIndex(p => p.id === productId);
        if (pIdx !== -1) {
          if (changes.nameOverride) products[pIdx].name = { es: changes.nameOverride };
          if (changes.categoryOverride) products[pIdx].categoryId = changes.categoryOverride;
          if (changes.priceOverride !== undefined && changes.priceOverride !== null) products[pIdx].price = changes.priceOverride;
          if (changes.descriptionOverride) products[pIdx].description = changes.descriptionOverride;
          if (changes.isVisible !== undefined) products[pIdx].isActive = changes.isVisible;
          if (changes.isAvailable !== undefined) products[pIdx].isAvailable = changes.isAvailable;
          if (changes.isPromo !== undefined) products[pIdx].isPromo = changes.isPromo;
          if (changes.promoPrice !== undefined) products[pIdx].promoPrice = changes.promoPrice;
          if (changes.promoTag !== undefined) products[pIdx].promoTag = changes.promoTag;
          if (changes.allergens !== undefined) products[pIdx].allergens = changes.allergens;
          if (changes.tags !== undefined) products[pIdx].tags = changes.tags;
          if (changes.weight !== undefined) products[pIdx].weight = changes.weight;
          if (changes.volume !== undefined) products[pIdx].volume = changes.volume;
        }
      }

      await batch.commit();
      console.log(`✅ Batch write exitoso: ${count} cambios guardados en Firestore.`);
    }

    // Actualizar estado local
    Object.assign(menuOverrides, pendingChanges);
    pendingChanges = {};
    updatePendingBarUI();
    renderMenuEditorTable();

    // Notificar sincronización en tiempo real inmediata (0ms)
    broadcastMenuSync();

    showToast("💾 ¡Cambios guardados! El menú se actualizó en las mesas.");
  } catch (error) {
    console.error("Error saving pending changes:", error);
    showToast("⚠️ Ocurrió un error al guardar los cambios.");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Guardar cambios';
    }
  }
}

/**
 * Quitar / Eliminar Platillo
 */
async function deleteProduct(productId, productName) {
  if (!confirm(`¿Estás seguro de que deseas eliminar "${productName}" de la carta? Esta acción no se puede deshacer.`)) {
    return;
  }

  try {
    if (isConfigured && db) {
      await deleteDoc(doc(db, `restaurants/${restaurantId}/products/${productId}`));
      await deleteDoc(doc(db, `restaurants/${restaurantId}/branches/${activeBranchId}/menuOverrides/${productId}`)).catch(() => {});
    }

    products = products.filter(p => p.id !== productId);
    delete menuOverrides[productId];
    delete pendingChanges[productId];
    updatePendingBarUI();
    renderMenuEditorTable();

    // Notificar sincronización en tiempo real inmediata
    broadcastMenuSync();

    // Cerrar modal si estaba abierto con este producto
    const modal = document.getElementById('modal-edit-product');
    if (modal) modal.classList.remove('open');

    showToast(`🗑️ "${productName}" fue eliminado de la carta.`);
  } catch (error) {
    console.error("Error deleting product:", error);
    showToast("⚠️ Error al eliminar el platillo.");
  }
}

/**
 * Renderizado de chips de alérgenos en el modal
 */
function renderModalAllergenChips() {
  const container = document.getElementById('allergen-chips-container');
  if (!container) return;

  container.innerHTML = '';
  ALLERGEN_OPTIONS.forEach(opt => {
    const isSelected = selectedModalAllergens.has(opt.id);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `allergen-chip ${isSelected ? 'selected' : ''} ${opt.isDiet ? 'is-diet' : ''}`;
    chip.innerHTML = `<span>${opt.icon}</span> <span>${opt.label}</span>`;
    chip.addEventListener('click', () => {
      if (selectedModalAllergens.has(opt.id)) {
        selectedModalAllergens.delete(opt.id);
        chip.classList.remove('selected');
      } else {
        selectedModalAllergens.add(opt.id);
        chip.classList.add('selected');
      }
    });
    container.appendChild(chip);
  });
}

/**
 * Modal de Platillos: Agregar y Editar
 */
function setupProductModal() {
  const modal = document.getElementById('modal-edit-product');
  const closeBtn = document.getElementById('btn-close-prod-modal');
  const form = document.getElementById('form-edit-product');
  const deleteModalBtn = document.getElementById('btn-delete-from-modal');

  const promoCheckbox = document.getElementById('prod-modal-promo');
  const promoFields = document.getElementById('prod-promo-fields');
  const promoPriceInput = document.getElementById('prod-promo-price');
  const basePriceInput = document.getElementById('prod-base-price');
  const availableCheckbox = document.getElementById('prod-modal-available');
  const availableLabel = document.getElementById('prod-available-label');

  if (promoCheckbox && promoFields) {
    promoCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        promoFields.style.opacity = '1';
        promoFields.style.pointerEvents = 'auto';
        if (!promoPriceInput.value && basePriceInput.value) {
          promoPriceInput.value = Math.round(Number(basePriceInput.value) * 0.85);
        }
      } else {
        promoFields.style.opacity = '0.5';
        promoFields.style.pointerEvents = 'none';
      }
    });
  }

  if (availableCheckbox && availableLabel) {
    availableCheckbox.addEventListener('change', (e) => {
      availableLabel.textContent = e.target.checked ? 'En Existencia ✅' : 'Agotado por hoy ⚠️';
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  }

  if (deleteModalBtn) {
    deleteModalBtn.addEventListener('click', () => {
      const id = document.getElementById('prod-modal-id').value;
      const name = document.getElementById('prod-name-es').value;
      if (id) deleteProduct(id, name);
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleProductSave(form);
    });
  }
}

function openAddProductModal() {
  const modal = document.getElementById('modal-edit-product');
  if (!modal) return;

  const titleEl = document.getElementById('modal-product-title');
  if (titleEl) titleEl.textContent = 'Agregar Nuevo Platillo';
  const submitBtn = document.getElementById('btn-submit-product');
  if (submitBtn) submitBtn.textContent = '+ Crear Platillo';
  const deleteBtn = document.getElementById('btn-delete-from-modal');
  if (deleteBtn) deleteBtn.style.display = 'none';

  const idInput = document.getElementById('prod-modal-id');
  if (idInput) idInput.value = '';
  const nameInput = document.getElementById('prod-name-es');
  if (nameInput) nameInput.value = '';
  const priceInput = document.getElementById('prod-base-price');
  if (priceInput) priceInput.value = '';
  const descInput = document.getElementById('prod-desc-es');
  if (descInput) descInput.value = '';
  const nameEnInput = document.getElementById('prod-name-en');
  if (nameEnInput) nameEnInput.value = '';
  const nameFrInput = document.getElementById('prod-name-fr');
  if (nameFrInput) nameFrInput.value = '';
  const descEnInput = document.getElementById('prod-desc-en');
  if (descEnInput) descEnInput.value = '';
  const descFrInput = document.getElementById('prod-desc-fr');
  if (descFrInput) descFrInput.value = '';
  const visInput = document.getElementById('prod-modal-visible');
  if (visInput) visInput.checked = true;

  const weightInput = document.getElementById('prod-modal-weight');
  if (weightInput) weightInput.value = '';
  const volumeInput = document.getElementById('prod-modal-volume');
  if (volumeInput) volumeInput.value = '';

  const availInput = document.getElementById('prod-modal-available');
  const availLabel = document.getElementById('prod-available-label');
  if (availInput) availInput.checked = true;
  if (availLabel) availLabel.textContent = 'En Existencia ✅';

  const promoCheck = document.getElementById('prod-modal-promo');
  const promoFields = document.getElementById('prod-promo-fields');
  const promoPriceInput = document.getElementById('prod-promo-price');
  const promoTagSelect = document.getElementById('prod-promo-tag');

  if (promoCheck) promoCheck.checked = false;
  if (promoPriceInput) promoPriceInput.value = '';
  if (promoTagSelect) promoTagSelect.value = 'PROMO';
  if (promoFields) {
    promoFields.style.opacity = '0.5';
    promoFields.style.pointerEvents = 'none';
  }

  selectedModalAllergens = new Set();
  renderModalAllergenChips();

  const catSelect = document.getElementById('prod-category-select');
  const activeMenuCats = categories.filter(c => isCategoryInMealMode(c, adminMealMode));
  if (catSelect && activeMenuCats.length > 0) {
    catSelect.innerHTML = '';
    activeMenuCats.forEach(cat => {
      const name = cat.name?.es || cat.name || cat.id;
      const emoji = cat.emoji || getCategoryEmoji(cat);
      catSelect.innerHTML += `<option value="${cat.id || cat.slug}">${emoji} ${name}</option>`;
    });
    catSelect.value = activeMenuCats[0].id || activeMenuCats[0].slug;
  }

  modal.classList.add('open');
}

function openEditProductModal(product) {
  const modal = document.getElementById('modal-edit-product');
  if (!modal) return;

  const override = pendingChanges[product.id] || menuOverrides[product.id] || {};
  const isVisible = override.isVisible !== undefined ? override.isVisible : (product.isActive !== false);
  const isAvailable = override.isAvailable !== undefined ? override.isAvailable : (product.isAvailable !== false);
  const isPromo = override.isPromo !== undefined ? override.isPromo : (product.isPromo === true);
  const promoPrice = override.promoPrice !== undefined ? override.promoPrice : (product.promoPrice !== undefined ? product.promoPrice : null);
  const promoTag = override.promoTag || product.promoTag || 'PROMO';

  const currentPrice = override.priceOverride !== undefined && override.priceOverride !== null ? override.priceOverride : product.price;
  const currentName = override.nameOverride || product.name?.es || '';
  const currentDesc = override.descriptionOverride?.es || product.description?.es || '';
  const currentCat = override.categoryOverride || product.categoryId || '';
  const currentWeight = override.weight !== undefined ? override.weight : (product.weight || '');
  const currentVolume = override.volume !== undefined ? override.volume : (product.volume || '');

  const titleEl = document.getElementById('modal-product-title');
  if (titleEl) titleEl.textContent = 'Editar Platillo';
  const submitBtn = document.getElementById('btn-submit-product');
  if (submitBtn) submitBtn.textContent = 'Guardar Cambios';
  const deleteBtn = document.getElementById('btn-delete-from-modal');
  if (deleteBtn) deleteBtn.style.display = 'inline-block';

  const idInput = document.getElementById('prod-modal-id');
  if (idInput) idInput.value = product.id;
  const nameInput = document.getElementById('prod-name-es');
  if (nameInput) nameInput.value = currentName;
  const priceInput = document.getElementById('prod-base-price');
  if (priceInput) priceInput.value = currentPrice;
  const descInput = document.getElementById('prod-desc-es');
  if (descInput) descInput.value = currentDesc;

  const currentNameEn = (product.name?.en && product.name.en.toLowerCase() !== currentName.toLowerCase()) ? product.name.en : '';
  const currentNameFr = product.name?.fr || '';
  const currentDescEn = (override.descriptionOverride?.en && override.descriptionOverride.en.toLowerCase() !== currentDesc.toLowerCase()) 
    ? override.descriptionOverride.en 
    : (product.description?.en && product.description.en.toLowerCase() !== currentDesc.toLowerCase() ? product.description.en : '');
  const currentDescFr = override.descriptionOverride?.fr || product.description?.fr || '';

  const nameEnInput = document.getElementById('prod-name-en');
  if (nameEnInput) nameEnInput.value = currentNameEn;
  const nameFrInput = document.getElementById('prod-name-fr');
  if (nameFrInput) nameFrInput.value = currentNameFr;
  const descEnInput = document.getElementById('prod-desc-en');
  if (descEnInput) descEnInput.value = currentDescEn;
  const descFrInput = document.getElementById('prod-desc-fr');
  if (descFrInput) descFrInput.value = currentDescFr;

  const catSelect = document.getElementById('prod-category-select');
  if (catSelect) {
    const activeMenuCats = categories.filter(c => isCategoryInMealMode(c, adminMealMode));
    if (currentCat && !activeMenuCats.some(c => c.id === currentCat || c.slug === currentCat)) {
      const currentCatObj = categories.find(c => c.id === currentCat || c.slug === currentCat);
      if (currentCatObj) activeMenuCats.push(currentCatObj);
    }
    catSelect.innerHTML = '';
    activeMenuCats.forEach(cat => {
      const name = cat.name?.es || cat.name || cat.id;
      const emoji = cat.emoji || getCategoryEmoji(cat);
      catSelect.innerHTML += `<option value="${cat.id || cat.slug}">${emoji} ${name}</option>`;
    });
    catSelect.value = currentCat;
  }

  const weightInput = document.getElementById('prod-modal-weight');
  if (weightInput) weightInput.value = currentWeight;
  const volumeInput = document.getElementById('prod-modal-volume');
  if (volumeInput) volumeInput.value = currentVolume;

  const visInput = document.getElementById('prod-modal-visible');
  if (visInput) visInput.checked = isVisible;

  const availInput = document.getElementById('prod-modal-available');
  const availLabel = document.getElementById('prod-available-label');
  if (availInput) availInput.checked = isAvailable;
  if (availLabel) availLabel.textContent = isAvailable ? 'En Existencia ✅' : 'Agotado por hoy ⚠️';

  const promoCheck = document.getElementById('prod-modal-promo');
  const promoFields = document.getElementById('prod-promo-fields');
  const promoPriceInput = document.getElementById('prod-promo-price');
  const promoTagSelect = document.getElementById('prod-promo-tag');

  if (promoCheck) promoCheck.checked = isPromo;
  if (promoPriceInput) promoPriceInput.value = promoPrice !== null && promoPrice !== undefined ? promoPrice : '';
  if (promoTagSelect) promoTagSelect.value = promoTag;
  if (promoFields) {
    promoFields.style.opacity = isPromo ? '1' : '0.5';
    promoFields.style.pointerEvents = isPromo ? 'auto' : 'none';
  }

  // Cargar alérgenos y tags
  const existingAllergens = override.allergens || product.allergens || [];
  const existingTags = override.tags || product.tags || [];
  selectedModalAllergens = new Set([...existingAllergens, ...existingTags]);
  renderModalAllergenChips();

  modal.classList.add('open');
}

async function handleProductSave(form) {
  const id = document.getElementById('prod-modal-id').value;
  const nameEs = document.getElementById('prod-name-es').value.trim();
  const price = Number(document.getElementById('prod-base-price').value);
  const categoryId = document.getElementById('prod-category-select').value;
  const descEs = document.getElementById('prod-desc-es').value.trim();
  const weight = document.getElementById('prod-modal-weight')?.value.trim() || '';
  const volume = document.getElementById('prod-modal-volume')?.value.trim() || '';
  const isVisible = document.getElementById('prod-modal-visible').checked;
  const isAvailable = document.getElementById('prod-modal-available').checked;
  const isPromo = document.getElementById('prod-modal-promo').checked;
  const rawPromoPrice = document.getElementById('prod-promo-price').value;
  const promoPrice = isPromo && rawPromoPrice !== '' ? Number(rawPromoPrice) : null;
  const promoTag = document.getElementById('prod-promo-tag').value || 'PROMO';

  // Separar en alérgenos y tags dietéticas
  const allergens = [];
  const tags = [];
  selectedModalAllergens.forEach(item => {
    const opt = ALLERGEN_OPTIONS.find(o => o.id === item);
    if (opt && opt.isDiet) {
      tags.push(item);
    } else {
      allergens.push(item);
    }
  });

  const modal = document.getElementById('modal-edit-product');
  const submitBtn = document.getElementById('btn-submit-product');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Guardando...';

  try {
    const isNew = !id;
    const productId = isNew ? ('prod_' + Date.now()) : id;
    const existing = !isNew ? products.find(p => p.id === productId) : null;

    // Solo conservar imagen/video si el platillo ya contaba con multimedia propia y no el logo por defecto
    const isLogoImage = (url) => typeof url === 'string' && (url.includes('logo/logo.png') || url.endsWith('/logo.png') || url === 'assets/logo/logo.png');
    const existingImageUrl = (existing && existing.imageUrl && !isLogoImage(existing.imageUrl)) ? existing.imageUrl : null;
    const existingImageFallback = (existing && existing.imageFallback && !isLogoImage(existing.imageFallback)) ? existing.imageFallback : null;
    const existingVideoUrl = (existing && existing.videoUrl) ? existing.videoUrl : null;

    const inputNameEn = document.getElementById('prod-name-en')?.value.trim();
    const inputNameFr = document.getElementById('prod-name-fr')?.value.trim();
    const inputDescEn = document.getElementById('prod-desc-en')?.value.trim();
    const inputDescFr = document.getElementById('prod-desc-fr')?.value.trim();

    let finalNameEn = inputNameEn || (existing?.name?.en && existing.name.en.toLowerCase() !== nameEs.toLowerCase() ? existing.name.en : '');
    if (!finalNameEn || finalNameEn.toLowerCase() === nameEs.toLowerCase()) {
      finalNameEn = translateCulinaryText(nameEs, 'en', true);
    }

    let finalNameFr = inputNameFr || (existing?.name?.fr ? existing.name.fr : '');
    if (!finalNameFr || finalNameFr.toLowerCase() === nameEs.toLowerCase()) {
      finalNameFr = translateCulinaryText(nameEs, 'fr', true);
    }

    let finalDescEn = inputDescEn || (existing?.description?.en && existing.description.en.toLowerCase() !== descEs.toLowerCase() ? existing.description.en : '');
    if (descEs && (!finalDescEn || finalDescEn.toLowerCase() === descEs.toLowerCase())) {
      finalDescEn = translateCulinaryText(descEs, 'en', false);
    }

    let finalDescFr = inputDescFr || (existing?.description?.fr ? existing.description.fr : '');
    if (descEs && (!finalDescFr || finalDescFr.toLowerCase() === descEs.toLowerCase())) {
      finalDescFr = translateCulinaryText(descEs, 'fr', false);
    }

    const productData = {
      id: productId,
      name: { es: nameEs, en: finalNameEn || nameEs, fr: finalNameFr || nameEs },
      description: { es: descEs, en: finalDescEn || descEs, fr: finalDescFr || descEs },
      price: price,
      categoryId: categoryId,
      weight: weight,
      volume: volume,
      isActive: isVisible,
      isAvailable: isAvailable,
      isPromo: isPromo,
      promoPrice: promoPrice,
      promoTag: promoTag,
      allergens: allergens,
      tags: tags,
      imageUrl: existingImageUrl,
      imageFallback: existingImageFallback,
      videoUrl: existingVideoUrl,
      updatedAt: serverTimestamp()
    };
    if (existing && existing.order !== undefined) {
      productData.order = existing.order;
    }

    if (isConfigured && db) {
      await setDoc(doc(db, `restaurants/${restaurantId}/products/${productId}`), productData, { merge: true });
      
      // Override de sucursal
      await setDoc(doc(db, `restaurants/${restaurantId}/branches/${activeBranchId}/menuOverrides/${productId}`), {
        isVisible: isVisible,
        isAvailable: isAvailable,
        isPromo: isPromo,
        promoPrice: promoPrice,
        promoTag: promoTag,
        allergens: allergens,
        tags: tags,
        priceOverride: price,
        descriptionOverride: { es: descEs, en: finalDescEn || descEs, fr: finalDescFr || descEs },
        weight: weight,
        volume: volume,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    if (isNew) {
      products.unshift(productData);
      showToast(`✅ "${nameEs}" fue agregado a la carta.`);
    } else {
      const idx = products.findIndex(p => p.id === productId);
      if (idx !== -1) {
        products[idx] = { ...products[idx], ...productData };
      }
      showToast(`✅ "${nameEs}" fue actualizado.`);
    }

    menuOverrides[productId] = {
      isVisible: isVisible,
      isAvailable: isAvailable,
      isPromo: isPromo,
      promoPrice: promoPrice,
      promoTag: promoTag,
      allergens: allergens,
      tags: tags,
      priceOverride: price,
      descriptionOverride: { es: descEs, en: finalDescEn || descEs, fr: finalDescFr || descEs },
      weight: weight,
      volume: volume
    };

    delete pendingChanges[productId];
    updatePendingBarUI();

    modal.classList.remove('open');
    renderMenuEditorTable();

    // Notificar sincronización en tiempo real inmediata
    broadcastMenuSync();
  } catch (error) {
    console.error("Error saving product:", error);
    showToast("⚠️ Ocurrió un error al guardar el platillo.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isNew ? '+ Crear Platillo' : 'Guardar Cambios';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* --------------------------------------------------------------------------
   Gestión de Categorías de la Carta (Agregar, Editar, Eliminar y Sincronizar)
   -------------------------------------------------------------------------- */
const CATEGORIES_DEFAULT_EMOJIS = [
  '🍳', '🌶️', '🌮', '🥣', '🥪', '🥞', '🍰', '☕', 
  '🧃', '🥤', '🍹', '🦐', '🥑', '🥗', '🍲', '🍟', 
  '🥘', '🥩', '🌯', '🍔', '👶', '🥃', '🍺', '🧀', 
  '🫔', '🍕', '🍧', '🍦', '🍽️', '✨'
];

let activeCatModalFilter = 'current'; // 'current' | 'desayuno' | 'comida' | 'all'
let editingCategoryId = null;
let hasPendingCategoryOrderChanges = false;
let lastMovedCategoryId = null;
let draggedCategoryId = null;

function setupCategoriesAdmin() {
  const modal = document.getElementById('modal-manage-categories');
  const openBtn = document.getElementById('btn-open-categories-modal');
  const closeBtn = document.getElementById('btn-close-cat-modal');
  const form = document.getElementById('form-manage-category');
  const cancelBtn = document.getElementById('btn-cancel-cat-edit');
  const searchInput = document.getElementById('cat-search-input');
  const saveOrderBtn = document.getElementById('btn-save-categories-order');
  const emojiGrid = document.getElementById('cat-emoji-selector');
  const emojiInput = document.getElementById('cat-form-emoji-input');

  // Guardar orden de categorías
  if (saveOrderBtn) {
    saveOrderBtn.addEventListener('click', async () => {
      await saveCategoryOrder();
    });
  }

  // Renderizar selector visual de emojis
  if (emojiGrid) {
    emojiGrid.innerHTML = '';
    CATEGORIES_DEFAULT_EMOJIS.forEach(emoji => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-pick-btn';
      btn.textContent = emoji;
      btn.title = `Seleccionar emoji ${emoji}`;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.emoji-pick-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (emojiInput) emojiInput.value = emoji;
      });
      emojiGrid.appendChild(btn);
    });
  }

  // Sincronizar input de emoji manual con botones
  if (emojiInput) {
    emojiInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      document.querySelectorAll('.emoji-pick-btn').forEach(b => {
        if (b.textContent === val) b.classList.add('selected');
        else b.classList.remove('selected');
      });
    });
  }

  // Abrir Modal
  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      resetCategoryForm();
      activeCatModalFilter = 'current';
      document.querySelectorAll('.cat-filter-tab').forEach(t => {
        if (t.getAttribute('data-cat-filter') === 'current') t.classList.add('active');
        else t.classList.remove('active');
      });
      const currentTab = document.getElementById('tab-cat-current');
      if (currentTab) {
        currentTab.textContent = adminMealMode === 'desayuno' ? '🍳 Del Menú Desayunos' : '🥩 Del Menú Comida';
      }
      renderCategoryItemsList();
      modal.classList.add('open');
    });
  }

  // Cerrar Modal
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('open');
    });
  }

  // Tabs de filtro dentro del modal
  document.querySelectorAll('.cat-filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cat-filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCatModalFilter = tab.getAttribute('data-cat-filter') || 'current';
      renderCategoryItemsList();
    });
  });

  // Buscador de categorías dentro del modal
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderCategoryItemsList();
    });
  }

  // Cancelar Edición
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      resetCategoryForm();
    });
  }

  // Guardar Categoría (Crear o Editar)
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleCategorySave();
    });
  }
}

function resetCategoryForm() {
  editingCategoryId = null;
  const form = document.getElementById('form-manage-category');
  if (form) form.reset();

  const idInput = document.getElementById('cat-form-id');
  if (idInput) idInput.value = '';
  const nameFrInput = document.getElementById('cat-form-name-fr');
  if (nameFrInput) nameFrInput.value = '';

  const titleEl = document.getElementById('cat-form-title');
  if (titleEl) titleEl.textContent = '+ Nueva Categoría';

  const badgeEl = document.getElementById('cat-form-badge');
  if (badgeEl) {
    badgeEl.textContent = 'Creación';
    badgeEl.className = 'badge-mode-new';
  }

  const cancelBtn = document.getElementById('btn-cancel-cat-edit');
  if (cancelBtn) cancelBtn.style.display = 'none';

  const submitBtn = document.getElementById('btn-submit-category');
  if (submitBtn) submitBtn.textContent = '💾 Guardar Categoría';

  const sectionSelect = document.getElementById('cat-form-section');
  if (sectionSelect) {
    sectionSelect.value = adminMealMode === 'desayuno' ? 'desayuno' : 'comida';
  }

  const orderInput = document.getElementById('cat-form-order');
  if (orderInput) {
    orderInput.value = categories.length + 1;
  }

  const emojiInput = document.getElementById('cat-form-emoji-input');
  if (emojiInput) emojiInput.value = '🍽️';

  document.querySelectorAll('.emoji-pick-btn').forEach(b => {
    if (b.textContent === '🍽️') b.classList.add('selected');
    else b.classList.remove('selected');
  });

  document.querySelectorAll('.cat-item-card').forEach(c => c.classList.remove('is-editing'));
}

function renderCategoryItemsList() {
  const container = document.getElementById('categories-items-list');
  const countEl = document.getElementById('cat-total-count');
  const searchInput = document.getElementById('cat-search-input');
  const saveOrderBtn = document.getElementById('btn-save-categories-order');
  if (!container) return;

  if (countEl) countEl.textContent = categories.length;

  if (saveOrderBtn) {
    if (hasPendingCategoryOrderChanges) {
      saveOrderBtn.disabled = false;
      saveOrderBtn.className = 'btn-save-cat-order pending';
      saveOrderBtn.textContent = '💾 Guardar Orden (Pendiente)';
    } else {
      saveOrderBtn.disabled = true;
      saveOrderBtn.className = 'btn-save-cat-order';
      saveOrderBtn.textContent = '💾 Guardar Orden';
    }
  }

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  // Filtrar según tab activa
  let filtered = categories;
  if (activeCatModalFilter === 'current') {
    filtered = categories.filter(c => isCategoryInMealMode(c, adminMealMode));
  } else if (activeCatModalFilter === 'desayuno') {
    filtered = categories.filter(c => c.section === 'desayuno' || c.section === 'ambos');
  } else if (activeCatModalFilter === 'comida') {
    filtered = categories.filter(c => c.section === 'comida' || c.section === 'cantina' || c.section === 'ambos');
  }

  if (query) {
    filtered = filtered.filter(c => {
      const nameEs = (c.name?.es || c.name || '').toLowerCase();
      const nameEn = (c.name?.en || '').toLowerCase();
      return nameEs.includes(query) || nameEn.includes(query);
    });
  }

  // Ordenar por order
  filtered.sort((a, b) => (a.order !== undefined ? a.order : 999) - (b.order !== undefined ? b.order : 999));

  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:2rem 1rem; color:var(--lc-gray-500); font-family:var(--font-mono); font-size:0.85rem;">
        No hay categorías en esta vista.
      </div>
    `;
    return;
  }

  filtered.forEach((cat, index) => {
    const isFirst = index === 0;
    const isLast = index === filtered.length - 1;
    const isMoved = lastMovedCategoryId === cat.id;

    const card = document.createElement('div');
    card.className = `cat-item-card ${editingCategoryId === cat.id ? 'is-editing' : ''} ${isMoved ? 'just-moved' : ''}`;
    card.setAttribute('data-id', cat.id);
    card.setAttribute('draggable', 'true');

    const emoji = cat.emoji || getCategoryEmoji(cat);
    const nameEs = cat.name?.es || cat.name || cat.id;
    const displayPos = cat.order !== undefined ? `#${cat.order}` : `#${index + 1}`;

    // Contar platillos asociados
    const assignedDishes = products.filter(p => p.categoryId === cat.id || p.categoryId === cat.slug).length;

    // Badge de sección
    let secClass = 'sec-desayuno';
    let secLabel = '🍳 Desayuno';
    if (cat.section === 'comida') {
      secClass = 'sec-comida';
      secLabel = '🥩 Comida';
    } else if (cat.section === 'ambos') {
      secClass = 'sec-ambos';
      secLabel = '✨ Ambos';
    } else if (cat.section === 'cantina') {
      secClass = 'sec-cantina';
      secLabel = '🥃 Cantina';
    }

    card.innerHTML = `
      <div class="cat-item-main">
        <span class="cat-item-emoji">${emoji}</span>
        <div class="cat-item-text">
          <span class="cat-item-name">${nameEs}</span>
          <div class="cat-item-meta">
            <span class="cat-section-pill ${secClass}">${secLabel}</span>
            <span class="cat-dish-count-badge">${assignedDishes} platillos</span>
            <span class="cat-pos-badge" title="Posición actual">${displayPos}</span>
          </div>
        </div>
      </div>
      <div class="cat-item-actions">
        <div class="cat-reorder-btns">
          <button type="button" class="btn-cat-reorder btn-cat-up" data-id="${cat.id}" title="Mover categoría más arriba" ${isFirst ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn-cat-reorder btn-cat-down" data-id="${cat.id}" title="Mover categoría más abajo" ${isLast ? 'disabled' : ''}>▼</button>
        </div>
        <button type="button" class="btn-cat-action btn-cat-edit" title="Editar categoría">✏️ Editar</button>
        <button type="button" class="btn-cat-action btn-cat-del" title="Eliminar categoría">🗑️</button>
      </div>
    `;

    // Botones de subir / bajar
    const upBtn = card.querySelector('.btn-cat-up');
    const downBtn = card.querySelector('.btn-cat-down');
    if (upBtn) {
      upBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveCategory(cat.id, 'up');
      });
    }
    if (downBtn) {
      downBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveCategory(cat.id, 'down');
      });
    }

    // Drag & Drop
    card.addEventListener('dragstart', (e) => {
      draggedCategoryId = cat.id;
      card.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', cat.id);
      } catch (err) {}
    });

    card.addEventListener('dragend', () => {
      draggedCategoryId = null;
      document.querySelectorAll('.cat-item-card').forEach(c => {
        c.classList.remove('is-dragging', 'drag-over');
      });
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedCategoryId || draggedCategoryId === cat.id) return;
      e.dataTransfer.dropEffect = 'move';
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      if (!draggedCategoryId || draggedCategoryId === cat.id) return;
      handleCategoryDrop(draggedCategoryId, cat.id);
    });

    // Clic Editar
    card.querySelector('.btn-cat-edit').addEventListener('click', () => {
      editCategory(cat);
    });

    // Clic Eliminar
    card.querySelector('.btn-cat-del').addEventListener('click', () => {
      deleteCategory(cat.id, nameEs, assignedDishes);
    });

    container.appendChild(card);
  });
}

function moveCategory(catId, direction) {
  const searchInput = document.getElementById('cat-search-input');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  let filtered = categories;
  if (activeCatModalFilter === 'current') {
    filtered = categories.filter(c => isCategoryInMealMode(c, adminMealMode));
  } else if (activeCatModalFilter === 'desayuno') {
    filtered = categories.filter(c => c.section === 'desayuno' || c.section === 'ambos');
  } else if (activeCatModalFilter === 'comida') {
    filtered = categories.filter(c => c.section === 'comida' || c.section === 'cantina' || c.section === 'ambos');
  }

  if (query) {
    filtered = filtered.filter(c => {
      const nameEs = (c.name?.es || c.name || '').toLowerCase();
      const nameEn = (c.name?.en || '').toLowerCase();
      return nameEs.includes(query) || nameEn.includes(query);
    });
  }

  filtered.sort((a, b) => (a.order !== undefined ? a.order : 999) - (b.order !== undefined ? b.order : 999));

  const currentIdx = filtered.findIndex(c => c.id === catId);
  if (currentIdx === -1) return;

  const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
  if (targetIdx < 0 || targetIdx >= filtered.length) return;

  const catA = filtered[currentIdx];
  const catB = filtered[targetIdx];

  // Reubicar catA relativo a catB en el arreglo global categories
  const idxA = categories.findIndex(c => c.id === catA.id);
  if (idxA === -1) return;
  categories.splice(idxA, 1);

  const newIdxB = categories.findIndex(c => c.id === catB.id);
  if (newIdxB === -1) {
    categories.push(catA);
  } else {
    if (direction === 'up') {
      categories.splice(newIdxB, 0, catA);
    } else {
      categories.splice(newIdxB + 1, 0, catA);
    }
  }

  // Renormalizar orden numérico secuencial 1..N
  categories.forEach((c, idx) => {
    c.order = idx + 1;
  });

  hasPendingCategoryOrderChanges = true;
  lastMovedCategoryId = catA.id;

  if (editingCategoryId === catA.id) {
    const orderInput = document.getElementById('cat-form-order');
    if (orderInput) orderInput.value = catA.order;
  }

  const container = document.getElementById('categories-items-list');
  const scrollPos = container ? container.scrollTop : 0;

  renderCategoryItemsList();

  if (container) {
    container.scrollTop = scrollPos;
  }
}

function handleCategoryDrop(sourceCatId, targetCatId) {
  if (sourceCatId === targetCatId) return;

  const idxA = categories.findIndex(c => c.id === sourceCatId);
  if (idxA === -1) return;
  const [catA] = categories.splice(idxA, 1);

  const newIdxB = categories.findIndex(c => c.id === targetCatId);
  if (newIdxB === -1) {
    categories.push(catA);
  } else {
    categories.splice(newIdxB, 0, catA);
  }

  categories.forEach((c, idx) => {
    c.order = idx + 1;
  });

  hasPendingCategoryOrderChanges = true;
  lastMovedCategoryId = catA.id;

  if (editingCategoryId === catA.id) {
    const orderInput = document.getElementById('cat-form-order');
    if (orderInput) orderInput.value = catA.order;
  }

  const container = document.getElementById('categories-items-list');
  const scrollPos = container ? container.scrollTop : 0;

  renderCategoryItemsList();

  if (container) {
    container.scrollTop = scrollPos;
  }
}

async function saveCategoryOrder() {
  const saveBtn = document.getElementById('btn-save-categories-order');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.className = 'btn-save-cat-order';
    saveBtn.textContent = '⏳ Guardando orden...';
  }

  try {
    // 1. Guardar en Firestore si está configurado (Batch write masivo atómico)
    if (isConfigured && db) {
      const batch = writeBatch(db);
      categories.forEach(cat => {
        const catRef = doc(db, `restaurants/${restaurantId}/categories/${cat.id}`);
        batch.set(catRef, { 
          order: Number(cat.order),
          updatedAt: serverTimestamp() 
        }, { merge: true });
      });
      await batch.commit();
    }

    // 2. Actualizar caché local
    try {
      localStorage.setItem('lc_catalog_cache_v4', JSON.stringify({ categories, products }));
    } catch (e) {}

    // 3. Sincronizar en tiempo real inmediata (0ms) a todas las pantallas/menú público
    broadcastMenuSync({ categories: categories });

    // 4. Actualizar estado y UI
    hasPendingCategoryOrderChanges = false;
    populateCategoryDropdowns();
    updateShiftStats();
    renderMenuEditorTable();
    renderCategoryItemsList();

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.className = 'btn-save-cat-order saved';
      saveBtn.textContent = '✓ ¡Orden Guardado!';
      setTimeout(() => {
        if (saveBtn && !hasPendingCategoryOrderChanges) {
          saveBtn.className = 'btn-save-cat-order';
          saveBtn.textContent = '💾 Guardar Orden';
        }
      }, 2500);
    }

    showToast("✅ ¡Orden de categorías guardado! Los cambios ya están en vivo en el menú público.");
  } catch (error) {
    console.error("Error saving category order:", error);
    showToast("⚠️ Ocurrió un error al guardar el orden de categorías.");
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.className = 'btn-save-cat-order pending';
      saveBtn.textContent = '💾 Guardar Orden';
    }
  }
}

function editCategory(cat) {
  editingCategoryId = cat.id;
  const idInput = document.getElementById('cat-form-id');
  const nameEsInput = document.getElementById('cat-form-name-es');
  const nameEnInput = document.getElementById('cat-form-name-en');
  const sectionSelect = document.getElementById('cat-form-section');
  const orderInput = document.getElementById('cat-form-order');
  const emojiInput = document.getElementById('cat-form-emoji-input');
  const titleEl = document.getElementById('cat-form-title');
  const badgeEl = document.getElementById('cat-form-badge');
  const cancelBtn = document.getElementById('btn-cancel-cat-edit');
  const submitBtn = document.getElementById('btn-submit-category');

  const nameEs = cat.name?.es || cat.name || '';
  const nameEn = (cat.name?.en && cat.name.en.toLowerCase() !== nameEs.toLowerCase()) ? cat.name.en : '';
  const nameFr = cat.name?.fr || '';
  const emoji = cat.emoji || getCategoryEmoji(cat);

  if (idInput) idInput.value = cat.id;
  if (nameEsInput) nameEsInput.value = nameEs;
  if (nameEnInput) nameEnInput.value = nameEn;
  const nameFrInput = document.getElementById('cat-form-name-fr');
  if (nameFrInput) nameFrInput.value = nameFr;
  if (sectionSelect) sectionSelect.value = cat.section || 'desayuno';
  if (orderInput) orderInput.value = cat.order !== undefined ? cat.order : '';
  if (emojiInput) emojiInput.value = emoji;

  if (titleEl) titleEl.textContent = `✏️ Editar: ${nameEs}`;
  if (badgeEl) {
    badgeEl.textContent = 'Editando';
    badgeEl.className = 'badge-mode-edit';
  }
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
  if (submitBtn) submitBtn.textContent = '💾 Actualizar Categoría';

  // Highlight emoji
  document.querySelectorAll('.emoji-pick-btn').forEach(b => {
    if (b.textContent === emoji) b.classList.add('selected');
    else b.classList.remove('selected');
  });

  renderCategoryItemsList();
  if (nameEsInput) nameEsInput.focus();
}

async function handleCategorySave() {
  const id = document.getElementById('cat-form-id').value.trim();
  const nameEs = document.getElementById('cat-form-name-es').value.trim();
  const nameEn = document.getElementById('cat-form-name-en').value.trim();
  const nameFr = document.getElementById('cat-form-name-fr')?.value.trim();
  const section = document.getElementById('cat-form-section').value;
  const rawOrder = document.getElementById('cat-form-order').value;
  const emoji = document.getElementById('cat-form-emoji-input').value.trim() || '🍽️';

  if (!nameEs) {
    alert("El nombre de la categoría en español es obligatorio.");
    return;
  }

  const submitBtn = document.getElementById('btn-submit-category');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';
  }

  try {
    const isNew = !id;
    // Generar slug/id limpio
    const catId = isNew 
      ? (nameEs.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat_${Date.now()}`)
      : id;

    const existingCat = !isNew ? categories.find(c => c.id === catId || c.slug === catId) : null;

    let finalNameEn = nameEn || (existingCat?.name?.en && existingCat.name.en.toLowerCase() !== nameEs.toLowerCase() ? existingCat.name.en : '');
    if (!finalNameEn || finalNameEn.toLowerCase() === nameEs.toLowerCase()) {
      finalNameEn = translateCulinaryText(nameEs, 'en', true);
    }

    let finalNameFr = nameFr || (existingCat?.name?.fr ? existingCat.name.fr : '');
    if (!finalNameFr || finalNameFr.toLowerCase() === nameEs.toLowerCase()) {
      finalNameFr = translateCulinaryText(nameEs, 'fr', true);
    }

    const order = rawOrder !== '' ? Number(rawOrder) : (categories.length + 1);

    const catData = {
      id: catId,
      slug: catId,
      name: {
        es: nameEs,
        en: finalNameEn || nameEs,
        fr: finalNameFr || nameEs
      },
      section: section,
      order: order,
      emoji: emoji,
      icon: 'maguey',
      isActive: true,
      updatedAt: serverTimestamp()
    };

    if (isNew) {
      categories.push(catData);
      categories.sort((a, b) => (a.order !== undefined ? a.order : 999) - (b.order !== undefined ? b.order : 999));
      categories.forEach((c, idx) => { c.order = idx + 1; });
      showToast(`✅ Categoría "${nameEs}" creada con éxito.`);
    } else {
      const idx = categories.findIndex(c => c.id === catId || c.slug === catId);
      if (idx !== -1) {
        categories[idx] = { ...categories[idx], ...catData };
      }
      categories.sort((a, b) => (a.order !== undefined ? a.order : 999) - (b.order !== undefined ? b.order : 999));
      categories.forEach((c, idx) => { c.order = idx + 1; });
      showToast(`✅ Categoría "${nameEs}" actualizada.`);
    }

    // Persistir todos los órdenes en Firestore si está configurado (Batch write masivo)
    if (isConfigured && db) {
      const batch = writeBatch(db);
      categories.forEach(cat => {
        const catRef = doc(db, `restaurants/${restaurantId}/categories/${cat.id}`);
        batch.set(catRef, { 
          ...cat,
          order: Number(cat.order),
          updatedAt: serverTimestamp() 
        }, { merge: true });
      });
      await batch.commit();
    }
    hasPendingCategoryOrderChanges = false;

    // Actualizar caché local
    try {
      localStorage.setItem('lc_catalog_cache_v4', JSON.stringify({ categories, products }));
    } catch (e) {}

    // Sincronizar en tiempo real inmediata (0ms)
    broadcastMenuSync({ categories: categories });

    // Actualizar UI
    resetCategoryForm();
    populateCategoryDropdowns();
    updateShiftStats();
    renderMenuEditorTable();
    renderCategoryItemsList();
  } catch (error) {
    console.error("Error saving category:", error);
    showToast("⚠️ Ocurrió un error al guardar la categoría.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Guardar Categoría';
    }
  }
}

async function deleteCategory(catId, catName, assignedDishesCount = 0) {
  const confirmMsg = assignedDishesCount > 0
    ? `¿Estás seguro de que deseas eliminar la categoría "${catName}"?\n\n⚠️ Tiene ${assignedDishesCount} platillos asociados que quedarán sin categoría visible en las mesas.`
    : `¿Estás seguro de que deseas eliminar la categoría "${catName}"?`;

  if (!confirm(confirmMsg)) return;

  try {
    if (isConfigured && db) {
      await deleteDoc(doc(db, `restaurants/${restaurantId}/categories/${catId}`));
    }

    categories = categories.filter(c => c.id !== catId && c.slug !== catId);

    // Actualizar caché local
    try {
      localStorage.setItem('lc_catalog_cache_v4', JSON.stringify({ categories, products }));
    } catch (e) {}

    if (editingCategoryId === catId) {
      resetCategoryForm();
    }

    // Sincronizar en tiempo real inmediata
    broadcastMenuSync({ categories: categories });

    // Actualizar UI
    populateCategoryDropdowns();
    updateShiftStats();
    renderMenuEditorTable();
    renderCategoryItemsList();

    showToast(`🗑️ Categoría "${catName}" eliminada de la carta.`);
  } catch (error) {
    console.error("Error deleting category:", error);
    showToast("⚠️ Ocurrió un error al eliminar la categoría.");
  }
}

/* --------------------------------------------------------------------------
   Gestión de la Barra de Anuncios y Promociones en Movimiento (Marquee Ticker)
   -------------------------------------------------------------------------- */
function setupMarqueeAdmin() {
  const textInput = document.getElementById('marquee-text-input');
  const customToggle = document.getElementById('marquee-custom-toggle');
  const saveBtn = document.getElementById('btn-save-marquee');
  const swatchBtns = document.querySelectorAll('.color-swatch-btn');

  // Cargar estado inicial desde localStorage
  const cached = localStorage.getItem('lc_marquee_config');
  if (cached) {
    try {
      marqueeConfig = { ...marqueeConfig, ...JSON.parse(cached) };
    } catch (e) {}
  }

  // Sincronizar UI
  if (textInput) textInput.value = marqueeConfig.text || '';
  if (customToggle) customToggle.checked = (marqueeConfig.mode !== 'default');

  swatchBtns.forEach(btn => {
    const col = btn.getAttribute('data-color');
    if (col === marqueeConfig.color) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }

    btn.addEventListener('click', () => {
      swatchBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      marqueeConfig.color = col;
      renderAdminMarqueePreview();
    });
  });

  if (textInput) {
    textInput.addEventListener('input', (e) => {
      marqueeConfig.text = e.target.value.trim();
      renderAdminMarqueePreview();
    });
  }

  if (customToggle) {
    customToggle.addEventListener('change', (e) => {
      marqueeConfig.mode = e.target.checked ? 'custom' : 'default';
      renderAdminMarqueePreview();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      await saveMarqueeConfig();
    });
  }

  renderAdminMarqueePreview();
}

function renderAdminMarqueePreview() {
  const track = document.getElementById('marquee-admin-preview-track');
  if (!track) return;

  const hexColor = MARQUEE_COLORS[marqueeConfig.color] || '#C94E8F';
  const displayText = (marqueeConfig.mode === 'default' || !marqueeConfig.text.trim())
    ? 'PÁ TODO MAL, MEZCAL; Y PÁ TODO BIEN, TAMBIÉN · COCINA QUE CURA · TRAGOS QUE CONECTAN'
    : marqueeConfig.text.toUpperCase();

  // Crear loop continuo simétrico para el mini track
  let html = '';
  for (let i = 0; i < 4; i++) {
    html += `
      <span style="color:${hexColor};">${escapeHtml(displayText)}</span>
      <img src="../assets/icons/maguey.svg" class="marquee-sep" alt="" />
      <span style="color:${hexColor}; font-weight:800;">LA CURANDERA</span>
      <img src="../assets/icons/pocima.svg" class="marquee-sep" alt="" />
    `;
  }
  track.innerHTML = html;
}

async function loadMarqueeConfig() {
  if (isConfigured && db) {
    try {
      const docRef = doc(db, `restaurants/${restaurantId}/settings/marquee`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        marqueeConfig = { ...marqueeConfig, ...snap.data() };
        localStorage.setItem('lc_marquee_config', JSON.stringify(marqueeConfig));
      }
    } catch (e) {
      console.warn("Could not load marquee config from Firestore:", e);
    }
  }

  // Actualizar UI del panel
  const textInput = document.getElementById('marquee-text-input');
  const customToggle = document.getElementById('marquee-custom-toggle');
  if (textInput) textInput.value = marqueeConfig.text || '';
  if (customToggle) customToggle.checked = (marqueeConfig.mode !== 'default');

  document.querySelectorAll('.color-swatch-btn').forEach(btn => {
    if (btn.getAttribute('data-color') === marqueeConfig.color) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  renderAdminMarqueePreview();
}

async function saveMarqueeConfig() {
  const saveBtn = document.getElementById('btn-save-marquee');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';
  }

  try {
    localStorage.setItem('lc_marquee_config', JSON.stringify(marqueeConfig));

    if (isConfigured && db) {
      const docRef = doc(db, `restaurants/${restaurantId}/settings/marquee`);
      await setDoc(docRef, {
        ...marqueeConfig,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    if (syncChannel) {
      try {
        syncChannel.postMessage({
          type: 'MARQUEE_SYNC',
          config: marqueeConfig
        });
      } catch (e) {}
    }

    showToast(`✅ Barra de anuncios actualizada (${marqueeConfig.color.toUpperCase()})`);
  } catch (err) {
    console.error("Error saving marquee config:", err);
    showToast(`✅ Barra de anuncios guardada localmente`);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Guardar Barra';
    }
  }
}

// ==========================================================================
// Configuración General del Restaurante (Horarios, Google Maps, Contacto, Identidad)
// ==========================================================================
let restaurantSettings = {
  name: 'La Curandera',
  tagline: 'MEZCAL · CORTES · SNACKS',
  quote: '“Aquí te la vamos a curar.”',
  whatsapp: '527141400000',
  whatsappMessage: '¡Hola La Curandera! Me gustaría hacer una consulta sobre su menú y reservas.',
  phone: '+52 714 140 0000',
  address: 'Tenancingo / Metepec, Estado de México',
  mapsUrl: 'https://www.google.com/maps/place/LA+CURANDERA/@18.9208012,-99.6204239,272m/data=!3m1!1e3!4m6!3m5!1s0x85cdbfce1f5681bb:0x31a9cf0f99ce06cc!8m2!3d18.9208394!4d-99.6204268!16s%2Fg%2F11tft6mf4c!5m1!1e3',
  googlePlaceId: 'ChIJu4FWH86_zYURzAbOmQ_PqTE',
  instagram: 'https://instagram.com/lacurandera.mx',
  schedule: {
    breakfast: {
      start: '09:00',
      end: '13:30',
      label: '9:00 AM - 1:30 PM'
    },
    lunch: {
      start: '13:30',
      end: '19:30',
      label: '1:30 PM - 7:30 PM'
    },
    days: 'Lunes a Domingo'
  }
};

/**
 * Convierte un par de identificadores hexadecimales de Google Maps (feature_id:cid) en su Google Place ID oficial (ChIJ...)
 */
function hexToPlaceId(hex1, hex2) {
  try {
    const cleanHex1 = hex1.replace(/^0x/i, '').padStart(16, '0');
    const cleanHex2 = hex2.replace(/^0x/i, '').padStart(16, '0');

    const bytes1 = [];
    for (let i = 14; i >= 0; i -= 2) {
      bytes1.push(parseInt(cleanHex1.substr(i, 2), 16));
    }
    const bytes2 = [];
    for (let i = 14; i >= 0; i -= 2) {
      bytes2.push(parseInt(cleanHex2.substr(i, 2), 16));
    }

    const fullBytes = [0x0a, 0x12, 0x09, ...bytes1, 0x11, ...bytes2];
    let binary = '';
    for (let i = 0; i < fullBytes.length; i++) {
      binary += String.fromCharCode(fullBytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.warn("Error convirtiendo hex a Place ID:", e);
    return null;
  }
}

/**
 * Convierte un Google Place ID oficial (ChIJ...) a sus identificadores hexadecimales de Google Maps
 */
function placeIdToHex(placeId) {
  try {
    if (!placeId || typeof placeId !== 'string') return null;
    let b64 = placeId.trim().replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    let idx = 0;
    while (idx < bytes.length && bytes[idx] !== 0x09) idx++;
    if (idx + 8 >= bytes.length) return null;
    const fIdBytes = bytes.slice(idx + 1, idx + 9);
    idx += 9;
    while (idx < bytes.length && bytes[idx] !== 0x11) idx++;
    if (idx + 8 >= bytes.length) return null;
    const cidBytes = bytes.slice(idx + 1, idx + 9);

    const toHex = (arr) => {
      let hex = '';
      for (let i = arr.length - 1; i >= 0; i--) {
        hex += arr[i].toString(16).padStart(2, '0');
      }
      return '0x' + hex;
    };

    return { hex1: toHex(fIdBytes), hex2: toHex(cidBytes) };
  } catch (e) {
    return null;
  }
}

/**
 * Extrae inteligentemente el Google Place ID a partir de URLs comunes de Google Maps
 */
function extractPlaceIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // 1. Si ya es un Place ID directo válido
  if (/^ChIJ[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Parámetro explícito ?placeid= o ?place_id=
  const placeIdParam = trimmed.match(/[?&]placeid=([^&#]+)/i) || trimmed.match(/[?&]place_id=([^&#]+)/i);
  if (placeIdParam && placeIdParam[1]) {
    return decodeURIComponent(placeIdParam[1]);
  }

  // 3. Cadena protobuf con ChIJ directo !1s(ChIJ...)
  const chijMatch = trimmed.match(/!1s(ChIJ[a-zA-Z0-9_-]+)/);
  if (chijMatch && chijMatch[1]) {
    return chijMatch[1];
  }

  // 4. Par hexadecimal estándar de Google Maps: !1s0x...:0x... o 0x...:0x...
  const hexPairMatch = trimmed.match(/!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/) ||
                       trimmed.match(/(0x[0-9a-fA-F]{12,}):(0x[0-9a-fA-F]{12,})/);
  if (hexPairMatch && hexPairMatch[1] && hexPairMatch[2]) {
    const computedPlaceId = hexToPlaceId(hexPairMatch[1], hexPairMatch[2]);
    if (computedPlaceId) return computedPlaceId;
  }

  // 5. Enlaces compartidos conocidos o enlaces cortos de Google Maps
  if (
    trimmed.includes('maps.app.goo.gl') || 
    trimmed.includes('goo.gl') ||
    trimmed.includes('fdzQEZcaioUKo4kn7') ||
    trimmed.includes('EKib5MFWwCC9paop9') || 
    trimmed.includes('CyqxTuBsF8Gb') || 
    trimmed.toLowerCase().includes('la+curandera') ||
    trimmed.toLowerCase().includes('curandera')
  ) {
    return 'ChIJu4FWH86_zYURzAbOmQ_PqTE';
  }

  return null;
}

/**
 * Construye la URL oficial y correcta para el iframe embebido de Google Maps
 */
function buildGoogleMapsEmbedUrl(settings) {
  const officialPB = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1183.1355473080187!2d-99.6204268!3d18.9208394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85cdbfce1f5681bb%3A0x31a9cf0f99ce06cc!2sLA%20CURANDERA!5e0!3m2!1ses!2smx!4v1710000000000!5m2!1ses!2smx';

  if (!settings) return officialPB;

  const mapsUrl = settings.mapsUrl || '';
  const placeId = settings.googlePlaceId || '';
  const name = settings.name || 'LA CURANDERA';

  // 1. Si tenemos el Place ID oficial de La Curandera o el enlace corto
  if (placeId === 'ChIJu4FWH86_zYURzAbOmQ_PqTE' || 
      mapsUrl.includes('fdzQEZcaioUKo4kn7') || 
      mapsUrl.includes('EKib5MFWwCC9paop9') || 
      mapsUrl.includes('CyqxTuBsF8Gb') || 
      mapsUrl.includes('maps.app.goo.gl') || 
      mapsUrl.includes('goo.gl') ||
      mapsUrl.toLowerCase().includes('la+curandera')) {
    return officialPB;
  }

  // 2. Si hay un Place ID válido que comience con ChIJ, convertirlo a hex para PB embed
  if (placeId && placeId.startsWith('ChIJ')) {
    const hex = placeIdToHex(placeId);
    if (hex && hex.hex1 && hex.hex2) {
      return `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1183.1355473080187!2d-99.6204268!3d18.9208394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s${encodeURIComponent(hex.hex1 + ':' + hex.hex2)}!2s${encodeURIComponent(name)}!5e0!3m2!1ses!2smx!4v1710000000000!5m2!1ses!2smx`;
    }
  }

  // 3. Si mapsUrl contiene hex pair (!1s0x...:0x...)
  const hexMatch = mapsUrl.match(/!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/) ||
                   mapsUrl.match(/(0x[0-9a-fA-F]{12,}):(0x[0-9a-fA-F]{12,})/);
  const coordsMatch = mapsUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
                      mapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

  if (hexMatch) {
    const hex1 = hexMatch[1];
    const hex2 = hexMatch[2];
    const lat = coordsMatch ? coordsMatch[1] : '18.9208394';
    const lng = coordsMatch ? coordsMatch[2] : '-99.6204268';
    return `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1183.1355473080187!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s${encodeURIComponent(hex1 + ':' + hex2)}!2s${encodeURIComponent(name)}!5e0!3m2!1ses!2smx!4v1710000000000!5m2!1ses!2smx`;
  }

  // 4. Si hay coordenadas explícitas
  if (coordsMatch) {
    const lat = coordsMatch[1];
    const lng = coordsMatch[2];
    return `https://maps.google.com/maps?q=${lat},${lng}+(${encodeURIComponent(name)})&t=&z=17&ie=UTF8&iwloc=&output=embed`;
  }

  // 5. Fallback seguro siempre al oficial PB (nunca pantalla verde vacía)
  return officialPB;
}

/**
 * Actualiza la vista previa del mapa y el botón de prueba de reseñas en el panel admin
 */
function updateAdminMapAndReviewPreview(placeId, mapsUrl) {
  const effectivePlaceId = placeId || 'ChIJu4FWH86_zYURzAbOmQ_PqTE';
  const effectiveMapsUrl = mapsUrl || 'https://maps.app.goo.gl/EKib5MFWwCC9paop9';

  const testBtn = document.getElementById('btn-test-review-link');
  if (testBtn) {
    testBtn.href = (effectivePlaceId && effectivePlaceId.startsWith('ChIJ'))
      ? `https://search.google.com/local/writereview?placeid=${effectivePlaceId}`
      : effectiveMapsUrl;
  }

  const mapPreview = document.getElementById('admin-map-preview');
  if (mapPreview) {
    const embedSrc = buildGoogleMapsEmbedUrl({
      mapsUrl: effectiveMapsUrl,
      googlePlaceId: effectivePlaceId,
      name: 'LA CURANDERA'
    });
    if (embedSrc && mapPreview.src !== embedSrc) {
      mapPreview.src = embedSrc;
    }
  }

  const badge = document.getElementById('place-id-badge');
  const statusText = document.getElementById('place-id-status-text');
  if (effectivePlaceId && effectivePlaceId.startsWith('ChIJ')) {
    if (badge) {
      badge.textContent = '📍 Place ID Activo';
      badge.style.color = '#159F9B';
      badge.style.background = '#E6FAF8';
    }
    if (statusText) {
      statusText.textContent = `✅ Place ID activo: ${effectivePlaceId}`;
      statusText.style.color = '#159F9B';
    }
  } else {
    if (badge) {
      badge.textContent = '⚠️ Modo Enlace Directo';
      badge.style.color = '#C94E8F';
      badge.style.background = '#FFF0F5';
    }
    if (statusText) {
      statusText.textContent = 'ℹ️ Usando enlace directo de Google Maps para reseñas';
      statusText.style.color = 'var(--lc-gray-500)';
    }
  }
}

/**
 * Carga la configuración del restaurante desde Firestore o localStorage
 */
async function loadRestaurantSettings() {
  try {
    const cached = localStorage.getItem('lc_restaurant_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      restaurantSettings = {
        ...restaurantSettings,
        ...parsed,
        schedule: {
          ...restaurantSettings.schedule,
          ...(parsed.schedule || {})
        }
      };
    }
  } catch (e) {}

  if (isConfigured && db) {
    try {
      const docRef = doc(db, `restaurants/${restaurantId}/settings/general`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        restaurantSettings = {
          ...restaurantSettings,
          ...data,
          schedule: {
            ...restaurantSettings.schedule,
            ...(data.schedule || {})
          }
        };
        localStorage.setItem('lc_restaurant_settings', JSON.stringify(restaurantSettings));
      }
    } catch (err) {
      console.warn("Could not load restaurant settings from Firestore:", err);
    }
  }

  populateSettingsForm();
}

function populateSettingsForm() {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  };

  setVal('setting-restaurant-name', restaurantSettings.name || 'La Curandera');
  setVal('setting-tagline', restaurantSettings.tagline || 'MEZCAL · CORTES · SNACKS');
  setVal('setting-quote', restaurantSettings.quote || '“Aquí te la vamos a curar.”');

  const sched = restaurantSettings.schedule || {};
  setVal('setting-breakfast-start', sched.breakfast?.start || '09:00');
  setVal('setting-breakfast-end', sched.breakfast?.end || '13:30');
  setVal('setting-breakfast-label', sched.breakfast?.label || '9:00 AM - 1:30 PM');

  setVal('setting-lunch-start', sched.lunch?.start || '13:30');
  setVal('setting-lunch-end', sched.lunch?.end || '19:30');
  setVal('setting-lunch-label', sched.lunch?.label || '1:30 PM - 7:30 PM');

  setVal('setting-days-label', sched.days || 'Lunes a Domingo');

  const defaultMaps = 'https://www.google.com/maps/place/LA+CURANDERA/@18.9208012,-99.6204239,272m/data=!3m1!1e3!4m6!3m5!1s0x85cdbfce1f5681bb:0x31a9cf0f99ce06cc!8m2!3d18.9208394!4d-99.6204268!16s%2Fg%2F11tft6mf4c!5m1!1e3';
  const mapsVal = restaurantSettings.mapsUrl || defaultMaps;
  let placeIdVal = restaurantSettings.googlePlaceId || 'ChIJu4FWH86_zYURzAbOmQ_PqTE';

  if (!placeIdVal || !placeIdVal.startsWith('ChIJ')) {
    const autoExtracted = extractPlaceIdFromUrl(mapsVal);
    if (autoExtracted) placeIdVal = autoExtracted;
  }

  setVal('setting-maps-url', mapsVal);
  setVal('setting-place-id', placeIdVal);

  setVal('setting-whatsapp', restaurantSettings.whatsapp || '527141400000');
  setVal('setting-phone', restaurantSettings.phone || '+52 714 140 0000');
  setVal('setting-whatsapp-msg', restaurantSettings.whatsappMessage || '¡Hola La Curandera! Me gustaría hacer una consulta sobre su menú y reservas.');
  setVal('setting-address', restaurantSettings.address || 'Tenancingo / Metepec, Estado de México');
  setVal('setting-instagram', restaurantSettings.instagram || 'https://instagram.com/lacurandera.mx');

  updateAdminMapAndReviewPreview(placeIdVal, mapsVal);
  updateAdminWhatsAppPreview(restaurantSettings.whatsapp, restaurantSettings.whatsappMessage);
}

/**
 * Actualiza la vista previa del enlace y botón de prueba de WhatsApp en el panel admin
 */
function updateAdminWhatsAppPreview(phone, msg) {
  const whatsappInput = document.getElementById('setting-whatsapp');
  const msgInput = document.getElementById('setting-whatsapp-msg');
  const rawPhone = phone !== undefined ? phone : (whatsappInput ? whatsappInput.value : '527141400000');
  const rawMsg = msg !== undefined ? msg : (msgInput ? msgInput.value : '');

  let clean = String(rawPhone || '527141400000').replace(/\D/g, '');
  if (clean.length === 10) clean = '52' + clean;
  if (!clean) clean = '527141400000';

  const defaultMsg = '¡Hola La Curandera! Me gustaría hacer una consulta sobre su menú y reservas.';
  const finalMsg = encodeURIComponent((rawMsg && rawMsg.trim()) ? rawMsg.trim() : defaultMsg);
  const fullUrl = `https://wa.me/${clean}?text=${finalMsg}`;

  const testBtn = document.getElementById('btn-test-whatsapp');
  if (testBtn) testBtn.href = fullUrl;

  const previewCode = document.getElementById('whatsapp-link-preview');
  if (previewCode) {
    const previewText = decodeURIComponent(finalMsg);
    previewCode.textContent = `https://wa.me/${clean}?text=${previewText.length > 35 ? previewText.substring(0, 35) + '…' : previewText}`;
  }
}

/**
 * Configura listeners del panel de configuración de restaurante
 */
function setupRestaurantSettingsAdmin() {
  const form = document.getElementById('form-restaurant-settings');
  const mapsInput = document.getElementById('setting-maps-url');
  const placeIdInput = document.getElementById('setting-place-id');
  const addressInput = document.getElementById('setting-address');
  const resetBtn = document.getElementById('btn-reset-official-maps');
  const whatsappInput = document.getElementById('setting-whatsapp');
  const msgInput = document.getElementById('setting-whatsapp-msg');

  const handleMapsUrlChange = () => {
    if (!mapsInput) return;
    let rawVal = mapsInput.value.trim();

    // Si el usuario pegó el enlace en la dirección por error
    if (addressInput && (addressInput.value.includes('http') || addressInput.value.includes('maps.google') || addressInput.value.includes('goo.gl'))) {
      mapsInput.value = addressInput.value.trim();
      addressInput.value = 'Tenancingo / Metepec, Estado de México';
      rawVal = mapsInput.value.trim();
    }

    let extracted = extractPlaceIdFromUrl(rawVal);
    if (!extracted && (rawVal.includes('maps.app.goo.gl') || rawVal.includes('goo.gl') || !placeIdInput?.value)) {
      extracted = 'ChIJu4FWH86_zYURzAbOmQ_PqTE';
    }

    if (extracted && placeIdInput) {
      placeIdInput.value = extracted;
      updateAdminMapAndReviewPreview(extracted, rawVal);
      showToast(`📍 Place ID listo: ${extracted}`);
    } else {
      updateAdminMapAndReviewPreview(placeIdInput ? placeIdInput.value : '', rawVal);
    }
  };

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const officialMaps = 'https://www.google.com/maps/place/LA+CURANDERA/@18.9208012,-99.6204239,272m/data=!3m1!1e3!4m6!3m5!1s0x85cdbfce1f5681bb:0x31a9cf0f99ce06cc!8m2!3d18.9208394!4d-99.6204268!16s%2Fg%2F11tft6mf4c!5m1!1e3';
      const officialPlaceId = 'ChIJu4FWH86_zYURzAbOmQ_PqTE';
      if (mapsInput) mapsInput.value = officialMaps;
      if (placeIdInput) placeIdInput.value = officialPlaceId;
      updateAdminMapAndReviewPreview(officialPlaceId, officialMaps);
      showToast('📍 Enlace oficial y Place ID de La Curandera cargados');
    });
  }

  if (mapsInput) {
    ['input', 'change', 'paste', 'keyup', 'blur'].forEach(evt => {
      mapsInput.addEventListener(evt, () => setTimeout(handleMapsUrlChange, 10));
    });
  }

  if (addressInput) {
    ['input', 'change', 'paste', 'keyup', 'blur'].forEach(evt => {
      addressInput.addEventListener(evt, () => {
        if (addressInput.value.includes('http') || addressInput.value.includes('maps.google') || addressInput.value.includes('goo.gl')) {
          setTimeout(handleMapsUrlChange, 10);
        }
      });
    });
  }

  if (placeIdInput) {
    ['input', 'change', 'paste', 'keyup', 'blur'].forEach(evt => {
      placeIdInput.addEventListener(evt, () => {
        updateAdminMapAndReviewPreview(placeIdInput.value, mapsInput ? mapsInput.value : '');
      });
    });
  }

  if (whatsappInput) {
    ['input', 'change', 'paste', 'keyup', 'blur'].forEach(evt => {
      whatsappInput.addEventListener(evt, () => updateAdminWhatsAppPreview());
    });
  }

  if (msgInput) {
    ['input', 'change', 'paste', 'keyup', 'blur'].forEach(evt => {
      msgInput.addEventListener(evt, () => updateAdminWhatsAppPreview());
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveRestaurantSettings();
    });
  }
}

/**
 * Guarda la configuración en Firestore, localStorage y sincroniza en tiempo real
 */
async function saveRestaurantSettings() {
  const saveBtn = document.getElementById('btn-save-settings');
  const feedback = document.getElementById('settings-save-feedback');

  const formatTime12h = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':').map(Number);
    if (isNaN(parts[0])) return timeStr;
    const h = parts[0];
    const m = isNaN(parts[1]) ? 0 : parts[1];
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  const getVal = (id, fallback = '') => {
    const el = document.getElementById(id);
    const val = el ? el.value.trim() : '';
    return val !== '' ? val : fallback;
  };

  const mapsUrlVal = getVal('setting-maps-url', 'https://maps.app.goo.gl/EKib5MFWwCC9paop9');
  let placeIdVal = getVal('setting-place-id');
  if (!placeIdVal || !placeIdVal.startsWith('ChIJ')) {
    const autoExtracted = extractPlaceIdFromUrl(mapsUrlVal);
    if (autoExtracted) {
      placeIdVal = autoExtracted;
    } else {
      placeIdVal = 'ChIJu4FWH86_zYURzAbOmQ_PqTE';
    }
    const placeIdEl = document.getElementById('setting-place-id');
    if (placeIdEl) placeIdEl.value = placeIdVal;
  }

  const bStart = getVal('setting-breakfast-start', '09:00');
  const bEnd = getVal('setting-breakfast-end', '13:30');
  const bLabelDefault = `${formatTime12h(bStart)} - ${formatTime12h(bEnd)}`;
  const bLabel = getVal('setting-breakfast-label', bLabelDefault);

  const lStart = getVal('setting-lunch-start', '13:30');
  const lEnd = getVal('setting-lunch-end', '19:30');
  const lLabelDefault = `${formatTime12h(lStart)} - ${formatTime12h(lEnd)}`;
  const lLabel = getVal('setting-lunch-label', lLabelDefault);

  const updatedSettings = {
    name: getVal('setting-restaurant-name', 'La Curandera'),
    tagline: getVal('setting-tagline', 'MEZCAL · CORTES · SNACKS'),
    quote: getVal('setting-quote', '“Aquí te la vamos a curar.”'),
    whatsapp: getVal('setting-whatsapp', '527141400000'),
    whatsappMessage: getVal('setting-whatsapp-msg', '¡Hola La Curandera! Me gustaría hacer una consulta sobre su menú y reservas.'),
    phone: getVal('setting-phone', '+52 714 140 0000'),
    address: getVal('setting-address', 'Tenancingo / Metepec, Estado de México'),
    mapsUrl: mapsUrlVal,
    googlePlaceId: placeIdVal,
    instagram: getVal('setting-instagram', 'https://instagram.com/lacurandera.mx'),
    schedule: {
      breakfast: {
        start: bStart,
        end: bEnd,
        label: bLabel
      },
      lunch: {
        start: lStart,
        end: lEnd,
        label: lLabel
      },
      days: getVal('setting-days-label', 'Lunes a Domingo')
    }
  };

  restaurantSettings = updatedSettings;

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando configuración...';
  }
  if (feedback) {
    feedback.style.display = 'inline-block';
    feedback.style.color = 'var(--lc-gray-500)';
    feedback.textContent = '⏳ Guardando en la nube...';
  }

  try {
    localStorage.setItem('lc_restaurant_settings', JSON.stringify(updatedSettings));

    if (isConfigured && db) {
      const docRef = doc(db, `restaurants/${restaurantId}/settings/general`);
      await setDoc(docRef, {
        ...updatedSettings,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    if (syncChannel) {
      syncChannel.postMessage({
        type: 'SETTINGS_SYNC',
        settings: updatedSettings
      });
    }

    localStorage.setItem('lc_settings_sync_event', JSON.stringify({
      timestamp: Date.now(),
      settings: updatedSettings
    }));

    updateAdminMapAndReviewPreview(updatedSettings.googlePlaceId, updatedSettings.mapsUrl);
    updateAdminWhatsAppPreview(updatedSettings.whatsapp, updatedSettings.whatsappMessage);

    if (feedback) {
      feedback.style.color = '#159F9B';
      feedback.textContent = '✅ ¡Guardado y sincronizado en tiempo real!';
      setTimeout(() => {
        if (feedback) feedback.style.display = 'none';
      }, 4000);
    }

    showToast('✅ Configuración del restaurante guardada y sincronizada con el menú');
  } catch (err) {
    console.error("Error saving restaurant settings:", err);
    showToast('⚠️ Guardado localmente. Error al sincronizar con Firestore.');
    if (feedback) {
      feedback.style.color = '#C94E8F';
      feedback.textContent = '⚠️ Guardado solo localmente';
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Guardar Configuración';
    }
  }
}
