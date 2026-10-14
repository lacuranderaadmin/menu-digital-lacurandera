/**
 * LA CURANDERA — Editor de Carta Física (Impresión en Tamaño Carta 8.5" x 11")
 * Permite editar textos, moverlos libremente en cada hoja, duplicarlos, borrarlos,
 * agregar nuevos textos, cambiar colores/tipografías, guardar en la nube y
 * descargar la carta física en PDF multi-página tamaño carta.
 */

import { 
  db, 
  collection,
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  serverTimestamp, 
  isConfigured 
} from './firebase-init.js';
import { showToast } from './ui.js';

let currentType = 'desayuno'; // 'desayuno' | 'comida' | 'cantina'
let currentDesign = 'tradicional'; // 'tradicional' | 'digital'
let currentPageIndex = 0;
let menusData = {
  desayuno_tradicional: null,
  comida_tradicional: null,
  cantina_tradicional: null,
  desayuno_digital: null,
  comida_digital: null,
  cantina_digital: null
};

// Helper para clave de menú compuesta
function getMenuKey(type = currentType, design = currentDesign) {
  return `${type}_${design}`;
}
let selectedItemId = null;
let selectedItemIds = new Set();
let editorClipboard = [];
let zoomScale = 0.75;
let isDragging = false;
let dragHasMoved = false;
let dragStartX = 0;
let dragStartY = 0;
let dragInitialItemX = 0;
let dragInitialItemY = 0;
let dragInitialPositions = new Map();
let isResizing = false;
let resizeHandleType = null;
let resizeTargetItem = null;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeInitialWidth = 0;
let resizeInitialHeight = 0;
let resizeInitialX = 0;
let resizeInitialY = 0;
let resizeBadgeEl = null;
let isMarqueeSelecting = false;
let marqueeStartX = 0;
let marqueeStartY = 0;
let marqueeEl = null;
let dragRafId = null;
let draggedElementsCache = [];
let marqueeCachedBoxes = [];
let isEditorInitialized = false;

// Recuperar portapapeles de sesión si existe
try {
  const savedClip = sessionStorage.getItem('lc_phys_clipboard');
  if (savedClip) editorClipboard = JSON.parse(savedClip);
} catch (e) {}

// Títulos amigables para cada hoja de las cartas físicas
const PAGE_TITLES = {
  desayuno_tradicional: [
    'Pág. 1: Portada y Raíces',
    'Pág. 2: Pa\' Curar el Alma & Lo Enchi-loso',
    'Pág. 3: Tacos Dorados, Sándwiches & Pa\' Caldear',
    'Pág. 4: Dulce Remedio, Pan Francés & Niños',
    'Pág. 5: Juguería, Cafetería & Bebidas'
  ],
  comida_tradicional: [
    'Pág. 1: Portada y Manifiesto Curandera',
    'Pág. 2: Sabores de Mar & Pa\' Empezar',
    'Pág. 3: Pa\' Cuidarte, Sopas, Pastas & Platos Fuertes',
    'Pág. 4: Platos Fuertes, Cortes de Res & Taquería',
    'Pág. 5: Burritos Norteños, Hamburguesas & Snacks',
    'Pág. 6: Alitas, Para los Morrillos & Dulce Remedio',
    'Pág. 7: Cafetería de Especialidad & Bebidas'
  ],
  cantina_tradicional: [
    'Pág. 1: Portada Cantina, Mezcales & Cócteles de la Casa',
    'Pág. 2: Coctelería Refrescante & Clásicos Favoritos',
    'Pág. 3: Cervezas Frías, Tarros Preparados & Vinos',
    'Pág. 4: Mezcales Artesanales & Tequilas de Tradición',
    'Pág. 5: Whiskies, Vodkas, Ron, Cognac & Digestivos'
  ],
  desayuno_digital: [
    'Pág. 1: Portada & Sabiduría Curandera',
    'Pág. 2: Pa\' Curar el Alma & Lo Enchi-loso',
    'Pág. 3: Tacos Dorados, Sándwiches & Pa\' Caldear',
    'Pág. 4: Dulce Remedio, Pan Francés & Niños',
    'Pág. 5: Juguería, Cafetería & Bebidas'
  ],
  comida_digital: [
    'Pág. 1: Portada & Manifiesto Curandera',
    'Pág. 2: Sabores de Mar & Pa\' Empezar',
    'Pág. 3: Pa\' Cuidarte, Sopas, Pastas & Platos Fuertes',
    'Pág. 4: Platos Fuertes, Cortes de Res & Taquería',
    'Pág. 5: Burritos Norteños, Hamburguesas & Snacks',
    'Pág. 6: Alitas, Para los Morrillos & Dulce Remedio',
    'Pág. 7: Cafetería de Especialidad & Bebidas'
  ],
  cantina_digital: [
    'Pág. 1: Portada Cantina & Cócteles de la Casa',
    'Pág. 2: Coctelería Refrescante & Clásicos Favoritos',
    'Pág. 3: Cervezas Frías, Tarros Preparados & Vinos',
    'Pág. 4: Mezcales Artesanales & Tequilas de Tradición',
    'Pág. 5: Whiskies, Vodkas, Ron, Cognac & Digestivos'
  ],
  desayuno: [
    'Pág. 1: Portada y Raíces',
    'Pág. 2: Pa\' Curar el Alma & Lo Enchi-loso',
    'Pág. 3: Tacos Dorados, Sándwiches & Pa\' Caldear',
    'Pág. 4: Dulce Remedio, Pan Francés & Niños',
    'Pág. 5: Juguería, Cafetería & Bebidas'
  ],
  comida: [
    'Pág. 1: Portada y Manifiesto Curandera',
    'Pág. 2: Sabores de Mar & Pa\' Empezar',
    'Pág. 3: Pa\' Cuidarte, Sopas, Pastas & Platos Fuertes',
    'Pág. 4: Platos Fuertes, Cortes de Res & Taquería',
    'Pág. 5: Burritos Norteños, Hamburguesas & Snacks',
    'Pág. 6: Alitas, Para los Morrillos & Dulce Remedio',
    'Pág. 7: Cafetería de Especialidad & Bebidas'
  ],
  cantina: [
    'Pág. 1: Portada Cantina, Mezcales & Cócteles de la Casa',
    'Pág. 2: Coctelería Refrescante & Clásicos Favoritos',
    'Pág. 3: Cervezas Frías, Tarros Preparados & Vinos',
    'Pág. 4: Mezcales Artesanales & Tequilas de Tradición',
    'Pág. 5: Whiskies, Vodkas, Ron, Cognac & Digestivos'
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
  if (menusData[key]) {
    ensureUniqueItemIds(menusData[key]);
  }

  calculateOptimalZoom();
  renderPagesList();
  renderCurrentPage();
  renderInspector();

  // Comprobar si hay cambios recientes del Menú Digital pendientes de sincronizar
  const btnSync = document.getElementById('btn-phys-sync') || document.getElementById('btn-phys-reset');
  if (btnSync) {
    const syncTime = localStorage.getItem('lc_menu_sync_timestamp');
    const lastPhysSync = localStorage.getItem('lc_last_physical_sync');
    if (syncTime && (!lastPhysSync || Number(syncTime) > Number(lastPhysSync))) {
      btnSync.classList.add('pulse-needs-update');
      btnSync.setAttribute('title', 'Hay cambios recientes en el Menú Digital listos para sincronizar');
    }
  }
}

/**
 * Garantiza que cada elemento en cada hoja de la carta tenga un ID estrictamente único.
 * Si detecta IDs repetidos (por ejemplo notas de categoría en la misma hoja o entre hojas),
 * genera un sufijo único e inequívoco para que cada texto se seleccione de forma 100% independiente.
 */
function ensureUniqueItemIds(pages) {
  if (!Array.isArray(pages)) return;
  const seenIds = new Set();
  pages.forEach((p, pIdx) => {
    if (!p || !Array.isArray(p.items)) return;
    p.items.forEach((it, iIdx) => {
      // Limpiar alturas artificiales corruptas en cuadros de texto para que se adapten naturalmente al contenido
      if (it.type !== 'image' && it.height && it.height > 180) {
        delete it.height;
      }
      if (!it.id || seenIds.has(it.id)) {
        const base = it.id ? it.id : `item_p${pIdx + 1}_${iIdx}`;
        let candidate = `${base}_p${pIdx + 1}_${iIdx}`;
        let counter = 1;
        while (seenIds.has(candidate)) {
          candidate = `${base}_${counter++}`;
        }
        it.id = candidate;
      }
      seenIds.add(it.id);
    });
  });
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
  const localKey = isTrad ? `lc_physical_menu_${type}_v7` : `lc_physical_menu_${type}_digital_v7`;
  const firestoreDocId = isTrad ? type : `${type}_digital`;
  
  // A. Intentar Firestore primero si está configurado
  if (isConfigured && db) {
    try {
      const snap = await getDoc(doc(db, `restaurants/la-curandera/physicalMenus/${firestoreDocId}`));
      if (snap.exists() && snap.data().pages && Array.isArray(snap.data().pages)) {
        const pages = snap.data().pages;
        ensureUniqueItemIds(pages);
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
      const pages = JSON.parse(cached);
      if (Array.isArray(pages)) {
        ensureUniqueItemIds(pages);
        return pages;
      }
    } catch (e) {}
  }

  // C. Fallback a templates JSON pre-extraídos
  const templateFilename = isTrad ? `carta_${type}_template.json` : `carta_${type}_digital_template.json`;
  const url = `../data/${templateFilename}`;
  const res = await fetch(url);
  if (res.ok) {
    const data = await res.json();
    ensureUniqueItemIds(data);
    localStorage.setItem(localKey, JSON.stringify(data));
    return data;
  }

  return [];
}

/**
 * Configuración de eventos de UI y atajos
 */
function setupPhysicalEditorEvents() {
  // Selector de Menú: Desayunos vs Comidas vs Cantina
  const btnTypeDesayuno = document.getElementById('btn-type-desayuno');
  const btnTypeComida = document.getElementById('btn-type-comida');
  const btnTypeCantina = document.getElementById('btn-type-cantina');

  if (btnTypeDesayuno) btnTypeDesayuno.addEventListener('click', () => switchMenuType('desayuno'));
  if (btnTypeComida) btnTypeComida.addEventListener('click', () => switchMenuType('comida'));
  if (btnTypeCantina) btnTypeCantina.addEventListener('click', () => switchMenuType('cantina'));

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

  // Botón ACTUALIZAR (Sincronizar información e imágenes con el Menú Digital)
  const btnSync = document.getElementById('btn-phys-sync') || document.getElementById('btn-phys-reset');
  if (btnSync) {
    btnSync.addEventListener('click', syncDigitalMenuToPhysicalMenu);

    // Escuchar notificaciones en tiempo real cuando se hagan cambios en el Editor de Menú Digital
    try {
      const menuSyncChannel = new BroadcastChannel('lc_menu_sync');
      menuSyncChannel.onmessage = (e) => {
        btnSync.classList.add('pulse-needs-update');
        btnSync.setAttribute('title', 'Hay cambios recientes en el Menú Digital listos para sincronizar');
      };
    } catch (err) {}

    window.addEventListener('storage', (e) => {
      if (e.key === 'lc_menu_sync_event') {
        btnSync.classList.add('pulse-needs-update');
        btnSync.setAttribute('title', 'Hay cambios recientes en el Menú Digital listos para sincronizar');
      }
    });
  }

  // Botón Agregar Texto
  const btnAddText = document.getElementById('btn-phys-add-text');
  if (btnAddText) {
    btnAddText.addEventListener('click', addNewTextItem);
  }

  // Botones Copiar y Pegar en la Barra Superior
  const btnCopy = document.getElementById('btn-phys-copy');
  if (btnCopy) {
    btnCopy.addEventListener('click', copySelectedItems);
  }

  const btnPaste = document.getElementById('btn-phys-paste');
  if (btnPaste) {
    btnPaste.addEventListener('click', pasteClipboardItems);
  }

  // Botones de Selección Múltiple en el Inspector
  const btnMultiCopy = document.getElementById('insp-btn-multi-copy');
  if (btnMultiCopy) {
    btnMultiCopy.addEventListener('click', copySelectedItems);
  }

  const btnMultiDel = document.getElementById('insp-btn-multi-delete');
  if (btnMultiDel) {
    btnMultiDel.addEventListener('click', deleteSelectedItems);
  }

  const btnMultiDeselect = document.getElementById('insp-btn-multi-deselect');
  if (btnMultiDeselect) {
    btnMultiDeselect.addEventListener('click', clearSelection);
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

  // Inspector de Imágenes de Platillos
  const inpImgWidth = document.getElementById('insp-img-width');
  const inpImgHeight = document.getElementById('insp-img-height');
  const inpImgRadius = document.getElementById('insp-img-radius');

  if (inpImgWidth) {
    inpImgWidth.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (val >= 20) updateSelectedItemProp('width', val);
    });
  }
  if (inpImgHeight) {
    inpImgHeight.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (val >= 20) updateSelectedItemProp('height', val);
    });
  }
  if (inpImgRadius) {
    inpImgRadius.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (!isNaN(val)) updateSelectedItemProp('borderRadius', val);
    });
  }

  // Botones de presets rápidos de tamaño para imágenes (S, M, L)
  document.querySelectorAll('.insp-img-size-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const w = Number(btn.getAttribute('data-w'));
      const h = Number(btn.getAttribute('data-h'));
      if (w && h) {
        updateSelectedItemProp('width', w);
        updateSelectedItemProp('height', h);
        if (inpImgWidth) inpImgWidth.value = w;
        if (inpImgHeight) inpImgHeight.value = h;
      }
    });
  });

  // Inspector de Dimensiones de Cuadro de Texto
  const inpItemWidth = document.getElementById('insp-item-width');
  const inpItemHeight = document.getElementById('insp-item-height');
  const btnWCol = document.getElementById('btn-w-col');
  const btnWWide = document.getElementById('btn-w-wide');
  const btnWAuto = document.getElementById('btn-w-auto');

  if (inpItemWidth) {
    inpItemWidth.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      const item = getSelectedItem();
      if (!item) return;
      const domEl = document.getElementById(`phys-item-${item.id}`);
      if (val >= 20) {
        item.width = val;
        item.maxWidth = val;
        delete item.height; // Mantener altura limpia auto-adaptativa al contenido
        if (domEl) {
          domEl.style.width = `${val}px`;
          domEl.style.maxWidth = `${val}px`;
          domEl.style.height = '';
          const natH = Math.max(16, Math.ceil(domEl.offsetHeight || domEl.scrollHeight));
          if (inpItemHeight && !item.height) {
            inpItemHeight.placeholder = `Auto (${natH}px)`;
          }
        }
        saveToLocalStorageDraft();
      } else if (!e.target.value) {
        delete item.width;
        delete item.height;
        if (domEl) {
          domEl.style.width = '';
          domEl.style.maxWidth = isWideItem(item) ? '710px' : '345px';
          domEl.style.height = '';
        }
        saveToLocalStorageDraft();
      }
    });
  }

  if (inpItemHeight) {
    inpItemHeight.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      const item = getSelectedItem();
      if (!item) return;
      const domEl = document.getElementById(`phys-item-${item.id}`);
      if (val >= 16) {
        item.height = val;
        if (domEl) domEl.style.height = `${val}px`;
        saveToLocalStorageDraft();
      } else if (!e.target.value) {
        delete item.height;
        if (domEl) domEl.style.height = '';
        saveToLocalStorageDraft();
      }
    });
  }

  if (btnWCol) {
    btnWCol.addEventListener('click', () => {
      const item = getSelectedItem();
      if (!item) return;
      item.width = 345;
      item.maxWidth = 345;
      delete item.height;
      const domEl = document.getElementById(`phys-item-${item.id}`);
      if (domEl) {
        domEl.style.width = '345px';
        domEl.style.maxWidth = '345px';
        domEl.style.height = '';
      }
      if (inpItemWidth) inpItemWidth.value = 345;
      if (inpItemHeight) inpItemHeight.value = '';
      saveToLocalStorageDraft();
      renderInspector();
    });
  }

  if (btnWWide) {
    btnWWide.addEventListener('click', () => {
      const item = getSelectedItem();
      if (!item) return;
      item.width = 710;
      item.maxWidth = 710;
      delete item.height;
      const domEl = document.getElementById(`phys-item-${item.id}`);
      if (domEl) {
        domEl.style.width = '710px';
        domEl.style.maxWidth = '710px';
        domEl.style.height = '';
      }
      if (inpItemWidth) inpItemWidth.value = 710;
      if (inpItemHeight) inpItemHeight.value = '';
      saveToLocalStorageDraft();
      renderInspector();
    });
  }

  if (btnWAuto) {
    btnWAuto.addEventListener('click', () => {
      const item = getSelectedItem();
      if (!item) return;
      delete item.width;
      delete item.height;
      const domEl = document.getElementById(`phys-item-${item.id}`);
      if (domEl) {
        domEl.style.width = '';
        domEl.style.maxWidth = isWideItem(item) ? '710px' : '345px';
        domEl.style.height = '';
      }
      if (inpItemWidth) inpItemWidth.value = '';
      if (inpItemHeight) inpItemHeight.value = '';
      saveToLocalStorageDraft();
      renderInspector();
    });
  }

  // Multi-Selección: Tamaño de letra para todos los textos seleccionados
  const inpMultiSize = document.getElementById('insp-multi-size');
  const inpMultiSizeRange = document.getElementById('insp-multi-size-range');
  const btnMultiInc = document.getElementById('insp-multi-size-inc');
  const btnMultiDec = document.getElementById('insp-multi-size-dec');
  const btnMultiM2 = document.getElementById('insp-multi-step-m2');
  const btnMultiM1 = document.getElementById('insp-multi-step-m1');
  const btnMultiP1 = document.getElementById('insp-multi-step-p1');
  const btnMultiP2 = document.getElementById('insp-multi-step-p2');

  if (inpMultiSize) {
    inpMultiSize.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (val >= 6) {
        if (inpMultiSizeRange) inpMultiSizeRange.value = val;
        updateMultiTextFontSize(val, false);
      }
    });
  }
  if (inpMultiSizeRange) {
    inpMultiSizeRange.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (inpMultiSize) inpMultiSize.value = val;
      updateMultiTextFontSize(val, false);
    });
  }
  if (btnMultiInc) btnMultiInc.addEventListener('click', () => updateMultiTextFontSize(1, true));
  if (btnMultiDec) btnMultiDec.addEventListener('click', () => updateMultiTextFontSize(-1, true));
  if (btnMultiP1) btnMultiP1.addEventListener('click', () => updateMultiTextFontSize(1, true));
  if (btnMultiP2) btnMultiP2.addEventListener('click', () => updateMultiTextFontSize(2, true));
  if (btnMultiM1) btnMultiM1.addEventListener('click', () => updateMultiTextFontSize(-1, true));
  if (btnMultiM2) btnMultiM2.addEventListener('click', () => updateMultiTextFontSize(-2, true));

  // Atajos de teclado para mover o borrar elementos seleccionados
  window.addEventListener('keydown', handleEditorKeyDown);

  // Eventos globales de mouse para drag & drop suave y redimensionamiento
  window.addEventListener('mousemove', handleDragMouseMove);
  window.addEventListener('mouseup', handleDragMouseUp);
  window.addEventListener('touchmove', handleDragTouchMove, { passive: false });
  window.addEventListener('touchend', handleDragMouseUp);
  window.addEventListener('touchcancel', handleDragMouseUp);
}

