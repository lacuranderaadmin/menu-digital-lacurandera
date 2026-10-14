/**
 * LA CURANDERA — Generador Maestro de Cartas Físicas (Tamaño Carta 8.5" x 11")
 * Genera plantillas impecables, legibles y perfectamente estructuradas para:
 * 1. Desayunos (Tradicional y Digital) — 5 Hojas
 * 2. Comidas (Tradicional y Digital) — 7 Hojas
 * 3. Cantina (Tradicional y Digital) — 5 Hojas
 * Y las sincroniza en public/data/ y en Cloud Firestore.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '../public/js/firebase-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const catalogPath = path.join(__dirname, '../public/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// Helper para extraer strings de campos i18n
function toStr(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') return val.es || val.en || Object.values(val)[0] || '';
  return String(val);
}

// Helper para ajustar texto en líneas de máximo N caracteres sin romper palabras
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

// Mapa de productos
const pMap = new Map();
catalog.products.forEach(p => pMap.set(p.id, p));

function getP(id, overrides = {}) {
  const p = pMap.get(id);
  if (!p) {
    console.warn(`Product not found: ${id}`);
    return { id, name: id, price: 0, description: '', ...overrides };
  }
  return {
    ...p,
    name: toStr(p.name),
    description: toStr(p.description),
    ...overrides
  };
}

// ============================================================================
// HELPERS DE DISEÑO DIGITAL (816 x 1056 PX)
// ============================================================================

function createDigitalHeader(pageNumber, totalPages, typeName, subTitle) {
  return [
    {
      id: `hdr_brand_${pageNumber}`,
      x: 55,
      y: 38,
      text: 'LA CURANDERA',
      fontSize: 24,
      fontFamily: 'Hansief',
      color: '#C94E8F',
      bold: true
    },
    {
      id: `hdr_tag_${pageNumber}`,
      x: 235,
      y: 45,
      text: `${typeName.toUpperCase()} · ${subTitle.toUpperCase()}`,
      fontSize: 12,
      fontFamily: 'Gotham-Bold',
      color: '#159F9B',
      bold: true
    },
    {
      id: `hdr_pnum_${pageNumber}`,
      x: 675,
      y: 45,
      text: `HOJA ${pageNumber} DE ${totalPages}`,
      fontSize: 11,
      fontFamily: 'JetBrains Mono',
      color: '#6D6258',
      bold: true
    },
    {
      id: `hdr_sep_${pageNumber}`,
      x: 55,
      y: 68,
      text: '─────────────────────────────────────────────────────────────────',
      fontSize: 12,
      fontFamily: 'JetBrains Mono',
      color: 'rgba(26, 20, 18, 0.15)',
      bold: false
    }
  ];
}

function createDigitalFooter(pageNumber, totalPages) {
  return [
    {
      id: `ftr_text_${pageNumber}`,
      x: 55,
      y: 1005,
      text: `LA CURANDERA  ·  COCINA MEXICANA TRADICIONAL & MEZCALERÍA  ·  HOJA ${pageNumber} DE ${totalPages}`,
      fontSize: 10.5,
      fontFamily: 'JetBrains Mono',
      color: '#9E8E81',
      bold: true
    }
  ];
}

const DIGITAL_DISH_IMAGES = {
  'enchiladas-tradicionales': { url: '../assets/dishes/enchiladas-tradicionales.webp', name: 'Enchiladas Tradicionales', width: 190, height: 110 },
  'club-sandwich-pollo': { url: '../assets/dishes/club-sandwich-pollo.webp', name: 'Club Sándwich de Pollo', width: 190, height: 110 },
  'cheesecake-des': { url: '../assets/dishes/cheesecake.webp', name: 'Cheesecake', width: 175, height: 100 },
  'strudel-de-manzana-des': { url: '../assets/dishes/strudel-manzana.webp', name: 'Strudel de Manzana', width: 175, height: 100 },
  'malteadas-des': { url: '../assets/dishes/malteadas.webp', name: 'Malteadas', width: 175, height: 100 },
  'jugo-curandero': { url: '../assets/dishes/jugo-curandero.webp', name: 'Jugo Curandero', width: 180, height: 105 },
  'aguachile-la-curandera': { url: '../assets/dishes/aguachile-la-curandera.webp', name: 'Aguachile La Curandera', width: 200, height: 115 },
  'tampiquena-de-arrachera': { url: '../assets/dishes/tampiquena-arrachera.webp', name: 'Tampiqueña de Arrachera', width: 200, height: 115 },
  'rib-eye': { url: '../assets/dishes/rib-eye-guarniciones.webp', name: 'Rib Eye con Guarniciones', width: 210, height: 120 },
  'nachos-nortenos': { url: '../assets/dishes/nachos-nortenos.webp', name: 'Nachos Norteños', width: 180, height: 90 },
  'hamburguesa-de-la-casa': { url: '../assets/dishes/hamburguesa-de-la-casa.webp', name: 'Hamburguesa de la Casa', width: 190, height: 110 },
  'orden-alitas': { url: '../assets/dishes/alitas.webp', name: 'Alitas', width: 180, height: 105 },
  'morrito': { url: '../assets/dishes/morrito.webp', name: 'Morrito Infantil', width: 180, height: 105 },
  'cheesecake-com': { url: '../assets/dishes/cheesecake.webp', name: 'Cheesecake', width: 175, height: 100 },
  'malteadas-com': { url: '../assets/dishes/malteadas.webp', name: 'Malteadas', width: 175, height: 100 },
  'la-curandera-cocktail': { url: '../assets/dishes/mezcal-curandera.webp', name: 'La Curandera Mezcal', width: 190, height: 110 },
  'mojito-frutos-rojos': { url: '../assets/dishes/mojito-frutos-rojos.webp', name: 'Mojito Frutos Rojos', width: 180, height: 105 }
};

function renderDigitalColumn(categoriesData, colX, startY, options = {}) {
  const items = [];
  let curY = startY;
  const colWidth = options.maxWidth || 345;
  const maxLineChars = options.maxChars || 38;

  categoriesData.forEach(cat => {
    if (curY > startY) curY += (options.categorySpacing !== undefined ? options.categorySpacing : 22);

    if (cat.title) {
      items.push({
        id: `cat_title_${cat.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${curY}`,
        x: colX,
        y: curY,
        text: cat.title.toUpperCase(),
        fontSize: options.catTitleFontSize || 18,
        fontFamily: 'Gotham-Bold',
        color: cat.titleColor || options.defaultTitleColor || '#C94E8F',
        bold: true,
        maxWidth: colWidth
      });
      curY += options.catTitleHeight || 26;
    }

    if (cat.note) {
      const wrappedNote = wrapText(cat.note, maxLineChars);
      items.push({
        id: `cat_note_${(cat.id || (colX + '_' + curY)).replace(/[^a-z0-9]/gi, '_')}`,
        x: colX,
        y: curY,
        text: wrappedNote,
        fontSize: options.catNoteFontSize || 13,
        fontFamily: 'Montserrat',
        color: '#6D6258',
        bold: false,
        maxWidth: colWidth
      });
      const noteLines = wrappedNote.split('\n').length;
      curY += noteLines * 16.5 + 6;
    }

    (cat.products || []).forEach(itemDef => {
      const prod = typeof itemDef === 'string' ? getP(itemDef) : itemDef;
      const name = toStr(prod.name);
      const desc = toStr(prod.description);

      // TÍTULO DEL PRODUCTO / DESTILADO
      // Si tiene precios compuestos (ej. Copa $XX · Botella $YY), separamos elegantemente
      // el nombre en la primera línea y los precios en la segunda para que nunca colisionen
      // ni queden palabras o precios cortados de forma antiestética.
      let titleText;
      if (prod.customPriceText && prod.customPriceText.includes('·')) {
        titleText = `${name}\n${prod.customPriceText}`;
      } else {
        const rawTitle = prod.customPriceText ? `${name}  ·  ${prod.customPriceText}` : `${name}  ·  $${prod.price}`;
        titleText = wrapText(rawTitle, options.titleMaxChars || 32);
      }

      items.push({
        id: `item_${prod.id}_title`,
        dishId: prod.id,
        x: colX,
        y: curY,
        text: titleText,
        fontSize: options.dishTitleFontSize || 15.5,
        fontFamily: 'Gotham-Bold',
        color: '#1C1714',
        bold: true,
        maxWidth: colWidth
      });

      const titleLines = titleText.split('\n').length;
      curY += titleLines * (options.dishTitleLineHeight || 20) + 2;

      // Imagen vinculada directamente al platillo
      const imgDef = prod.image || (options.enableDishImages !== false ? DIGITAL_DISH_IMAGES[prod.id] : null);

      // DESCRIPCIÓN DEL PLATILLO
      if (desc) {
        const wrappedDesc = wrapText(desc, maxLineChars);
        items.push({
          id: `item_${prod.id}_desc`,
          dishId: prod.id,
          x: colX,
          y: curY,
          text: wrappedDesc,
          fontSize: options.dishDescFontSize || 12.5,
          fontFamily: 'Montserrat',
          color: '#554B43',
          bold: false,
          maxWidth: colWidth
        });
        const descLines = wrappedDesc.split('\n').length;
        curY += descLines * 16.5 + (imgDef ? 6 : (options.itemSpacing !== undefined ? options.itemSpacing : 8));
      } else {
        curY += (imgDef ? 4 : (options.itemSpacing !== undefined ? options.itemSpacing : 6));
      }

      // RENDERIZADO DE LA IMAGEN EN SU RESPECTIVO PLATILLO
      if (imgDef) {
        items.push({
          id: `img_${prod.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
          type: 'image',
          dishId: prod.id,
          dishName: imgDef.name || name,
          url: imgDef.url,
          x: colX,
          y: curY,
          width: imgDef.width || 190,
          height: imgDef.height || 110,
          borderRadius: 8
        });
        curY += (imgDef.height || 110) + (options.itemSpacing !== undefined ? options.itemSpacing : 12);
      }
    });
  });

  return { items, endY: curY };
}

// ============================================================================
// 1. DESAYUNOS (5 HOJAS DIGITALES)
// ============================================================================

function buildDesayunoDigital() {
  const pages = [];

  // Pág 1: Portada y Raíces
  pages.push({
    pageNumber: 1,
    width: 816,
    height: 1056,
    bgColor: '#FDF6EC',
    hasEmblem: true,
    items: [
      { id: 'des_d_p1_badge', x: 75, y: 55, text: '✦ CARTA FÍSICA · EDICIÓN MENÚ DIGITAL ✦', fontSize: 13.5, fontFamily: 'Gotham-Bold', color: '#E87850', bold: true },
      { id: 'des_d_p1_brand', x: 75, y: 98, text: 'LA CURANDERA', fontSize: 60, fontFamily: 'Hansief', color: '#C94E8F', bold: true },
      { id: 'des_d_p1_sub', x: 77, y: 172, text: 'COCINA TRADICIONAL & REMEDIOS DEL ALMA', fontSize: 16.5, fontFamily: 'Gotham-Bold', color: '#159F9B', bold: true },
      { id: 'des_d_p1_type', x: 77, y: 208, text: 'MENÚ DE DESAYUNOS Y JUGUERÍA ARTESANAL · SERVICIO DE 9:00 AM A 1:30 PM', fontSize: 13.5, fontFamily: 'Montserrat', color: '#2C2621', bold: true },
      { id: 'des_d_p1_sep1', x: 77, y: 240, text: '═════════════════════════════════════════════════', fontSize: 13, fontFamily: 'JetBrains Mono', color: '#E87850', bold: false },
      { id: 'des_d_p1_hist_t', x: 77, y: 280, text: 'EL AUTÉNTICO SABOR DE NUESTRAS RAÍCES', fontSize: 21, fontFamily: 'Gotham-Bold', color: '#1C1714', bold: true },
      { id: 'des_d_p1_hist_1', x: 77, y: 320, text: 'La Curandera nace de un sueño entre mi esposa y yo:\ncrear un lugar donde pudiéramos reunir todo lo que nos\ninspiraba en ese momento de la vida: la generosidad de la\ncocina tradicional, el amor a la tierra y el calor del hogar.', fontSize: 15.5, fontFamily: 'Montserrat', color: '#2C2621', bold: false, maxWidth: 660 },
      { id: 'des_d_p1_hist_2', x: 77, y: 428, text: 'Durante la búsqueda del nombre encontramos una coincidencia muy\nespecial: en mi familia, mi bisabuela era la curandera del pueblo,\nde esas mujeres que con hierbas, pócimas y remedios caseros\nlograban hacerte sentir mejor el cuerpo y el espíritu.', fontSize: 15.5, fontFamily: 'Montserrat', color: '#2C2621', bold: false, maxWidth: 660 },
      { id: 'des_d_p1_hist_3', x: 77, y: 536, text: 'Así adoptamos este nombre, como un homenaje sincero a esos\npersonajes místicos y a las tradiciones ancestrales que viven en\nnuestro México.', fontSize: 15.5, fontFamily: 'Montserrat', color: '#2C2621', bold: false, maxWidth: 660 },
      { id: 'des_d_p1_pil_t', x: 77, y: 635, text: '✦ NUESTROS COMPROMISOS CON TU MESA ✦', fontSize: 17, fontFamily: 'Gotham-Bold', color: '#159F9B', bold: true },
      { id: 'des_d_p1_p1', x: 77, y: 675, text: '✓ Carne 100% libre de clembuterol y de proveedores certificados', fontSize: 15, fontFamily: 'Montserrat', color: '#1C1714', bold: true, maxWidth: 660 },
      { id: 'des_d_p1_p2', x: 77, y: 715, text: '✓ Pan de masa madre artesanal en la mayoría de nuestros platillos', fontSize: 15, fontFamily: 'Montserrat', color: '#1C1714', bold: true, maxWidth: 660 },
      { id: 'des_d_p1_p3', x: 77, y: 755, text: '✓ Frutas, hortalizas y vegetales 100% frescos de la región', fontSize: 15, fontFamily: 'Montserrat', color: '#1C1714', bold: true, maxWidth: 660 },
      { id: 'des_d_p1_p4', x: 77, y: 795, text: '✓ Frijoles de la olla refritos a diario y tortillas hechas a mano', fontSize: 15, fontFamily: 'Montserrat', color: '#1C1714', bold: true, maxWidth: 660 },
      { id: 'des_d_p1_inc_t', x: 77, y: 848, text: '☀️ TODOS NUESTROS DESAYUNOS INCLUYEN:', fontSize: 16, fontFamily: 'Gotham-Bold', color: '#C94E8F', bold: true },
      { id: 'des_d_p1_inc_d', x: 77, y: 882, text: 'Café de olla, café americano o té + fruta de temporada +\njugo de temporada + bolillo tostado con mermelada de la casa.', fontSize: 15, fontFamily: 'Montserrat', color: '#2C2621', bold: false, maxWidth: 660 },
      ...createDigitalFooter(1, 5)
    ]
  });

  // Pág 2: Pa' Curar el Alma & Lo Enchi-loso
  const p2Items = [
    ...createDigitalHeader(2, 5, 'Desayunos', 'Huevos, Omelettes & Lo Enchi-loso'),
    {
      id: 'des_d_p2_banner',
      x: 55,
      y: 78,
      text: '★ Todos los desayunos incluyen: Café de olla / americano / té + fruta + jugo + bolillos tostados con mermelada de la casa.',
      fontSize: 11.5,
      fontFamily: 'Gotham-Bold',
      color: '#E87850',
      bold: true,
      maxWidth: 710
    }
  ];

  const col1P2 = renderDigitalColumn([
    {
      title: "☀️ Pa' Curar el Alma",
      note: 'Servidos con frijoles refritos y totopos crujientes.',
      products: [
        'huevos-revueltos',
        'huevos-rancheros',
        'huevos-divorciados',
        'huevos-nortenos',
        'huevos-caldo-de-oso',
        'omelette-rajas-poblanas',
        'omelette-jamon-queso',
        'omelette-champinon-queso',
        'molletes-clasicos',
        'molletes-longaniza',
        'mollepizza'
      ]
    }
  ], 55, 102, { itemSpacing: 3.5, dishTitleHeight: 18.5 });
  p2Items.push(...col1P2.items);

  const col2P2 = renderDigitalColumn([
    {
      title: '🌶️ Lo Enchi-loso',
      note: 'Chilaquiles y enchiladas con salsas artesanales de la casa.',
      products: [
        'enchiladas-tradicionales',
        'enchiladas-la-curandera',
        'enchiladas-suizas',
        'enchiladas-yucas',
        'enchiladas-del-patron',
        'chilaquiles-tradicionales',
        'chilaquiles-la-curandera',
        'chilaquiles-del-patron',
        'enfrijoladas-de-pollo'
      ]
    }
  ], 425, 102, { itemSpacing: 6, dishTitleHeight: 20 });
  p2Items.push(...col2P2.items);

  p2Items.push(...createDigitalFooter(2, 5));
  pages.push({ pageNumber: 2, width: 816, height: 1056, bgColor: '#FDF6EC', hasEmblem: false, items: p2Items });

  // Pág 3: Tacos Dorados, Sándwich y Algo Más & Pa' Caldear
  const p3Items = [
    ...createDigitalHeader(3, 5, 'Desayunos', 'Tacos Dorados, Sándwiches & Pa\' Caldear')
  ];

  const col1P3 = renderDigitalColumn([
    {
      title: '🌮 Tacos Dorados',
      note: '3 piezas acompañadas de lechuga, queso y crema.',
      products: [
        'tacos-dorados-pollo',
        'tacos-dorados-frijol-pollo',
        'tacos-dorados-frijol-queso'
      ]
    },
    {
      title: '🥪 Sándwich y Algo Más',
      note: 'Acompañados de papas a la francesa sazonadas.',
      products: [
        'club-sandwich',
        'club-sandwich-pollo',
        'tostado-aguacate-huevo'
      ]
    }
  ], 55, 95, { categorySpacing: 25, itemSpacing: 10 });
  p3Items.push(...col1P3.items);

  const col2P3 = renderDigitalColumn([
    {
      title: "🍲 Pa' Caldear",
      note: 'Caldos sustanciosos y reparadores servidos bien calientes.',
      products: [
        'pancita-o-menudo'
      ]
    }
  ], 425, 95, { itemSpacing: 12 });
  p3Items.push(...col2P3.items);

  p3Items.push({
    id: 'des_d_p3_note_box',
    x: 425,
    y: col2P3.endY + 25,
    text: '✦ SAZÓN TRADICIONAL ✦\nTodos nuestros caldos son elaborados con receta familiar y servidos con aguacate, orégano y bolillo crujiente recién tostado.',
    fontSize: 13.5,
    fontFamily: 'Montserrat',
    color: '#6D6258',
    bold: false,
    maxWidth: 360
  });

  p3Items.push(...createDigitalFooter(3, 5));
  pages.push({ pageNumber: 3, width: 816, height: 1056, bgColor: '#FDF6EC', hasEmblem: false, items: p3Items });

  // Pág 4: Dulce Remedio (Desayuno) & Pa' Los Peques
  const p4Items = [
    ...createDigitalHeader(4, 5, 'Desayunos', 'Dulce Remedio · Panes, Postres & Niños')
  ];

  const col1P4 = renderDigitalColumn([
    {
      title: '🥞 Hot-cakes & Pan Francés',
      note: '3 piezas esponjosas con fresas y topping a elegir.',
      products: [
        'hot-cakes',
        'pan-frances'
      ]
    },
    {
      title: '🍰 Postres Caseros',
      note: 'Recetas de la abuela elaboradas a diario.',
      products: [
        'strudel-de-manzana-des',
        'cheesecake-des',
        'panque-de-elote-des',
        'tarta-de-nata-des'
      ]
    }
  ], 55, 95, { categorySpacing: 25, itemSpacing: 10 });
  p4Items.push(...col1P4.items);

  const col2P4 = renderDigitalColumn([
    {
      title: '🍨 Helados & Malteadas',
      note: 'Vainilla, chocolate, fresa o cookies and cream.',
      products: [
        'helado-des',
        'malteadas-des'
      ]
    },
    {
      title: "👶 Pa' Los Peques",
      note: 'Porciones individuales pensadas para los reyes del hogar.',
      products: [
        'calate',
        'chilpayate'
      ]
    }
  ], 425, 95, { categorySpacing: 25, itemSpacing: 10 });
  p4Items.push(...col2P4.items);

  p4Items.push(...createDigitalFooter(4, 5));
  pages.push({ pageNumber: 4, width: 816, height: 1056, bgColor: '#FDF6EC', hasEmblem: false, items: p4Items });

  // Pág 5: Juguería, Cafetería & Bebidas
  const p5Items = [
    ...createDigitalHeader(5, 5, 'Desayunos', 'Juguería, Cafetería & Bebidas Naturales')
  ];

  const col1P5 = renderDigitalColumn([
    {
      title: '🍊 Juguería La Curandera',
      note: 'Jugos 100% naturales exprimidos al momento.',
      products: [
        'jugo-clasico',
        'jugo-rojo-amor',
        'jugo-pura-vitamina-c',
        'jugo-verde',
        'jugo-curandero'
      ]
    },
    {
      title: "☕ Pa' Calentar el Espíritu",
      note: 'Cafés de altura, infusiones y chocolate tradicional.',
      products: [
        'chocolate-tradicional',
        'lechero',
        'capuchino',
        'cafe-de-olla',
        'cafe-americano',
        'te'
      ]
    }
  ], 55, 95, { categorySpacing: 22, itemSpacing: 6 });
  p5Items.push(...col1P5.items);

  const col2P5 = renderDigitalColumn([
    {
      title: '🥤 Bebidas Sin Alcohol',
      note: 'Refrescos fríos y jarras tradicionales para compartir.',
      products: [
        'agua-natural-embotellada',
        'agua-mineral-directa',
        'agua-mineral-preparada',
        'juguito-infantil',
        'refresco-de-vidrio',
        'jarra-de-agua-2l',
        'jarra-de-agua-curandera-2l'
      ]
    },
    {
      title: '🍹 Mocktelería (Cero Alcohol)',
      note: 'Coctelería artesanal sin alcohol, mucho sabor y frescura.',
      products: [
        'limonada',
        'naranjada',
        'pinada',
        'pitufo-mocktail'
      ]
    }
  ], 425, 95, { categorySpacing: 22, itemSpacing: 6 });
  p5Items.push(...col2P5.items);

  p5Items.push(...createDigitalFooter(5, 5));
  pages.push({ pageNumber: 5, width: 816, height: 1056, bgColor: '#FDF6EC', hasEmblem: false, items: p5Items });

  return pages;
}

// ============================================================================
// 2. COMIDAS (7 HOJAS DIGITALES)
// ============================================================================

function buildComidaDigital() {
  const pages = [];

  // Pág 1: Portada
  pages.push({
    pageNumber: 1,
    width: 816,
    height: 1056,
    bgColor: '#FDF6EC',
    hasEmblem: true,
    items: [
      { id: 'com_d_p1_badge', x: 75, y: 55, text: '✦ CARTA FÍSICA · EDICIÓN MENÚ DIGITAL ✦', fontSize: 13.5, fontFamily: 'Gotham-Bold', color: '#E87850', bold: true },
      { id: 'com_d_p1_brand', x: 75, y: 98, text: 'LA CURANDERA', fontSize: 60, fontFamily: 'Hansief', color: '#C94E8F', bold: true },
      { id: 'com_d_p1_sub', x: 77, y: 172, text: 'COCINA TRADICIONAL, CORTES SELECTOS & ASADOR', fontSize: 16.5, fontFamily: 'Gotham-Bold', color: '#159F9B', bold: true },
      { id: 'com_d_p1_type', x: 77, y: 208, text: 'MENÚ DE COMIDAS · SERVICIO DE 1:30 PM A 7:30 PM', fontSize: 13.5, fontFamily: 'Montserrat', color: '#2C2621', bold: true },
      { id: 'com_d_p1_sep1', x: 77, y: 240, text: '═════════════════════════════════════════════════', fontSize: 13, fontFamily: 'JetBrains Mono', color: '#E87850', bold: false },
      { id: 'com_d_p1_hist_t', x: 77, y: 280, text: 'COCINA QUE CURA, TRAGOS QUE CONECTAN', fontSize: 21, fontFamily: 'Gotham-Bold', color: '#1C1714', bold: true },
      { id: 'com_d_p1_hist_1', x: 77, y: 320, text: 'Nuestra cocina rinde tributo a las recetas familiares de Tenancingo\ny el Valle de Toluca. Carne seleccionada libre de clembuterol,\nsalsas hechas a mano en molcajete y cortes a la parrilla con\nguarniciones tradicionales.', fontSize: 15.5, fontFamily: 'Montserrat', color: '#2C2621', bold: false, maxWidth: 660 },
      { id: 'com_d_p1_hist_2', x: 77, y: 440, text: 'Cada platillo está preparado con el respeto y el tiempo que merece.\nAquí te consentimos con comida reconfortante, tortillas calientes\ny recetas de herencia viva.', fontSize: 15.5, fontFamily: 'Montserrat', color: '#2C2621', bold: false, maxWidth: 660 },
      { id: 'com_d_p1_pil_t', x: 77, y: 560, text: '✦ MANIFIESTO DE NUESTRA COCINA ✦', fontSize: 17, fontFamily: 'Gotham-Bold', color: '#159F9B', bold: true },
      { id: 'com_d_p1_p1', x: 77, y: 605, text: '✓ Carne selecta 100% libre de clembuterol', fontSize: 15, fontFamily: 'Montserrat', color: '#1C1714', bold: true, maxWidth: 660 },
      { id: 'com_d_p1_p2', x: 77, y: 650, text: '✓ Cortes de res de 300 a 350 gr con 3 guarniciones a elegir', fontSize: 15, fontFamily: 'Montserrat', color: '#1C1714', bold: true, maxWidth: 660 },
      { id: 'com_d_p1_p3', x: 77, y: 695, text: '✓ Mariscos frescos preparados al momento con sazón de costa', fontSize: 15, fontFamily: 'Montserrat', color: '#1C1714', bold: true, maxWidth: 660 },
      { id: 'com_d_p1_p4', x: 77, y: 740, text: '✓ Salsas martajadas y chiles tatemados a la leña', fontSize: 15, fontFamily: 'Montserrat', color: '#1C1714', bold: true, maxWidth: 660 },
      ...createDigitalFooter(1, 7)
    ]
  });

  // Pág 2: Sabores de Mar & Pa' Empezar
  const p2Items = [
    ...createDigitalHeader(2, 7, 'Comidas', 'Sabores de Mar & Entradas')
  ];

  const col1P2 = renderDigitalColumn([
    {
      title: '🌊 Sabores de Mar',
      note: 'Mariscos frescos con el toque cítrico y picante de la casa.',
      products: [
        'aguachile-rojo',
        'aguachile-jade',
        'aguachile-la-curandera',
        'ceviche-tropical',
        'ceviche-clasico',
        'camarones-bravos',
        'filete-de-pescado'
      ]
    }
  ], 55, 95, { itemSpacing: 10 });
  p2Items.push(...col1P2.items);

  const col2P2 = renderDigitalColumn([
    {
      title: "🍲 Pa' Empezar (Entradas)",
      note: 'Ideales para compartir al centro antes de tus cortes.',
      products: [
        'cazuela-queso-fundido',
        'cazuela-frijoles',
        'guacamole-tradicional',
        'guacamole-chicharron-norteno',
        'huevitos-de-codorniz',
        'orden-sopecitos',
        'costillas-de-elote'
      ]
    }
  ], 425, 95, { itemSpacing: 10 });
  p2Items.push(...col2P2.items);

  p2Items.push(...createDigitalFooter(2, 7));
  pages.push({ pageNumber: 2, width: 816, height: 1056, bgColor: '#FDF6EC', hasEmblem: false, items: p2Items });

  // Pág 3: Pa' Cuidarte & Sopas y Pastas
  const p3Items = [
    ...createDigitalHeader(3, 7, 'Comidas', 'Ensaladas & Sopas y Pastas')
  ];

  const col1P3 = renderDigitalColumn([
    {
      title: "🥗 Pa' Cuidarte (Ensaladas)",
      note: 'Hojas frescas de huerto con aderezos de la casa.',
      products: [
        'ensalada-la-curandera',
        'ensalada-campesina'
      ]
    },
    {
      title: '🍜 Sopas y Pastas',
      note: 'Caldillos tradicionales servidos con totopos y aguacate.',
      products: [
        'sopa-azteca',
        'sopa-de-medula',
        'fusilli-al-chipotle',
        'carne-en-su-jugo',
        'consome-de-pollo',
        'pancita-comida'
      ]
    }
  ], 55, 95, { categorySpacing: 25, itemSpacing: 10 });
  p3Items.push(...col1P3.items);

  const col2P3 = renderDigitalColumn([
    {
      title: '🥘 Platos Fuertes (Especialidades)',
      note: 'Nuestras mejores recetas con cecinas, pechugas y salsas rojas.',
      products: [
        'tampiquena-la-curandera',
        'tampiquena-de-arrachera',
        'cecina-roja',
        'milanesa-cordon-bleu'
      ]
    }
  ], 425, 95, { itemSpacing: 12 });
  p3Items.push(...col2P3.items);

  p3Items.push(...createDigitalFooter(3, 7));
  pages.push({ pageNumber: 3, width: 816, height: 1056, bgColor: '#FDF6EC', hasEmblem: false, items: p3Items });

  // Pág 4: Platos Fuertes (Pechugas & Enchiladas), Cortes a las Brasas & Taquería
  const p4Items = [
    ...createDigitalHeader(4, 7, 'Comidas', 'Platos Fuertes, Cortes & Taquería')
  ];

  const col1P4 = renderDigitalColumn([
    {
      title: '🍗 Platos Fuertes (Pechugas & Enchiladas)',
      note: 'Acompañados de ensaladas frescas y arroz.',
      products: [
        'pechuga-a-la-plancha',
        'pechuga-empanizada',
        'enchiladas-yucas-comida',
        'enchiladas-del-patron-comida',
        'enfrijoladas-de-pollo-comida'
      ]
    },
    {
      title: '🌮 Taquería La Curandera',
      note: '3 tacos en tortilla de maíz o harina, acompañados de nopales, cebolla y frijoles.',
      products: [
        'orden-tacos-estandar',
        'orden-tacos-premium'
      ]
    }
  ], 55, 95, { categorySpacing: 20, itemSpacing: 8 });
  p4Items.push(...col1P4.items);

  const col2P4 = renderDigitalColumn([
    {
      title: '🥩 Cortes a las Brasas (300 - 350 gr)',
      note: 'Incluyen 3 guarniciones a elegir: nopales y cebollas, piña asada, guacamole, elote amarillo, cebollitas cambray, queso asado, frijoles.',
      products: [
        't-bone',
        'new-york',
        'rib-eye',
        'picana'
      ]
    }
  ], 425, 95, { itemSpacing: 10 });
  p4Items.push(...col2P4.items);

  p4Items.push(...createDigitalFooter(4, 7));
  pages.push({ pageNumber: 4, width: 816, height: 1056, bgColor: '#FDF6EC', hasEmblem: false, items: p4Items });

  // Pág 5: Burritos, Hamburguesas & Snacks
  const p5Items = [
    ...createDigitalHeader(5, 7, 'Comidas', 'Burritos, Burgers & Snacks')
  ];

  const col1P5 = renderDigitalColumn([
    {
      title: '🌯 Burritos en Tortilla de Harina',
      note: 'Con queso manchego, frijoles y aderezo chipotle cremoso.',
      products: [
        'burrito-bistec',
        'burrito-arrachera',
        'burrito-campechano',
        'burrito-cochinita-pibil'
      ]
    },
    {
      title: '🍟 Snacks para Compartir',
      note: 'Botanas crujientes con especias y queso fundido.',
      products: [
        'papas-gajo',
        'papas-a-la-francesa',
        'nachos-nortenos',
        'nachos-con-arrachera'
      ]
    }
  ], 55, 95, { categorySpacing: 16, itemSpacing: 4.5 });
  p5Items.push(...col1P5.items);

  const col2P5 = renderDigitalColumn([
    {
      title: '🍔 Burgers de Res Selecta',
      note: 'Carne jugosa con quesos amarillo y manchego, lechuga y tomate.',
      products: [
        'hamburguesa-tradicional',
        'hamburguesa-hawaiana',
        'hamburguesa-bbq',
        'hamburguesa-de-la-casa',
        'hamburguesa-de-arrachera',
        'hamburguesa-monchosa'
      ]
    }
  ], 425, 95, { itemSpacing: 10 });
  p5Items.push(...col2P5.items);

  p5Items.push(...createDigitalFooter(5, 7));
  pages.push({ pageNumber: 5, width: 816, height: 1056, bgColor: '#FDF6EC', hasEmblem: false, items: p5Items });

  // Pág 6: Alitas, Para los Morrillos & Postres
  const p6Items = [
    ...createDigitalHeader(6, 7, 'Comidas', 'Alitas, Menú Infantil & Postres')
  ];

  const col1P6 = renderDigitalColumn([
    {
      title: '🍗 Alitas La Curandera',
      note: 'Crujientes y doraditas, acompañadas con apio, pepino y zanahoria.',
      products: [
        'orden-alitas'
      ]
    },
    {
      title: '👶 Para los Morrillos (Niños)',
      note: 'Paquetes completos con bebida para los pequeños.',
      products: [
        'morrito',
        'escuinclito'
      ]
    }
  ], 55, 95, { categorySpacing: 35, itemSpacing: 14 });
  p6Items.push(...col1P6.items);

  const col2P6 = renderDigitalColumn([
    {
      title: '🍰 Dulce Remedio (Postres)',
      note: 'Recetas caseras y pan artesanal de la región.',
      products: [
        'strudel-de-manzana-com',
        'cheesecake-com',
        'panque-de-elote-com',
        'tarta-de-nata-com',
        'pan-arabe-de-la-region',
        'helado-com',
        'malteadas-com'
      ]
    }
  ], 425, 95, { categorySpacing: 25, itemSpacing: 10 });
  p6Items.push(...col2P6.items);

  p6Items.push(...createDigitalFooter(6, 7));
  pages.push({ pageNumber: 6, width: 816, height: 1056, bgColor: '#FDF6EC', hasEmblem: false, items: p6Items });

  // Pág 7: Cafetería & Bebidas Sin Alcohol / Mocktails
  const p7Items = [
    ...createDigitalHeader(7, 7, 'Comidas', 'Cafetería, Jarras & Bebidas')
  ];

  const col1P7 = renderDigitalColumn([
    {
      title: "☕ Pa' Calentar el Espíritu",
      note: 'Cafés calientes de grano selecto y chocolate.',
      products: [
        'chocolate-tradicional',
        'lechero',
        'capuchino',
        'cafe-de-olla',
        'cafe-americano',
        'te'
      ]
    },
    {
      title: '🍹 Mocktelería (Cero Alcohol)',
      note: 'Coctelería fresca con frutas naturales.',
      products: [
        'limonada',
        'naranjada',
        'pinada',
        'pitufo-mocktail'
      ]
    }
  ], 55, 95, { categorySpacing: 25, itemSpacing: 9 });
  p7Items.push(...col1P7.items);

  const col2P7 = renderDigitalColumn([
    {
      title: '🥤 Bebidas Sin Alcohol',
      note: 'Aguas frescas, jarras familiares de 2 litros y refrescos.',
      products: [
        'agua-natural-embotellada',
        'agua-mineral-directa',
        'agua-mineral-preparada',
        'juguito-infantil',
        'refresco-de-vidrio',
        'jarra-de-agua-2l',
        'jarra-de-agua-curandera-2l'
      ]
    }
  ], 425, 95, { itemSpacing: 10 });
  p7Items.push(...col2P7.items);

  p7Items.push(...createDigitalFooter(7, 7));
  pages.push({ pageNumber: 7, width: 816, height: 1056, bgColor: '#FDF6EC', hasEmblem: false, items: p7Items });

  return pages;
}

// ============================================================================
// 3. CANTINA (5 HOJAS DIGITALES - ¡NUEVO!)
// ============================================================================

function buildCantinaDigital() {
  const pages = [];

  // Pág 1: Portada Cantina & De la Casa con Mezcal
  const p1Items = [
    { id: 'can_d_p1_badge', x: 75, y: 55, text: '✦ CARTA FÍSICA · CANTINA & DESTILADOS ✦', fontSize: 13.5, fontFamily: 'Gotham-Bold', color: '#E87850', bold: true },
    { id: 'can_d_p1_brand', x: 75, y: 98, text: 'CANTINA LA CURANDERA', fontSize: 54, fontFamily: 'Hansief', color: '#C94E8F', bold: true },
    { id: 'can_d_p1_sub', x: 77, y: 172, text: '"AQUÍ TE LA VAMOS A CURAR" · MEZCALERÍA & COCTELERÍA DE AUTOR', fontSize: 16.5, fontFamily: 'Gotham-Bold', color: '#159F9B', bold: true },
    { id: 'can_d_p1_type', x: 77, y: 208, text: 'DISPONIBLE EN TODO EL HORARIO DE SERVICIO', fontSize: 13.5, fontFamily: 'Montserrat', color: '#2C2621', bold: true },
    { id: 'can_d_p1_banner', x: 77, y: 242, text: '🍾 TODA BOTELLA INCLUYE SERVICIO DE MEZCLADORES', fontSize: 14.5, fontFamily: 'Gotham-Bold', color: '#E87850', bold: true },
    { id: 'can_d_p1_sep1', x: 77, y: 275, text: '═════════════════════════════════════════════════', fontSize: 13, fontFamily: 'JetBrains Mono', color: '#E87850', bold: false }
  ];

  const col1P1 = renderDigitalColumn([
    {
      title: "🌿 Pa' Curar",
      note: 'El mejor remedio; se toma derecho o con agua mineral.',
      products: [
        'piedra'
      ]
    }
  ], 77, 315, { itemSpacing: 14 });
  p1Items.push(...col1P1.items);

  p1Items.push({
    id: 'can_d_p1_quote',
    x: 77,
    y: col1P1.endY + 25,
    text: '"Pa\' todo mal, mezcal;\ny pa\' todo bien, también...;\ny si no hay remedio: litro y medio."',
    fontSize: 16,
    fontFamily: 'Gotham-Bold',
    color: '#E87850',
    bold: true,
    maxWidth: 345
  });

  const col2P1 = renderDigitalColumn([
    {
      title: '🌵 De la Casa (Con Mezcal)',
      note: 'Creaciones exclusivas de la casa con mezcal artesanal.',
      products: [
        'la-curandera-cocktail',
        'mezcalita-casa',
        'cantarito-casa',
        'mojito-con-mezcal',
        'baby-mango-con-mezcal'
      ]
    }
  ], 425, 315, { itemSpacing: 12 });
  p1Items.push(...col2P1.items);

  p1Items.push(...createDigitalFooter(1, 5));
  pages.push({ pageNumber: 1, width: 816, height: 1056, bgColor: '#FDF6EC', hasEmblem: true, items: p1Items });

  // Pág 2: Coctelería Refrescante & Lo Más Pedido
  const p2Items = [
    ...createDigitalHeader(2, 5, 'Cantina', 'Coctelería Refrescante & Lo Más Pedido')
  ];

  const col1P2 = renderDigitalColumn([
    {
      title: '🍹 Cocteles Refrescantes',
      note: 'Con rones selectos, ginebras, vodka y tequilas.',
      products: [
        'mojito-tradicional',
        'mojito-frutos-rojos',
        'baby-mango',
        'gin-tonic',
        'gin-frutos-rojos',
        'cosmopolitan',
        'paloma',
        'quemadita'
      ]
    }
  ], 55, 95, { itemSpacing: 10 });
  p2Items.push(...col1P2.items);

  const col2P2 = renderDigitalColumn([
    {
      title: '⭐ Lo Más Pedido',
      note: 'Los favoritos de nuestros comensales.',
      products: [
        'pina-colada',
        'tom-collins',
        'tequila-sunrise',
        'bloody-mary',
        'mezcalita-lo-mas-pedido',
        'cantarito-lo-mas-pedido',
        'margarita',
        'pitufo-cantina',
        'ruso-blanco',
        'aperol-sunrise',
        'aperol-spritz'
      ]
    }
  ], 425, 95, { itemSpacing: 7 });
  p2Items.push(...col2P2.items);

  p2Items.push(...createDigitalFooter(2, 5));
  pages.push({ pageNumber: 2, width: 816, height: 1056, bgColor: '#FDF6EC', hasEmblem: false, items: p2Items });

  // Pág 3: Cervezas, Tarros Preparados & Vinos
  const p3Items = [
    ...createDigitalHeader(3, 5, 'Cantina', 'Cervezas Frías, Tarros & Vinos'),
    {
      id: 'can_d_p3_quote',
      x: 55,
      y: 78,
      text: '"Amor, alegría y cerveza fría"',
      fontSize: 13.5,
      fontFamily: 'Gotham-Bold',
      color: '#E87850',
      bold: true,
      maxWidth: 345
    }
  ];

  const col1P3 = renderDigitalColumn([
    {
      title: '🍺 Cervezas Nacionales',
      note: 'Botellas de 355 ml servidas bien heladas.',
      products: [
        'victoria',
        'corona-clara',
        'corona-oscura',
        'modelo-especial',
        'negra-modelo',
        'modelo-especial-0'
      ]
    },
    {
      title: "🌶️ Pa' Tu Cerveza (Tarros Preparados)",
      note: 'Preparamos tu tarro con la cerveza de tu elección.',
      products: [
        'pa-tu-cerveza-escarchado',
        'pa-tu-cerveza-clamatado',
        'pa-tu-cerveza-cubano'
      ]
    }
  ], 55, 105, { categorySpacing: 24, itemSpacing: 10 });
  p3Items.push(...col1P3.items);

  const col2P3 = renderDigitalColumn([
    {
      title: '🍻 Tarros de a Litro',
      note: 'La porción ideal para disfrutar con calma.',
      products: [
        'tarro-litro-directo',
        'tarro-litro-escarchado',
        'tarro-litro-clamatado',
        'tarro-litro-cubano'
      ]
    },
    {
      title: '🍷 Vinos de la Casa',
      note: 'Para acompañar carnes selectas y tertulias.',
      products: [
        'jarra-de-clericot',
        'botella-de-vino'
      ]
    }
  ], 425, 105, { categorySpacing: 24, itemSpacing: 10 });
  p3Items.push(...col2P3.items);

  p3Items.push(...createDigitalFooter(3, 5));
  pages.push({ pageNumber: 3, width: 816, height: 1056, bgColor: '#FDF6EC', hasEmblem: false, items: p3Items });

  // Pág 4: Licores y Destilados I: Mezcal Artesanal & Tequilas
  const p4Items = [
    ...createDigitalHeader(4, 5, 'Cantina', 'Mezcal Artesanal & Tequilas'),
    {
      id: 'can_d_p4_banner',
      x: 55,
      y: 78,
      text: '🍾 TODA BOTELLA INCLUYE SERVICIO DE MEZCLADORES',
      fontSize: 13,
      fontFamily: 'Gotham-Bold',
      color: '#E87850',
      bold: true,
      maxWidth: 710
    }
  ];

  const col1P4 = renderDigitalColumn([
    {
      title: '🏺 Mezcal Artesanal',
      note: '"Pa\' todo mal, mezcal… y pa\' todo bien, también"\nDestilados tradicionales. Precio por Copa y Botella.',
      products: [
        { id: 'mezcal-san-mateo-despoblado', name: 'San Mateo Despoblado', price: 70, customPriceText: 'Copa $70 · Botella $650', description: 'Mezcal artesanal de la región.' },
        { id: 'mezcal-don-simitrio', name: 'Don Simitrio', price: 75, customPriceText: 'Copa $75 · Botella $700', description: 'Agave espadín cocido en horno de tierra.' },
        { id: 'mezcal-atempa', name: 'Atempa', price: 70, customPriceText: 'Copa $70 · Botella $650', description: 'Notas ahumadas y terrosas tradicionales.' },
        { id: 'mezcal-chintamalco', name: 'Chintamalco', price: 70, customPriceText: 'Copa $70 · Botella $650', description: 'Destilado suave con matices herbales.' },
        { id: 'mezcal-cannabis-santa-ana', name: 'Cannabis Santa Ana', price: 75, customPriceText: 'Copa $75 · Botella $750', description: 'Maceración especial artesanal de la casa.' }
      ]
    }
  ], 55, 105, { itemSpacing: 14 });
  p4Items.push(...col1P4.items);

  const col2P4 = renderDigitalColumn([
    {
      title: '🥃 Tequilas Selectos',
      note: '"Los besos, como el tequila, se piden dobles"\nAgave azul selecto. Precio por Copa y Botella.',
      products: [
        { id: 'tequila-jose-cuervo-tradicional', name: 'José Cuervo Tradicional', price: 85, customPriceText: 'Copa $85 · Botella $850', description: 'Reposado 100% agave azul.' },
        { id: 'tequila-plata', name: 'Tequila Plata', price: 85, customPriceText: 'Copa $85 · Botella $850', description: 'Notas frescas, cítricas y cristalinas.' },
        { id: 'tequila-don-julio-reposado', name: 'Don Julio Reposado', price: 110, customPriceText: 'Copa $110 · Botella $1,300', description: 'Madurado en barricas de roble blanco.' },
        { id: 'tequila-don-julio-blanco', name: 'Don Julio Blanco', price: 95, customPriceText: 'Copa $95 · Botella $1,200', description: 'Pura esencia de agave azul dulce.' },
        { id: 'tequila-don-julio-70', name: 'Don Julio 70', price: 155, customPriceText: 'Copa $155 · Botella $2,200', description: 'Añejo cristalino legendario.' }
      ]
    }
  ], 425, 105, { itemSpacing: 14 });
  p4Items.push(...col2P4.items);

  p4Items.push(...createDigitalFooter(4, 5));
  pages.push({ pageNumber: 4, width: 816, height: 1056, bgColor: '#FDF6EC', hasEmblem: false, items: p4Items });

  // Pág 5: Licores y Destilados II: Whisky, Vodka, Ron, Cognac & Digestivos
  const p5Items = [
    ...createDigitalHeader(5, 5, 'Cantina', 'Whiskies, Vodkas, Ron & Digestivos'),
    {
      id: 'can_d_p5_banner',
      x: 55,
      y: 78,
      text: '🍾 TODA BOTELLA INCLUYE SERVICIO DE MEZCLADORES',
      fontSize: 13,
      fontFamily: 'Gotham-Bold',
      color: '#E87850',
      bold: true,
      maxWidth: 710
    }
  ];

  const col1P5 = renderDigitalColumn([
    {
      title: '🥃 Whiskies & Licores Finos',
      note: 'Escoceses selectos servidos en las rocas o con mezclador.',
      products: [
        { id: 'whisky-etiqueta-roja', name: 'Johnnie Walker Etiqueta Roja', price: 85, customPriceText: 'Copa $85 · Botella $900', description: 'Blended Scotch Whisky.' },
        { id: 'whisky-etiqueta-negra', name: 'Johnnie Walker Etiqueta Negra', price: 115, customPriceText: 'Copa $115 · Botella $1,700', description: 'Añejamiento 12 años.' },
        { id: 'whisky-buchanans-12', name: "Buchanan's 12", price: 125, customPriceText: 'Copa $125 · Botella $1,800', description: 'Suave y afrutado de alta gama.' },
        { id: 'whisky-buchanans-18', name: "Buchanan's 18", price: 250, customPriceText: 'Copa $250 · Botella $3,200', description: 'Gran Reserva 18 años.' }
      ]
    },
    {
      title: '🍸 Vodka Premium',
      note: '"Un trago de vodka al día, es la clave de la alegría"',
      products: [
        { id: 'vodka-smirnoff', name: 'Smirnoff', price: 75, customPriceText: 'Copa $75 · Botella $750', description: 'Triple destilación.' },
        { id: 'vodka-absolut', name: 'Absolut', price: 75, customPriceText: 'Copa $75 · Botella $750', description: 'Trigo de invierno sueco.' }
      ]
    }
  ], 55, 105, { categorySpacing: 25, itemSpacing: 12 });
  p5Items.push(...col1P5.items);

  const col2P5 = renderDigitalColumn([
    {
      title: '🍹 Ron & Cognac',
      note: 'Destilados de caña y uva añejados en roble.',
      products: [
        { id: 'ron-bacardi-blanco', name: 'Bacardí Blanco', price: 80, customPriceText: 'Copa $80 · Botella $800', description: 'Ron clásico caribeño.' },
        { id: 'cognac-martell-vsop', name: 'Martell VSOP', price: 205, customPriceText: 'Copa $205 · Botella $2,300', description: 'Cognac francés en barrica de roble.' }
      ]
    },
    {
      title: '☕ Digestivos & Sobremesa',
      note: 'Para cerrar una gran velada en La Curandera.',
      products: [
        'digestivo-baileys',
        'digestivo-licor-43',
        'digestivo-carajillo'
      ]
    }
  ], 425, 105, { categorySpacing: 25, itemSpacing: 12 });
  p5Items.push(...col2P5.items);

  p5Items.push(...createDigitalFooter(5, 5));
  pages.push({ pageNumber: 5, width: 816, height: 1056, bgColor: '#FDF6EC', hasEmblem: false, items: p5Items });

  return pages;
}

// ============================================================================
// CONVERTIDOR INTELIGENTE A TRADICIONAL (KRAFT RÚSTICO & TYPEWRITER)
// ============================================================================

function createTradHeader(pageNumber, totalPages, typeName, subTitle) {
  return [
    {
      id: `trad_hdr_brand_${pageNumber}`,
      x: 65,
      y: 45,
      text: 'L A   C U R A N D E R A',
      fontSize: 15,
      fontFamily: 'Hansief',
      color: '#000000',
      bold: true
    },
    {
      id: `trad_hdr_tag_${pageNumber}`,
      x: 310,
      y: 48,
      text: `${typeName.toUpperCase()} - ${subTitle.toUpperCase()}`,
      fontSize: 9.5,
      fontFamily: 'SourceCodeVariable-Roman',
      color: '#000000',
      bold: true
    },
    {
      id: `trad_hdr_pnum_${pageNumber}`,
      x: 690,
      y: 48,
      text: `HOJA ${pageNumber} DE ${totalPages}`,
      fontSize: 9.5,
      fontFamily: 'SourceCodeVariable-Roman',
      color: '#000000',
      bold: true
    },
    {
      id: `trad_hdr_sep_${pageNumber}`,
      x: 65,
      y: 68,
      text: '═════════════════════════════════════════════════════════════════════',
      fontSize: 10,
      fontFamily: 'SourceCodeVariable-Roman',
      color: 'rgba(0, 0, 0, 0.25)',
      bold: false
    }
  ];
}

function convertDigitalPagesToTradicional(digitalPages, typeName) {
  return digitalPages.map((dPage, pIdx) => {
    const pNum = dPage.pageNumber;
    const totalP = digitalPages.length;

    // Portada en tradicional
    if (pNum === 1) {
      return {
        pageNumber: 1,
        width: 816,
        height: 1056,
        bgColor: typeName === 'comida' ? '#CCAD93' : (typeName === 'cantina' ? '#CCAD93' : '#00b4a0'),
        hasEmblem: true,
        items: [
          { id: `trad_p1_brand`, x: 95, y: 760, text: 'L A   C U R A N D E R A', fontSize: 68, fontFamily: 'Hansief', color: '#000000', bold: true },
          { id: `trad_p1_tag`, x: 95, y: 400, text: `CARTA FÍSICA · MENÚ DE ${typeName.toUpperCase()}`, fontSize: 13, fontFamily: 'SourceCodeVariable-Roman', color: '#000000', bold: true },
          { id: `trad_p1_text1`, x: 95, y: 440, text: 'La Curandera nace de un sueño entre mi esposa y yo:\ncrear un lugar donde pudiéramos reunir todo lo que nos\ninspiraba en ese momento de la vida: la generosidad de la\ncocina tradicional, el amor a la tierra y el calor del hogar.', fontSize: 11, fontFamily: 'SourceCodeVariable-Roman', color: '#000000', bold: false },
          { id: `trad_p1_text2`, x: 95, y: 530, text: 'Durante la búsqueda del nombre encontramos una coincidencia muy\nespecial: en mi familia, mi bisabuela era la curandera del pueblo,\nde esas mujeres que con hierbas, pócimas y remedios caseros\nlograban hacerte sentir mejor el cuerpo y el espíritu.', fontSize: 11, fontFamily: 'SourceCodeVariable-Roman', color: '#000000', bold: false },
          { id: `trad_p1_text3`, x: 95, y: 620, text: 'Así adoptamos este nombre, como un homenaje sincero a esos\npersonajes místicos y a las tradiciones ancestrales que viven en\nnuestro México.', fontSize: 11, fontFamily: 'SourceCodeVariable-Roman', color: '#000000', bold: false },
          { id: `trad_p1_ftr`, x: 95, y: 970, text: `L A   C U R A N D E R A   ·   H O J A   1   D E   ${totalP}`, fontSize: 9.5, fontFamily: 'SourceCodeVariable-Roman', color: '#000000', bold: true }
        ]
      };
    }

    // Páginas interiores
    const tradItems = [
      ...createTradHeader(pNum, totalP, typeName, 'Carta Tradicional')
    ];

    (dPage.items || []).forEach(it => {
      if (it.id.startsWith('hdr_') || it.id.startsWith('ftr_')) return;

      if (it.type === 'image') {
        tradItems.push({
          ...it,
          borderRadius: 4
        });
        return;
      }

      // Título de categoría
      if (it.id.startsWith('cat_title_')) {
        tradItems.push({
          id: `trad_${it.id}`,
          ...(it.dishId ? { dishId: it.dishId } : {}),
          x: it.x,
          y: it.y,
          text: it.text,
          fontSize: 14.5,
          fontFamily: 'Hansief',
          color: '#000000',
          bold: true,
          maxWidth: 345
        });
        return;
      }

      // Nota de categoría
      if (it.id.startsWith('cat_note_')) {
        tradItems.push({
          id: `trad_${it.id}`,
          ...(it.dishId ? { dishId: it.dishId } : {}),
          x: it.x,
          y: it.y,
          text: it.text,
          fontSize: 9.5,
          fontFamily: 'SourceCodeVariable-Roman',
          color: '#222222',
          bold: false,
          maxWidth: 345
        });
        return;
      }

      // Platillo (nombre + precio)
      if (it.id.includes('_title')) {
        const parts = it.text.split('·');
        const dishName = parts[0]?.trim() || it.text;
        const priceStr = parts[1]?.trim() || '';

        const priceX = it.x < 300 ? 340 : 705;

        tradItems.push({
          id: `trad_${it.id}_name`,
          ...(it.dishId ? { dishId: it.dishId } : {}),
          x: it.x,
          y: it.y,
          text: dishName,
          fontSize: 11,
          fontFamily: 'SourceCodeVariable-Roman',
          color: '#000000',
          bold: false,
          maxWidth: 265
        });

        if (priceStr) {
          tradItems.push({
            id: `trad_${it.id}_price`,
            ...(it.dishId ? { dishId: it.dishId } : {}),
            x: priceX,
            y: it.y,
            text: priceStr,
            fontSize: 11,
            fontFamily: 'SourceCodeVariable-Roman',
            color: '#000000',
            bold: true
          });
        }
        return;
      }

      // Descripción
      if (it.id.includes('_desc')) {
        tradItems.push({
          id: `trad_${it.id}`,
          ...(it.dishId ? { dishId: it.dishId } : {}),
          x: it.x,
          y: it.y,
          text: it.text,
          fontSize: 9.5,
          fontFamily: 'SourceCodeVariable-Roman',
          color: '#444444',
          bold: false,
          maxWidth: 345
        });
        return;
      }

      // Texto accesorio
      tradItems.push({
        id: `trad_${it.id}`,
        x: it.x,
        y: it.y,
        text: it.text,
        fontSize: Math.max(8.5, it.fontSize * 0.9),
        fontFamily: 'SourceCodeVariable-Roman',
        color: '#000000',
        bold: it.bold || false
      });
    });

    tradItems.push({
      id: `trad_ftr_${pNum}`,
      x: 65,
      y: 1005,
      text: `L A   C U R A N D E R A   ·   H O J A   ${pNum}   D E   ${totalP}`,
      fontSize: 9,
      fontFamily: 'SourceCodeVariable-Roman',
      color: '#000000',
      bold: true
    });

    return {
      pageNumber: pNum,
      width: 816,
      height: 1056,
      bgColor: '#CCAD93',
      hasEmblem: false,
      items: tradItems
    };
  });
}

// ============================================================================
// MAIN GENERATOR & UPLOADER
// ============================================================================

async function main() {
  console.log('📋 Generando plantillas maestras de cartas físicas...');

  const desDigital = buildDesayunoDigital();
  const comDigital = buildComidaDigital();
  const canDigital = buildCantinaDigital();

  const desTrad = convertDigitalPagesToTradicional(desDigital, 'desayuno');
  const comTrad = convertDigitalPagesToTradicional(comDigital, 'comida');
  const canTrad = convertDigitalPagesToTradicional(canDigital, 'cantina');

  const filesMap = {
    'carta_desayuno_digital_template.json': desDigital,
    'carta_desayuno_template.json': desTrad,
    'carta_comida_digital_template.json': comDigital,
    'carta_comida_template.json': comTrad,
    'carta_cantina_digital_template.json': canDigital,
    'carta_cantina_template.json': canTrad
  };

  const dataDir = path.join(__dirname, '../public/data');
  for (const [filename, content] of Object.entries(filesMap)) {
    const fPath = path.join(dataDir, filename);
    fs.writeFileSync(fPath, JSON.stringify(content, null, 2), 'utf8');
    console.log(`✅ ${filename} generado (${content.length} páginas)`);
  }

  // Sincronizar en Firestore
  console.log('☁️ Sincronizando en Cloud Firestore (restaurants/la-curandera/physicalMenus)...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const firestoreMap = {
    'desayuno': desTrad,
    'desayuno_digital': desDigital,
    'comida': comTrad,
    'comida_digital': comDigital,
    'cantina': canTrad,
    'cantina_digital': canDigital
  };

  for (const [docId, pages] of Object.entries(firestoreMap)) {
    const cleanPages = JSON.parse(JSON.stringify(pages));
    await setDoc(doc(db, 'restaurants/la-curandera/physicalMenus', docId), {
      pages: cleanPages,
      updatedAt: new Date()
    }, { merge: true });
    console.log(`✅ Firestore actualizado: /restaurants/la-curandera/physicalMenus/${docId} (${cleanPages.length} páginas)`);
  }

  console.log('🎉 ¡Todas las cartas físicas (Desayunos, Comidas y Cantina) generadas y sincronizadas exitosamente!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error fatal al generar cartas físicas:', err);
  process.exit(1);
});
