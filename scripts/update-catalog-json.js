import fs from 'fs';

const catalog = JSON.parse(fs.readFileSync('./public/data/catalog.json', 'utf8'));

// 1. Update categories
const dr = catalog.categories.find(c => c.id === 'dulce-remedio');
if (dr) {
  dr.name = {
    es: 'Dulce Remedio',
    en: 'Sweet Remedy (Desserts)',
    fr: 'Douceurs & Desserts Maison'
  };
}
const pa = catalog.categories.find(c => c.id === 'pa-curar-el-alma');
if (pa) {
  pa.name = {
    es: "Pa' Curar el Alma",
    en: 'Soul Healers (Breakfast)',
    fr: "Pour Guérir l'Âme (Petits-Déjeuners)"
  };
}

// 2. Add or update the 3 new products
const newProds = [
  {
    id: 'prod_1790349552621',
    categoryId: 'dulce-remedio',
    name: { es: 'Panqué de elote', en: 'Sweet Corn Cake', fr: 'Gâteau de Maïs Doux' },
    description: { es: 'Delicioso panqué artesanal elaborado con elote dulce tierno.', en: 'Delicious artisanal sweet corn cake, tender and warm.', fr: 'Délicieux gâteau artisanal au maïs doux, tendre et savoureux.' },
    price: 65,
    order: 35,
    isActive: true
  },
  {
    id: 'prod_1790349587246',
    categoryId: 'dulce-remedio',
    name: { es: 'Pay de limón', en: 'Key Lime Pie', fr: 'Tarte au Citron Vert' },
    description: { es: 'Cremoso pay de limón fresco con costra crujiente de galleta.', en: 'Creamy fresh key lime pie with crunchy biscuit crust.', fr: 'Tarte crémeuse au citron vert frais sur croûte sablée croustillante.' },
    price: 70,
    order: 36,
    isActive: true
  },
  {
    id: 'prod_1790349770333',
    categoryId: 'dulce-remedio',
    name: { es: 'Pan Francés Curandero', en: 'Curandero Stuffed French Toast', fr: 'Pain Perdu Curandero Farcis' },
    description: { es: 'Relleno de crema suave con frutos rojos frescos.', en: 'Stuffed with sweet cream and fresh wild berries.', fr: 'Garni de crème onctueuse et de fruits des bois frais.' },
    price: 85,
    order: 37,
    isActive: true
  }
];

for (const np of newProds) {
  const existingIdx = catalog.products.findIndex(p => p.id === np.id);
  if (existingIdx >= 0) {
    catalog.products[existingIdx] = { ...catalog.products[existingIdx], ...np };
  } else {
    catalog.products.push(np);
  }
}

fs.writeFileSync('./public/data/catalog.json', JSON.stringify(catalog, null, 2), 'utf8');
console.log('✅ public/data/catalog.json actualizado. Total productos:', catalog.products.length);