/**
 * Cambia el tipo de menú entre Desayunos y Comidas
 */
async function switchMenuType(type) {
  if (currentType === type) return;
  currentType = type;
  currentPageIndex = 0;
  selectedItemId = null;
  selectedItemIds.clear();

  document.querySelectorAll('.physical-type-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-type') === type);
  });

  const key = getMenuKey();
  if (!menusData[key]) {
    menusData[key] = await loadSingleMenuData(currentType, currentDesign);
  }
  if (menusData[key]) {
    ensureUniqueItemIds(menusData[key]);
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
  selectedItemIds.clear();

  document.querySelectorAll('.physical-design-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-design') === design);
  });

  const key = getMenuKey();
  if (!menusData[key]) {
    menusData[key] = await loadSingleMenuData(currentType, currentDesign);
  }
  if (menusData[key]) {
    ensureUniqueItemIds(menusData[key]);
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
  const availWidth = viewport.clientWidth - 70;
  const availHeight = viewport.clientHeight - 90;
  
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
    // Ajustar margen inferior dinámico para que el scroll del viewport sea natural a cualquier nivel de zoom
    const scaledHeight = 1056 * zoomScale;
    sheet.style.marginBottom = `${Math.max(40, scaledHeight - 1056 + 50)}px`;
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
  const defaultBg = currentDesign === 'digital' ? '#FDF6EC' : '#CCAD93';

  container.innerHTML = '';
  pages.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = `physical-page-card ${idx === currentPageIndex ? 'active' : ''}`;
    const title = titles[idx] || `Página ${idx + 1}`;
    
    card.innerHTML = `
      <div class="page-card-swatch" style="background-color: ${p.bgColor || defaultBg};"></div>
      <div class="page-card-info">
        <span class="page-card-num">Hoja ${idx + 1}</span>
        <span class="page-card-desc" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      if (currentPageIndex === idx) return;
      currentPageIndex = idx;
      selectedItemId = null;
      selectedItemIds.clear();
      renderPagesList();
      renderCurrentPage();
      renderInspector();
    });

    container.appendChild(card);
  });
}

/**
 * Helper para detectar si un texto es un encabezado o banner ancho
 */
function isWideItem(item) {
  if (!item) return false;
  const id = (item.id || '').toLowerCase();
  // Platillos, notas y títulos de columna NUNCA son wide items
  if (id.startsWith('item_') || id.startsWith('cat_') || item.dishId) return false;
  if (item.maxWidth && item.maxWidth >= 500) return true;
  return (
    id.startsWith('hdr_') ||
    id.startsWith('ftr_') ||
    id.startsWith('trad_hdr_') ||
    id.startsWith('trad_ftr_') ||
    id.includes('brand') ||
    id.includes('badge') ||
    id.includes('sub') ||
    id.includes('type') ||
    id.includes('sep') ||
    id.includes('banner') ||
    id.includes('hist') ||
    id.includes('pil_') ||
    id.includes('inc_') ||
    (item.text && item.text.includes('───')) ||
    (item.text && item.text.includes('═══'))
  );
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

  const defaultBg = currentDesign === 'digital' ? '#FDF6EC' : '#CCAD93';
  sheet.style.backgroundColor = page.bgColor || defaultBg;
  sheet.innerHTML = '';

  // Emblema místico de la Curandera para Portada (Hoja 1)
  if (page.hasEmblem || page.pageNumber === 1 || currentPageIndex === 0) {
    const emblemImg = document.createElement('img');
    emblemImg.src = '../assets/logo/curandera-emblem-lineart.png';
    emblemImg.alt = 'La Curandera';
    emblemImg.className = 'physical-paper-emblem';
    sheet.appendChild(emblemImg);
  }

  // Renderizar cada elemento (texto o imagen) como interactivo posicionable
  (page.items || []).forEach(item => {
    const isSelected = selectedItemIds.has(item.id) || item.id === selectedItemId;
    const isMultiSelected = selectedItemIds.size > 1 && selectedItemIds.has(item.id);

    // IMAGEN de platillo
    if (item.type === 'image') {
      const el = document.createElement('div');
      el.id = `phys-item-${item.id}`;
      el.className = `physical-image-item ${isSelected ? 'is-selected' : ''} ${isMultiSelected ? 'is-multi-selected' : ''}`;
      el.style.left = `${item.x}px`;
      el.style.top = `${item.y}px`;
      el.style.width = `${item.width || 95}px`;
      el.style.height = `${item.height || 65}px`;
      el.style.borderRadius = `${item.borderRadius !== undefined ? item.borderRadius : 8}px`;

      const img = document.createElement('img');
      img.src = item.url;
      img.alt = item.dishName || 'Platillo';
      img.draggable = false;
      img.style.borderRadius = `${item.borderRadius !== undefined ? item.borderRadius : 8}px`;
      img.onerror = () => {
        img.src = '../assets/logo/curandera-emblem-lineart.png';
      };
      el.appendChild(img);

      const badge = document.createElement('div');
      badge.className = 'phys-img-badge';
      badge.textContent = item.dishName || 'Platillo';
      el.appendChild(badge);

      // Barra flotante rápida SOLO si está seleccionado individualmente
      if (isSelected && selectedItemIds.size <= 1) {
        const quickBar = document.createElement('div');
        quickBar.className = 'item-quick-toolbar';
        if (item.y < 38) {
          quickBar.style.top = 'auto';
          quickBar.style.bottom = '-32px';
        }
        if (item.x > 680) {
          quickBar.style.left = 'auto';
          quickBar.style.right = '0px';
        }
        quickBar.addEventListener('mousedown', (e) => e.stopPropagation());
        quickBar.addEventListener('touchstart', (e) => e.stopPropagation());
        quickBar.innerHTML = `
          <button class="btn-item-quick dup" title="Duplicar imagen">📋 Copiar</button>
          <button class="btn-item-quick delete" title="Eliminar imagen">🗑️ Borrar</button>
        `;

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

      // Handles de redimensionamiento (Horizontal, Vertical, Diagonal)
      if (isSelected && selectedItemIds.size <= 1) {
        attachResizeHandles(el, item);
      }

      el.addEventListener('mousedown', (e) => startDragItem(e, item));
      el.addEventListener('touchstart', (e) => startDragItemTouch(e, item), { passive: false });

      sheet.appendChild(el);
      return;
    }

    // TEXTO
    const el = document.createElement('div');
    el.id = `phys-item-${item.id}`;
    const wideClass = isWideItem(item) ? 'is-wide' : '';
    el.className = `physical-text-item ${isSelected ? 'is-selected' : ''} ${isMultiSelected ? 'is-multi-selected' : ''} ${wideClass}`;
    el.style.left = `${item.x}px`;
    el.style.top = `${item.y}px`;
    el.style.fontSize = `${item.fontSize}px`;
    el.style.fontFamily = getCssFontFamily(item.fontFamily);
    el.style.color = item.color || '#000000';
    el.style.fontWeight = item.bold ? '800' : '400';
    const isWide = isWideItem(item);
    const itemMaxW = item.width ? Math.max(item.width, item.maxWidth || item.width) : (item.maxWidth || (isWide ? 710 : 345));
    el.style.maxWidth = `${itemMaxW}px`;
    if (item.width) {
      el.style.width = `${item.width}px`;
    }
    // Si algún item de texto tiene altura artificial inflada o corrupta (> 180px), la limpiamos para que se ajuste naturalmente a su contenido
    if (item.height && item.height > 180) {
      delete item.height;
    }
    if (item.height) {
      el.style.height = `${item.height}px`;
    }
    el.textContent = item.text;

    // Barra flotante rápida SOLO si está seleccionado individualmente
    if (isSelected && selectedItemIds.size <= 1) {
      const quickBar = document.createElement('div');
      quickBar.className = 'item-quick-toolbar';
      if (item.y < 38) {
        quickBar.style.top = 'auto';
        quickBar.style.bottom = '-32px';
      }
      if (item.x > 680) {
        quickBar.style.left = 'auto';
        quickBar.style.right = '0px';
      }
      quickBar.addEventListener('mousedown', (e) => e.stopPropagation());
      quickBar.addEventListener('touchstart', (e) => e.stopPropagation());
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
      attachResizeHandles(el, item);
    }

    el.addEventListener('mousedown', (e) => startDragItem(e, item));
    el.addEventListener('touchstart', (e) => startDragItemTouch(e, item), { passive: false });

    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      focusInspectorTextarea();
    });

    sheet.appendChild(el);
  });

  // Evento Mousedown en el lienzo para selección por marco (Marquee Lasso)
  sheet.onmousedown = handleSheetMouseDown;
}

function wrapText(text, maxChars = 38) {
  if (!text || typeof text !== 'string') return '';
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (clean.length <= maxChars && !clean.includes('\n')) return clean;

  const paragraphs = clean.split('\n');
  const result = [];

  paragraphs.forEach(para => {
    const words = para.trim().split(/\s+/);
    if (words.length === 0 || words[0] === '') return;
    let currentLine = '';

    words.forEach(word => {
      if (!currentLine) {
        currentLine = word;
      } else if ((currentLine + ' ' + word).length <= maxChars) {
        currentLine += ' ' + word;
      } else {
        result.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) result.push(currentLine);
  });

  return result.join('\n');
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
 * Selección por Marco (Lasso Marquee) sobre el fondo de la hoja
 */
function handleSheetMouseDown(e) {
  if (e.button !== 0) return;
  const sheet = document.getElementById('physical-paper-sheet');
  if (!sheet) return;

  // Solo iniciar marco si se hizo clic en el lienzo vacío o el logo de fondo
  if (e.target !== sheet && !e.target.classList.contains('physical-paper-emblem')) {
    return;
  }

  const isMultiModifier = e.shiftKey || e.ctrlKey || e.metaKey;
  if (!isMultiModifier) {
    selectedItemIds.clear();
    selectedItemId = null;
    renderCurrentPage();
    renderInspector();
  }

  const sheetRect = sheet.getBoundingClientRect();
  marqueeStartX = (e.clientX - sheetRect.left) / zoomScale;
  marqueeStartY = (e.clientY - sheetRect.top) / zoomScale;
  isMarqueeSelecting = true;

  if (!marqueeEl) {
    marqueeEl = document.createElement('div');
    marqueeEl.className = 'selection-marquee';
    sheet.appendChild(marqueeEl);
  }
  marqueeEl.style.display = 'block';
  marqueeEl.style.left = `${marqueeStartX}px`;
  marqueeEl.style.top = `${marqueeStartY}px`;
  marqueeEl.style.width = '0px';
  marqueeEl.style.height = '0px';

  // Pre-calcular cajas delimitadoras para rendimiento óptimo de 60 FPS sin reflows continuos
  marqueeCachedBoxes = [];
  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (page && page.items) {
    page.items.forEach(it => {
      const domEl = document.getElementById(`phys-item-${it.id}`);
      const w = it.width || (domEl ? domEl.offsetWidth : 120);
      const h = it.height || (domEl ? domEl.offsetHeight : 24);
      marqueeCachedBoxes.push({
        id: it.id,
        domEl,
        left: it.x,
        top: it.y,
        right: it.x + w,
        bottom: it.y + h
      });
    });
  }
}

function handleMarqueeMouseMove(e) {
  if (!isMarqueeSelecting || !marqueeEl) return;
  const sheet = document.getElementById('physical-paper-sheet');
  if (!sheet) return;

  const sheetRect = sheet.getBoundingClientRect();
  const currentX = (e.clientX - sheetRect.left) / zoomScale;
  const currentY = (e.clientY - sheetRect.top) / zoomScale;

  const left = Math.min(marqueeStartX, currentX);
  const top = Math.min(marqueeStartY, currentY);
  const width = Math.abs(currentX - marqueeStartX);
  const height = Math.abs(currentY - marqueeStartY);

  marqueeEl.style.left = `${left}px`;
  marqueeEl.style.top = `${top}px`;
  marqueeEl.style.width = `${width}px`;
  marqueeEl.style.height = `${height}px`;

  const right = left + width;
  const bottom = top + height;

  marqueeCachedBoxes.forEach(box => {
    const intersects = !(box.left > right || box.right < left || box.top > bottom || box.bottom < top);
    if (intersects) {
      selectedItemIds.add(box.id);
      if (box.domEl) {
        box.domEl.classList.add('is-selected');
        box.domEl.classList.add('is-multi-selected');
      }
    }
  });

  if (selectedItemIds.size === 1) {
    selectedItemId = [...selectedItemIds][0];
  } else {
    selectedItemId = null;
  }
}

/**
 * Adjunta los 8 controles (handles) de redimensionamiento:
 * - 4 esquinas (diagonal)
 * - 2 laterales (horizontal: izquierda y derecha)
 * - 2 superior/inferior (vertical: arriba y abajo)
 */
function attachResizeHandles(el, item) {
  const isImg = item.type === 'image';
  const handles = isImg ? [
    { type: 'nw', title: 'Redimensionar diagonalmente (esquina superior izquierda)' },
    { type: 'n',  title: 'Redimensionar verticalmente (arriba)' },
    { type: 'ne', title: 'Redimensionar diagonalmente (esquina superior derecha)' },
    { type: 'e',  title: 'Redimensionar horizontalmente (derecha)' },
    { type: 'se', title: 'Redimensionar diagonalmente (esquina inferior derecha)' },
    { type: 's',  title: 'Redimensionar verticalmente (abajo)' },
    { type: 'sw', title: 'Redimensionar diagonalmente (esquina inferior izquierda)' },
    { type: 'w',  title: 'Redimensionar horizontalmente (izquierda)' }
  ] : [
    { type: 'nw', title: 'Ajustar ancho (esquina superior izquierda)' },
    { type: 'ne', title: 'Ajustar ancho (esquina superior derecha)' },
    { type: 'e',  title: 'Ajustar ancho (derecha)' },
    { type: 'se', title: 'Ajustar ancho (esquina inferior derecha)' },
    { type: 'sw', title: 'Ajustar ancho (esquina inferior izquierda)' },
    { type: 'w',  title: 'Ajustar ancho (izquierda)' }
  ];

  handles.forEach(h => {
    const handleEl = document.createElement('div');
    handleEl.className = `phys-resize-handle handle-${h.type}`;
    handleEl.setAttribute('data-handle', h.type);
    handleEl.setAttribute('title', h.title);
    handleEl.addEventListener('mousedown', (e) => startResizeItem(e, item, h.type));
    handleEl.addEventListener('touchstart', (e) => startResizeItemTouch(e, item, h.type), { passive: false });
    el.appendChild(handleEl);
  });
}

function startResizeItem(e, item, handleType) {
  if (e.button !== 0) return;
  e.stopPropagation();
  e.preventDefault();

  isResizing = true;
  isDragging = false;
  draggedElementsCache = [];
  resizeHandleType = handleType;
  resizeTargetItem = item;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;

  const domEl = document.getElementById(`phys-item-${item.id}`);
  resizeInitialWidth = item.width || (domEl ? domEl.offsetWidth : 120);
  resizeInitialHeight = item.height || (domEl ? domEl.offsetHeight : 24);
  resizeInitialX = item.x || 0;
  resizeInitialY = item.y || 0;

  if (domEl) {
    domEl.classList.add('is-resizing');
    if (!resizeBadgeEl) {
      resizeBadgeEl = document.createElement('div');
      resizeBadgeEl.className = 'phys-resize-badge';
    }
    const currentH = item.type === 'image' ? resizeInitialHeight : (domEl.offsetHeight || resizeInitialHeight);
    resizeBadgeEl.textContent = `${Math.round(resizeInitialWidth)} × ${Math.round(currentH)} px`;
    domEl.appendChild(resizeBadgeEl);
  }
}

function startResizeItemTouch(e, item, handleType) {
  if (e.touches.length !== 1) return;
  e.stopPropagation();
  e.preventDefault();

  isResizing = true;
  isDragging = false;
  draggedElementsCache = [];
  resizeHandleType = handleType;
  resizeTargetItem = item;
  resizeStartX = e.touches[0].clientX;
  resizeStartY = e.touches[0].clientY;

  const domEl = document.getElementById(`phys-item-${item.id}`);
  resizeInitialWidth = item.width || (domEl ? domEl.offsetWidth : 120);
  resizeInitialHeight = item.height || (domEl ? domEl.offsetHeight : 24);
  resizeInitialX = item.x || 0;
  resizeInitialY = item.y || 0;

  if (domEl) {
    domEl.classList.add('is-resizing');
    if (!resizeBadgeEl) {
      resizeBadgeEl = document.createElement('div');
      resizeBadgeEl.className = 'phys-resize-badge';
    }
    const currentH = item.type === 'image' ? resizeInitialHeight : (domEl.offsetHeight || resizeInitialHeight);
    resizeBadgeEl.textContent = `${Math.round(resizeInitialWidth)} × ${Math.round(currentH)} px`;
    domEl.appendChild(resizeBadgeEl);
  }
}

function handleResizeMouseMove(e) {
  if (!isResizing || !resizeTargetItem) return;
  e.preventDefault();

  const deltaX = (e.clientX - resizeStartX) / zoomScale;
  const deltaY = (e.clientY - resizeStartY) / zoomScale;
  applyResizeDelta(deltaX, deltaY);
}

function handleResizeTouchMove(e) {
  if (!isResizing || !resizeTargetItem || e.touches.length !== 1) return;
  e.preventDefault();

  const deltaX = (e.touches[0].clientX - resizeStartX) / zoomScale;
  const deltaY = (e.touches[0].clientY - resizeStartY) / zoomScale;
  applyResizeDelta(deltaX, deltaY);
}

function applyResizeDelta(deltaX, deltaY) {
  const item = resizeTargetItem;
  if (!item) return;
  const domEl = document.getElementById(`phys-item-${item.id}`);
  if (!domEl) return;

  const isImg = item.type === 'image';
  const sheetWidth = 816;
  const sheetHeight = 1056;

  // ==========================================
  // CASO 1: REDIMENSIONAMIENTO DE IMÁGENES
  // ==========================================
  if (isImg) {
    const minWidth = 30;
    const minHeight = 20;
    let newWidth = resizeInitialWidth;
    let newHeight = resizeInitialHeight;
    let newX = resizeInitialX;
    let newY = resizeInitialY;
    const hType = resizeHandleType || '';

    if (hType.includes('e')) {
      newWidth = Math.max(minWidth, Math.min(sheetWidth - resizeInitialX, Math.round(resizeInitialWidth + deltaX)));
      newX = resizeInitialX;
    } else if (hType.includes('w')) {
      const initialRight = resizeInitialX + resizeInitialWidth;
      newX = Math.max(0, Math.min(initialRight - minWidth, Math.round(resizeInitialX + deltaX)));
      newWidth = initialRight - newX;
    }

    if (hType.includes('s')) {
      newHeight = Math.max(minHeight, Math.min(sheetHeight - resizeInitialY, Math.round(resizeInitialHeight + deltaY)));
      newY = resizeInitialY;
    } else if (hType.includes('n')) {
      const initialBottom = resizeInitialY + resizeInitialHeight;
      newY = Math.max(0, Math.min(initialBottom - minHeight, Math.round(resizeInitialY + deltaY)));
      newHeight = initialBottom - newY;
    }

    item.width = newWidth;
    item.height = newHeight;
    item.x = newX;
    item.y = newY;

    domEl.style.left = `${newX}px`;
    domEl.style.top = `${newY}px`;
    domEl.style.width = `${newWidth}px`;
    domEl.style.height = `${newHeight}px`;

    if (resizeBadgeEl) {
      resizeBadgeEl.textContent = `${newWidth} × ${newHeight} px`;
    }

    const inpImgW = document.getElementById('insp-img-width');
    const inpImgH = document.getElementById('insp-img-height');
    const inpX = document.getElementById('insp-item-x');
    const inpY = document.getElementById('insp-item-y');
    if (inpImgW) inpImgW.value = newWidth;
    if (inpImgH) inpImgH.value = newHeight;
    if (inpX) inpX.value = newX;
    if (inpY) inpY.value = newY;
    return;
  }

  // ==========================================
  // CASO 2: REDIMENSIONAMIENTO DE CUADROS DE TEXTO
  // ==========================================
  const minWidth = 40;
  const hType = resizeHandleType || '';
  let newWidth = resizeInitialWidth;
  let newX = resizeInitialX;
  const newY = resizeInitialY; // La coordenada Y NUNCA cambia al redimensionar un cuadro de texto (se queda anclada)

  // Arrastre por el lado derecho (e) o esquinas derechas (se, ne)
  if (hType.includes('e')) {
    // Si el usuario arrastró esquina 'se', permitimos que tanto arrastre horizontal como vertical agranden el ancho
    const effectiveDelta = (hType === 'se' && Math.abs(deltaY) > Math.abs(deltaX)) ? deltaY : deltaX;
    newWidth = Math.max(minWidth, Math.min(sheetWidth - resizeInitialX, Math.round(resizeInitialWidth + effectiveDelta)));
    newX = resizeInitialX; // Fijo a la izquierda
  }
  // Arrastre por el lado izquierdo (w) o esquinas izquierdas (sw, nw)
  else if (hType.includes('w')) {
    const initialRight = resizeInitialX + resizeInitialWidth;
    const effectiveDelta = (hType === 'sw' && Math.abs(deltaY) > Math.abs(deltaX)) ? -deltaY : deltaX;
    newX = Math.max(0, Math.min(initialRight - minWidth, Math.round(resizeInitialX + effectiveDelta)));
    newWidth = initialRight - newX;
  }

  // Actualizar modelo del elemento
  item.width = newWidth;
  item.maxWidth = newWidth;
  item.x = newX;
  item.y = newY;
  delete item.height; // Los cuadros de texto tienen altura natural auto-ajustable al contenido

  // Actualizar DOM en tiempo real
  domEl.style.left = `${newX}px`;
  domEl.style.top = `${newY}px`;
  domEl.style.width = `${newWidth}px`;
  domEl.style.maxWidth = `${newWidth}px`;
  domEl.style.height = ''; // Auto-height para que envuelva exactamente las líneas de texto

  // Medir altura natural del texto con el nuevo ancho
  const naturalHeight = Math.max(16, Math.ceil(domEl.offsetHeight || domEl.scrollHeight));

  if (resizeBadgeEl) {
    resizeBadgeEl.textContent = `${newWidth} × ${naturalHeight} px`;
  }

  // Actualizar inspectores en tiempo real
  const inpX = document.getElementById('insp-item-x');
  const inpY = document.getElementById('insp-item-y');
  const inpW = document.getElementById('insp-item-width');
  const inpH = document.getElementById('insp-item-height');
  if (inpX) inpX.value = newX;
  if (inpY) inpY.value = newY;
  if (inpW) inpW.value = newWidth;
  if (inpH) inpH.placeholder = `Auto (${naturalHeight}px)`;
}

/**
 * Drag & Drop individual o grupal de elementos sobre la hoja de papel
 */
function startDragItem(e, item) {
  if (e.button !== 0) return; // solo botón izquierdo
  if (isResizing) return;
  e.stopPropagation();

  const isMultiModifier = e.shiftKey || e.ctrlKey || e.metaKey;
  let selectionChanged = false;

  if (isMultiModifier) {
    selectionChanged = true;
    if (selectedItemIds.has(item.id)) {
      selectedItemIds.delete(item.id);
      if (selectedItemId === item.id) {
        selectedItemId = selectedItemIds.size === 1 ? [...selectedItemIds][0] : null;
      }
      renderCurrentPage();
      renderInspector();
      return;
    } else {
      selectedItemIds.add(item.id);
      selectedItemId = item.id;
    }
  } else {
    // Si no se presiona Shift/Ctrl y el elemento no formaba parte del grupo, seleccionarlo únicamente
    if (!selectedItemIds.has(item.id)) {
      selectionChanged = true;
      selectedItemIds.clear();
      selectedItemIds.add(item.id);
      selectedItemId = item.id;
    } else {
      selectedItemId = item.id;
    }
  }

  isDragging = true;
  dragHasMoved = false;
  dragStartX = e.clientX;
  dragStartY = e.clientY;

  // Registrar posiciones iniciales de todos los elementos seleccionados para arrastrar todo el grupo junto
  dragInitialPositions.clear();
  draggedElementsCache = [];
  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (page && page.items) {
    page.items.forEach(it => {
      if (selectedItemIds.has(it.id)) {
        dragInitialPositions.set(it.id, { x: it.x, y: it.y });
        const domEl = document.getElementById(`phys-item-${it.id}`);
        if (domEl) {
          draggedElementsCache.push({
            id: it.id,
            domEl,
            item: it,
            initX: it.x,
            initY: it.y
          });
        }
      }
    });
  }

  dragInitialItemX = item.x;
  dragInitialItemY = item.y;

  // Solo re-renderizar si la selección cambió de elemento para evitar destruir el DOM bajo el cursor
  if (selectionChanged) {
    renderCurrentPage();
    draggedElementsCache = [];
    if (page && page.items) {
      page.items.forEach(it => {
        if (selectedItemIds.has(it.id)) {
          const domEl = document.getElementById(`phys-item-${it.id}`);
          const initPos = dragInitialPositions.get(it.id) || { x: it.x, y: it.y };
          if (domEl) {
            draggedElementsCache.push({
              id: it.id,
              domEl,
              item: it,
              initX: initPos.x,
              initY: initPos.y
            });
          }
        }
      });
    }
  }
  renderInspector();
}

function startDragItemTouch(e, item) {
  if (e.touches.length !== 1) return;
  if (isResizing) return;
  e.stopPropagation();

  let selectionChanged = false;
  if (!selectedItemIds.has(item.id)) {
    selectionChanged = true;
    selectedItemIds.clear();
    selectedItemIds.add(item.id);
    selectedItemId = item.id;
  }

  isDragging = true;
  dragHasMoved = false;
  dragStartX = e.touches[0].clientX;
  dragStartY = e.touches[0].clientY;

  dragInitialPositions.clear();
  draggedElementsCache = [];
  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (page && page.items) {
    page.items.forEach(it => {
      if (selectedItemIds.has(it.id)) {
        dragInitialPositions.set(it.id, { x: it.x, y: it.y });
        const domEl = document.getElementById(`phys-item-${it.id}`);
        if (domEl) {
          draggedElementsCache.push({
            id: it.id,
            domEl,
            item: it,
            initX: it.x,
            initY: it.y
          });
        }
      }
    });
  }

  dragInitialItemX = item.x;
  dragInitialItemY = item.y;

  if (selectionChanged) {
    renderCurrentPage();
    draggedElementsCache = [];
    if (page && page.items) {
      page.items.forEach(it => {
        if (selectedItemIds.has(it.id)) {
          const domEl = document.getElementById(`phys-item-${it.id}`);
          const initPos = dragInitialPositions.get(it.id) || { x: it.x, y: it.y };
          if (domEl) {
            draggedElementsCache.push({
              id: it.id,
              domEl,
              item: it,
              initX: initPos.x,
              initY: initPos.y
            });
          }
        }
      });
    }
  }
  renderInspector();
}

function handleDragMouseMove(e) {
  if (isMarqueeSelecting) {
    handleMarqueeMouseMove(e);
    return;
  }

  if (isResizing) {
    handleResizeMouseMove(e);
    return;
  }

  if (!isDragging || selectedItemIds.size === 0 || draggedElementsCache.length === 0) return;
  e.preventDefault();

  const deltaX = (e.clientX - dragStartX) / zoomScale;
  const deltaY = (e.clientY - dragStartY) / zoomScale;

  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
    dragHasMoved = true;
  }

  if (!dragRafId) {
    dragRafId = requestAnimationFrame(() => {
      dragRafId = null;
      draggedElementsCache.forEach(entry => {
        const newX = Math.max(0, Math.min(816 - 20, Math.round(entry.initX + deltaX)));
        const newY = Math.max(0, Math.min(1056 - 20, Math.round(entry.initY + deltaY)));
        entry.item.x = newX;
        entry.item.y = newY;
        entry.domEl.style.left = `${newX}px`;
        entry.domEl.style.top = `${newY}px`;
      });

      if (draggedElementsCache.length === 1) {
        const inpX = document.getElementById('insp-item-x');
        const inpY = document.getElementById('insp-item-y');
        if (inpX) inpX.value = draggedElementsCache[0].item.x;
        if (inpY) inpY.value = draggedElementsCache[0].item.y;
      }
    });
  }
}

function handleDragTouchMove(e) {
  if (isResizing) {
    handleResizeTouchMove(e);
    return;
  }

  if (!isDragging || selectedItemIds.size === 0 || e.touches.length !== 1 || draggedElementsCache.length === 0) return;
  e.preventDefault();

  const deltaX = (e.touches[0].clientX - dragStartX) / zoomScale;
  const deltaY = (e.touches[0].clientY - dragStartY) / zoomScale;

  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
    dragHasMoved = true;
  }

  if (!dragRafId) {
    dragRafId = requestAnimationFrame(() => {
      dragRafId = null;
      draggedElementsCache.forEach(entry => {
        const newX = Math.max(0, Math.min(816 - 20, Math.round(entry.initX + deltaX)));
        const newY = Math.max(0, Math.min(1056 - 20, Math.round(entry.initY + deltaY)));
        entry.item.x = newX;
        entry.item.y = newY;
        entry.domEl.style.left = `${newX}px`;
        entry.domEl.style.top = `${newY}px`;
      });

      if (draggedElementsCache.length === 1) {
        const inpX = document.getElementById('insp-item-x');
        const inpY = document.getElementById('insp-item-y');
        if (inpX) inpX.value = draggedElementsCache[0].item.x;
        if (inpY) inpY.value = draggedElementsCache[0].item.y;
      }
    });
  }
}

function handleDragMouseUp() {
  if (dragRafId) {
    cancelAnimationFrame(dragRafId);
    dragRafId = null;
  }

  if (isMarqueeSelecting) {
    isMarqueeSelecting = false;
    marqueeCachedBoxes = [];
    if (marqueeEl) {
      marqueeEl.style.display = 'none';
    }
    renderCurrentPage();
    renderInspector();
  }

  if (isResizing) {
    isResizing = false;
    if (resizeTargetItem) {
      const domEl = document.getElementById(`phys-item-${resizeTargetItem.id}`);
      if (domEl) {
        domEl.classList.remove('is-resizing');
        if (resizeTargetItem.type !== 'image') {
          delete resizeTargetItem.height;
          domEl.style.height = '';
        }
      }
    }
    if (resizeBadgeEl && resizeBadgeEl.parentNode) {
      resizeBadgeEl.parentNode.removeChild(resizeBadgeEl);
    }
    resizeTargetItem = null;
    saveToLocalStorageDraft();
    renderInspector();
  }

  if (isDragging) {
    isDragging = false;
    draggedElementsCache = [];
    if (!dragHasMoved && selectedItemIds.size > 1 && selectedItemId) {
      selectedItemIds.clear();
      selectedItemIds.add(selectedItemId);
      renderCurrentPage();
      renderInspector();
    }
    dragHasMoved = false;
    saveToLocalStorageDraft();
  }
}

/**
 * Atajos de teclado para mover, copiar, pegar o borrar elementos seleccionados
 */
function handleEditorKeyDown(e) {
  // Ignorar si estamos escribiendo en campos de formulario o editables
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  if (document.activeElement?.isContentEditable) return;

  const hasSelection = selectedItemIds.size > 0 || Boolean(selectedItemId);

  // Ctrl+C / Cmd+C: Copiar
  if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
    if (hasSelection) {
      e.preventDefault();
      copySelectedItems();
      return;
    }
  }

  // Ctrl+V / Cmd+V: Pegar
  if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
    e.preventDefault();
    pasteClipboardItems();
    return;
  }

  // Ctrl+A / Cmd+A: Seleccionar todo
  if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
    e.preventDefault();
    selectAllCurrentPageItems();
    return;
  }

  // Escape: Deseleccionar
  if (e.key === 'Escape') {
    clearSelection();
    return;
  }

  if (!hasSelection) return;

  const step = e.shiftKey ? 10 : 1;
  let handled = false;

  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page || !page.items) return;

  const activeItems = page.items.filter(it => selectedItemIds.has(it.id) || it.id === selectedItemId);

  if (e.key === 'ArrowLeft') {
    activeItems.forEach(it => { it.x = Math.max(0, it.x - step); });
    handled = true;
  } else if (e.key === 'ArrowRight') {
    activeItems.forEach(it => { it.x = Math.min(816 - 20, it.x + step); });
    handled = true;
  } else if (e.key === 'ArrowUp') {
    activeItems.forEach(it => { it.y = Math.max(0, it.y - step); });
    handled = true;
  } else if (e.key === 'ArrowDown') {
    activeItems.forEach(it => { it.y = Math.min(1056 - 20, it.y + step); });
    handled = true;
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    deleteSelectedItems();
    e.preventDefault();
    return;
  }

  if (handled) {
    e.preventDefault();
    activeItems.forEach(it => {
      const domEl = document.getElementById(`phys-item-${it.id}`);
      if (domEl) {
        domEl.style.left = `${it.x}px`;
        domEl.style.top = `${it.y}px`;
      }
    });
    if (activeItems.length === 1) {
      const inpX = document.getElementById('insp-item-x');
      const inpY = document.getElementById('insp-item-y');
      if (inpX) inpX.value = activeItems[0].x;
      if (inpY) inpY.value = activeItems[0].y;
    }
    saveToLocalStorageDraft();
  }
}

/**
 * Inspector Lateral de Propiedades
 */
function renderInspector() {
  const panelItem = document.getElementById('inspector-item-controls');
  const panelPage = document.getElementById('inspector-page-controls');
  const panelMulti = document.getElementById('inspector-multi-controls');

  // Caso: Múltiples elementos seleccionados
  if (selectedItemIds.size > 1) {
    if (panelItem) panelItem.style.display = 'none';
    if (panelPage) panelPage.style.display = 'none';
    if (panelMulti) {
      panelMulti.style.display = 'flex';
      const countEl = document.getElementById('insp-multi-count');
      if (countEl) countEl.textContent = `${selectedItemIds.size}`;

      const pages = menusData[getMenuKey()] || [];
      const page = pages[currentPageIndex];
      const textItems = (page?.items || []).filter(it => selectedItemIds.has(it.id) && it.type !== 'image');

      const multiTextBox = document.getElementById('insp-multi-text-box');
      const textCountEl = document.getElementById('insp-multi-text-count');
      const inpMultiSize = document.getElementById('insp-multi-size');
      const inpMultiSizeRange = document.getElementById('insp-multi-size-range');

      if (textCountEl) textCountEl.textContent = `${textItems.length} textos`;

      if (multiTextBox) {
        if (textItems.length === 0) {
          multiTextBox.style.display = 'none';
        } else {
          multiTextBox.style.display = 'flex';
          const firstSize = textItems[0].fontSize;
          const allSame = textItems.every(it => it.fontSize === firstSize);

          if (allSame && firstSize) {
            if (inpMultiSize) inpMultiSize.value = firstSize;
            if (inpMultiSizeRange) inpMultiSizeRange.value = firstSize;
          } else {
            if (inpMultiSize) {
              inpMultiSize.value = '';
              inpMultiSize.placeholder = 'Varía';
            }
            const avg = Math.round(textItems.reduce((acc, it) => acc + (it.fontSize || 12), 0) / textItems.length);
            if (inpMultiSizeRange) inpMultiSizeRange.value = avg;
          }
        }
      }
    }
    return;
  }

  if (panelMulti) panelMulti.style.display = 'none';

  const item = getSelectedItem();

  if (item) {
    if (panelItem) panelItem.style.display = 'flex';
    if (panelPage) panelPage.style.display = 'none';

    const textFields = document.getElementById('inspector-text-fields');
    const imageFields = document.getElementById('inspector-image-fields');
    const titleSpan = panelItem?.querySelector('.inspector-section-title span');

    const inpX = document.getElementById('insp-item-x');
    const inpY = document.getElementById('insp-item-y');
    if (inpX) inpX.value = item.x;
    if (inpY) inpY.value = item.y;

    if (item.type === 'image') {
      if (textFields) textFields.style.display = 'none';
      if (imageFields) imageFields.style.display = 'flex';
      if (titleSpan) titleSpan.textContent = 'Propiedades de Imagen';

      const previewImg = document.getElementById('insp-img-preview');
      const imgName = document.getElementById('insp-img-name');
      const inpWidth = document.getElementById('insp-img-width');
      const inpHeight = document.getElementById('insp-img-height');
      const inpRadius = document.getElementById('insp-img-radius');

      if (previewImg) previewImg.src = item.url || '';
      if (imgName) imgName.textContent = item.dishName || 'Platillo';
      if (inpWidth) inpWidth.value = item.width || 95;
      if (inpHeight) inpHeight.value = item.height || 65;
      if (inpRadius) inpRadius.value = item.borderRadius !== undefined ? item.borderRadius : 8;
    } else {
      if (textFields) textFields.style.display = 'flex';
      if (imageFields) imageFields.style.display = 'none';
      if (titleSpan) titleSpan.textContent = 'Editar Texto';

      const inpText = document.getElementById('insp-item-text');
      const inpFont = document.getElementById('insp-item-font');
      const inpSize = document.getElementById('insp-item-size');
      const inpSizeRange = document.getElementById('insp-item-size-range');
      const inpBold = document.getElementById('insp-item-bold');
      const inpColor = document.getElementById('insp-item-color');
      const inpItemWidth = document.getElementById('insp-item-width');
      const inpItemHeight = document.getElementById('insp-item-height');

      if (inpText) inpText.value = item.text;
      if (inpFont) {
        const f = (item.fontFamily || '').toLowerCase();
        if (f.includes('hansief')) inpFont.value = 'Hansief';
        else if (f.includes('sourcecode') || f.includes('mono')) inpFont.value = 'SourceCodeVariable-Roman';
        else if (f.includes('montserrat')) inpFont.value = 'Montserrat';
        else if (f.includes('caveat')) inpFont.value = 'Caveat Brush';
        else inpFont.value = 'Gotham-Bold';
      }
      if (inpSize) inpSize.value = item.fontSize;
      if (inpSizeRange) inpSizeRange.value = item.fontSize;
      if (inpBold) inpBold.classList.toggle('active', Boolean(item.bold));
      if (inpColor) inpColor.value = item.color || '#000000';
      if (inpItemWidth) {
        inpItemWidth.value = item.width || '';
        inpItemWidth.placeholder = isWideItem(item) ? '710 (Ancho)' : '345 (Columna)';
      }
      if (inpItemHeight) {
        const domEl = document.getElementById(`phys-item-${item.id}`);
        const natH = domEl ? domEl.offsetHeight : 24;
        inpItemHeight.value = item.height || '';
        inpItemHeight.placeholder = `Auto (${natH}px)`;
      }

      const btnWCol = document.getElementById('btn-w-col');
      const btnWWide = document.getElementById('btn-w-wide');
      const btnWAuto = document.getElementById('btn-w-auto');
      if (btnWCol) btnWCol.classList.toggle('active', item.width === 345);
      if (btnWWide) btnWWide.classList.toggle('active', item.width === 710);
      if (btnWAuto) btnWAuto.classList.toggle('active', !item.width);

      renderColorPresets('item-color-presets', item.color, (hex) => {
        if (inpColor) inpColor.value = hex;
        updateSelectedItemProp('color', hex);
      });
    }
  } else {
    if (panelItem) panelItem.style.display = 'none';
    if (panelPage) panelPage.style.display = 'flex';

    const pages = menusData[getMenuKey()] || [];
    const page = pages[currentPageIndex];
    const defaultBg = currentDesign === 'digital' ? '#FDF6EC' : '#CCAD93';
    const inpPageBg = document.getElementById('insp-page-bg');
    if (inpPageBg && page) inpPageBg.value = page.bgColor || defaultBg;

    renderColorPresets('page-color-presets', page?.bgColor || defaultBg, (hex) => {
      if (inpPageBg) inpPageBg.value = hex;
      updateCurrentPageBg(hex);
    });

    // Lista de textos en la página actual para selección rápida
    renderCurrentPageTextsList();
  }
}

/**
 * Modifica el tamaño de letra de todos los textos seleccionados en selección múltiple
 * @param {number} value - Tamaño absoluto o delta de cambio (+1, -1, +2, -2)
 * @param {boolean} isDelta - Si es verdadero, suma/resta al tamaño individual de cada texto
 */
function updateMultiTextFontSize(value, isDelta = false) {
  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page || !page.items) return;

  const textItems = page.items.filter(it => selectedItemIds.has(it.id) && it.type !== 'image');
  if (textItems.length === 0) return;

  textItems.forEach(it => {
    if (isDelta) {
      const current = it.fontSize || 12;
      it.fontSize = Math.max(6, Math.min(120, Math.round((current + Number(value)) * 2) / 2));
    } else {
      it.fontSize = Math.max(6, Math.min(120, Number(value)));
    }

    const domEl = document.getElementById(`phys-item-${it.id}`);
    if (domEl) {
      domEl.style.fontSize = `${it.fontSize}px`;
      if (!it.height) domEl.style.height = '';
    }
  });

  // Actualizar indicadores del inspector
  const inpMultiSize = document.getElementById('insp-multi-size');
  const inpMultiSizeRange = document.getElementById('insp-multi-size-range');
  const firstSize = textItems[0].fontSize;
  const allSame = textItems.every(it => it.fontSize === firstSize);

  if (allSame) {
    if (inpMultiSize) inpMultiSize.value = firstSize;
    if (inpMultiSizeRange) inpMultiSizeRange.value = firstSize;
  } else {
    if (inpMultiSize) {
      inpMultiSize.value = '';
      inpMultiSize.placeholder = 'Varía';
    }
    const avg = Math.round(textItems.reduce((acc, it) => acc + (it.fontSize || 12), 0) / textItems.length);
    if (inpMultiSizeRange) inpMultiSizeRange.value = avg;
  }

  saveToLocalStorageDraft();
}

function renderColorPresets(containerId, activeHex, onClick) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  COLOR_PRESETS.forEach(cp => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isSelected = activeHex && activeHex.toLowerCase() === cp.hex.toLowerCase();
    btn.className = `color-swatch-btn ${isSelected ? 'selected' : ''}`;
    btn.style.backgroundColor = cp.hex;
    btn.title = `${cp.name} (${cp.hex})`;
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
    container.innerHTML = '<span style="font-size:0.75rem; color:#888;">No hay elementos en esta hoja.</span>';
    return;
  }

  container.innerHTML = '';
  page.items.forEach((it) => {
    const isThisSelected = selectedItemIds.has(it.id) || selectedItemId === it.id;
    const row = document.createElement('div');
    row.style.cssText = `
      padding: 0.4rem 0.5rem;
      background: ${isThisSelected ? 'rgba(201,78,143,0.25)' : 'rgba(255,255,255,0.05)'};
      border: 1px solid ${isThisSelected ? 'var(--lc-rosa)' : 'transparent'};
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-bottom: 0.3rem;
      transition: all 0.15s ease;
    `;
    if (it.type === 'image') {
      row.innerHTML = `<span style="color:var(--lc-rosa); font-weight:700;">🖼️ Imagen:</span> ${escapeHtml(it.dishName || 'Platillo')}`;
    } else {
      row.textContent = `📝 ${(it.text || '').replace(/\n/g, ' ')}`;
    }
    row.addEventListener('click', () => {
      selectedItemId = it.id;
      selectedItemIds.clear();
      selectedItemIds.add(it.id);
      renderCurrentPage();
      renderInspector();
      if (it.type !== 'image') {
        focusInspectorTextarea();
      }
    });
    container.appendChild(row);
  });
}

function focusInspectorTextarea() {
  const ta = document.getElementById('insp-item-text');
  if (ta) {
    ta.focus();
    ta.select();
    ta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function getSelectedItem() {
  const idToFind = selectedItemId || (selectedItemIds.size === 1 ? [...selectedItemIds][0] : null);
  if (!idToFind) return null;
  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page || !page.items) return null;
  return page.items.find(i => i.id === idToFind);
}

function updateSelectedItemProp(prop, value) {
  const item = getSelectedItem();
  if (!item) return;

  item[prop] = value;
  const domEl = document.getElementById(`phys-item-${item.id}`);
  if (domEl) {
    if (prop === 'text') {
      domEl.textContent = value;
      if (!item.height) domEl.style.height = '';
    }
    if (prop === 'x') domEl.style.left = `${value}px`;
    if (prop === 'y') domEl.style.top = `${value}px`;
    if (prop === 'width') {
      item.maxWidth = value;
      domEl.style.width = `${value}px`;
      domEl.style.maxWidth = `${value}px`;
    }
    if (prop === 'height') domEl.style.height = `${value}px`;
    if (prop === 'borderRadius') {
      domEl.style.borderRadius = `${value}px`;
      const imgChild = domEl.querySelector('img');
      if (imgChild) imgChild.style.borderRadius = `${value}px`;
    }
    if (prop === 'fontSize') {
      domEl.style.fontSize = `${value}px`;
      if (!item.height) domEl.style.height = '';
    }
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
 * Operaciones: Copiar, Pegar, Eliminar elementos (Soporte individual y múltiple)
 */
function copySelectedItems() {
  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page || !page.items) return;

  const toCopy = page.items.filter(it => selectedItemIds.has(it.id) || it.id === selectedItemId);
  if (toCopy.length === 0) {
    showToast('⚠️ Selecciona uno o más elementos para copiar.');
    return;
  }

  // Clonado profundo de elementos seleccionados
  editorClipboard = toCopy.map(it => JSON.parse(JSON.stringify(it)));
  try {
    sessionStorage.setItem('lc_phys_clipboard', JSON.stringify(editorClipboard));
  } catch (e) {}

  showToast(`📋 ${editorClipboard.length} elemento(s) copiado(s). Puedes pegarlo(s) en esta u otra hoja.`);
  renderInspector();
}

function pasteClipboardItems() {
  if (!editorClipboard || editorClipboard.length === 0) {
    try {
      const saved = sessionStorage.getItem('lc_phys_clipboard');
      if (saved) editorClipboard = JSON.parse(saved);
    } catch (e) {}
  }

  if (!editorClipboard || editorClipboard.length === 0) {
    showToast('ℹ️ El portapapeles está vacío. Selecciona elementos y presiona Copiar.');
    return;
  }

  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page) return;
  if (!page.items) page.items = [];

  const newSelectedIds = new Set();
  const offset = 20;

  editorClipboard.forEach((clipItem, idx) => {
    const newId = `item_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`;
    const cloned = JSON.parse(JSON.stringify(clipItem));
    cloned.id = newId;
    cloned.x = Math.max(10, Math.min(816 - 50, (cloned.x || 50) + offset));
    cloned.y = Math.max(10, Math.min(1056 - 50, (cloned.y || 100) + offset));

    page.items.push(cloned);
    newSelectedIds.add(newId);
  });

  selectedItemIds = newSelectedIds;
  selectedItemId = newSelectedIds.size === 1 ? [...newSelectedIds][0] : null;

  renderCurrentPage();
  renderInspector();
  saveToLocalStorageDraft();
  showToast(`📋 ${newSelectedIds.size} elemento(s) pegado(s) en Hoja ${currentPageIndex + 1}.`);
}

function deleteSelectedItems() {
  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page || !page.items) return;

  const count = page.items.filter(it => selectedItemIds.has(it.id) || it.id === selectedItemId).length;
  if (count === 0) return;

  page.items = page.items.filter(it => !selectedItemIds.has(it.id) && it.id !== selectedItemId);
  selectedItemIds.clear();
  selectedItemId = null;

  renderCurrentPage();
  renderInspector();
  saveToLocalStorageDraft();
  showToast(`🗑️ ${count} elemento(s) eliminado(s).`);
}

function selectAllCurrentPageItems() {
  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page || !page.items || page.items.length === 0) return;

  selectedItemIds.clear();
  page.items.forEach(it => selectedItemIds.add(it.id));
  selectedItemId = page.items.length === 1 ? page.items[0].id : null;

  renderCurrentPage();
  renderInspector();
  showToast(`✨ ${selectedItemIds.size} elementos seleccionados.`);
}

function clearSelection() {
  selectedItemIds.clear();
  selectedItemId = null;
  renderCurrentPage();
  renderInspector();
}

function addNewTextItem() {
  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page) return;

  if (!page.items) page.items = [];

  // Posición Y inteligente para no encimar sobre encabezados ni subtítulos
  let targetY = 120;
  const contentItems = page.items.filter(it => 
    !it.id.startsWith('hdr_') && 
    !it.id.startsWith('ftr_') && 
    !it.id.startsWith('trad_hdr_') && 
    !it.id.startsWith('trad_ftr_')
  );
  if (contentItems.length > 0) {
    const maxY = Math.max(...contentItems.map(it => (it.y || 0) + (it.height || 35)));
    targetY = maxY < 920 ? maxY + 25 : 120;
  }

  const newId = `item_${Date.now()}`;
  const newItem = {
    id: newId,
    x: 80,
    y: targetY,
    text: 'NUEVO PLATILLO O TEXTO\nDescripción o detalle aquí...',
    fontSize: 12,
    fontFamily: 'Gotham-Bold',
    color: '#1C1714',
    bold: true
  };

  page.items.push(newItem);
  selectedItemIds.clear();
  selectedItemIds.add(newId);
  selectedItemId = newId;

  renderCurrentPage();
  renderInspector();
  focusInspectorTextarea();
  showToast('➕ Nuevo texto agregado.');
  saveToLocalStorageDraft();
}

function duplicateSelectedItem() {
  const pages = menusData[getMenuKey()] || [];
  const page = pages[currentPageIndex];
  if (!page || !page.items) return;

  const idsToDup = selectedItemIds.size > 0 ? [...selectedItemIds] : (selectedItemId ? [selectedItemId] : []);
  if (idsToDup.length === 0) return;

  const newSelectedIds = new Set();
  idsToDup.forEach((id, idx) => {
    const orig = page.items.find(i => i.id === id);
    if (orig) {
      const newId = `item_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`;
      const cloned = {
        ...JSON.parse(JSON.stringify(orig)),
        id: newId,
        x: Math.min(816 - 40, orig.x + 20),
        y: Math.min(1056 - 40, orig.y + 20)
      };
      page.items.push(cloned);
      newSelectedIds.add(newId);
    }
  });

  selectedItemIds = newSelectedIds;
  selectedItemId = newSelectedIds.size === 1 ? [...newSelectedIds][0] : null;

  renderCurrentPage();
  renderInspector();
  showToast(`📋 ${newSelectedIds.size} elemento(s) duplicado(s).`);
  saveToLocalStorageDraft();
}

function deleteSelectedItem() {
  deleteSelectedItems();
}

function reindexPageNumbers(pages) {
  if (!Array.isArray(pages)) return;
  const total = pages.length;
  pages.forEach((p, idx) => {
    p.pageNumber = idx + 1;
    (p.items || []).forEach(it => {
      if (it.text && /HOJA\s+\d+\s+DE\s+\d+/i.test(it.text)) {
        it.text = it.text.replace(/HOJA\s+\d+\s+DE\s+\d+/i, `HOJA ${idx + 1} DE ${total}`);
        const domEl = document.getElementById(`phys-item-${it.id}`);
        if (domEl) domEl.textContent = it.text;
      }
    });
  });
}

function addNewPage() {
  const pages = menusData[getMenuKey()] || [];
  const newNum = pages.length + 1;
  const isDig = currentDesign === 'digital';
  const newPage = {
    pageNumber: newNum,
    width: 816,
    height: 1056,
    bgColor: isDig ? '#FDF6EC' : '#CCAD93',
    hasEmblem: false,
    items: [
      {
        id: `item_${Date.now()}`,
        x: 80,
        y: 80,
        text: 'NUEVA SECCIÓN DE CARTA',
        fontSize: 22,
        fontFamily: isDig ? 'Hansief' : 'Hansief',
        color: isDig ? '#C94E8F' : '#000000',
        bold: true
      }
    ]
  };

  pages.push(newPage);
  reindexPageNumbers(pages);
  currentPageIndex = pages.length - 1;
  selectedItemId = null;
  selectedItemIds.clear();

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
  cloned.items = (cloned.items || []).map(it => ({ ...it, id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` }));

  pages.splice(currentPageIndex + 1, 0, cloned);
  reindexPageNumbers(pages);
  currentPageIndex = currentPageIndex + 1;
  selectedItemId = null;
  selectedItemIds.clear();

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
  reindexPageNumbers(pages);
  if (currentPageIndex >= pages.length) {
    currentPageIndex = pages.length - 1;
  }
  selectedItemId = null;
  selectedItemIds.clear();

  renderPagesList();
  renderCurrentPage();
  renderInspector();
  showToast('🗑️ Hoja eliminada.');
  saveToLocalStorageDraft();
}

