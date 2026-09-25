/**
 * LA CURANDERA — Editor de Carta Física (Impresión en Tamaño Carta 8.5" x 11")
 * Permite editar textos, moverlos libremente en cada hoja, duplicarlos, borrarlos,
 * agregar nuevos textos, cambiar colores/tipografías, guardar en la nube y
 * descargar la carta física en PDF multi-página tamaño carta.
 */

import { 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  isConfigured 
} from './firebase-init.js';
import { showToast } from './ui.js';

let currentType = 'desayuno'; // 'desayuno' | 'comida'
let currentDesign = 'tradicional'; // 'tradicional' | 'digital'
let currentPageIndex = 0;
let menusData = {
  desayuno_tradicional: null,
  comida_tradicional: null,
  desayuno_digital: null,
  comida_digital: null
};

// Helper para clave de menú compuesta
function getMenuKey(type = currentType, design = currentDesign) {
  return `${type}_${design}`;
}
let selectedItemId = null;
let zoomScale = 0.75;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragInitialItemX = 0;
let dragInitialItemY = 0;
let isEditorInitialized = false;

// Títulos amigables para cada hoja de las cartas originales
const PAGE_TITLES = {
  desayuno_tradicional: [
    'Pág. 1: Portada y Raíces',
    'Pág. 2: Dulce Remedio & Hotcakes',
    'Pág. 3: Juguería & Bebidas',
    'Pág. 4: Huevos, Omelettes & Enchiladas',
    'Pág. 5: Tacos Dorados, Caldos & Pa\' Peques'
  ],
  comida_tradicional: [
    'Pág. 1: Portada y Raíces',
    'Pág. 2: Sabores de Cuaresma',
    'Pág. 3: Dulce Remedio & Cafetería',
    'Pág. 4: Cantina La Curandera & Cocteles',
    'Pág. 5: Cervezas & Mezcalería',
    'Pág. 6: Tequilas & Destilados',
    'Pág. 7: Pa\' Empezar, Ensaladas & Sopas',
    'Pág. 8: Platos Fuertes, Tacos & Cortes',
    'Pág. 9: Burritos, Hamburguesas & Snacks'
  ],
  desayuno_digital: [
    'Pág. 1: Portada & Sabiduría Curandera',
    'Pág. 2: Pa\' Curar el Alma (Huevos)',
    'Pág. 3: Lo Enchi-loso & Tacos Dorados',
    'Pág. 4: Caldos, Sándwiches & Peques',
    'Pág. 5: Dulce Remedio, Jugos & Café'
  ],
  comida_digital: [
    'Pág. 1: Portada & Cantina Tradicional',
    'Pág. 2: Entradas, Ensaladas & Sopas',
    'Pág. 3: Sabores de Cuaresma (Mariscos)',
    'Pág. 4: Platos Fuertes, Cortes & Tacos',
    'Pág. 5: Burritos, Burguers & Jocho',
    'Pág. 6: Dulce Remedio & Cafetería',
    'Pág. 7: Cantina La Curandera & Mezcales'
  ],
  desayuno: [
    'Pág. 1: Portada y Raíces',
    'Pág. 2: Dulce Remedio & Hotcakes',
    'Pág. 3: Juguería & Bebidas',
    'Pág. 4: Huevos, Omelettes & Enchiladas',
    'Pág. 5: Tacos Dorados, Caldos & Pa\' Peques'
  ],
  comida: [
    'Pág. 1: Portada y Raíces',
    'Pág. 2: Sabores de Cuaresma',
    'Pág. 3: Dulce Remedio & Cafetería',
    'Pág. 4: Cantina La Curandera & Cocteles',
    'Pág. 5: Cervezas & Mezcalería',
    'Pág. 6: Tequilas & Destilados',
    'Pág. 7: Pa\' Empezar, Ensaladas & Sopas',
    'Pág. 8: Platos Fuertes, Tacos & Cortes',
    'Pág. 9: Burritos, Hamburguesas & Snacks'
  ]
};

// Preset de colores de la identidad de La Curandera
const COLOR_PRESETS = [
  { name: 'Negro Carbón', hex: '#1C1714' },
  { name: 'Gris Grafito', hex: '#2C2621' },
  { name: 'Blanco Puro', hex: '#FFFFFF' },
  { name: 'Rosa Curandera', hex: '#C94E8F' },
  { name: 'Turquesa Sagrado', hex: '#159F9B' },
  { name: 'Terracota Cálido', hex: '#E87850' },
  { name: 'Crema Menú Digital', hex: '#FDF6EC' },
  { name: 'Crema Arena Tradicional', hex: '#CCAD93' },
  { name: 'Melocotón Artesanal', hex: '#EF937A' },
  { name: 'Dorado Mostaza', hex: '#E6A13B' }
];

export async function initPhysicalMenuAdmin() {
  if (!isEditorInitialized) {
    setupPhysicalEditorEvents();
    isEditorInitialized = true;
  }

  // Cargar datos si aún no están listos
  const key = getMenuKey();
  if (!menusData[key]) {
    await loadInitialMenusData();
  }

  calculateOptimalZoom();
  renderPagesList();
  renderCurrentPage();
  renderInspector();
}

