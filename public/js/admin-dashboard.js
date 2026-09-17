/**
 * LA CURANDERA — Admin Dashboard
 * Gestión de Carta: Agregar, Quitar, Ocultar, Editar Nombre, Categoría, Precio y Descripción.
 * (Sin multimedia, fotos ni videos).
 */

import { 
  db, 
  collection, 
  doc, 
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
  { id: 'metepec', name: 'La Curandera Metepec', address: 'Tenancingo / Metepec, Edo. Méx.', phone: '+52 714 140 0000', isActive: true }
];
let categories = [];
let products = [];
let menuOverrides = {}; // { productId: { isVisible, priceOverride, descriptionOverride } }
let pendingChanges = {}; // { productId: { ...changes } }

let searchFilter = '';
let categoryFilter = 'all';
let visibilityFilter = 'all'; // 'all' | 'visible' | 'hidden'

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

  // Botón "+ Agregar Platillo"
  const addBtn = document.getElementById('btn-open-add-modal');
  if (addBtn) {
    addBtn.addEventListener('click', () => openAddProductModal());
  }

  // Modal para agregar/editar producto
  setupProductModal();
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

    // Filtro visibilidad
    const override = pendingChanges[product.id] || menuOverrides[product.id];
    const isVisible = override?.isVisible !== undefined ? override.isVisible : (product.isActive !== false);
    if (visibilityFilter === 'visible' && !isVisible) return false;
    if (visibilityFilter === 'hidden' && isVisible) return false;

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
        <td colspan="6" style="text-align:center; padding:3rem 1rem; color:var(--lc-gray-500); font-family:var(--font-mono);">
          No se encontraron platillos con los filtros seleccionados.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(product => {
    const override = pendingChanges[product.id] || menuOverrides[product.id] || {};
    const isVisible = override.isVisible !== undefined ? override.isVisible : (product.isActive !== false);
    const currentPrice = override.priceOverride !== undefined && override.priceOverride !== null ? override.priceOverride : product.price;
    const currentName = override.nameOverride || product.name?.es || '';
    const currentDesc = override.descriptionOverride?.es || product.description?.es || '';
    const currentCat = override.categoryOverride || product.categoryId || '';

    // Generar opciones de categoría para el selector en fila
    let catOptionsHtml = '';
    categories.forEach(cat => {
      const cId = cat.id || cat.slug;
      const cName = cat.name?.es || cat.name || cId;
      const selected = cId === currentCat ? 'selected' : '';
      catOptionsHtml += `<option value="${cId}" ${selected}>${cName}</option>`;
    });

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center;">
        <label class="checkbox-toggle-wrapper" title="${isVisible ? 'Visible en mesas' : 'Oculto en mesas'}">
          <input type="checkbox" class="checkbox-toggle toggle-visibility" data-id="${product.id}" ${isVisible ? 'checked' : ''}/>
        </label>
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
        <input type="number" min="0" step="any" class="input-inline input-inline-price" data-id="${product.id}" value="${currentPrice}" title="Haz clic para cambiar el precio" />
      </td>
      <td>
        <input type="text" class="input-inline input-inline-desc" data-id="${product.id}" value="${escapeHtml(currentDesc)}" placeholder="Descripción del platillo..." title="Haz clic para cambiar la descripción" />
      </td>
      <td style="text-align:center;">
        <div style="display:flex; justify-content:center; gap:0.4rem;">
          <button class="btn-edit-inline btn-edit-details" data-id="${product.id}" title="Editar detalles">
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

    // 2. Cambiar Nombre del Platillo
    const nameInput = tr.querySelector('.input-inline-name');
    nameInput.addEventListener('change', (e) => {
      const val = e.target.value.trim();
      if (val) {
        markPendingChange(product.id, { nameOverride: val });
      }
    });

    // 3. Cambiar Categoría
    const catDropdown = tr.querySelector('.select-inline-category');
    catDropdown.addEventListener('change', (e) => {
      markPendingChange(product.id, { categoryOverride: e.target.value });
    });

    // 4. Cambiar Precio
    const priceInput = tr.querySelector('.input-inline-price');
    priceInput.addEventListener('change', (e) => {
      const val = Number(e.target.value);
      if (!isNaN(val) && val >= 0) {
        markPendingChange(product.id, { priceOverride: val });
      }
    });

    // 5. Cambiar Descripción
    const descInput = tr.querySelector('.input-inline-desc');
    descInput.addEventListener('change', (e) => {
      const descObj = { es: e.target.value.trim(), en: '', fr: '' };
      markPendingChange(product.id, { descriptionOverride: descObj });
    });

    // 6. Botón Editar en Modal
    const editBtn = tr.querySelector('.btn-edit-details');
    editBtn.addEventListener('click', () => openEditProductModal(product));

    // 7. Botón Quitar / Eliminar Platillo
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
        // 1. Guardar override de sucursal (visibilidad y precios locales)
        const overrideRef = doc(db, `restaurants/${restaurantId}/branches/${activeBranchId}/menuOverrides/${productId}`);
        const overrideData = {
          updatedAt: serverTimestamp()
        };
        if (changes.isVisible !== undefined) overrideData.isVisible = changes.isVisible;
        if (changes.priceOverride !== undefined) overrideData.priceOverride = changes.priceOverride;
        if (changes.descriptionOverride !== undefined) overrideData.descriptionOverride = changes.descriptionOverride;
        batch.set(overrideRef, overrideData, { merge: true });

        // 2. Si se cambió nombre, categoría o precio maestro, actualizar el producto maestro
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
        batch.set(prodRef, masterData, { merge: true });

        // Actualizar en el array local de productos
        const pIdx = products.findIndex(p => p.id === productId);
        if (pIdx !== -1) {
          if (changes.nameOverride) products[pIdx].name = { es: changes.nameOverride };
          if (changes.categoryOverride) products[pIdx].categoryId = changes.categoryOverride;
          if (changes.priceOverride !== undefined && changes.priceOverride !== null) products[pIdx].price = changes.priceOverride;
          if (changes.descriptionOverride) products[pIdx].description = changes.descriptionOverride;
          if (changes.isVisible !== undefined) products[pIdx].isActive = changes.isVisible;
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
 * Modal de Platillos: Agregar y Editar (Sin archivos, fotos ni videos)
 */
function setupProductModal() {
  const modal = document.getElementById('modal-edit-product');
  const closeBtn = document.getElementById('btn-close-prod-modal');
  const form = document.getElementById('form-edit-product');
  const deleteModalBtn = document.getElementById('btn-delete-from-modal');

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

  modal.classList.add('open');
}

async function handleProductSave(form) {
  const id = document.getElementById('prod-modal-id').value;
  const nameEs = document.getElementById('prod-name-es').value.trim();
  const price = Number(document.getElementById('prod-base-price').value);
  const categoryId = document.getElementById('prod-category-select').value;
  const descEs = document.getElementById('prod-desc-es').value.trim();
  const isVisible = document.getElementById('prod-modal-visible').checked;

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
      imageUrl: '../assets/logo/logo.png',
      updatedAt: serverTimestamp()
    };

    if (isConfigured && db) {
      await setDoc(doc(db, `restaurants/${restaurantId}/products/${productId}`), productData, { merge: true });
      
      // Override de sucursal
      await setDoc(doc(db, `restaurants/${restaurantId}/branches/${activeBranchId}/menuOverrides/${productId}`), {
        isVisible: isVisible,
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

    // Limpiar cambios pendientes de este producto si había
    delete pendingChanges[productId];
    updatePendingBarUI();

    modal.classList.remove('open');
    renderMenuEditorTable();
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