function saveToLocalStorageDraft() {
  try {
    const isTrad = currentDesign === 'tradicional';
    const localKey = isTrad ? `lc_physical_menu_${currentType}_v7` : `lc_physical_menu_${currentType}_digital_v7`;
    const data = menusData[getMenuKey()];
    if (data) {
      localStorage.setItem(localKey, JSON.stringify(data));
    }
  } catch (e) {}
}

/**
 * Guarda los cambios permanentemente en Firestore y localStorage
 */
async function savePhysicalMenu(silent = false) {
  const btn = document.getElementById('btn-phys-save');
  const originalBtnHtml = btn ? btn.innerHTML : '';
  if (btn && !silent) {
    btn.disabled = true;
    btn.textContent = 'Guardando...';
  }

  try {
    const rawPages = menusData[getMenuKey()] || [];
    // Limpiar cualquier propiedad undefined antes de almacenar
    const pages = JSON.parse(JSON.stringify(rawPages));
    const isTrad = currentDesign === 'tradicional';
    const localKey = isTrad ? `lc_physical_menu_${currentType}_v7` : `lc_physical_menu_${currentType}_digital_v7`;
    const firestoreDocId = isTrad ? currentType : `${currentType}_digital`;

    localStorage.setItem(localKey, JSON.stringify(pages));

    if (isConfigured && db) {
      try {
        await setDoc(doc(db, `restaurants/la-curandera/physicalMenus/${firestoreDocId}`), {
          type: currentType,
          design: currentDesign,
          pages: pages,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (fsErr) {
        console.warn('Firestore setDoc warn in savePhysicalMenu:', fsErr);
      }
    }

    if (!silent) {
      const typeLabel = currentType === 'desayuno' ? 'Desayunos' : (currentType === 'cantina' ? 'Cantina & Destilados' : 'Comidas');
      const designLabel = currentDesign === 'digital' ? '(Estilo Menú Digital)' : '(Diseño Tradicional)';
      showToast(`✅ Carta de ${typeLabel} ${designLabel} guardada correctamente.`);
    }
  } catch (err) {
    console.error('Error saving physical menu:', err);
    if (!silent) showToast('⚠️ Error al guardar los cambios en la nube.');
  } finally {
    if (btn && !silent) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml || '💾 Guardar Cambios';
    }
  }
}

/**
 * ACTUALIZAR: Sincroniza la información del Menú Digital con el Editor de Carta Física.
 * Sincroniza nombres, precios, descripciones e inserta/actualiza las imágenes de los platillos.
 */
async function syncDigitalMenuToPhysicalMenu() {
  const btn = document.getElementById('btn-phys-sync') || document.getElementById('btn-phys-reset');
  const originalBtnHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Sincronizando...</span>';
    btn.classList.add('is-syncing');
    btn.classList.remove('pulse-needs-update');
  }

  try {
    // 1. Obtener catálogo y overrides en vivo (Memoria + Firestore en tiempo real + Fallback)
    let catalogData = null;
    if (typeof window.getDigitalMenuCatalog === 'function') {
      try {
        catalogData = window.getDigitalMenuCatalog();
      } catch (e) {
        console.warn('Error reading window.getDigitalMenuCatalog:', e);
      }
    }

    let memoryProducts = (catalogData && Array.isArray(catalogData.products)) ? catalogData.products : [];
    let categories = (catalogData && Array.isArray(catalogData.categories)) ? catalogData.categories : [];
    let memoryOverrides = (catalogData && catalogData.menuOverrides) ? catalogData.menuOverrides : {};
    let pendingChanges = (catalogData && catalogData.pendingChanges) ? catalogData.pendingChanges : {};
    const restaurantId = catalogData?.restaurantId || 'la-curandera';
    const activeBranchId = catalogData?.activeBranchId || 'metepec';

    // Consultar Firestore y Catálogo en paralelo con Promise.allSettled (3x más veloz)
    let firestoreOverrides = {};
    let firestoreProducts = [];
    let fallbackProducts = [];
    let fallbackCategories = [];

    const fetchTasks = [];

    if (isConfigured && db) {
      fetchTasks.push(
        getDocs(collection(db, `restaurants/${restaurantId}/branches/${activeBranchId}/menuOverrides`))
          .then(overSnap => { overSnap.forEach(d => { firestoreOverrides[d.id] = d.data(); }); })
          .catch(e => console.warn('Firestore live overrides fetch warn:', e))
      );
      fetchTasks.push(
        getDocs(collection(db, `restaurants/${restaurantId}/products`))
          .then(prodSnap => { prodSnap.forEach(d => { firestoreProducts.push({ id: d.id, ...d.data() }); }); })
          .catch(e => console.warn('Firestore live products fetch warn:', e))
      );
    }

    fetchTasks.push(
      fetch('../data/catalog.json')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            fallbackProducts = data.products || [];
            fallbackCategories = data.categories || [];
          }
        })
        .catch(e => console.warn('Error fetching fallback catalog.json:', e))
    );

    await Promise.allSettled(fetchTasks);

    // Combinar productos respetando prioridad: Firestore > Memoria > Fallback
    const isDishLogo = (url) => typeof url === 'string' && (url.includes('logo/logo.png') || url.endsWith('/logo.png') || url === 'assets/logo/logo.png');

    const productsMap = new Map();
    // 1. Base catálogo maestro con imágenes
    fallbackProducts.forEach(p => {
      if (!p || !p.id) return;
      productsMap.set(p.id, {
        ...p,
        imageUrl: (p.imageUrl && !isDishLogo(p.imageUrl)) ? p.imageUrl : null,
        imageFallback: (p.imageFallback && !isDishLogo(p.imageFallback)) ? p.imageFallback : null
      });
    });

    // 2. Firestore productos (sobrescribe precios, nombres, conservando imagen si la tiene)
    firestoreProducts.forEach(p => {
      if (!p || !p.id) return;
      const prev = productsMap.get(p.id) || {};
      const validImg = (p.imageUrl && !isDishLogo(p.imageUrl)) ? p.imageUrl : prev.imageUrl;
      const validFallback = (p.imageFallback && !isDishLogo(p.imageFallback)) ? p.imageFallback : prev.imageFallback;
      productsMap.set(p.id, {
        ...prev,
        ...p,
        imageUrl: validImg,
        imageFallback: validFallback
      });
    });

    // 3. Productos en memoria del panel admin
    memoryProducts.forEach(p => {
      if (!p || !p.id) return;
      const prev = productsMap.get(p.id) || {};
      const validImg = (p.imageUrl && !isDishLogo(p.imageUrl)) ? p.imageUrl : prev.imageUrl;
      const validFallback = (p.imageFallback && !isDishLogo(p.imageFallback)) ? p.imageFallback : prev.imageFallback;
      productsMap.set(p.id, {
        ...prev,
        ...p,
        imageUrl: validImg,
        imageFallback: validFallback
      });
    });

    const allProducts = Array.from(productsMap.values());

    if (categories.length === 0 && fallbackCategories.length > 0) {
      categories = fallbackCategories;
    }

    const mergedOverrides = { ...firestoreOverrides, ...memoryOverrides };

    if (allProducts.length === 0) {
      showToast('⚠️ No se encontraron platillos en el Menú Digital para sincronizar.');
      return;
    }

    // 2. Funciones auxiliares de extracción segura, normalización y tokens
    const extractString = (val) => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'number') return String(val);
      if (typeof val === 'object') {
        if (typeof val.es === 'string') return val.es;
        if (typeof val.en === 'string') return val.en;
        if (typeof val.value === 'string') return val.value;
        if (typeof val.name === 'string') return val.name;
        if (typeof val.description === 'string') return val.description;
        const strVal = Object.values(val).find(v => typeof v === 'string' && v.trim().length > 0);
        if (strVal) return strVal;
        return '';
      }
      return String(val);
    };

    const STOP_WORDS = new Set(['de', 'la', 'el', 'los', 'las', 'con', 'del', 'al', 'en', 'para', 'por', 'piezas', 'pzas', 'orden', 'clasico', 'clasica', 'tradicional', 'autentica', 'autentico']);

    const norm = (str) => {
      return extractString(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
    };

    const getTokens = (str) => {
      return extractString(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
    };

    const formatImgUrl = (url) => {
      if (!url || typeof url !== 'string') return '';
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('/')) {
        return url;
      }
      if (url.startsWith('../')) {
        return url;
      }
      return '../' + url.replace(/^\.\//, '');
    };

    const getEffectiveData = (prod) => {
      const pId = prod.id;
      const over = mergedOverrides[pId] || {};
      const pend = pendingChanges[pId] || {};

      // 1. Nombre
      let rawName = '';
      if (pend.nameOverride !== undefined && pend.nameOverride !== null) rawName = pend.nameOverride;
      else if (pend.name !== undefined && pend.name !== null) rawName = pend.name;
      else if (over.nameOverride !== undefined && over.nameOverride !== null) rawName = over.nameOverride;
      else if (over.name !== undefined && over.name !== null) rawName = over.name;
      else if (prod.name !== undefined && prod.name !== null) rawName = prod.name;
      else if (prod.nameOverride !== undefined && prod.nameOverride !== null) rawName = prod.nameOverride;

      let name = extractString(rawName).replace(/\[object Object\]/g, '').trim();

      // 2. Precio
      let price = prod.price;
      if (pend.priceOverride !== undefined && pend.priceOverride !== null && pend.priceOverride !== '') {
        price = pend.priceOverride;
      } else if (over.priceOverride !== undefined && over.priceOverride !== null && over.priceOverride !== '') {
        price = over.priceOverride;
      } else if (prod.price !== undefined && prod.price !== null) {
        price = prod.price;
      }
      const numPrice = Number(price) || 0;

      // 3. Descripción
      let rawDesc = '';
      if (pend.descriptionOverride !== undefined && pend.descriptionOverride !== null) rawDesc = pend.descriptionOverride;
      else if (pend.description !== undefined && pend.description !== null) rawDesc = pend.description;
      else if (over.descriptionOverride !== undefined && over.descriptionOverride !== null) rawDesc = over.descriptionOverride;
      else if (over.description !== undefined && over.description !== null) rawDesc = over.description;
      else if (prod.description !== undefined && prod.description !== null) rawDesc = prod.description;
      else if (prod.descriptionOverride !== undefined && prod.descriptionOverride !== null) rawDesc = prod.descriptionOverride;

      let desc = extractString(rawDesc).replace(/\[object Object\]/g, '').trim();

      // 4. Imagen (respetando prioridad: pending > overrides > product > imageFallback)
      let rawImg = pend.imageUrl || over.imageUrl || prod.imageUrl || prod.imageFallback || '';
      let img = extractString(rawImg).trim();
      if (img && (img.includes('logo/logo.png') || img.endsWith('/logo.png') || img === 'assets/logo/logo.png')) {
        img = '';
      }

      return {
        id: pId,
        name: name,
        price: numPrice,
        description: desc,
        imageUrl: formatImgUrl(img)
      };
    };

    // Mapa de categorías para filtrar Desayuno vs Comida
    const catMap = {};
    fallbackCategories.forEach(c => {
      if (c.id) catMap[c.id] = c;
      if (c.slug) catMap[c.slug] = c;
    });
    categories.forEach(c => {
      if (c.id) catMap[c.id] = { ...(catMap[c.id] || {}), ...c };
      if (c.slug) catMap[c.slug] = { ...(catMap[c.slug] || {}), ...c };
    });

    const isProductInCurrentMeal = (prod) => {
      const cat = catMap[prod.categoryId];
      if (!cat) return false;
      const section = (cat.section || '').toLowerCase();
      if (currentType === 'desayuno') {
        return section === 'desayuno' || section === 'ambos';
      } else if (currentType === 'cantina') {
        return section === 'cantina';
      } else {
        return section === 'comida' || section === 'ambos';
      }
    };

    const pages = menusData[getMenuKey()] || [];
    if (pages.length === 0) {
      showToast('⚠️ No hay páginas disponibles en esta carta.');
      return;
    }

    let updatedTextsCount = 0;
    let addedImagesCount = 0;
    let updatedImagesCount = 0;
    let newDishesAddedCount = 0;

    const relevantProducts = allProducts.filter(isProductInCurrentMeal);
    const matchedProductIds = new Set();

    const isStructuralElement = (it) => {
      if (!it || !it.id) return true;
      const id = it.id.toLowerCase();
      return id.startsWith('hdr_') || 
             id.startsWith('ftr_') || 
             id.startsWith('trad_hdr_') || 
             id.startsWith('trad_p1_') || 
             id.startsWith('cat_title_') || 
             id.startsWith('cat_note_') || 
             id.startsWith('des_d_p1_') || 
             id.startsWith('com_d_p1_') || 
             id.startsWith('can_d_p1_') || 
             id.includes('brand') || 
             id.includes('badge') || 
             id.includes('quote') || 
             id.includes('sep') || 
             id.includes('banner') || 
             id.includes('tag');
    };

    // 3. Sincronizar platillos en las hojas de la carta física
    pages.forEach(page => {
      if (!page.items) page.items = [];

      // Sanear cualquier texto previo que contenga "[object Object]" o no sea string
      page.items.forEach(it => {
        if (typeof it.text === 'string') {
          if (it.text.includes('[object Object]')) {
            it.text = it.text.replace(/\[object Object\]/g, '').trim();
          }
        } else if (it.type !== 'image' && it.text) {
          it.text = extractString(it.text).replace(/\[object Object\]/g, '').trim();
        }
      });

      relevantProducts.forEach(prod => {
        // Si el platillo ya fue ubicado en otra hoja o posición, evitar duplicarlo
        if (matchedProductIds.has(prod.id)) return;

        const effective = getEffectiveData(prod);
        if (!effective.name || effective.name === '[object Object]') return;

        const pNorm = norm(effective.name);
        const pTokens = getTokens(effective.name);

        if (currentDesign === 'digital') {
          // --- DISEÑO MENÚ DIGITAL ---
          // 1. Coincidencia directa por dishId (100% precisa)
          let matchedItem = page.items.find(it => {
            if (it.type === 'image' || isStructuralElement(it)) return false;
            return it.dishId === prod.id;
          });

          // 2. Coincidencia por nombre exacto (solo en elementos de menú no estructurales)
          if (!matchedItem) {
            matchedItem = page.items.find(it => {
              if (it.type === 'image' || isStructuralElement(it)) return false;
              if (it.dishId && it.dishId !== prod.id) return false;
              const itemText = extractString(it.text);
              const titlePart = itemText.split(/·|\$|\n/)[0];
              const normTitle = norm(titlePart);
              return normTitle === pNorm;
            });
          }

          // 3. Fallback por tokens solo si no tiene dishId ajeno
          if (!matchedItem && pTokens.length >= 2) {
            matchedItem = page.items.find(it => {
              if (it.type === 'image' || isStructuralElement(it)) return false;
              if (it.dishId && it.dishId !== prod.id) return false;
              const itemText = extractString(it.text);
              if (itemText.trim().startsWith('$')) return false;
              const titlePart = itemText.split(/·|\$|\n/)[0];
              const normTitle = norm(titlePart);
              let tokenHits = 0;
              pTokens.forEach(t => { if (normTitle.includes(t)) tokenHits++; });
              return tokenHits === pTokens.length || (tokenHits >= 2 && tokenHits >= pTokens.length - 1);
            });
          }

          if (matchedItem) {
            matchedProductIds.add(prod.id);
            matchedItem.dishId = prod.id;

            const cleanName = effective.name;
            const cleanDesc = effective.description;

            // Preservar formato de destilados por copa y botella si ya existe
            let newTitle;
            if (matchedItem.text.includes('Botella') || matchedItem.text.includes('Copa')) {
              newTitle = matchedItem.text;
            } else {
              newTitle = `${cleanName}  ·  $${effective.price}`;
            }

            // Comprobar si hubo cambios reales en el Menú Digital
            const priceMatch = (matchedItem.text || '').match(/\$\s*([\d,.]+)/);
            const currentPrice = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : null;
            const currentTitlePart = (matchedItem.text || '').split(/·|\$|\n/)[0].trim();
            const nameChanged = norm(currentTitlePart) !== norm(cleanName);
            const priceChanged = currentPrice !== null && effective.price > 0 && currentPrice !== effective.price;

            if (priceChanged && !nameChanged) {
              // Solo cambió el precio: actualizar únicamente el monto sin romper estructura ni saltos de línea del usuario
              matchedItem.text = matchedItem.text.replace(/\$\s*[\d,.]+/, `$${effective.price}`);
              updatedTextsCount++;
            } else if (nameChanged) {
              // Cambió el nombre: actualizar nombre respetando estructura
              if (matchedItem.text.includes('Botella') || matchedItem.text.includes('Copa')) {
                matchedItem.text = matchedItem.text.replace(currentTitlePart, cleanName);
              } else {
                matchedItem.text = newTitle;
              }
              updatedTextsCount++;
            }
            // Si ni nombre ni precio cambiaron en el Menú Digital, NO sobreescribir el texto del usuario

            // Preservar dimensiones personalizadas de matchedItem (nunca reiniciar a default 345)
            if (matchedItem.width && (!matchedItem.maxWidth || matchedItem.maxWidth < matchedItem.width)) {
              matchedItem.maxWidth = matchedItem.width;
            }

            // Buscar item de descripción contiguo
            let descItem = page.items.find(it => {
              if (it.type === 'image' || it === matchedItem || isStructuralElement(it)) return false;
              return it.dishId === prod.id && (it.id.includes('desc') || it !== matchedItem);
            });
            if (!descItem) {
              descItem = page.items.find(it => {
                if (it.type === 'image' || it === matchedItem || isStructuralElement(it)) return false;
                if (it.id === `${matchedItem.id}_desc` || it.id === matchedItem.id.replace('_title', '_desc')) return true;
                return Math.abs(it.x - matchedItem.x) < 50 && (it.y > matchedItem.y && it.y < matchedItem.y + 70);
              });
            }

            if (descItem && cleanDesc) {
              descItem.dishId = prod.id;
              const existingDescNorm = norm(descItem.text);
              const newDescNorm = norm(cleanDesc);

              // Solo actualizar si hay un cambio real en la descripción del Menú Digital
              if (existingDescNorm !== newDescNorm) {
                descItem.text = cleanDesc;
                updatedTextsCount++;
              }

              // Preservar dimensiones y proporciones de descItem (nunca reiniciar a default 345)
              if (descItem.width && (!descItem.maxWidth || descItem.maxWidth < descItem.width)) {
                descItem.maxWidth = descItem.width;
              }
            }

            // Sincronizar o insertar imagen si el platillo cuenta con una
            if (effective.imageUrl) {
              let existingImg = page.items.find(it => it.type === 'image' && (it.dishId === prod.id || norm(it.dishName) === pNorm));
              if (existingImg) {
                if (existingImg.url !== effective.imageUrl || existingImg.dishName !== effective.name) {
                  existingImg.url = effective.imageUrl;
                  existingImg.dishName = effective.name;
                  updatedImagesCount++;
                }
              } else if (matchedItem.y >= 90) {
                const imgX = matchedItem.x < 300 ? 295 : 665;
                const imgY = Math.max(90, Math.min(990, matchedItem.y - 4));
                page.items.push({
                  id: `img_${prod.id}_${Date.now()}`,
                  type: 'image',
                  dishId: prod.id,
                  dishName: effective.name,
                  url: effective.imageUrl,
                  x: imgX,
                  y: imgY,
                  width: 95,
                  height: 65,
                  borderRadius: 8
                });
                addedImagesCount++;
              }
            }
          }
        } else {
          // --- DISEÑO TRADICIONAL ---
          // 1. Coincidencia directa por dishId
          let matchedItem = page.items.find(it => {
            if (it.type === 'image' || isStructuralElement(it)) return false;
            return it.dishId === prod.id;
          });

          // 2. Coincidencia por nombre
          if (!matchedItem) {
            matchedItem = page.items.find(it => {
              if (it.type === 'image' || isStructuralElement(it)) return false;
              if (it.dishId && it.dishId !== prod.id) return false;
              const normIt = norm(it.text);
              return normIt === pNorm || (pNorm.length >= 5 && normIt.startsWith(pNorm));
            });
          }

          // 3. Coincidencia por tokens
          if (!matchedItem) {
            let bestScore = 0;
            let candidate = null;

            page.items.forEach(it => {
              if (it.type === 'image' || isStructuralElement(it)) return;
              if (it.dishId && it.dishId !== prod.id) return;
              const itemText = extractString(it.text);
              if (itemText.trim().startsWith('$')) return;
              const normIt = norm(itemText);
              if (normIt.length < 3) return;

              let hits = 0;
              pTokens.forEach(t => { if (normIt.includes(t)) hits++; });

              if (pTokens.length > 0 && hits === pTokens.length) {
                if (80 + hits > bestScore) { bestScore = 80 + hits; candidate = it; }
              } else if (pTokens.length >= 2 && hits >= 2) {
                if (50 + hits > bestScore) { bestScore = 50 + hits; candidate = it; }
              } else if (pTokens.some(t => t.length >= 6 && normIt.includes(t))) {
                if (40 > bestScore) { bestScore = 40; candidate = it; }
              }
            });

            if (candidate && bestScore >= 40) {
              matchedItem = candidate;
            }
          }

          if (matchedItem) {
            matchedProductIds.add(prod.id);
            matchedItem.dishId = prod.id;

            // En tradicional, si no es una lista agrupada con viñeta, actualizar solo si hubo cambio real
            const itText = extractString(matchedItem.text);
            if (!itText.includes('•') && itText.length < 120) {
              const cleanName = effective.name;
              const cleanDesc = effective.description;
              const expectedText = cleanDesc ? `${cleanName}\n${cleanDesc}` : cleanName;

              const existingNorm = norm(matchedItem.text);
              const expectedNorm = norm(expectedText);

              if (existingNorm !== expectedNorm) {
                matchedItem.text = expectedText;
                updatedTextsCount++;
              }
            }

            // Preservar dimensiones de matchedItem
            if (matchedItem.width && (!matchedItem.maxWidth || matchedItem.maxWidth < matchedItem.width)) {
              matchedItem.maxWidth = matchedItem.width;
            }

            // Buscar precio contiguo en tradicional
            let priceItem = page.items.find(it => {
              if (it.type === 'image' || it === matchedItem || isStructuralElement(it)) return false;
              if (it.dishId === prod.id && (it.id.includes('price') || extractString(it.text).trim().startsWith('$'))) return true;
              return false;
            });
            if (!priceItem) {
              priceItem = page.items.find(it => {
                if (it.type === 'image' || it === matchedItem || isStructuralElement(it)) return false;
                const pText = extractString(it.text).trim();
                return Math.abs(it.y - matchedItem.y) < 25 && it.x > matchedItem.x && pText.startsWith('$');
              });
            }

            if (priceItem) {
              const newPriceText = `$${effective.price}`;
              if (priceItem.text.trim() !== newPriceText) {
                priceItem.text = newPriceText;
                updatedTextsCount++;
              }
              if (priceItem.width && (!priceItem.maxWidth || priceItem.maxWidth < priceItem.width)) {
                priceItem.maxWidth = priceItem.width;
              }
            }

            // Sincronizar o insertar imagen si el platillo cuenta con una
            if (effective.imageUrl) {
              let existingImg = page.items.find(it => it.type === 'image' && (it.dishId === prod.id || norm(it.dishName) === pNorm));
              if (existingImg) {
                if (existingImg.url !== effective.imageUrl || existingImg.dishName !== effective.name) {
                  existingImg.url = effective.imageUrl;
                  existingImg.dishName = effective.name;
                  updatedImagesCount++;
                }
              } else if (matchedItem.y >= 90) {
                const imgX = Math.min(680, matchedItem.x + 195);
                const imgY = Math.max(90, Math.min(990, matchedItem.y - 2));
                page.items.push({
                  id: `img_${prod.id}_${Date.now()}`,
                  type: 'image',
                  dishId: prod.id,
                  dishName: effective.name,
                  url: effective.imageUrl,
                  x: imgX,
                  y: imgY,
                  width: 95,
                  height: 65,
                  borderRadius: 8
                });
                addedImagesCount++;
              }
            }
          }
        }
      });
    });

    // 4. Agregar platillos nuevos del Menú Digital que aún no existen en ninguna hoja
    const unplacedProducts = relevantProducts.filter(p => !matchedProductIds.has(p.id));
    if (unplacedProducts.length > 0) {
      let targetPage = pages[pages.length - 1];
      let currentY = 180;
      (targetPage.items || []).forEach(it => {
        if (it.y && it.y > currentY && it.y < 850) {
          currentY = it.y + 70;
        }
      });

      unplacedProducts.forEach(prod => {
        const effective = getEffectiveData(prod);
        if (!effective.name || effective.name === '[object Object]') return;

        const cleanName = effective.name;
        const cleanDesc = effective.description;

        // Si ya no cabe en la hoja actual, crear una NUEVA hoja limpia
        if (currentY > 880) {
          const newPageNum = pages.length + 1;
          targetPage = {
            id: `page_${newPageNum}_${Date.now()}`,
            bgColor: currentDesign === 'digital' ? '#FDF6EC' : '#CCAD93',
            items: []
          };
          pages.push(targetPage);
          currentY = 140;
        }

        if (currentDesign === 'digital') {
          targetPage.items.push({
            id: `sync_item_${prod.id}_title`,
            dishId: prod.id,
            x: 55,
            y: currentY,
            text: `${cleanName}  ·  $${effective.price}`,
            fontSize: 13,
            fontFamily: 'Gotham-Bold',
            color: '#1C1714',
            bold: true,
            maxWidth: 350
          });
          if (cleanDesc) {
            targetPage.items.push({
              id: `sync_item_${prod.id}_desc`,
              dishId: prod.id,
              x: 55,
              y: currentY + 20,
              text: cleanDesc,
              fontSize: 10.5,
              fontFamily: 'Montserrat',
              color: '#554B43',
              bold: false,
              maxWidth: 350
            });
          }
          if (effective.imageUrl) {
            targetPage.items.push({
              id: `img_${prod.id}_${Date.now()}`,
              type: 'image',
              dishId: prod.id,
              dishName: cleanName,
              url: effective.imageUrl,
              x: 295,
              y: currentY - 2,
              width: 95,
              height: 65,
              borderRadius: 8
            });
            addedImagesCount++;
          }
        } else {
          targetPage.items.push({
            id: `sync_item_${prod.id}`,
            dishId: prod.id,
            x: 95,
            y: currentY,
            text: cleanDesc ? `${cleanName}\n${cleanDesc}` : cleanName,
            fontSize: 11,
            fontFamily: 'SourceCodeVariable-Roman',
            color: '#000000',
            bold: false
          });
          targetPage.items.push({
            id: `sync_price_${prod.id}`,
            x: 290,
            y: currentY,
            text: `$${effective.price}`,
            fontSize: 12.5,
            fontFamily: 'SourceCodeVariable-Roman',
            color: '#000000',
            bold: true
          });
          if (effective.imageUrl) {
            targetPage.items.push({
              id: `img_${prod.id}_${Date.now()}`,
              type: 'image',
              dishId: prod.id,
              dishName: cleanName,
              url: effective.imageUrl,
              x: 340,
              y: currentY - 2,
              width: 95,
              height: 65,
              borderRadius: 8
            });
            addedImagesCount++;
          }
        }

        currentY += 75;
        newDishesAddedCount++;
      });
    }

    // 5. Reindexar hojas y guardar permanentemente en borrador local y en Firestore
    reindexPageNumbers(pages);
    saveToLocalStorageDraft();
    await savePhysicalMenu(true);

    // 6. Mantener la hoja actual activa para no desorientar al usuario
    if (currentPageIndex >= pages.length) {
      currentPageIndex = Math.max(0, pages.length - 1);
    }

    // 7. Renderizar vistas con datos frescos
    renderPagesList();
    renderCurrentPage();
    renderInspector();

    // Guardar marca de tiempo de sincronización exitosa
    localStorage.setItem('lc_last_physical_sync', String(Date.now()));

    const summaryParts = [];
    if (updatedTextsCount > 0) summaryParts.push(`${updatedTextsCount} textos actualizados`);
    if (addedImagesCount > 0) summaryParts.push(`${addedImagesCount} imágenes agregadas`);
    if (updatedImagesCount > 0) summaryParts.push(`${updatedImagesCount} imágenes sincronizadas`);
    if (newDishesAddedCount > 0) summaryParts.push(`${newDishesAddedCount} platillos nuevos incorporados`);

    if (summaryParts.length === 0) {
      showToast('✅ La carta física ya está 100% sincronizada con el Menú Digital.');
    } else {
      showToast(`🔄 ¡Carta Física Sincronizada! ${summaryParts.join(', ')}.`);
    }
  } catch (err) {
    console.error('Error al sincronizar carta física con menú digital:', err);
    showToast('⚠️ Ocurrió un error durante la sincronización.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
      btn.classList.remove('is-syncing');
    }
  }
}