/**
 * Carga los menús desde Firestore, localStorage o templates iniciales
 */
async function loadInitialMenusData() {
  try {
    const key = getMenuKey();
    if (!menusData[key]) {
      menusData[key] = await loadSingleMenuData(currentType, currentDesign);
    }
  } catch (err) {
    console.error('Error cargando datos de carta física:', err);
    showToast('⚠️ No se pudieron cargar los datos de carta física.');
  }
}

async function loadSingleMenuData(type, design = currentDesign) {
  const isTrad = design === 'tradicional';
  const localKey = isTrad ? `lc_physical_menu_${type}_v1` : `lc_physical_menu_${type}_digital_v1`;
  const firestoreDocId = isTrad ? type : `${type}_digital`;
  
  // A. Intentar Firestore primero si está configurado
  if (isConfigured && db) {
    try {
      const snap = await getDoc(doc(db, `restaurants/la-curandera/physicalMenus/${firestoreDocId}`));
      if (snap.exists() && snap.data().pages && Array.isArray(snap.data().pages)) {
        const pages = snap.data().pages;
        localStorage.setItem(localKey, JSON.stringify(pages));
        return pages;
      }
    } catch (e) {
      console.warn(`Firestore load error for physical menu ${firestoreDocId}:`, e);
    }
  }

  // B. Intentar localStorage
  const cached = localStorage.getItem(localKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  // C. Fallback a templates JSON pre-extraídos
  const templateFilename = isTrad ? `carta_${type}_template.json` : `carta_${type}_digital_template.json`;
  const url = `../data/${templateFilename}`;
  const res = await fetch(url);
  if (res.ok) {
    const data = await res.json();
    localStorage.setItem(localKey, JSON.stringify(data));
    return data;
  }

  return [];
}

/**
 * Configuración de eventos de UI y atajos
 */
function setupPhysicalEditorEvents() {
  // Selector de Menú: Desayuno vs Comida
  const btnTypeDesayuno = document.getElementById('btn-type-desayuno');
  const btnTypeComida = document.getElementById('btn-type-comida');

  if (btnTypeDesayuno && btnTypeComida) {
    btnTypeDesayuno.addEventListener('click', () => switchMenuType('desayuno'));
    btnTypeComida.addEventListener('click', () => switchMenuType('comida'));
  }

  // Selector de Versión de Diseño: Tradicional vs Menú Digital
  const btnDesignTrad = document.getElementById('btn-design-tradicional');
  const btnDesignDig = document.getElementById('btn-design-digital');

  if (btnDesignTrad && btnDesignDig) {
    btnDesignTrad.addEventListener('click', () => switchDesign('tradicional'));
    btnDesignDig.addEventListener('click', () => switchDesign('digital'));
  }

  // Botón Guardar Cambios
  const btnSave = document.getElementById('btn-phys-save');
  if (btnSave) {
    btnSave.addEventListener('click', savePhysicalMenu);
  }

  // Botón Descargar PDF
  const btnDownload = document.getElementById('btn-phys-download');
  if (btnDownload) {
    btnDownload.addEventListener('click', downloadPhysicalMenuPDF);
  }

  // Botón Restablecer Original
  const btnReset = document.getElementById('btn-phys-reset');
  if (btnReset) {
    btnReset.addEventListener('click', resetPhysicalMenuToTemplate);
  }

  // Botón Agregar Texto
  const btnAddText = document.getElementById('btn-phys-add-text');
  if (btnAddText) {
    btnAddText.addEventListener('click', addNewTextItem);
  }

  // Controles de Zoom
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomFit = document.getElementById('btn-zoom-fit');

  if (btnZoomIn) btnZoomIn.addEventListener('click', () => setZoom(zoomScale + 0.1));
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => setZoom(zoomScale - 0.1));
  if (btnZoomFit) btnZoomFit.addEventListener('click', calculateOptimalZoom);

  // Botones de Gestión de Hojas
  const btnAddPage = document.getElementById('btn-add-page');
  const btnDupPage = document.getElementById('btn-dup-page');
  const btnDelPage = document.getElementById('btn-del-page');

  if (btnAddPage) btnAddPage.addEventListener('click', addNewPage);
  if (btnDupPage) btnDupPage.addEventListener('click', duplicateCurrentPage);
  if (btnDelPage) btnDelPage.addEventListener('click', deleteCurrentPage);

  // Inspector Form Events
  const inpText = document.getElementById('insp-item-text');
  const inpFont = document.getElementById('insp-item-font');
  const inpSize = document.getElementById('insp-item-size');
  const inpSizeRange = document.getElementById('insp-item-size-range');
  const inpBold = document.getElementById('insp-item-bold');
  const inpColor = document.getElementById('insp-item-color');
  const inpX = document.getElementById('insp-item-x');
  const inpY = document.getElementById('insp-item-y');
  const btnDupItem = document.getElementById('insp-btn-duplicate');
  const btnDelItem = document.getElementById('insp-btn-delete');
  const inpPageBg = document.getElementById('insp-page-bg');

  if (inpText) {
    inpText.addEventListener('input', (e) => updateSelectedItemProp('text', e.target.value));
  }
  if (inpFont) {
    inpFont.addEventListener('change', (e) => updateSelectedItemProp('fontFamily', e.target.value));
  }
  if (inpSize) {
    inpSize.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (val > 0) {
        if (inpSizeRange) inpSizeRange.value = val;
        updateSelectedItemProp('fontSize', val);
      }
    });
  }
  if (inpSizeRange) {
    inpSizeRange.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (inpSize) inpSize.value = val;
      updateSelectedItemProp('fontSize', val);
    });
  }
  if (inpBold) {
    inpBold.addEventListener('click', () => {
      const item = getSelectedItem();
      if (item) {
        const nextBold = !item.bold;
        inpBold.classList.toggle('active', nextBold);
        updateSelectedItemProp('bold', nextBold);
      }
    });
  }
  if (inpColor) {
    inpColor.addEventListener('input', (e) => updateSelectedItemProp('color', e.target.value));
  }
  if (inpX) {
    inpX.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (!isNaN(val)) updateSelectedItemProp('x', val);
    });
  }
  if (inpY) {
    inpY.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (!isNaN(val)) updateSelectedItemProp('y', val);
    });
  }
  if (btnDupItem) {
    btnDupItem.addEventListener('click', duplicateSelectedItem);
  }
  if (btnDelItem) {
    btnDelItem.addEventListener('click', deleteSelectedItem);
  }
  if (inpPageBg) {
    inpPageBg.addEventListener('input', (e) => updateCurrentPageBg(e.target.value));
  }

  // Atajos de teclado para mover o borrar elementos seleccionados
  window.addEventListener('keydown', handleEditorKeyDown);

  // Eventos globales de mouse para drag & drop suave
  window.addEventListener('mousemove', handleDragMouseMove);
  window.addEventListener('mouseup', handleDragMouseUp);
  window.addEventListener('touchmove', handleDragTouchMove, { passive: false });
  window.addEventListener('touchend', handleDragMouseUp);
}

