import { firebaseConfig } from '../public/js/firebase-config.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, setDoc } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log('Actualizando categorias...');
  await updateDoc(doc(db, 'restaurants/la-curandera/categories/dulce-remedio'), {
    name: {
      es: 'Dulce Remedio',
      en: 'Sweet Remedy (Desserts)',
      fr: 'Douceurs & Desserts Maison'
    }
  });

  await updateDoc(doc(db, 'restaurants/la-curandera/categories/pa-curar-el-alma'), {
    name: {
      es: "Pa' Curar el Alma",
      en: 'Soul Healers (Breakfast)',
      fr: "Pour Guérir l'Âme (Petits-Déjeuners)"
    }
  });

  console.log('Actualizando productos...');
  const prods = [
    {
      id: 'alitas-autenticas-7pzas',
      name: { es: 'Alitas auténticas (7 pzas)', en: 'Artisanal Chicken Wings (7 pcs)', fr: 'Ailes de Poulet Dorées (7 pcs)' },
      desc: { es: 'Sabores: Naturales, Mango habanero, BBQ, Búfalo, Habanero cremoso, Mango mezcal o Tamarindo mezcal.', en: 'Flavors: Plain, Mango Habanero, BBQ, Buffalo, Creamy Habanero, Mango Mezcal or Tamarind Mezcal.', fr: 'Saveurs: Nature, Mangue habanero, BBQ, Buffalo, Habanero crémeux, Mangue mezcal ou Tamarin mezcal.' }
    },
    {
      id: 'cantarito-mezcal',
      name: { es: 'Cantarito de mezcal o tequila', en: 'Traditional Clay Cantarito', fr: 'Cantarito Traditionnel en Terre Cuite' },
      desc: { es: 'Servido en cantarito de barro con cítricos frescos (toronja, naranja, limón), refresco de toronja y sal.', en: 'Served in a traditional clay cup with fresh citrus (grapefruit, orange, lime), grapefruit soda and salt.', fr: 'Servi en tasse de terre cuite avec agrumes frais, soda pamplemousse et sel.' }
    },
    {
      id: 'cerveza-tarro-litro-clamato',
      name: { es: 'Tarro de litro clamatado', en: 'One-Liter Clamato Beer Mug', fr: 'Chope d’un Litre Clamato et Bière' },
      desc: { es: 'Cerveza fría a elección, jugo de limón, sal, mezcla de salsas negras y Clamato original.', en: 'Ice cold beer of choice, fresh lime juice, salt, savory sauces and original Clamato.', fr: 'Bière fraîche au choix, jus de citron vert, sel, sauces savoureuses et Clamato.' }
    },
    {
      id: 'cheesecake',
      name: { es: 'Cheesecake artesanal', en: 'Artisanal Cheesecake', fr: 'Cheesecake Maison' },
      desc: { es: 'Cremoso pastel de queso. Elige tu sabor: fresa, chocolate o guayaba.', en: 'Creamy artisanal cheesecake. Choose your topping: strawberry, chocolate or house guava.', fr: 'Gâteau au fromage crémeux. Choisissez: fraise, chocolat ou goyave maison.' }
    },
    {
      id: 'helado',
      name: { es: 'Helado artesanal', en: 'Artisanal Ice Cream', fr: 'Glace Artisanale' },
      desc: { es: 'Vainilla, chocolate o fresa natural.', en: 'Vanilla, dark chocolate or natural strawberry.', fr: 'Vanille, chocolat ou fraise naturelle.' }
    },
    {
      id: 'hotcakes-tres-piezas',
      name: { es: 'Hotcakes La Curandera (3 pzas)', en: 'Signature Pancakes (3 pcs)', fr: 'Pancakes La Curandera (3 pcs)' },
      desc: { es: '3 piezas con fresas frescas y topping: lechera, nutella, mermelada de guayaba de la casa o fresa con lechera.', en: '3 fluffy pancakes with fresh strawberries and choice of topping: condensed milk, Nutella, house guava jam or strawberries with cream.', fr: '3 pancakes moelleux aux fraises fraîches et garniture au choix: lait concentré, Nutella, confiture de goyave maison ou fraises à la crème.' }
    },
    {
      id: 'malteadas',
      name: { es: 'Malteadas cremosas', en: 'Classic Creamy Milkshakes', fr: 'Milkshakes Crémeux' },
      desc: { es: 'Batidas al momento con helado premium: fresa, chocolate o vainilla.', en: 'Freshly blended with premium ice cream: strawberry, chocolate or vanilla.', fr: 'Frappés à la minute avec glace artisanale: fraise, chocolat ou vanille.' }
    },
    {
      id: 'mezcal-ojo-de-tigre',
      name: { es: 'Mezcal Ojo de Tigre, Oaxaca', en: 'Mezcal Ojo de Tigre, Oaxaca', fr: 'Mezcal Ojo de Tigre, Oaxaca' },
      desc: { es: 'Ensamble de maguey Espadín y Tobalá. Notas ahumadas y cítricas. Caballito $90 · Botella $1,200.', en: 'Blend of Espadín and Tobalá agave. Smoky and citrus notes. Shot $90 · Bottle $1,200.', fr: 'Assemblage d’agave Espadín et Tobalá. Notes fumées et d’agrumes. Verre $90 · Bouteille $1 200.' }
    },
    {
      id: 'pan-frances',
      name: { es: 'Pan francés (2 pzas)', en: 'Brioche French Toast (2 pcs)', fr: 'Pain Perdu Brioché (2 pcs)' },
      desc: { es: 'Pan remojado en leche y huevo con azúcar y canela, coronado con fresas.', en: 'Brioche soaked in spiced milk and egg, golden griddled with sugar, cinnamon and fresh strawberries.', fr: 'Pain brioché doré au lait et à la cannelle, couronné de fraises fraîches.' }
    },
    {
      id: 'prod_1790349552621',
      name: { es: 'Panqué de elote', en: 'Sweet Corn Cake', fr: 'Gâteau de Maïs Doux' },
      desc: { es: 'Delicioso panqué artesanal elaborado con elote dulce tierno.', en: 'Delicious artisanal sweet corn cake, tender and warm.', fr: 'Délicieux gâteau artisanal au maïs doux, tendre et savoureux.' }
    },
    {
      id: 'prod_1790349587246',
      name: { es: 'Pay de limón', en: 'Key Lime Pie', fr: 'Tarte au Citron Vert' },
      desc: { es: 'Cremoso pay de limón fresco con costra crujiente de galleta.', en: 'Creamy fresh key lime pie with crunchy biscuit crust.', fr: 'Tarte crémeuse au citron vert frais sur croûte sablée croustillante.' }
    },
    {
      id: 'prod_1790349770333',
      name: { es: 'Pan Francés Curandero', en: 'Curandero Stuffed French Toast', fr: 'Pain Perdu Curandero Farcis' },
      desc: { es: 'Relleno de crema suave con frutos rojos frescos.', en: 'Stuffed with sweet cream and fresh wild berries.', fr: 'Garni de crème onctueuse et de fruits des bois frais.' }
    },
    {
      id: 'strudel-manzana',
      name: { es: 'Strudel de manzana', en: 'Warm Apple Strudel', fr: 'Strudel aux Pommes Chaud' },
      desc: { es: 'Hojaldre dorado crujiente relleno de manzana especiada con canela.', en: 'Crisp flaky puff pastry stuffed with spiced cinnamon apples.', fr: 'Feuilletage croustillant garni de pommes fondantes à la cannelle.' }
    }
  ];

  for (const p of prods) {
    await updateDoc(doc(db, 'restaurants/la-curandera/products', p.id), {
      name: p.name,
      description: p.desc
    });
    await setDoc(doc(db, 'restaurants/la-curandera/branches/metepec/menuOverrides', p.id), {
      nameOverride: p.name,
      descriptionOverride: p.desc
    }, { merge: true });
    console.log('Actualizado:', p.id);
  }

  console.log('✅ Firestore actualizado con éxito');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
