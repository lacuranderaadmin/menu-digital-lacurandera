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

let restaurantId = 'la-curandera';
let activeBranchId = 'metepec';
let activeView = 'branches'; // 'branches' | 'menu-editor' | 'settings'

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
      productsCount: products.length,
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

export function initAdminDashboard() {
  checkAdminAuth((user) => {
    setupDashboardUI(user);
    loadData();
  });
}

function setupDashboardUI(user) {
  const greetingEl = document.getElementById('user-greeting');
  if (greetingEl) {
    greetingEl.textContent = `Hola, ${user.email.split('@')[0]}`;
  }

  // Navegación Sidebar
  document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      if (view) switchView(view);
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

  const views = ['view-branches', 'view-menu-editor', 'view-settings'];
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.style.display = 'none';
  });

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.style.display = 'block';

  if (viewName === 'branches') renderBranchesList();
  if (viewName === 'menu-editor') renderMenuEditorTable();
  if (viewName === 'settings') loadRestaurantSettings();
}

async function loadData() {
  if (isConfigured && db) {
    try {
      // 1. Cargar Categorías
      const catSnap = await getDocs(collection(db, `restaurants/${restaurantId}/categories`));
      categories = [];
      catSnap.forEach(d => categories.push({ id: d.id, ...d.data() }));

      // 2. Cargar Productos
      const prodSnap = await getDocs(collection(db, `restaurants/${restaurantId}/products`));
      products = [];
      prodSnap.forEach(d => products.push({ id: d.id, ...d.data() }));

      // 3. Cargar Overrides de Sucursal
      const overSnap = await getDocs(collection(db, `restaurants/${restaurantId}/branches/${activeBranchId}/menuOverrides`));
      menuOverrides = {};
      overSnap.forEach(d => menuOverrides[d.id] = d.data());

    } catch (e) {
      console.warn("Error loading Firestore data, loading local fallback:", e);
      await loadLocalFallback();
    }
  } else {
    await loadLocalFallback();
  }

  // Cargar configuración de la barra en movimiento (Marquee)
  await loadMarqueeConfig();

  // Cargar configuración general del restaurante (Horarios, Reseñas, Contacto)
  await loadRestaurantSettings();

  populateCategoryDropdowns();
  renderBranchesList();
  renderMenuEditorTable();
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

function populateCategoryDropdowns() {
  const catFilter = document.getElementById('admin-cat-filter');
  const catSelect = document.getElementById('prod-category-select');

  if (catFilter) {
    catFilter.innerHTML = '<option value="all">Todas las Categorías</option>';
    categories.forEach(cat => {
      const name = cat.name?.es || cat.name || cat.id;
      catFilter.innerHTML += `<option value="${cat.id || cat.slug}">${name}</option>`;
    });
  }

  if (catSelect) {
    catSelect.innerHTML = '';
    categories.forEach(cat => {
      const name = cat.name?.es || cat.name || cat.id;
      catSelect.innerHTML += `<option value="${cat.id || cat.slug}">${name}</option>`;
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

  const filtered = products.filter(product => {
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
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:3rem 1rem; color:var(--lc-gray-500); font-family:var(--font-mono);">
          No se encontraron platillos con los filtros seleccionados.
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

    const allergens = override.allergens || product.allergens || [];
    const tags = override.tags || product.tags || [];

    // Generar opciones de categoría para el selector en fila
    let catOptionsHtml = '';
    categories.forEach(cat => {
      const cId = cat.id || cat.slug;
      const cName = cat.name?.es || cat.name || cId;
      const selected = cId === currentCat ? 'selected' : '';
      catOptionsHtml += `<option value="${cId}" ${selected}>${cName}</option>`;
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

    // 7. Toggle Promo
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

    // 8. Botón Editar en Modal
    const editBtn = tr.querySelector('.btn-edit-details');
    editBtn.addEventListener('click', () => openEditProductModal(product));

    // 9. Botón Quitar / Eliminar Platillo
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
  const visInput = document.getElementById('prod-modal-visible');
  if (visInput) visInput.checked = true;

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
  if (catSelect && categories.length > 0) {
    catSelect.value = categories[0].id || categories[0].slug;
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
  const catSelect = document.getElementById('prod-category-select');
  if (catSelect) catSelect.value = currentCat;

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

    const productData = {
      id: productId,
      name: { es: nameEs, en: nameEs, fr: '' },
      description: { es: descEs, en: descEs, fr: '' },
      price: price,
      categoryId: categoryId,
      isActive: isVisible,
      isAvailable: isAvailable,
      isPromo: isPromo,
      promoPrice: promoPrice,
      promoTag: promoTag,
      allergens: allergens,
      tags: tags,
      imageUrl: '../assets/logo/logo.png',
      updatedAt: serverTimestamp()
    };

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
        descriptionOverride: { es: descEs, en: descEs, fr: '' },
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
      descriptionOverride: { es: descEs, en: descEs, fr: '' }
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
  mapsUrl: 'https://maps.app.goo.gl/EKib5MFWwCC9paop9',
  googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
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
 * Extrae inteligentemente el Google Place ID a partir de URLs comunes de Google Maps
 */
function extractPlaceIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  if (/^ChIJ[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  const placeIdParam = trimmed.match(/[?&]placeid=([^&#]+)/i) || trimmed.match(/[?&]place_id=([^&#]+)/i);
  if (placeIdParam && placeIdParam[1]) {
    return decodeURIComponent(placeIdParam[1]);
  }

  const chijMatch = trimmed.match(/!1s(ChIJ[a-zA-Z0-9_-]+)/);
  if (chijMatch && chijMatch[1]) {
    return chijMatch[1];
  }

  return null;
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

  setVal('setting-maps-url', restaurantSettings.mapsUrl || 'https://maps.app.goo.gl/EKib5MFWwCC9paop9');
  setVal('setting-place-id', restaurantSettings.googlePlaceId || 'ChIJN1t_tDeuEmsRUsoyG83frY4');

  setVal('setting-whatsapp', restaurantSettings.whatsapp || '527141400000');
  setVal('setting-phone', restaurantSettings.phone || '+52 714 140 0000');
  setVal('setting-whatsapp-msg', restaurantSettings.whatsappMessage || '¡Hola La Curandera! Me gustaría hacer una consulta sobre su menú y reservas.');
  setVal('setting-address', restaurantSettings.address || 'Tenancingo / Metepec, Estado de México');
  setVal('setting-instagram', restaurantSettings.instagram || 'https://instagram.com/lacurandera.mx');
}

/**
 * Configura listeners del panel de configuración de restaurante
 */
function setupRestaurantSettingsAdmin() {
  const form = document.getElementById('form-restaurant-settings');
  const mapsInput = document.getElementById('setting-maps-url');
  const placeIdInput = document.getElementById('setting-place-id');

  if (mapsInput && placeIdInput) {
    mapsInput.addEventListener('input', () => {
      const extracted = extractPlaceIdFromUrl(mapsInput.value);
      if (extracted) {
        placeIdInput.value = extracted;
        showToast(`📍 Place ID detectado automáticamente: ${extracted}`);
      }
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

  const getVal = (id, fallback = '') => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : fallback;
  };

  const mapsUrlVal = getVal('setting-maps-url', 'https://maps.app.goo.gl/EKib5MFWwCC9paop9');
  let placeIdVal = getVal('setting-place-id');
  if (!placeIdVal) {
    const autoExtracted = extractPlaceIdFromUrl(mapsUrlVal);
    if (autoExtracted) placeIdVal = autoExtracted;
  }

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
        start: getVal('setting-breakfast-start', '09:00'),
        end: getVal('setting-breakfast-end', '13:30'),
        label: getVal('setting-breakfast-label', '9:00 AM - 1:30 PM')
      },
      lunch: {
        start: getVal('setting-lunch-start', '13:30'),
        end: getVal('setting-lunch-end', '19:30'),
        label: getVal('setting-lunch-label', '1:30 PM - 7:30 PM')
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