/**
 * Cambia el tipo de menú entre Desayunos y Comidas
 */
async function switchMenuType(type) {
  if (currentType === type) return;
  currentType = type;
  currentPageIndex = 0;
  selectedItemId = null;

  document.querySelectorAll('.physical-type-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-type') === type);
  });

  const key = getMenuKey();
  if (!menusData[key]) {
    menusData[key] = await loadSingleMenuData(currentType, currentDesign);
  }

  renderPagesList();
  renderCurrentPage();
  renderInspector();
}

/**
 * Cambia la versión de diseño entre Tradicional y Menú Digital
 */
async function switchDesign(design) {
  if (currentDesign === design) return;
  currentDesign = design;
  currentPageIndex = 0;
  selectedItemId = null;

  document.querySelectorAll('.physical-design-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-design') === design);
  });

  const key = getMenuKey();
  if (!menusData[key]) {
    menusData[key] = await loadSingleMenuData(currentType, currentDesign);
  }

  renderPagesList();
  renderCurrentPage();
  renderInspector();

  const label = design === 'digital' ? 'Menú Digital' : 'Tradicional';
  showToast(`✨ Cambiado a diseño: ${label}`);
}

/**
 * Ajusta el zoom óptimo según el tamaño disponible en pantalla
 */
function calculateOptimalZoom() {
  const viewport = document.getElementById('physical-canvas-viewport');
  if (!viewport) return;
  const availWidth = viewport.clientWidth - 80;
  const availHeight = viewport.clientHeight - 100;
  
  if (availWidth > 0 && availHeight > 0) {
    const scaleX = availWidth / 816;
    const scaleY = availHeight / 1056;
    const best = Math.min(scaleX, scaleY, 0.95);
    setZoom(Math.max(0.4, Math.min(1.2, Number(best.toFixed(2)))));
  } else {
    setZoom(0.75);
  }
}

function setZoom(scale) {
  zoomScale = Math.max(0.35, Math.min(1.5, Number(scale.toFixed(2))));
  const sheet = document.getElementById('physical-paper-sheet');
  const zoomText = document.getElementById('zoom-level-text');

  if (sheet) {
    sheet.style.transform = `scale(${zoomScale})`;
  }
  if (zoomText) {
    zoomText.textContent = `${Math.round(zoomScale * 100)}%`;
  }
}

/**
 * Renderiza la lista lateral de hojas
 */