async function resetPhysicalMenuToTemplate() {
  return syncDigitalMenuToPhysicalMenu();
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
      <p id="phys-progress-text" style="font-family:var(--font-mono); font-size:0.85rem; color:var(--lc-crema);">Inicializando tipografías y recursos...</p>
      <div class="physical-progress-bar">
        <div id="phys-progress-fill" class="physical-progress-fill"></div>
      </div>
      <span style="font-size:0.75rem; color:var(--lc-gray-500);">8.5 x 11 pulgadas · Impresión profesional de alta fidelidad</span>
    </div>
  `;
  document.body.appendChild(progressModal);

  const progressText = progressModal.querySelector('#phys-progress-text');
  const progressFill = progressModal.querySelector('#phys-progress-fill');

  let renderContainer = null;

  try {
    // 1. Esperar a que las fuentes personalizadas estén 100% listas
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (e) {}
    }

    const { jsPDF } = window.jspdf;
    // Dimensiones exactas de US Letter en puntos (72 pt / pulgada): 612 x 792 pt
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter',
      compress: true
    });

    // Contenedor temporal de renderizado a escala 1:1 (816 x 1056 px)
    // Se ubica a left:0 top:0 detrás del modal de progreso (z-index 9998 < modal 9999)
    // para evitar cualquier error de recorte o coordenadas fuera de pantalla en html2canvas
    renderContainer = document.createElement('div');
    renderContainer.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 816px;
      height: 1056px;
      z-index: 9998;
      pointer-events: none;
      overflow: hidden;
      box-sizing: border-box;
      transform: none !important;
    `;
    document.body.appendChild(renderContainer);

    const defaultBg = currentDesign === 'digital' ? '#FDF6EC' : '#CCAD93';

    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      if (progressText) progressText.textContent = `Renderizando hoja ${i + 1} de ${pages.length}...`;
      if (progressFill) progressFill.style.width = `${Math.round(((i + 1) / pages.length) * 100)}%`;

      renderContainer.style.backgroundColor = p.bgColor || defaultBg;
      renderContainer.innerHTML = '';

      // Emblema místico de La Curandera en Portada (Hoja 1)
      if (p.hasEmblem || p.pageNumber === 1 || i === 0) {
        const emblem = document.createElement('img');
        emblem.src = '../assets/logo/curandera-emblem-lineart.png';
        emblem.alt = 'La Curandera';
        emblem.style.cssText = 'position:absolute; top:48px; right:50px; width:170px; height:170px; z-index:1; opacity:0.95; display:block;';
        renderContainer.appendChild(emblem);
      }

      (p.items || []).forEach(it => {
        if (it.type === 'image') {
          const imgEl = document.createElement('img');
          imgEl.src = it.url;
          imgEl.alt = it.dishName || 'Platillo';
          imgEl.crossOrigin = 'anonymous';
          imgEl.style.cssText = `
            position: absolute;
            left: ${it.x}px;
            top: ${it.y}px;
            width: ${it.width || 95}px;
            height: ${it.height || 65}px;
            border-radius: ${it.borderRadius !== undefined ? it.borderRadius : 8}px;
            object-fit: cover;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            z-index: 4;
            display: block;
          `;
          imgEl.onerror = () => {
            imgEl.src = '../assets/logo/curandera-emblem-lineart.png';
          };
          renderContainer.appendChild(imgEl);
        } else {
          const itemEl = document.createElement('div');
          const isWide = isWideItem(it);
          const effectiveMaxWidth = it.width ? `${Math.max(it.width, it.maxWidth || it.width)}px` : (it.maxWidth ? `${it.maxWidth}px` : (isWide ? '710px' : '345px'));
          const widthStyle = it.width ? `width: ${it.width}px;` : '';
          const heightStyle = it.height ? `height: ${it.height}px;` : '';

          itemEl.style.cssText = `
            position: absolute;
            left: ${it.x}px;
            top: ${it.y}px;
            padding: 2px 4px;
            font-size: ${it.fontSize}px;
            font-family: ${getCssFontFamily(it.fontFamily)};
            color: ${it.color || '#000000'};
            font-weight: ${it.bold ? '800' : '400'};
            line-height: 1.28;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-wrap: break-word;
            box-sizing: border-box;
            z-index: 5;
            max-width: ${effectiveMaxWidth};
            ${widthStyle}
            ${heightStyle}
          `;
          itemEl.textContent = it.text;
          renderContainer.appendChild(itemEl);
        }
      });

      // 2. Esperar rigurosamente a que todas las imágenes terminen de cargar y decodificarse
      const imgs = Array.from(renderContainer.querySelectorAll('img'));
      if (imgs.length > 0) {
        await Promise.all(imgs.map(img => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 2000); // Límite de seguridad
          });
        }));
      }

      // Pequeña pausa para asegurar sincronización de renderizado en el compositor gráfico
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 60)));

      // 3. Captura con html2canvas en alta resolución (escala 2.25x = ~230 DPI óptimo para imprenta)
      const canvas = await window.html2canvas(renderContainer, {
        scale: 2.25,
        useCORS: true,
        allowTaint: true,
        backgroundColor: p.bgColor || defaultBg,
        width: 816,
        height: 1056,
        windowWidth: 816,
        windowHeight: 1056,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        logging: false
      });

      // Compresión fotográfica nítida a 0.98 sin artefactos
      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      if (i > 0) {
        pdf.addPage('letter', 'portrait');
      }

      // Añadir la página a tamaño exacto Carta (612 x 792 pt) con interpolación de calidad
      pdf.addImage(imgData, 'JPEG', 0, 0, 612, 792, undefined, 'SLOW');
    }

    if (renderContainer && renderContainer.parentNode) {
      renderContainer.parentNode.removeChild(renderContainer);
      renderContainer = null;
    }

    const isTrad = currentDesign === 'tradicional';
    let filename = '';
    if (currentType === 'desayuno') {
      filename = isTrad ? 'La_Curandera_Menu_Desayunos_Tradicional_Carta.pdf' : 'La_Curandera_Menu_Desayunos_Digital_Carta.pdf';
    } else if (currentType === 'cantina') {
      filename = isTrad ? 'La_Curandera_Menu_Cantina_Tradicional_Carta.pdf' : 'La_Curandera_Menu_Cantina_Digital_Carta.pdf';
    } else {
      filename = isTrad ? 'La_Curandera_Menu_Comidas_Tradicional_Carta.pdf' : 'La_Curandera_Menu_Comidas_Digital_Carta.pdf';
    }

    pdf.save(filename);
    showToast(`✅ PDF descargado exitosamente: ${filename}`);
  } catch (err) {
    console.error('Error generando PDF de carta física:', err);
    showToast('⚠️ Error al generar el PDF.');
  } finally {
    if (renderContainer && renderContainer.parentNode) {
      renderContainer.parentNode.removeChild(renderContainer);
    }
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