function renderPagesList() {
  const container = document.getElementById('physical-pages-list');
  if (!container) return;

  const key = getMenuKey();
  const pages = menusData[key] || [];
  const titles = PAGE_TITLES[key] || PAGE_TITLES[currentType] || [];

  container.innerHTML = '';
  pages.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = `physical-page-card ${idx === currentPageIndex ? 'active' : ''}`;
    const title = titles[idx] || `Página ${idx + 1}`;
    
    card.innerHTML = `
      <div class="page-card-swatch" style="background-color: ${p.bgColor || '#CCAD93'};"></div>
      <div class="page-card-info">
        <span class="page-card-num">Hoja ${idx + 1}</span>
        <span class="page-card-desc" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      currentPageIndex = idx;
      selectedItemId = null;
      renderPagesList();
      renderCurrentPage();
      renderInspector();
    });

    container.appendChild(card);
  });
}

/**
 * Renderiza la hoja de papel interactiva en Tamaño Carta (816px x 1056px)
 */
function renderCurrentPage() {
  const sheet = document.getElementById('physical-paper-sheet');
  if (!sheet) return;

  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page) {
    sheet.innerHTML = '<div style="padding:2rem; color:#888;">No hay páginas disponibles.</div>';
    return;
  }

  sheet.style.backgroundColor = page.bgColor || '#CCAD93';
  sheet.innerHTML = '';

  // Emblema místico de la Curandera para Portada (Hoja 1)
  if (page.hasEmblem || page.pageNumber === 1) {
    const emblemImg = document.createElement('img');
    emblemImg.src = '../assets/logo/curandera-emblem-lineart.png';
    emblemImg.alt = 'La Curandera';
    emblemImg.className = 'physical-paper-emblem';
    sheet.appendChild(emblemImg);
  }

  // Renderizar cada texto como elemento interactivo posicionable
  (page.items || []).forEach(item => {
    const el = document.createElement('div');
    el.id = `phys-item-${item.id}`;
    el.className = `physical-text-item ${item.id === selectedItemId ? 'is-selected' : ''}`;
    el.style.left = `${item.x}px`;
    el.style.top = `${item.y}px`;
    el.style.fontSize = `${item.fontSize}px`;
    el.style.fontFamily = getCssFontFamily(item.fontFamily);
    el.style.color = item.color || '#000000';
    el.style.fontWeight = item.bold ? '800' : '400';
    el.textContent = item.text;

    // Barra flotante rápida si está seleccionado
    if (item.id === selectedItemId) {
      const quickBar = document.createElement('div');
      quickBar.className = 'item-quick-toolbar';
      quickBar.innerHTML = `
        <button class="btn-item-quick edit" title="Editar texto">✏️ Editar</button>
        <button class="btn-item-quick dup" title="Duplicar">📋 Copiar</button>
        <button class="btn-item-quick delete" title="Eliminar">🗑️ Borrar</button>
      `;

      quickBar.querySelector('.edit').addEventListener('click', (e) => {
        e.stopPropagation();
        focusInspectorTextarea();
      });
      quickBar.querySelector('.dup').addEventListener('click', (e) => {
        e.stopPropagation();
        duplicateSelectedItem();
      });
      quickBar.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSelectedItem();
      });

      el.appendChild(quickBar);
    }

    // Evento MouseDown / TouchStart para arrastrar
    el.addEventListener('mousedown', (e) => startDragItem(e, item));
    el.addEventListener('touchstart', (e) => startDragItemTouch(e, item), { passive: false });

    // Doble clic para editar directamente
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      focusInspectorTextarea();
    });

    sheet.appendChild(el);
  });

  // Clic en la hoja para deseleccionar si se hace clic afuera de un elemento
  sheet.onclick = (e) => {
    if (e.target === sheet || e.target.classList.contains('physical-paper-emblem')) {
      selectedItemId = null;
      renderCurrentPage();
      renderInspector();
    }
  };
}

function getCssFontFamily(font) {
  if (!font) return "'Gotham-Bold', sans-serif";
  const f = font.toLowerCase();
  if (f.includes('hansief')) return "'Hansief', 'Montserrat', sans-serif";
  if (f.includes('sourcecode') || f.includes('mono')) return "'JetBrains Mono', monospace";
  if (f.includes('montserrat')) return "'Montserrat', -apple-system, sans-serif";
  if (f.includes('caveat')) return "'Caveat Brush', 'Kalam', cursive";
  if (f.includes('gotham')) return "'Gotham-Bold', 'Gotham', 'Montserrat', sans-serif";
  return "'Gotham-Bold', sans-serif";
}

/**
 * Drag & Drop de elementos sobre la hoja de papel
 */
function startDragItem(e, item) {
  if (e.button !== 0) return; // solo botón izquierdo
  e.stopPropagation();

  selectedItemId = item.id;
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragInitialItemX = item.x;
  dragInitialItemY = item.y;

  renderCurrentPage();
  renderInspector();
}

function startDragItemTouch(e, item) {
  if (e.touches.length !== 1) return;
  e.stopPropagation();

  selectedItemId = item.id;
  isDragging = true;
  dragStartX = e.touches[0].clientX;
  dragStartY = e.touches[0].clientY;
  dragInitialItemX = item.x;
  dragInitialItemY = item.y;

  renderCurrentPage();
  renderInspector();
}

function handleDragMouseMove(e) {
  if (!isDragging || !selectedItemId) return;
  e.preventDefault();

  const deltaX = (e.clientX - dragStartX) / zoomScale;
  const deltaY = (e.clientY - dragStartY) / zoomScale;

  const item = getSelectedItem();
  if (!item) return;

  item.x = Math.max(0, Math.min(816 - 20, Math.round(dragInitialItemX + deltaX)));
  item.y = Math.max(0, Math.min(1056 - 20, Math.round(dragInitialItemY + deltaY)));

  const domEl = document.getElementById(`phys-item-${item.id}`);
  if (domEl) {
    domEl.style.left = `${item.x}px`;
    domEl.style.top = `${item.y}px`;
  }

  // Sincronizar inputs de inspector en tiempo real
  const inpX = document.getElementById('insp-item-x');
  const inpY = document.getElementById('insp-item-y');
  if (inpX) inpX.value = item.x;
  if (inpY) inpY.value = item.y;
}

function handleDragTouchMove(e) {
  if (!isDragging || !selectedItemId || e.touches.length !== 1) return;
  e.preventDefault();

  const deltaX = (e.touches[0].clientX - dragStartX) / zoomScale;
  const deltaY = (e.touches[0].clientY - dragStartY) / zoomScale;

  const item = getSelectedItem();
  if (!item) return;

  item.x = Math.max(0, Math.min(816 - 20, Math.round(dragInitialItemX + deltaX)));
  item.y = Math.max(0, Math.min(1056 - 20, Math.round(dragInitialItemY + deltaY)));

  const domEl = document.getElementById(`phys-item-${item.id}`);
  if (domEl) {
    domEl.style.left = `${item.x}px`;
    domEl.style.top = `${item.y}px`;
  }

  const inpX = document.getElementById('insp-item-x');
  const inpY = document.getElementById('insp-item-y');
  if (inpX) inpX.value = item.x;
  if (inpY) inpY.value = item.y;
}

function handleDragMouseUp() {
  if (isDragging) {
    isDragging = false;
    saveToLocalStorageDraft();
  }
}

/**
 * Atajos de teclado para mover con precisión
 */
function handleEditorKeyDown(e) {
  // Solo aplicar si no estamos escribiendo en un input o textarea
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (!selectedItemId) return;

  const item = getSelectedItem();
  if (!item) return;

  const step = e.shiftKey ? 10 : 1;
  let handled = false;

  if (e.key === 'ArrowLeft') {
    item.x = Math.max(0, item.x - step);
    handled = true;
  } else if (e.key === 'ArrowRight') {
    item.x = Math.min(816 - 20, item.x + step);
    handled = true;
  } else if (e.key === 'ArrowUp') {
    item.y = Math.max(0, item.y - step);
    handled = true;
  } else if (e.key === 'ArrowDown') {
    item.y = Math.min(1056 - 20, item.y + step);
    handled = true;
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    deleteSelectedItem();
    handled = true;
  }

  if (handled) {
    e.preventDefault();
    const domEl = document.getElementById(`phys-item-${item.id}`);
    if (domEl) {
      domEl.style.left = `${item.x}px`;
      domEl.style.top = `${item.y}px`;
    }
    const inpX = document.getElementById('insp-item-x');
    const inpY = document.getElementById('insp-item-y');
    if (inpX) inpX.value = item.x;
    if (inpY) inpY.value = item.y;
    saveToLocalStorageDraft();
  }
}

/**
 * Inspector Lateral de Propiedades
 */
function renderInspector() {
  const panelItem = document.getElementById('inspector-item-controls');
  const panelPage = document.getElementById('inspector-page-controls');
  const item = getSelectedItem();

  if (item) {
    if (panelItem) panelItem.style.display = 'flex';
    if (panelPage) panelPage.style.display = 'none';

    const inpText = document.getElementById('insp-item-text');
    const inpFont = document.getElementById('insp-item-font');
    const inpSize = document.getElementById('insp-item-size');
    const inpSizeRange = document.getElementById('insp-item-size-range');
    const inpBold = document.getElementById('insp-item-bold');
    const inpColor = document.getElementById('insp-item-color');
    const inpX = document.getElementById('insp-item-x');
    const inpY = document.getElementById('insp-item-y');

    if (inpText) inpText.value = item.text;
    if (inpFont) {
      const f = (item.fontFamily || '').toLowerCase();
      if (f.includes('hansief')) inpFont.value = 'Hansief';
      else if (f.includes('sourcecode') || f.includes('mono')) inpFont.value = 'SourceCodeVariable-Roman';
      else inpFont.value = 'Gotham-Bold';
    }
    if (inpSize) inpSize.value = item.fontSize;
    if (inpSizeRange) inpSizeRange.value = item.fontSize;
    if (inpBold) inpBold.classList.toggle('active', Boolean(item.bold));
    if (inpColor) inpColor.value = item.color || '#000000';
    if (inpX) inpX.value = item.x;
    if (inpY) inpY.value = item.y;

    renderColorPresets('item-color-presets', item.color, (hex) => {
      if (inpColor) inpColor.value = hex;
      updateSelectedItemProp('color', hex);
    });
  } else {
    if (panelItem) panelItem.style.display = 'none';
    if (panelPage) panelPage.style.display = 'flex';

    const pages = menusData[getMenuKey()] || [];
    const page = pages[currentPageIndex];
    const inpPageBg = document.getElementById('insp-page-bg');
    if (inpPageBg && page) inpPageBg.value = page.bgColor || '#CCAD93';

    renderColorPresets('page-color-presets', page?.bgColor, (hex) => {
      if (inpPageBg) inpPageBg.value = hex;
      updateCurrentPageBg(hex);
    });

    // Lista de textos en la página actual para selección rápida
    renderCurrentPageTextsList();
  }
}

function renderColorPresets(containerId, activeHex, onClick) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  COLOR_PRESETS.forEach(cp => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `color-swatch-btn ${activeHex?.toLowerCase() === cp.hex.toLowerCase() ? 'selected' : ''}`;
    btn.style.backgroundColor = cp.hex;
    btn.title = cp.name;
    btn.addEventListener('click', () => {
      onClick(cp.hex);
      renderInspector();
    });
    container.appendChild(btn);
  });
}

function renderCurrentPageTextsList() {
  const container = document.getElementById('current-page-texts-list');
  if (!container) return;

  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page || !page.items || page.items.length === 0) {
    container.innerHTML = '<span style="font-size:0.75rem; color:#888;">No hay textos en esta hoja.</span>';
    return;
  }

  container.innerHTML = '';
  page.items.slice(0, 15).forEach((it) => {
    const row = document.createElement('div');
    row.style.cssText = 'padding:0.4rem; background:rgba(255,255,255,0.05); border-radius:4px; font-size:0.75rem; cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:0.3rem;';
    row.textContent = it.text.replace(/\n/g, ' ');
    row.addEventListener('click', () => {
      selectedItemId = it.id;
      renderCurrentPage();
      renderInspector();
      focusInspectorTextarea();
    });
    container.appendChild(row);
  });
}

function focusInspectorTextarea() {
  const ta = document.getElementById('insp-item-text');
  if (ta) {
    ta.focus();
    ta.select();
  }
}

function getSelectedItem() {
  if (!selectedItemId) return null;
  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page || !page.items) return null;
  return page.items.find(i => i.id === selectedItemId);
}

function updateSelectedItemProp(prop, value) {
  const item = getSelectedItem();
  if (!item) return;

  item[prop] = value;
  const domEl = document.getElementById(`phys-item-${item.id}`);
  if (domEl) {
    if (prop === 'text') domEl.textContent = value;
    if (prop === 'x') domEl.style.left = `${value}px`;
    if (prop === 'y') domEl.style.top = `${value}px`;
    if (prop === 'fontSize') domEl.style.fontSize = `${value}px`;
    if (prop === 'fontFamily') domEl.style.fontFamily = getCssFontFamily(value);
    if (prop === 'color') domEl.style.color = value;
    if (prop === 'bold') domEl.style.fontWeight = value ? '800' : '400';
  }
  saveToLocalStorageDraft();
}

function updateCurrentPageBg(hex) {
  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page) return;

  page.bgColor = hex;
  const sheet = document.getElementById('physical-paper-sheet');
  if (sheet) sheet.style.backgroundColor = hex;
  renderPagesList();
  saveToLocalStorageDraft();
}

/**
 * Operaciones: Agregar, Duplicar, Eliminar elementos y hojas
 */
function addNewTextItem() {
  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page) return;

  if (!page.items) page.items = [];
  const newId = `item_${Date.now()}`;
  const newItem = {
    id: newId,
    x: 100,
    y: 200,
    text: 'NUEVO PLATILLO O TEXTO\nDescripción o detalle aquí...',
    fontSize: 14,
    fontFamily: 'Gotham-Bold',
    color: '#000000',
    bold: true
  };

  page.items.push(newItem);
  selectedItemId = newId;

  renderCurrentPage();
  renderInspector();
  focusInspectorTextarea();
  showToast('➕ Nuevo texto agregado a la hoja.');
  saveToLocalStorageDraft();
}

function duplicateSelectedItem() {
  const item = getSelectedItem();
  if (!item) return;

  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page) return;

  const newId = `item_${Date.now()}`;
  const cloned = {
    ...item,
    id: newId,
    x: Math.min(816 - 40, item.x + 15),
    y: Math.min(1056 - 40, item.y + 15)
  };

  page.items.push(cloned);
  selectedItemId = newId;

  renderCurrentPage();
  renderInspector();
  showToast('📋 Elemento duplicado.');
  saveToLocalStorageDraft();
}

function deleteSelectedItem() {
  const item = getSelectedItem();
  if (!item) return;

  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page) return;

  page.items = page.items.filter(i => i.id !== item.id);
  selectedItemId = null;

  renderCurrentPage();
  renderInspector();
  showToast('🗑️ Elemento eliminado.');
  saveToLocalStorageDraft();
}

function addNewPage() {
  const pages = menusData[getMenuKey()] || [];
  const newNum = pages.length + 1;
  const newPage = {
    pageNumber: newNum,
    width: 816,
    height: 1056,
    bgColor: currentDesign === 'digital' ? '#FDF6EC' : '#CCAD93',
    hasEmblem: false,
    items: [
      {
        id: `item_${Date.now()}`,
        x: 80,
        y: 80,
        text: 'NUEVA SECCIÓN DE CARTA',
        fontSize: 22,
        fontFamily: 'Hansief',
        color: '#000000',
        bold: true
      }
    ]
  };

  pages.push(newPage);
  currentPageIndex = pages.length - 1;
  selectedItemId = null;

  renderPagesList();
  renderCurrentPage();
  renderInspector();
  showToast(`📄 Hoja ${newNum} agregada.`);
  saveToLocalStorageDraft();
}

function duplicateCurrentPage() {
  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page) return;

  const cloned = JSON.parse(JSON.stringify(page));
  cloned.pageNumber = pages.length + 1;
  cloned.items = (cloned.items || []).map(it => ({ ...it, id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` }));

  pages.splice(currentPageIndex + 1, 0, cloned);
  currentPageIndex = currentPageIndex + 1;
  selectedItemId = null;

  renderPagesList();
  renderCurrentPage();
  renderInspector();
  showToast('📋 Hoja duplicada.');
  saveToLocalStorageDraft();
}

function deleteCurrentPage() {
  const pages = menusData[getMenuKey()] || [];
  if (pages.length <= 1) {
    showToast('⚠️ No puedes eliminar la única hoja de la carta.');
    return;
  }

  if (!confirm(`¿Deseas eliminar la Hoja ${currentPageIndex + 1}?`)) return;

  pages.splice(currentPageIndex, 1);
  if (currentPageIndex >= pages.length) {
    currentPageIndex = pages.length - 1;
  }
  selectedItemId = null;

  renderPagesList();
  renderCurrentPage();
  renderInspector();
  showToast('🗑️ Hoja eliminada.');
  saveToLocalStorageDraft();
}

function saveToLocalStorageDraft() {
  try {
    const isTrad = currentDesign === 'tradicional';
    const localKey = isTrad ? `lc_physical_menu_${currentType}_v1` : `lc_physical_menu_${currentType}_digital_v1`;
    localStorage.setItem(localKey, JSON.stringify(menusData[getMenuKey()]));
  } catch (e) {}
}

/**
 * Guarda los cambios permanentemente en Firestore y localStorage
 */
async function savePhysicalMenu() {
  const btn = document.getElementById('btn-phys-save');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Guardando...';
  }

  try {
    const pages = menusData[getMenuKey()] || [];
    const isTrad = currentDesign === 'tradicional';
    const localKey = isTrad ? `lc_physical_menu_${currentType}_v1` : `lc_physical_menu_${currentType}_digital_v1`;
    const firestoreDocId = isTrad ? currentType : `${currentType}_digital`;

    localStorage.setItem(localKey, JSON.stringify(pages));

    if (isConfigured && db) {
      await setDoc(doc(db, `restaurants/la-curandera/physicalMenus/${firestoreDocId}`), {
        type: currentType,
        design: currentDesign,
        pages: pages,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    const typeLabel = currentType === 'desayuno' ? 'Desayunos' : 'Comidas';
    const designLabel = currentDesign === 'digital' ? '(Estilo Menú Digital)' : '(Diseño Tradicional)';
    showToast(`✅ Carta de ${typeLabel} ${designLabel} guardada correctamente.`);
  } catch (err) {
    console.error('Error saving physical menu:', err);
    showToast('⚠️ Error al guardar los cambios en la nube.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '💾 Guardar Cambios';
    }
  }
}

/**
 * Restablece la carta actual al template original de los PDFs oficiales
 */
async function resetPhysicalMenuToTemplate() {
  const typeLabel = currentType === 'desayuno' ? 'Desayunos' : 'Comidas';
  const designLabel = currentDesign === 'digital' ? 'Menú Digital' : 'Tradicional';
  if (!confirm(`¿Estás seguro de restablecer la Carta de ${typeLabel} (${designLabel}) a su plantilla original? Se perderán las modificaciones no guardadas en esta versión.`)) {
    return;
  }

  try {
    const isTrad = currentDesign === 'tradicional';
    const templateFilename = isTrad ? `carta_${currentType}_template.json` : `carta_${currentType}_digital_template.json`;
    const res = await fetch(`../data/${templateFilename}`);
    if (res.ok) {
      menusData[getMenuKey()] = await res.json();
      currentPageIndex = 0;
      selectedItemId = null;
      renderPagesList();
      renderCurrentPage();
      renderInspector();
      saveToLocalStorageDraft();
      showToast(`🔄 Carta de ${typeLabel} (${designLabel}) restablecida al diseño original.`);
    }
  } catch (e) {
    showToast('⚠️ No se pudo restablecer el template.');
  }
}

/**
 * Genera y descarga el PDF de alta resolución en Tamaño Carta (US Letter 8.5" x 11")
 */
async function downloadPhysicalMenuPDF() {
  if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
    showToast('⚠️ Esperando carga del motor PDF...');
    return;
  }

  const pages = menusData[getMenuKey()] || [];
  if (pages.length === 0) {
    showToast('⚠️ No hay páginas para exportar.');
    return;
  }

  const btn = document.getElementById('btn-phys-download');
  const originalBtnHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Preparando PDF...';
  }

  // Modal visual de progreso
  const progressModal = document.createElement('div');
  progressModal.className = 'physical-print-modal';
  progressModal.innerHTML = `
    <div class="physical-print-box">
      <h3 style="font-family:var(--font-title); font-size:1.25rem; margin-bottom:0.5rem;">Generando PDF Tamaño Carta</h3>
      <p id="phys-progress-text" style="font-family:var(--font-mono); font-size:0.85rem; color:var(--lc-crema);">Renderizando páginas en alta resolución...</p>
      <div class="physical-progress-bar">
        <div id="phys-progress-fill" class="physical-progress-fill"></div>
      </div>
      <span style="font-size:0.75rem; color:var(--lc-gray-500);">8.5 x 11 pulgadas · Impresión profesional</span>
    </div>
  `;
  document.body.appendChild(progressModal);

  const progressText = progressModal.querySelector('#phys-progress-text');
  const progressFill = progressModal.querySelector('#phys-progress-fill');

  try {
    const { jsPDF } = window.jspdf;
    // Dimensiones exactas de US Letter en puntos (72 pt / pulgada): 612 x 792 pt
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter',
      compress: true
    });

    // Contenedor temporal fuera de pantalla para renderizar cada página a tamaño completo (816px x 1056px)
    const renderContainer = document.createElement('div');
    renderContainer.style.cssText = 'position:fixed; left:-9999px; top:0; width:816px; height:1056px; z-index:-1000; overflow:hidden;';
    document.body.appendChild(renderContainer);

    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      if (progressText) progressText.textContent = `Generando hoja ${i + 1} de ${pages.length}...`;
      if (progressFill) progressFill.style.width = `${Math.round(((i + 1) / pages.length) * 100)}%`;

      // Renderizar el HTML idéntico de la hoja a escala 1:1
      renderContainer.style.backgroundColor = p.bgColor || '#CCAD93';
      renderContainer.innerHTML = '';

      if (p.hasEmblem || p.pageNumber === 1) {
        const emblem = document.createElement('img');
        emblem.src = '../assets/logo/curandera-emblem-lineart.png';
        emblem.style.cssText = 'position:absolute; top:48px; right:50px; width:170px; height:170px; z-index:1; opacity:0.95;';
        renderContainer.appendChild(emblem);
      }

      (p.items || []).forEach(it => {
        const itemEl = document.createElement('div');
        itemEl.style.cssText = `
          position: absolute;
          left: ${it.x}px;
          top: ${it.y}px;
          font-size: ${it.fontSize}px;
          font-family: ${getCssFontFamily(it.fontFamily)};
          color: ${it.color || '#000000'};
          font-weight: ${it.bold ? '800' : '400'};
          line-height: 1.25;
          white-space: pre-wrap;
          z-index: 5;
        `;
        itemEl.textContent = it.text;
        renderContainer.appendChild(itemEl);
      });

      // Capturar la hoja a escala 2x (300 DPI aprox para impresión nítida)
      const canvas = await window.html2canvas(renderContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: p.bgColor || '#CCAD93',
        width: 816,
        height: 1056
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (i > 0) {
        pdf.addPage('letter', 'portrait');
      }

      // Añadir la página a tamaño exacto Carta (612 x 792 puntos)
      pdf.addImage(imgData, 'JPEG', 0, 0, 612, 792, undefined, 'FAST');
    }

    document.body.removeChild(renderContainer);

    const isTrad = currentDesign === 'tradicional';
    const filename = currentType === 'desayuno' 
      ? (isTrad ? 'La_Curandera_Menu_Desayunos_Tradicional_Carta.pdf' : 'La_Curandera_Menu_Desayunos_Digital_Carta.pdf') 
      : (isTrad ? 'La_Curandera_Menu_Comidas_Tradicional_Carta.pdf' : 'La_Curandera_Menu_Comidas_Digital_Carta.pdf');

    pdf.save(filename);
    showToast(`✅ PDF descargado exitosamente: ${filename}`);
  } catch (err) {
    console.error('Error generando PDF de carta física:', err);
    showToast('⚠️ Error al generar el PDF.');
  } finally {
    if (document.body.contains(progressModal)) {
      document.body.removeChild(progressModal);
    }
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
