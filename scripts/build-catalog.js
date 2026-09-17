const fs = require('fs');
const path = require('path');

const categories = [
  // DESAYUNOS
  { id: 'pa-curar-el-alma', slug: 'pa-curar-el-alma', order: 1, section: 'desayuno', icon: 'sol', name: { es: "Pa' Curar el Alma", en: "Soul Healing (Breakfast)", fr: "Pour Guérir l'Âme" }, isActive: true },
  { id: 'lo-enchi-loso', slug: 'lo-enchi-loso', order: 2, section: 'desayuno', icon: 'chile', name: { es: "Lo Enchi-loso", en: "Lo Enchi-loso (Spicy)", fr: "Spécialités Épicées" }, isActive: true },
  { id: 'tacos-dorados', slug: 'tacos-dorados', order: 3, section: 'desayuno', icon: 'tortilla', name: { es: "Tacos Dorados", en: "Tacos Dorados (Crispy Tacos)", fr: "Tacos Croustillants" }, isActive: true },
  { id: 'pa-caldear', slug: 'pa-caldear', order: 4, section: 'desayuno', icon: 'pocima', name: { es: "Pa' Caldear", en: "Pa' Caldear (Broths)", fr: "Bouillons Chauds" }, isActive: true },
  { id: 'sandwich-y-algo-mas', slug: 'sandwich-y-algo-mas', order: 5, section: 'desayuno', icon: 'corazon', name: { es: "Sándwich y Algo Más", en: "Sandwiches & More", fr: "Sandwichs & Plus" }, isActive: true },
  { id: 'pa-los-peques', slug: 'pa-los-peques', order: 6, section: 'desayuno', icon: 'estrella', name: { es: "Pa' los Más Peques", en: "Kids Breakfast", fr: "Menu Petits" }, isActive: true },
  { id: 'dulce-remedio', slug: 'dulce-remedio', order: 7, section: 'ambos', icon: 'corazon', name: { es: "Dulce Remedio", en: "Dulce Remedio (Desserts)", fr: "Desserts & Douceurs" }, isActive: true },
  { id: 'pa-calentar-el-espiritu', slug: 'pa-calentar-el-espiritu', order: 8, section: 'ambos', icon: 'sol', name: { es: "Pa' Calentar el Espíritu", en: "Pa' Calentar el Espíritu (Coffee & Tea)", fr: "Boissons Chaudes" }, isActive: true },
  { id: 'jugueria-la-curandera', slug: 'jugueria-la-curandera', order: 9, section: 'desayuno', icon: 'limon', name: { es: "Juguería La Curandera", en: "Fresh Juices & Smoothies", fr: "Jus Naturels" }, isActive: true },
  { id: 'bebidas-sin-alcohol', slug: 'bebidas-sin-alcohol', order: 10, section: 'ambos', icon: 'pocima', name: { es: "Bebidas sin Alcohol", en: "Non-Alcoholic Drinks", fr: "Boissons sans Alcool" }, isActive: true },
  { id: 'mockteleria', slug: 'mockteleria', order: 11, section: 'ambos', icon: 'limon', name: { es: "Mocktelería", en: "Craft Mocktails", fr: "Mocktails Artisanaux" }, isActive: true },

  // COMIDA Y CANTINA
  { id: 'sabores-de-cuaresma', slug: 'sabores-de-cuaresma', order: 12, section: 'comida', icon: 'limon', name: { es: "Sabores de Cuaresma", en: "Seafood Delights (Cuaresma)", fr: "Saveurs Marines" }, isActive: true },
  { id: 'pa-empezar', slug: 'pa-empezar', order: 13, section: 'comida', icon: 'tortilla', name: { es: "Pa' Empezar", en: "Starters & Appetizers", fr: "Entrées à Partager" }, isActive: true },
  { id: 'pa-cuidarte', slug: 'pa-cuidarte', order: 14, section: 'comida', icon: 'hierbas', name: { es: "Pa' Cuidarte (Ensaladas)", en: "Fresh Salads", fr: "Salades Fraîches" }, isActive: true },
  { id: 'sopas-y-pastas', slug: 'sopas-y-pastas', order: 15, section: 'comida', icon: 'pocima', name: { es: "Sopas y Pastas", en: "Traditional Soups & Pastas", fr: "Soupes et Pâtes" }, isActive: true },
  { id: 'snacks', slug: 'snacks', order: 16, section: 'comida', icon: 'maiz', name: { es: "Snacks", en: "Snacks & Munchies", fr: "Snacks Mexicains" }, isActive: true },
  { id: 'platos-fuertes', slug: 'platos-fuertes', order: 17, section: 'comida', icon: 'corazon', name: { es: "Platos Fuertes", en: "Main Specialties", fr: "Plats Principaux" }, isActive: true },
  { id: 'taqueria-la-curandera', slug: 'taqueria-la-curandera', order: 18, section: 'comida', icon: 'tortilla', name: { es: "Taquería La Curandera", en: "Taquería (3 pcs)", fr: "Taquería Artisanale" }, isActive: true },
  { id: 'cortes', slug: 'cortes', order: 19, section: 'comida', icon: 'sol', name: { es: "Cortes Selectos (300-350g)", en: "Prime Steaks", fr: "Viandes Sélectionnées" }, isActive: true },
  { id: 'burritos', slug: 'burritos', order: 20, section: 'comida', icon: 'tortilla', name: { es: "Burritos", en: "Northern Burritos", fr: "Burritos Généreux" }, isActive: true },
  { id: 'burguers-y-jocho', slug: 'burguers-y-jocho', order: 21, section: 'comida', icon: 'estrella', name: { es: "Burguers y Jocho", en: "Burgers & Mexican Jocho", fr: "Burgers & Jocho" }, isActive: true },
  { id: 'pa-los-morrillos', slug: 'pa-los-morrillos', order: 22, section: 'comida', icon: 'estrella', name: { es: "Pa' los Morrillos", en: "Kids Menu (Comida)", fr: "Menu Enfants" }, isActive: true },
  { id: 'cantina-la-curandera', slug: 'cantina-la-curandera', order: 23, section: 'cantina', icon: 'maguey', name: { es: "Cantina La Curandera", en: "Cantina & Spirits", fr: "Cantina & Spiritueux" }, isActive: true }
];

const products = [
  // 5.1 DESAYUNOS - Pa' curar el alma
  {
    id: 'huevos-revueltos-mexicana',
    categoryId: 'pa-curar-el-alma',
    name: { es: "Huevos revueltos a la mexicana", en: "Mexican Scrambled Eggs", fr: "Œufs Brouillés à la Mexicaine" },
    description: { es: "Con jitomate, cebolla y chile serrano. Servidos con frijoles refritos y totopos crujientes.", en: "With fresh tomato, onion and serrano chile. Served with refried beans and tortilla chips.", fr: "Avec tomate, oignon et piment. Servis avec haricots et totopos." },
    price: 180,
    tags: ["recomendado"],
    allergens: [],
    order: 1,
    isActive: true
  },
  {
    id: 'huevos-revueltos-salchicha',
    categoryId: 'pa-curar-el-alma',
    name: { es: "Huevos revueltos con salchicha", en: "Scrambled Eggs with Sausage", fr: "Œufs Brouillés aux Saucisses" },
    description: { es: "Huevos revueltos con salchicha, servidos con frijoles refritos y totopos.", en: "Scrambled eggs with sausage, served with refried beans and tortilla chips.", fr: "Œufs brouillés avec saucisse, servis avec haricots." },
    price: 180,
    tags: [],
    allergens: [],
    order: 2,
    isActive: true
  },
  {
    id: 'huevos-revueltos-jamon',
    categoryId: 'pa-curar-el-alma',
    name: { es: "Huevos revueltos con jamón", en: "Scrambled Eggs with Ham", fr: "Œufs Brouillés au Jambon" },
    description: { es: "Con jamón seleccionado, servidos con frijoles refritos y totopos.", en: "With select ham, served with refried beans and chips.", fr: "Au jambon sélectionné, servis avec haricots." },
    price: 180,
    tags: [],
    allergens: [],
    order: 3,
    isActive: true
  },
  {
    id: 'huevos-revueltos-longaniza',
    categoryId: 'pa-curar-el-alma',
    name: { es: "Huevos revueltos con longaniza", en: "Scrambled Eggs with Local Longaniza", fr: "Œufs Brouillés à la Longaniza" },
    description: { es: "Con longaniza artesanal de la región, servidos con frijoles refritos y totopos.", en: "With regional artisanal longaniza sausage, refried beans and chips.", fr: "À la saucisse artisanale régionale et haricots." },
    price: 180,
    tags: ["hero"],
    allergens: [],
    order: 4,
    isActive: true
  },
  {
    id: 'huevos-rancheros',
    categoryId: 'pa-curar-el-alma',
    name: { es: "Huevos rancheros", en: "Huevos Rancheros (Ranch-Style Eggs)", fr: "Huevos Rancheros Traditionnels" },
    description: { es: "2 huevos estrellados sobre tortilla de maíz, bañados en auténtica salsa de jitomate.", en: "Two sunny-side eggs on corn tortilla smothered in tomato ranch sauce.", fr: "Deux œufs sur tortilla arrosés de sauce tomate maison." },
    price: 185,
    tags: ["recomendado"],
    allergens: [],
    order: 5,
    isActive: true
  },
  {
    id: 'huevos-divorciados',
    categoryId: 'pa-curar-el-alma',
    name: { es: "Huevos divorciados", en: "Huevos Divorciados (Dual Salsa Eggs)", fr: "Huevos Divorciados" },
    description: { es: "2 huevos estrellados montados sobre tortillas, uno en salsa verde y otro en salsa roja.", en: "Two fried eggs over tortillas, one in salsa verde and one in salsa roja.", fr: "Deux œufs sur tortillas, l'un en salsa verte et l'autre rouge." },
    price: 210,
    tags: ["hero"],
    allergens: [],
    order: 6,
    isActive: true
  },
  {
    id: 'huevos-nortenos',
    categoryId: 'pa-curar-el-alma',
    name: { es: "Huevos norteños", en: "Huevos Norteños (Crispy Tortilla Scramble)", fr: "Huevos Norteños" },
    description: { es: "Revueltos con trozos de tortilla frita dorada, chile, cebolla y salsa de jitomate.", en: "Scrambled with fried corn tortilla crisps, chile, onion and tomato sauce.", fr: "Œufs brouillés aux morceaux de tortillas croustillantes." },
    price: 195,
    tags: ["picante"],
    allergens: [],
    order: 7,
    isActive: true
  },
  {
    id: 'omelette-rajas-elote',
    categoryId: 'pa-curar-el-alma',
    name: { es: "Omelette de rajas poblanas con elote", en: "Poblano Pepper & Sweet Corn Omelette", fr: "Omelette aux Lamelles de Poblano et Maïs" },
    description: { es: "Servido con frijoles refritos y totopos.", en: "Filled with roasted poblano strips and corn, served with refried beans.", fr: "Garni de poivrons poblano et maïs doux." },
    price: 205,
    tags: ["vegetariano"],
    allergens: ["lacteos"],
    order: 8,
    isActive: true
  },
  {
    id: 'omelette-jamon-queso',
    categoryId: 'pa-curar-el-alma',
    name: { es: "Omelette de jamón y queso", en: "Ham & Cheese Omelette", fr: "Omelette Jambon & Fromage" },
    description: { es: "Con queso fundido y jamón de pavo. Servido con frijoles refritos y totopos.", en: "With melted artisanal cheese and turkey ham, served with refried beans.", fr: "Au fromage fondu et jambon, servi avec haricots." },
    price: 210,
    tags: [],
    allergens: ["lacteos"],
    order: 9,
    isActive: true
  },
  {
    id: 'omelette-champinon-queso',
    categoryId: 'pa-curar-el-alma',
    name: { es: "Omelette de champiñón con queso", en: "Mushroom & Melted Cheese Omelette", fr: "Omelette aux Champignons et Fromage" },
    description: { es: "Champiñones salteados y queso fundido. Con frijoles refritos y totopos.", en: "Sautéed fresh mushrooms and melted cheese with refried beans.", fr: "Champignons frais sautés et fromage fondant." },
    price: 185,
    tags: ["vegetariano"],
    allergens: ["lacteos"],
    order: 10,
    isActive: true
  },
  {
    id: 'molletes-clasicos',
    categoryId: 'pa-curar-el-alma',
    name: { es: "Molletes clásicos", en: "Classic Molletes (Open-Faced Sourdough)", fr: "Molletes Classiques" },
    description: { es: "Bolillo tostado con frijoles refritos, queso manchego fundido y pico de gallo fresco.", en: "Toasted bolillo bread spread with refried beans, melted cheese, and fresh pico de gallo.", fr: "Pain bolillo avec purée de haricots, fromage gratiné et pico de gallo." },
    price: 185,
    tags: ["vegetariano"],
    allergens: ["gluten", "lacteos"],
    order: 11,
    isActive: true
  },
  {
    id: 'molletes-longaniza',
    categoryId: 'pa-curar-el-alma',
    name: { es: "Molletes con longaniza", en: "Molletes with Artisanal Longaniza", fr: "Molletes à la Longaniza" },
    description: { es: "Bolillo con frijoles, queso fundido, longaniza bien doradita y pico de gallo.", en: "Molletes topped with crispy regional longaniza sausage.", fr: "Molletes garnis de savoureuse saucisse longaniza." },
    price: 210,
    tags: ["recomendado"],
    allergens: ["gluten", "lacteos"],
    order: 12,
    isActive: true
  },
  {
    id: 'mollepizza',
    categoryId: 'pa-curar-el-alma',
    name: { es: "Mollepizza", en: "Mollepizza (Pizza-Style Mollete)", fr: "Mollepizza" },
    description: { es: "Base de salsa de tomate especiada con pepperoni y queso fundido sobre bolillo.", en: "Spiced tomato base with pepperoni and melted cheese on crusty sourdough bread.", fr: "Sauce tomate, pepperoni et fromage fondu sur pain toasté." },
    price: 210,
    tags: [],
    allergens: ["gluten", "lacteos"],
    order: 13,
    isActive: true
  },

  // 5.2 LO ENCHI-LOSO
  {
    id: 'enchiladas-tradicionales',
    categoryId: 'lo-enchi-loso',
    name: { es: "Enchiladas tradicionales", en: "Traditional Enchiladas Verdes (3 pcs)", fr: "Enchiladas Traditionnelles Vertes (3 pcs)" },
    description: { es: "3 piezas bañadas en auténtica salsa verde de la casa, rellenas de pollo, longaniza o bistec.", en: "Three corn tortillas bathed in green salsa, filled with chicken, longaniza, or beef steak.", fr: "Trois tortillas nappées de salsa verte, garnies de poulet ou bœuf." },
    price: 180,
    tags: ["picante"],
    allergens: ["lacteos"],
    order: 14,
    isActive: true
  },
  {
    id: 'enchiladas-la-curandera',
    categoryId: 'lo-enchi-loso',
    name: { es: "Enchiladas La Curandera", en: "Enchiladas La Curandera (Arrachera)", fr: "Enchiladas La Curandera (Bavette Arrachera)" },
    description: { es: "3 piezas bañadas en nuestra salsa especial roja secreta, rellenas de arrachera tierna.", en: "Three tortillas in our signature secret red sauce, stuffed with tender grilled arrachera steak.", fr: "Trois pièces en sauce rouge spéciale, garnies de savoureuse arrachera." },
    price: 210,
    tags: ["hero", "recomendado", "picante"],
    allergens: ["lacteos"],
    order: 15,
    isActive: true
  },
  {
    id: 'enchiladas-suizas',
    categoryId: 'lo-enchi-loso',
    name: { es: "Enchiladas suizas", en: "Enchiladas Suizas (Gratin Creamy Salsa)", fr: "Enchiladas Suisses Gratinées" },
    description: { es: "3 piezas en salsa auténtica suiza cremosa, gratinadas con queso manchego, con pollo, longaniza o bistec.", en: "Three tortillas in creamy tomatillo sauce, baked with melted cheese, filled with chicken, longaniza, or steak.", fr: "En sauce tomatillo crémeuse, gratinées au fromage suisse." },
    price: 195,
    tags: ["recomendado"],
    allergens: ["lacteos"],
    order: 16,
    isActive: true
  },
  {
    id: 'enchiladas-yucas',
    categoryId: 'lo-enchi-loso',
    name: { es: "Enchiladas Yucas", en: "Enchiladas Yucas (Cochinita Pibil)", fr: "Enchiladas Yucas (Cochinita Pibil)" },
    description: { es: "3 piezas en salsa verde auténtica rellenas de cochinita pibil, cebolla morada encurtida, queso y crema.", en: "Three tortillas stuffed with slow-cooked cochinita pibil pork, salsa verde, pickled red onions and crema.", fr: "Farcies de porc cochinita pibil, oignons rouges marinés et crème." },
    price: 205,
    tags: ["hero"],
    allergens: ["lacteos"],
    order: 17,
    isActive: true
  },
  {
    id: 'enchiladas-del-patron',
    categoryId: 'lo-enchi-loso',
    name: { es: "Enchiladas del Patrón", en: "Enchiladas del Patrón (Prime Arrachera)", fr: "Enchiladas del Patrón" },
    description: { es: "3 piezas bañadas en nuestra auténtica salsa verde rellenas de jugosa arrachera.", en: "Three tortillas in vibrant salsa verde stuffed with premium arrachera steak.", fr: "Baignées de salsa verte et garnies de bavette arrachera." },
    price: 210,
    tags: ["hero", "picante"],
    allergens: ["lacteos"],
    order: 18,
    isActive: true
  },
  {
    id: 'chilaquiles-tradicionales',
    categoryId: 'lo-enchi-loso',
    name: { es: "Chilaquiles tradicionales", en: "Traditional Chilaquiles Verdes", fr: "Chilaquiles Traditionnels Verts" },
    description: { es: "Totopos crocantes bañados en salsa verde con crema, queso fresco, y pollo, longaniza o bistec.", en: "Crispy tortilla chips simmered in tangy salsa verde with crema, cheese, and chicken, longaniza, or steak.", fr: "Totopos croustillants en salsa verte, crème et fromage." },
    price: 185,
    tags: ["picante"],
    allergens: ["lacteos"],
    order: 19,
    isActive: true
  },
  {
    id: 'chilaquiles-la-curandera',
    categoryId: 'lo-enchi-loso',
    name: { es: "Chilaquiles La Curandera", en: "Chilaquiles La Curandera (Signature Red)", fr: "Chilaquiles La Curandera (Sauce Rouge)" },
    description: { es: "Totopos bañados en nuestra salsa roja auténtica acompañados de arrachera.", en: "Totopos in house secret red salsa crowned with tender grilled arrachera steak.", fr: "Totopos en sauce rouge signature accompagnés de bavette arrachera." },
    price: 210,
    tags: ["hero", "recomendado", "picante"],
    allergens: ["lacteos"],
    order: 20,
    isActive: true
  },
  {
    id: 'chilaquiles-del-patron',
    categoryId: 'lo-enchi-loso',
    name: { es: "Chilaquiles del Patrón", en: "Chilaquiles del Patrón (Green Salsa & Arrachera)", fr: "Chilaquiles del Patrón (Sauce Verte & Arrachera)" },
    description: { es: "Totopos bañados en auténtica salsa verde acompañados de arrachera.", en: "Totopos in salsa verde topped with grilled arrachera steak, cream and cheese.", fr: "Totopos en sauce verte garnis de tendre arrachera." },
    price: 210,
    tags: ["hero", "picante"],
    allergens: ["lacteos"],
    order: 21,
    isActive: true
  },
  {
    id: 'enfrijoladas-pollo',
    categoryId: 'lo-enchi-loso',
    name: { es: "Enfrijoladas de pollo", en: "Enfrijoladas de Pollo (Black Bean Tortillas)", fr: "Enfrijoladas au Poulet" },
    description: { es: "3 tortillas bañadas en suave salsa de frijol negro, rellenas de pollo y cubiertas con crema y queso.", en: "Three tortillas bathed in velvet black bean sauce, filled with shredded chicken, crema, and cheese.", fr: "Trois tortillas nappées d'une douce sauce aux haricots noirs et poulet." },
    price: 185,
    tags: ["recomendado"],
    allergens: ["lacteos"],
    order: 22,
    isActive: true
  },

  // 5.3 TACOS DORADOS
  {
    id: 'tacos-dorados-pollo',
    categoryId: 'tacos-dorados',
    name: { es: "Tacos dorados de pollo", en: "Crispy Rolled Chicken Tacos (3 pcs)", fr: "Tacos Dorés au Poulet (3 pcs)" },
    description: { es: "3 piezas crujientes acompañadas de lechuga fresca, queso de rancho y crema.", en: "Three crispy rolled tacos filled with chicken, topped with lettuce, fresh cheese, and cream.", fr: "Trois tacos croustillants garnis de poulet, laitue, fromage et crème." },
    price: 140,
    tags: [],
    allergens: ["lacteos"],
    order: 23,
    isActive: true
  },
  {
    id: 'tacos-dorados-frijol-pollo',
    categoryId: 'tacos-dorados',
    name: { es: "Tacos dorados de frijol con pollo", en: "Crispy Tacos: Bean & Chicken (3 pcs)", fr: "Tacos Dorés Haricots & Poulet (3 pcs)" },
    description: { es: "3 piezas doraditas rellenas de frijol y pollo, con lechuga, queso y crema.", en: "Three crispy tacos stuffed with savory beans and chicken.", fr: "Trois tacos dorés aux haricots et poulet." },
    price: 150,
    tags: [],
    allergens: ["lacteos"],
    order: 24,
    isActive: true
  },
  {
    id: 'tacos-dorados-frijol-queso',
    categoryId: 'tacos-dorados',
    name: { es: "Tacos dorados de frijol con queso manchego", en: "Crispy Tacos: Bean & Manchego Cheese", fr: "Tacos Dorés Haricots & Fromage Manchego" },
    description: { es: "3 piezas con frijol y queso manchego derretido, lechuga, queso y crema.", en: "Three crispy tacos with refried beans and melted manchego cheese.", fr: "Trois tacos dorés végétariens aux haricots et fromage fondant." },
    price: 150,
    tags: ["vegetariano"],
    allergens: ["lacteos"],
    order: 25,
    isActive: true
  },
  {
    id: 'tacos-dorados-obispo',
    categoryId: 'tacos-dorados',
    name: { es: "Tacos dorados Obispo", en: "Tacos Dorados Obispo (Regional Delicacy)", fr: "Tacos Dorés Obispo (Spécialité Régionale)" },
    description: { es: "3 piezas rellenas del auténtico y tradicional obispo de Tenancingo.", en: "Three crispy tacos filled with traditional seasoned Obispo meat from Tenancingo.", fr: "Trois tacos dorés farcis de la viande traditionnelle Obispo de Tenancingo." },
    price: 160,
    tags: ["hero", "recomendado"],
    allergens: ["lacteos"],
    order: 26,
    isActive: true
  },

  // 5.4 PA' CALDEAR
  {
    id: 'caldo-rojo',
    categoryId: 'pa-caldear',
    name: { es: "Caldo rojo", en: "Caldo Rojo (Spiced Chicken & Menudencia Broth)", fr: "Caldo Rojo Traditionnel" },
    description: { es: "Caldo tradicional de chiles secos con verdura, menudencia y pollo tierno.", en: "Comforting dried chili broth with garden vegetables, giblets and chicken.", fr: "Bouillon réconfortant aux piments séchés, légumes et poulet." },
    price: 85,
    tags: ["picante"],
    allergens: [],
    order: 27,
    isActive: true
  },
  {
    id: 'pancita-menudo',
    categoryId: 'pa-caldear',
    name: { es: "Pancita o Menudo", en: "Pancita / Menudo (Weekend Tripe Broth)", fr: "Pancita / Menudo Traditionnel" },
    description: { es: "(Sábado, domingo y lunes) Caldo de guajillo especiado con aguacate y bolillito crujiente.", en: "(Sat, Sun & Mon only) Rich guajillo tripe broth served with avocado and warm crusty roll.", fr: "(Sam, Dim et Lun) Bouillon traditionnel de tripes au guajillo, avocat et pain." },
    price: 130,
    tags: ["hero", "picante"],
    allergens: ["gluten"],
    order: 28,
    isActive: true
  },

  // 5.5 SANDWICH Y ALGO MAS
  {
    id: 'club-sandwich',
    categoryId: 'sandwich-y-algo-mas',
    name: { es: "Club sándwich", en: "Club Sandwich with French Fries", fr: "Club Sandwich & Frites" },
    description: { es: "Pan tostado con jamón de pavo, queso, aderezo chipotle cremoso y verduras, acompañado de papas a la francesa.", en: "Toasted sandwich with turkey ham, cheese, chipotle dressing, vegetables and french fries.", fr: "Pain grillé, jambon de dinde, fromage, sauce chipotle et frites." },
    price: 130,
    tags: [],
    allergens: ["gluten", "lacteos"],
    order: 29,
    isActive: true
  },
  {
    id: 'club-sandwich-pollo',
    categoryId: 'sandwich-y-algo-mas',
    name: { es: "Club sándwich de pollo", en: "Chicken Club Sandwich with French Fries", fr: "Club Sandwich au Poulet & Frites" },
    description: { es: "Pan tostado con pechuga de pollo, queso, aderezo chipotle cremoso y verduras, con papas a la francesa.", en: "Club sandwich with grilled chicken breast, cheese, chipotle cream, and crispy fries.", fr: "Club sandwich au blanc de poulet, fromage et frites maison." },
    price: 150,
    tags: ["recomendado"],
    allergens: ["gluten", "lacteos"],
    order: 30,
    isActive: true
  },
  {
    id: 'toast-aguacate-huevo',
    categoryId: 'sandwich-y-algo-mas',
    name: { es: "Toast de aguacate con huevo", en: "Artisanal Sourdough Avocado Toast with Poached Eggs", fr: "Toast Avocat & Œufs Pochés au Levain" },
    description: { es: "2 piezas de pan masa madre tostado con aguacate fresco, huevos pochados y un toque de salsa macha.", en: "Two thick slices of toasted sourdough with fresh mashed avocado, poached eggs, and salsa macha.", fr: "Deux tranches de pain au levain, avocat frais, œufs pochés et salsa macha." },
    price: 150,
    tags: ["hero", "vegetariano", "picante"],
    allergens: ["gluten"],
    order: 31,
    isActive: true
  },

  // 5.6 PA' LOS PEQUES
  {
    id: 'peques-calate',
    categoryId: 'pa-los-peques',
    name: { es: "Calate", en: "Calate Kids Combo", fr: "Menu Calate pour Enfants" },
    description: { es: "2 mini hotcakes esponjosos + 1 lechita (chocolate, fresa o vainilla) + 1 huevito revuelto.", en: "Two fluffy mini pancakes + one flavored milk (chocolate/strawberry/vanilla) + one scrambled egg.", fr: "Deux mini pancakes + une brique de lait aromatisé + un œuf brouillé." },
    price: 130,
    tags: [],
    allergens: ["gluten", "lacteos"],
    order: 32,
    isActive: true
  },
  {
    id: 'peques-chilpayate',
    categoryId: 'pa-los-peques',
    name: { es: "Chilpayate", en: "Chilpayate Kids Combo", fr: "Menu Chilpayate" },
    description: { es: "½ mollete sencillo con pico de gallo + 1 lechita (chocolate, fresa o vainilla).", en: "Half mollete with melted cheese and mild pico de gallo + one flavored milk.", fr: "Demi-mollete au fromage et pico de gallo doux + un lait aromatisé." },
    price: 85,
    tags: [],
    allergens: ["gluten", "lacteos"],
    order: 33,
    isActive: true
  },

  // 5.7 DULCE REMEDIO
  {
    id: 'strudel-manzana',
    categoryId: 'dulce-remedio',
    name: { es: "Strudel de manzana", en: "Warm Apple Strudel", fr: "Strudel aux Pommes Chaud" },
    description: { es: "Hojaldre dorado crujiente relleno de manzana especiada con canela.", en: "Crisp flaky puff pastry stuffed with spiced cinnamon apples.", fr: "Feuilletage croustillant garni de pommes fondantes à la cannelle." },
    price: 60,
    tags: [],
    allergens: ["gluten"],
    order: 34,
    isActive: true
  },
  {
    id: 'cheesecake',
    categoryId: 'dulce-remedio',
    name: { es: "Cheesecake", en: "Artisanal Cheesecake", fr: "Cheesecake Maison" },
    description: { es: "Cremoso pastel de queso. Elige tu topping: fresa, zarzamora, frambuesa o guayaba.", en: "Creamy cheesecake with your choice of topping: strawberry, blackberry, raspberry, or guava.", fr: "Gâteau au fromage crémeux: fraise, mûre, framboise ou goyave." },
    price: 60,
    tags: ["recomendado"],
    allergens: ["gluten", "lacteos"],
    order: 35,
    isActive: true
  },
  {
    id: 'helado',
    categoryId: 'dulce-remedio',
    name: { es: "Helado artesanal", en: "Artisanal Ice Cream", fr: "Glace Artisanale" },
    description: { es: "Vainilla, chocolate o fresa natural.", en: "Vanilla, rich chocolate or fresh strawberry.", fr: "Vanille, chocolat ou fraise naturelle." },
    price: 55,
    tags: [],
    allergens: ["lacteos"],
    order: 36,
    isActive: true
  },
  {
    id: 'malteadas',
    categoryId: 'dulce-remedio',
    name: { es: "Malteadas cremosas", en: "Classic Milkshakes", fr: "Milkshakes Crémeux" },
    description: { es: "Preparadas al momento: Vainilla, chocolate, fresa o café.", en: "Freshly blended: Vanilla, chocolate, strawberry, or coffee.", fr: "Préparés à la minute: Vanille, chocolat, fraise ou café." },
    price: 70,
    tags: [],
    allergens: ["lacteos"],
    order: 37,
    isActive: true
  },
  {
    id: 'hotcakes-tres-piezas',
    categoryId: 'dulce-remedio',
    name: { es: "Hotcakes La Curandera (3 pzas)", en: "Signature Pancakes (3 pcs)", fr: "Pancakes La Curandera (3 pcs)" },
    description: { es: "3 piezas con fresas frescas y topping: lechera, nutella, mermelada de guayaba de la casa o miel de agave. (Clásico $90 / Relleno $99).", en: "Three fluffy pancakes with fresh strawberries and choice of house guava jam, agave nectar, or Nutella.", fr: "Trois pancakes avec fraises et confiture de goyave maison." },
    price: 120,
    tags: ["hero", "recomendado"],
    allergens: ["gluten", "lacteos"],
    order: 38,
    isActive: true
  },
  {
    id: 'pan-frances',
    categoryId: 'dulce-remedio',
    name: { es: "Pan francés (2 pzas)", en: "Brioche French Toast (2 pcs)", fr: "Pain Perdu Brioché (2 pcs)" },
    description: { es: "Pan remojado en leche y huevo con azúcar, canela y fresas. Clásico $80 / Relleno de frutos rojos y queso crema $99.", en: "Custard-dipped toast with cinnamon sugar and fresh strawberries.", fr: "Pain perdu doré à la cannelle et fraises fraîches." },
    price: 99,
    tags: ["recomendado"],
    allergens: ["gluten", "lacteos"],
    order: 39,
    isActive: true
  },

  // 5.8 BEBIDAS CALIENTES
  {
    id: 'chocolate-tradicional',
    categoryId: 'pa-calentar-el-espiritu',
    name: { es: "Chocolate tradicional lechero", en: "Traditional Mexican Hot Chocolate", fr: "Chocolat Chaud Mexicain Traditionnel" },
    description: { es: "Batido a mano con molinillo tradicional de madera.", en: "Hand-frothed with traditional wooden molinillo.", fr: "Fouetté à la main au molinillo en bois." },
    price: 45,
    tags: ["hero"],
    allergens: ["lacteos"],
    order: 40,
    isActive: true
  },
  {
    id: 'cafe-con-leche',
    categoryId: 'pa-calentar-el-espiritu',
    name: { es: "Café con leche (Lechero)", en: "Café con Leche (Lechero)", fr: "Café au Lait Traditionnel" },
    description: { es: "Café aromático vertido con leche caliente espumosa.", en: "Rich aromatic coffee poured with steamed milk.", fr: "Café aromatique et lait mousseux chaud." },
    price: 55,
    tags: [],
    allergens: ["lacteos"],
    order: 41,
    isActive: true
  },
  {
    id: 'capuchino-clasico',
    categoryId: 'pa-calentar-el-espiritu',
    name: { es: "Capuchino clásico", en: "Classic Cappuccino", fr: "Cappuccino Classique" },
    description: { es: "Espresso italiano con abundante crema de leche.", en: "Espresso topped with velvet steamed milk froth.", fr: "Espresso et mousse de lait onctueuse." },
    price: 50,
    tags: [],
    allergens: ["lacteos"],
    order: 42,
    isActive: true
  },
  {
    id: 'cafe-de-olla',
    categoryId: 'pa-calentar-el-espiritu',
    name: { es: "Café de olla", en: "Café de Olla (Clay Pot Spiced Coffee)", fr: "Café de Olla Mexicain" },
    description: { es: "Hervido en barro con piloncillo, canela en raja y especias de la curandera.", en: "Simmered in clay with raw cane sugar, cinnamon bark and curative spices.", fr: "Infusé en pot de terre avec cannelle et piloncillo." },
    price: 45,
    tags: ["hero", "recomendado"],
    allergens: [],
    order: 43,
    isActive: true
  },
  {
    id: 'cafe-americano',
    categoryId: 'pa-calentar-el-espiritu',
    name: { es: "Café americano", en: "Americano Coffee", fr: "Café Americano" },
    description: { es: "Grano seleccionado 100% mexicano tostado medio.", en: "Select 100% Mexican medium roast beans.", fr: "Grains mexicains torréfaction moyenne." },
    price: 45,
    tags: [],
    allergens: [],
    order: 44,
    isActive: true
  },

  // 5.9 JUGUERIA LA CURANDERA
  {
    id: 'jugo-naranja-clasico',
    categoryId: 'jugueria-la-curandera',
    name: { es: "Jugo de naranja clásico", en: "Freshly Squeezed Orange Juice", fr: "Jus d'Orange Pressé Minute" },
    description: { es: "100% natural, recién exprimido al momento.", en: "100% fresh, pressed to order.", fr: "100% pur jus fraîchement pressé." },
    price: 40,
    tags: [],
    allergens: [],
    order: 45,
    isActive: true
  },
  {
    id: 'jugo-rojo-amor',
    categoryId: 'jugueria-la-curandera',
    name: { es: "Jugo Rojo Amor", en: "Rojo Amor (Orange & Red Berries)", fr: "Jus Rojo Amor (Orange & Fruits Rouges)" },
    description: { es: "Naranja natural combinada con frutos rojos frescos.", en: "Fresh orange blended with antioxidant berries.", fr: "Orange fraîche et baies rouges régionales." },
    price: 45,
    tags: ["recomendado"],
    allergens: [],
    order: 46,
    isActive: true
  },
  {
    id: 'jugo-pura-vitamina-c',
    categoryId: 'jugueria-la-curandera',
    name: { es: "Jugo Pura Vitamina C", en: "Pure Vitamin C Elixir", fr: "Élixir Pure Vitamine C" },
    description: { es: "Naranja, piña, guayaba fresca y miel de abeja pura.", en: "Orange, pineapple, fresh guava, and pure local honey.", fr: "Orange, ananas, goyave fraîche et miel pur." },
    price: 45,
    tags: ["hero"],
    allergens: [],
    order: 47,
    isActive: true
  },
  {
    id: 'jugo-verde-nopal',
    categoryId: 'jugueria-la-curandera',
    name: { es: "Jugo Verde Nopal", en: "Green Nopal Detox Juice", fr: "Jus Vert Détox au Nopal" },
    description: { es: "Naranja, nopal tierno, apio, perejil, guayaba y piña.", en: "Tender nopal cactus, orange, celery, parsley, guava and pineapple.", fr: "Cactus nopal tendre, orange, céleri, persil et ananas." },
    price: 45,
    tags: ["hero", "recomendado"],
    allergens: [],
    order: 48,
    isActive: true
  },
  {
    id: 'jugo-curandero',
    categoryId: 'jugueria-la-curandera',
    name: { es: "Jugo Curandero", en: "Curandero Healing Smoothie", fr: "Smoothie Curandero" },
    description: { es: "Naranja, fresa, plátano y toque refrescante de coco.", en: "Orange, strawberry, banana, and a tropical touch of coconut.", fr: "Orange, fraise, banane et touche de noix de coco." },
    price: 45,
    tags: ["hero"],
    allergens: [],
    order: 49,
    isActive: true
  },
  {
    id: 'mix-fruta-temporada',
    categoryId: 'jugueria-la-curandera',
    name: { es: "Mix fruta de temporada", en: "Seasonal Fruit Bowl with Yogurt & Granola", fr: "Assiette de Fruits de Saison & Granola" },
    description: { es: "Frutas frescas de la región servidas con yogurt natural, miel de abeja y granola artesanal.", en: "Fresh regional fruits served with natural yogurt, honey, and granola.", fr: "Fruits frais régionaux, yaourt nature, miel et granola." },
    price: 65,
    tags: ["vegetariano"],
    allergens: ["lacteos"],
    order: 50,
    isActive: true
  },

  // 5.10 BEBIDAS SIN ALCOHOL
  {
    id: 'agua-topochico-preparada',
    categoryId: 'bebidas-sin-alcohol',
    name: { es: "Agua mineral Topo Chico preparada", en: "Topo Chico Preparada (Lime & Salt)", fr: "Topo Chico Préparée (Citron & Sel)" },
    description: { es: "Agua mineral con jugo de limón fresco y escarchado de sal de grano.", en: "Sparkling mineral water with fresh lime juice and salted rim.", fr: "Eau minérale gazeuse, jus de citron vert et sel marin." },
    price: 35,
    tags: [],
    allergens: [],
    order: 51,
    isActive: true
  },
  {
    id: 'jarra-agua-curandera-2l',
    categoryId: 'bebidas-sin-alcohol',
    name: { es: "Jarra de agua La Curandera (2 L)", en: "La Curandera House Infused Pitcher (2 L)", fr: "Carafe Signature La Curandera (2 L)" },
    description: { es: "Infusión fría artesanal de guayaba, pera y manzana fresca.", en: "Chilled natural infusion of guava, crisp pear and apple.", fr: "Infusion fraîche de goyave, poire et pomme." },
    price: 90,
    tags: ["hero", "recomendado"],
    allergens: [],
    order: 52,
    isActive: true
  },
  {
    id: 'jarra-agua-sabor-2l',
    categoryId: 'bebidas-sin-alcohol',
    name: { es: "Jarra de agua fresca tradicional (2 L)", en: "Traditional Mexican Agua Fresca (2 L)", fr: "Carafe d'Agua Fresca Traditionnelle (2 L)" },
    description: { es: "Horchata con canela, flor de jamaica o tamarindo natural.", en: "Horchata with cinnamon, hibiscus flower (jamaica) or sweet tamarind.", fr: "Horchata à la cannelle, hibiscus ou tamarin naturel." },
    price: 85,
    tags: [],
    allergens: [],
    order: 53,
    isActive: true
  },

  // 5.11 MOCKTELERIA
  {
    id: 'mocktail-limonada-pepino',
    categoryId: 'mockteleria',
    name: { es: "Limonada con pepino y hierbabuena", en: "Cucumber & Mint Craft Lemonade", fr: "Limonade Concombre & Menthe Fraîche" },
    description: { es: "Pepino macerado, hierbabuena fresca del huerto y limón con agua mineral.", en: "Muddled crisp cucumber, garden mint, and fresh lime with mineral water.", fr: "Concombre écrasé, menthe du jardin et citron vert." },
    price: 48,
    tags: ["hero", "recomendado"],
    allergens: [],
    order: 54,
    isActive: true
  },
  {
    id: 'mocktail-pinada',
    categoryId: 'mockteleria',
    name: { es: "Piñada cremosa", en: "Virgin Piñada (Piña Colada Mocktail)", fr: "Piñada Crémeuse sans Alcool" },
    description: { es: "Piña natural, crema de coco, leche evaporada y canela espolvoreada.", en: "Fresh pineapple, rich coconut cream, evaporated milk, and cinnamon.", fr: "Ananas, crème de coco onctueuse et touche de cannelle." },
    price: 58,
    tags: ["recomendado"],
    allergens: ["lacteos"],
    order: 55,
    isActive: true
  },

  // 5.12 COMIDA - Sabores de Cuaresma (del mar)
  {
    id: 'aguachile-rojo',
    categoryId: 'sabores-de-cuaresma',
    name: { es: "Aguachile rojo", en: "Aguachile Rojo (Red Chiltepín Prawns)", fr: "Aguachile Rouge au Chiltepín" },
    description: { es: "Camarones frescos marinados en limón, chiltepín, pepino en medias lunas, cebolla morada y especias.", en: "Fresh prawns cured in lime, fiery chiltepín pepper, cucumber, and red onions.", fr: "Crevettes marinées au citron vert, piment chiltepín et oignons rouges." },
    price: 260,
    tags: ["hero", "picante"],
    allergens: [],
    order: 56,
    isActive: true
  },
  {
    id: 'aguachile-jade',
    categoryId: 'sabores-de-cuaresma',
    name: { es: "Aguachile Jade", en: "Aguachile Jade (Green Serrano & Herbs)", fr: "Aguachile Jade aux Herbes Fraîches" },
    description: { es: "Camarones en salsa verde de chile serrano, cilantro, cebolla, pepino y toque cítrico.", en: "Succulent shrimp cured in serrano chili, fresh cilantro, lime, and cucumber.", fr: "Crevettes marinées au serrano, coriandre et citron." },
    price: 240,
    tags: ["picante", "recomendado"],
    allergens: [],
    order: 57,
    isActive: true
  },
  {
    id: 'aguachile-la-curandera',
    categoryId: 'sabores-de-cuaresma',
    name: { es: "Aguachile La Curandera", en: "Aguachile La Curandera (Hibiscus & Chiltepín)", fr: "Aguachile La Curandera (Hibiscus & Chiltepín)" },
    description: { es: "Camarones con infusión reducida de flor de jamaica, chiltepín, cebolla morada, pepino y especias secretas.", en: "Prawns in a signature hibiscus flower reduction, chiltepín, lime, and cucumber.", fr: "Crevettes en réduction d'hibiscus, piment chiltepín et épices." },
    price: 270,
    tags: ["hero", "recomendado", "picante"],
    allergens: [],
    order: 58,
    isActive: true
  },
  {
    id: 'ceviche-tropical',
    categoryId: 'sabores-de-cuaresma',
    name: { es: "Ceviche tropical", en: "Tropical Fish Ceviche with Mango", fr: "Ceviche Tropical au Mangue" },
    description: { es: "Pescado fresco con jitomate, cilantro, chile serrano, mango dulce picado, pepino, apio y limón.", en: "Fresh fish cured in lime with sweet mango, tomato, cilantro, and serrano chili.", fr: "Poisson frais mariné au citron vert, mangue fraîche et coriandre." },
    price: 180,
    tags: ["recomendado"],
    allergens: [],
    order: 59,
    isActive: true
  },
  {
    id: 'caldo-de-camaron',
    categoryId: 'sabores-de-cuaresma',
    name: { es: "Caldo de camarón", en: "Traditional Mexican Shrimp Broth", fr: "Bouillon Rouge de Crevettes" },
    description: { es: "Tradicional caldito rojo aromático con camarones enteros y verduras de la estación.", en: "Savory red chili shrimp soup loaded with seasonal root vegetables.", fr: "Bouillon épicé aux crevettes entières et légumes." },
    price: 160,
    tags: ["picante"],
    allergens: [],
    order: 60,
    isActive: true
  },

  // 5.13 PA' EMPEZAR
  {
    id: 'cazuela-queso-fundido',
    categoryId: 'pa-empezar',
    name: { es: "Cazuela de queso fundido", en: "Melted Asadero Cheese Casserole with Chistorra", fr: "Cassolette de Fromage Fondu & Chistorra" },
    description: { es: "Queso asadero fundido burbujeante con chistorra doradita y 5 tortillas de harina recién hechas.", en: "Bubbly melted Mexican Asadero cheese with Spanish chistorra, served with 5 warm flour tortillas.", fr: "Fromage asadero fondu gratiné à la saucisse chistorra et tortillas de blé." },
    price: 135,
    tags: ["hero", "recomendado"],
    allergens: ["gluten", "lacteos"],
    order: 61,
    isActive: true
  },
  {
    id: 'guacamole-tradicional',
    categoryId: 'pa-empezar',
    name: { es: "Guacamole tradicional", en: "Traditional Molcajete Guacamole", fr: "Guacamole Traditionnel au Molcajete" },
    description: { es: "Aguacate Hass fresco machacado con jitomate, cebolla, cilantro, limón y totopos de maíz.", en: "Mashed Hass avocado with tomato, onion, cilantro, fresh lime, and crisp tortilla chips.", fr: "Avocat Hass écrasé, tomate, coriandre et totopos croustillants." },
    price: 90,
    tags: ["vegetariano"],
    allergens: [],
    order: 62,
    isActive: true
  },
  {
    id: 'guacamole-chicharron-norteno',
    categoryId: 'pa-empezar',
    name: { es: "Guacamole con chicharrón norteño", en: "Guacamole with Northern Pork Belly Chicharrón", fr: "Guacamole au Chicharrón Croustillant" },
    description: { es: "Nuestra receta de guacamole copada con trozos crujientes de chicharrón de cerdo norteño carnoso.", en: "Fresh guacamole topped with crispy, savory Northern Mexican pork belly cracklings.", fr: "Guacamole garni de morceaux de chicharrón de porc croustillant." },
    price: 195,
    tags: ["hero", "recomendado"],
    allergens: [],
    order: 63,
    isActive: true
  },

  // 5.14 PA' CUIDARTE
  {
    id: 'ensalada-la-curandera',
    categoryId: 'pa-cuidarte',
    name: { es: "Ensalada La Curandera", en: "Signature La Curandera Salad with Arrachera", fr: "Salade Gourmande La Curandera" },
    description: { es: "Mix de lechuga fresca, manzana, durazno, arándano, nuez, ajonjolí garapiñado, arrachera y aderezo miel mostaza.", en: "Crisp greens, apple, peach, cranberries, walnuts, candied sesame seeds, grilled arrachera, and honey mustard.", fr: "Mesclun, pomme, pêche, noix, sésame caramélisé, bavette arrachera et vinaigrette miel-moutarde." },
    price: 145,
    tags: ["hero", "recomendado"],
    allergens: ["frutos_secos"],
    order: 64,
    isActive: true
  },
  {
    id: 'ensalada-campesina',
    categoryId: 'pa-cuidarte',
    name: { es: "Ensalada campesina", en: "Campesina Garden Salad", fr: "Salade Paysanne" },
    description: { es: "Mix de lechugas, pepino, jitomate, cebolla morada, aguacate y cubitos de queso manchego. (Extra pollo +$20).", en: "Mixed lettuces, cucumber, tomato, red onion, avocado, and manchego cubes. (Extra chicken +$20).", fr: "Salade composée, avocat, concombre et dés de fromage manchego." },
    price: 110,
    tags: ["vegetariano"],
    allergens: ["lacteos"],
    order: 65,
    isActive: true
  },

  // 5.15 SOPAS Y PASTAS
  {
    id: 'sopa-azteca-tortilla',
    categoryId: 'sopas-y-pastas',
    name: { es: "Sopa azteca o de tortilla", en: "Traditional Sopa Azteca (Tortilla Soup)", fr: "Soupe Aztèque à la Tortilla" },
    description: { es: "Tiras crujientes de tortilla en caldillo de jitomate con chicharrón, aguacate, crema y queso Oaxaca.", en: "Crispy tortilla strips in rich tomato broth with pork crackling, avocado, crema, and Oaxaca cheese.", fr: "Lanières de tortillas croustillantes en bouillon de tomate, avocat et fromage Oaxaca." },
    price: 90,
    tags: ["hero", "recomendado"],
    allergens: ["lacteos"],
    order: 66,
    isActive: true
  },
  {
    id: 'fusilli-al-chipotle',
    categoryId: 'sopas-y-pastas',
    name: { es: "Fusilli al chipotle", en: "Chipotle Cream Fusilli with Arrachera", fr: "Fusilli Crémeux au Chipotle et Arrachera" },
    description: { es: "Pasta fusilli al dente en salsa cremosa de chipotle acompañada de trocitos de arrachera.", en: "Fusilli pasta tossed in a creamy chipotle reduction with tender arrachera steak bites.", fr: "Pâtes fusilli en crème de chipotle et morceaux d'arrachera grillée." },
    price: 95,
    tags: ["picante", "recomendado"],
    allergens: ["gluten", "lacteos"],
    order: 67,
    isActive: true
  },

  // 5.16 SNACKS
  {
    id: 'nachos-nortenos',
    categoryId: 'snacks',
    name: { es: "Nachos norteños", en: "Loaded Northern Nachos", fr: "Nachos Gourmands du Nord" },
    description: { es: "Totopos con queso cheddar fundido, frijoles, queso manchego, pico de gallo, longaniza y rodajas de jalapeño.", en: "Tortilla chips with melted cheddar and manchego cheese, refried beans, pico de gallo, longaniza and jalapeños.", fr: "Totopos nappés de cheddar, haricots, longaniza dorée et jalapeños." },
    price: 120,
    tags: ["hero", "picante"],
    allergens: ["lacteos"],
    order: 68,
    isActive: true
  },
  {
    id: 'alitas-autenticas-7pzas',
    categoryId: 'snacks',
    name: { es: "Alitas auténticas (7 pzas)", en: "Artisanal Chicken Wings (7 pcs)", fr: "Ailes de Poulet Dorées (7 pcs)" },
    description: { es: "Sabores: Naturales, Mango habanero, BBQ, Búfalo, Habanero cremoso, Mango mezcal o Tamarindo mezcal.", en: "Crispy wings: Natural, Mango Habanero, BBQ, Buffalo, Creamy Habanero, Mango Mezcal, or Tamarind Mezcal.", fr: "Ailes au choix: Mangue Habanero, BBQ, Mangue Mezcal ou Tamarin Mezcal." },
    price: 180,
    tags: ["hero", "picante"],
    allergens: [],
    order: 69,
    isActive: true
  },
  {
    id: 'costillas-de-elote',
    categoryId: 'snacks',
    name: { es: "Costillas de elote dulce", en: "Sweet Corn Ribs with Special Dip", fr: "Travers de Maïs Doux & Sauce Spéciale" },
    description: { es: "Costillitas de elote dulce doradas a las brasas con aderezo especial de la casa.", en: "Chargrilled sweet corn ribs served with house special spicy aioli.", fr: "Croustillants de maïs doux grillés et sauce maison." },
    price: 120,
    tags: ["recomendado", "vegetariano"],
    allergens: ["lacteos"],
    order: 70,
    isActive: true
  },

  // 5.17 PLATOS FUERTES
  {
    id: 'tampiquena-la-curandera',
    categoryId: 'platos-fuertes',
    name: { es: "Tampiqueña La Curandera", en: "Carne a la Tampiqueña La Curandera", fr: "Tampiqueña Traditionnelle La Curandera" },
    description: { es: "Cecina o bistec suave acompañado de enchiladas rojas, arroz mexicano y rajas poblanas con crema.", en: "Tender cured cecina or beef steak served with red enchiladas, Mexican rice, and poblano pepper rajas.", fr: "Bifteck ou cecina accompagné d'enchiladas rouges, riz et lamelles de poblano." },
    price: 245,
    tags: ["hero", "recomendado"],
    allergens: ["lacteos"],
    order: 71,
    isActive: true
  },
  {
    id: 'tampiquena-arrachera',
    categoryId: 'platos-fuertes',
    name: { es: "Tampiqueña de arrachera", en: "Prime Arrachera Tampiqueña", fr: "Tampiqueña de Bavette Arrachera" },
    description: { es: "Arrachera marinada a las brasas con enchiladas rojas o verdes, arroz y rajas poblanas.", en: "Grilled prime arrachera steak served with green or red enchiladas, rice, and poblano strips.", fr: "Bavette arrachera grillée, enchiladas, riz mexicain et poblano." },
    price: 275,
    tags: ["hero", "recomendado"],
    allergens: ["lacteos"],
    order: 72,
    isActive: true
  },
  {
    id: 'cecina-puerca',
    categoryId: 'platos-fuertes',
    name: { es: "Cecina puerca enchilada", en: "Cecina Puerca Enchilada", fr: "Cecina de Porc Marinée aux Piments" },
    description: { es: "Cecina de cerdo enchilada artesanal con guacamole fresco, frijoles refritos y rebanada de queso de rancho.", en: "Spiced cured pork cecina served with guacamole, refried beans, and fresh ranch cheese.", fr: "Viande de porc marinée aux épices, guacamole et fromage frais." },
    price: 210,
    tags: ["recomendado", "picante"],
    allergens: ["lacteos"],
    order: 73,
    isActive: true
  },

  // 5.18 TAQUERIA LA CURANDERA
  {
    id: 'tacos-arrachera',
    categoryId: 'taqueria-la-curandera',
    name: { es: "Orden de tacos de arrachera (3 pzas)", en: "Arrachera Steak Tacos (3 pcs)", fr: "Tacos de Bavette Arrachera (3 pcs)" },
    description: { es: "3 piezas en tortilla de maíz o harina con nopales asados, cebollitas y frijoles de la olla.", en: "Three tacos on corn or flour tortillas served with grilled cactus, sweet onions, and beans.", fr: "Trois tacos sur tortillas de maïs ou blé avec nopales et haricots." },
    price: 130,
    tags: ["hero"],
    allergens: [],
    order: 74,
    isActive: true
  },
  {
    id: 'tacos-villamelon',
    categoryId: 'taqueria-la-curandera',
    name: { es: "Tacos Villamelón (3 pzas)", en: "Famous Villamelón Tacos (3 pcs)", fr: "Tacos Villamelón Célèbres (3 pcs)" },
    description: { es: "Cecina con longaniza y trocitos de chicharrón con salsa especial de chile guajillo, cilantro y cebollita.", en: "Cecina beef, longaniza sausage, and crunchy pork crackling in a secret guajillo reduction.", fr: "Bœuf séché, saucisse longaniza et chicharrón croustillant en sauce guajillo." },
    price: 130,
    tags: ["hero", "recomendado", "picante"],
    allergens: [],
    order: 75,
    isActive: true
  },
  {
    id: 'tacos-cochinita-pibil',
    categoryId: 'taqueria-la-curandera',
    name: { es: "Tacos de cochinita pibil (3 pzas)", en: "Cochinita Pibil Tacos (3 pcs)", fr: "Tacos de Cochinita Pibil (3 pcs)" },
    description: { es: "Cerdo marinado en achiote horneado lento, servidos con cebolla morada encurtida y salsa de habanero.", en: "Slow-roasted Yucatan pork in citrus and achiote with pickled onions and habanero salsa.", fr: "Porc rôti à l'achiote, oignons rouges marinés et sauce habanero." },
    price: 130,
    tags: ["hero"],
    allergens: [],
    order: 76,
    isActive: true
  },

  // 5.19 CORTES SELECTOS
  {
    id: 'corte-rib-eye',
    categoryId: 'cortes',
    name: { es: "Rib Eye a las brasas (350g)", en: "Grilled Rib Eye Steak (350g)", fr: "Rib Eye Grillé au Feu de Bois (350g)" },
    description: { es: "Corte selecto jugoso con marmoleo superior. Incluye 3 guarniciones a elegir: guacamole, nopales, elote, frijoles o cebollitas.", en: "Juicy prime marbled steak grilled to your preferred temperature. Includes 3 sides of your choice.", fr: "Viande persillée et juteuse. Comprend 3 garnitures au choix." },
    price: 280,
    tags: ["hero", "recomendado"],
    allergens: [],
    order: 77,
    isActive: true
  },
  {
    id: 'corte-new-york',
    categoryId: 'cortes',
    name: { es: "New York Strip (350g)", en: "New York Strip Steak (350g)", fr: "New York Strip (350g)" },
    description: { es: "Corte magro y tierno con gran sabor. Incluye 3 guarniciones a elegir.", en: "Tender and flavorful prime beef cut. Served with 3 sides of your choice.", fr: "Coupure tendre et savoureuse. Servie avec 3 garnitures au choix." },
    price: 290,
    tags: [],
    allergens: [],
    order: 78,
    isActive: true
  },
  {
    id: 'corte-t-bone',
    categoryId: 'cortes',
    name: { es: "T-Bone clásico (350g)", en: "Classic T-Bone Steak (350g)", fr: "T-Bone Classique (350g)" },
    description: { es: "Lo mejor del filete y el New York en un solo corte con hueso. Incluye 3 guarniciones.", en: "The best of tenderloin and strip on the bone. Includes 3 choice sides.", fr: "Filet et faux-filet sur l'os. Comprend 3 accompagnements." },
    price: 290,
    tags: ["recomendado"],
    allergens: [],
    order: 79,
    isActive: true
  },

  // 5.20 BURRITOS
  {
    id: 'burrito-arrachera',
    categoryId: 'burritos',
    name: { es: "Burrito de arrachera", en: "Grilled Arrachera Giant Burrito", fr: "Burrito Généreux d'Arrachera" },
    description: { es: "Gran tortilla de harina con arrachera, pico de gallo, guacamole, queso manchego, frijoles y aderezo chipotle.", en: "Large flour tortilla with grilled arrachera, guacamole, manchego cheese, refried beans, and chipotle.", fr: "Grande tortilla de blé, bavette arrachera, guacamole, fromage fondu et haricots." },
    price: 160,
    tags: ["hero"],
    allergens: ["gluten", "lacteos"],
    order: 80,
    isActive: true
  },

  // 5.21 BURGUERS Y JOCHO
  {
    id: 'hamburguesa-de-la-casa',
    categoryId: 'burguers-y-jocho',
    name: { es: "Hamburguesa de la casa", en: "House Signature Double Burger", fr: "Burger Double Signature de la Maison" },
    description: { es: "Doble carne selecta, queso amarillo y manchego, doble tocino ahumado, piña asada, lechuga, tomate y cebolla.", en: "Double select beef patties, yellow & manchego cheese, double smoked bacon, grilled pineapple, lettuce, tomato.", fr: "Double steak de bœuf, double fromage, bacon fumé, ananas rôti et légumes." },
    price: 185,
    tags: ["hero", "recomendado"],
    allergens: ["gluten", "lacteos"],
    order: 81,
    isActive: true
  },
  {
    id: 'jocho-especial',
    categoryId: 'burguers-y-jocho',
    name: { es: "Jocho La Curandera", en: "Mexican Bacon-Wrapped Jocho (Hot Dog)", fr: "Jocho Mexicain au Bacon" },
    description: { es: "Salchicha envuelta en tocino crujiente en pan brioche con papas a la francesa y pico de gallo.", en: "Jumbo sausage wrapped in crispy bacon with french fries and fresh pico de gallo.", fr: "Saucisse enroulée de bacon croustillant, frites et pico de gallo." },
    price: 85,
    tags: [],
    allergens: ["gluten", "lacteos"],
    order: 82,
    isActive: true
  },

  // 5.23 - 5.28 CANTINA LA CURANDERA
  {
    id: 'coctel-la-curandera',
    categoryId: 'cantina-la-curandera',
    name: { es: "Cóctel insignia La Curandera", en: "Signature Cocktail La Curandera", fr: "Cocktail Signature La Curandera" },
    description: { es: "Mezcal artesanal, jugo de piña fresca, tomate, toque de Tajín, limón y aromatizado con rama de romero.", en: "Artisanal mezcal, fresh pineapple juice, tomato essence, Tajin chile rim, lime and burnt rosemary.", fr: "Mezcal artisanal, jus d'ananas frais, essence de tomate, Tajín et romarin." },
    price: 98,
    tags: ["hero", "recomendado"],
    allergens: [],
    order: 83,
    isActive: true
  },
  {
    id: 'mezcalita-artesanal',
    categoryId: 'cantina-la-curandera',
    name: { es: "Mezcalita de jamaica o tamarindo", en: "Craft Mezcalita (Hibiscus or Tamarind)", fr: "Mezcalita Artisanale (Hibiscus ou Tamarin)" },
    description: { es: "Mezcal de la casa macerado con infusión de jamaica o tamarindo y toque de sal de gusano.", en: "House artisanal mezcal with hibiscus or tamarind infusion and agave worm salt rim.", fr: "Mezcal de la maison infusé à l'hibiscus ou tamarin avec sel d'agave." },
    price: 85,
    tags: ["hero"],
    allergens: [],
    order: 84,
    isActive: true
  },
  {
    id: 'cantarito-mezcal',
    categoryId: 'cantina-la-curandera',
    name: { es: "Cantarito de mezcal o tequila", en: "Traditional Clay Cantarito", fr: "Cantarito Traditionnel en Terre Cuite" },
    description: { es: "Servido en cantarito de barro con cítricos frescos (toronja, naranja, limón), refresco de toronja y sal.", en: "Served in an authentic clay cup with fresh citrus juices, grapefruit soda, and sea salt.", fr: "Servi dans une tasse en terre cuite avec agrumes frais et soda pamplemousse." },
    price: 99,
    tags: ["hero", "recomendado"],
    allergens: [],
    order: 85,
    isActive: true
  },
  {
    id: 'la-piedra-anti-cruda',
    categoryId: 'cantina-la-curandera',
    name: { es: "La Piedra (El antídoto pa' la cruda)", en: "La Piedra (Hangover Cure Elixir)", fr: "La Piedra (Remède Anti-Gueule de Bois)" },
    description: { es: "El mejor remedio tradicional: derecho o con agua mineral, anís, tequila reposado y licor de hierbas curativas.", en: "The ultimate Mexican cure: neat or on mineral water, with anise, tequila, and curative herbal liqueur.", fr: "Le célèbre remède mexicain: anis, tequila reposado et liqueur d'herbes." },
    price: 100,
    tags: ["hero"],
    allergens: [],
    order: 86,
    isActive: true
  },
  {
    id: 'cerveza-tarro-litro-clamato',
    categoryId: 'cantina-la-curandera',
    name: { es: "Tarro de litro clamatado", en: "1-Liter Clamato Beer Mug", fr: "Chope d'un Litre Bière & Clamato" },
    description: { es: "Cerveza fría a elección, jugo de limón, sal, mezcla de salsas negras y Clamato original.", en: "Ice cold beer of choice with fresh lime juice, Mexican black sauces, and seasoned Clamato.", fr: "Bière bien fraîche, citron vert, sauces noires et jus Clamato assaisonné." },
    price: 90,
    tags: ["recomendado"],
    allergens: [],
    order: 87,
    isActive: true
  },
  {
    id: 'mezcal-cannabis-sta-ana',
    categoryId: 'cantina-la-curandera',
    name: { es: "Mezcal Cannabis Sta. Ana Despoblado", en: "Cannabis Mezcal Sta. Ana Despoblado", fr: "Mezcal Cannabis Sta. Ana Despoblado" },
    description: { es: "Destilado en Zumpahuacán con infusión herbal única. Caballito $80 · Botella $800.", en: "Distilled in Zumpahuacán with a rare herbal infusion. Shot $80 · Bottle $800.", fr: "Distillé à Zumpahuacán. Shot $80 · Bouteille $800." },
    price: 80,
    tags: ["hero", "recomendado"],
    allergens: [],
    order: 88,
    isActive: true
  },
  {
    id: 'mezcal-ojo-de-tigre',
    categoryId: 'cantina-la-curandera',
    name: { es: "Mezcal Ojo de Tigre, Oaxaca", en: "Ojo de Tigre Artisanal Mezcal, Oaxaca", fr: "Mezcal Artisanal Ojo de Tigre, Oaxaca" },
    description: { es: "Ensamble de maguey Espadín y Tobalá. Notas ahumadas y cítricas. Caballito $90 · Botella $1,200.", en: "Espadín and Tobalá agave blend with smooth herbal smoke. Shot $90 · Bottle $1,200.", fr: "Assemblage Espadín et Tobalá. Shot $90 · Bouteille $1,200." },
    price: 90,
    tags: ["recomendado"],
    allergens: [],
    order: 89,
    isActive: true
  }
];

const publicDataDir = path.join(__dirname, '..', 'public', 'data');
if (!fs.existsSync(publicDataDir)) fs.mkdirSync(publicDataDir, { recursive: true });

const catalogJson = JSON.stringify({ categories, products }, null, 2);
fs.writeFileSync(path.join(publicDataDir, 'catalog.json'), catalogJson);
console.log('✅ public/data/catalog.json generado exitosamente con ' + products.length + ' platillos.');

// Generar seed.js para poblar Firestore
const seedScript = `/**
 * LA CURANDERA — Script de Semilla Firestore (Poblado Automático)
 * Ejecuta con: node scripts/seed.js
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, writeBatch } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, "../public/data/catalog.json");
const { categories, products } = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

// Lee las credenciales de firebase-config.js
import { firebaseConfig } from "../public/js/firebase-config.js";

async function runSeed() {
  console.log("🌵 [La Curandera] Iniciando carga de catálogo a Firestore...");
  
  if (firebaseConfig.apiKey.includes("Placeholder")) {
    console.error("❌ Por favor configura primero tus credenciales reales en public/js/firebase-config.js");
    process.exit(1);
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const restaurantId = "la-curandera";

  // 1. Restaurante Base
  console.log("Configurando documento del restaurante...");
  await setDoc(doc(db, "restaurants", restaurantId), {
    name: "La Curandera",
    slug: "la-curandera",
    description: "Cocina tradicional con el auténtico sabor de nuestras raíces.",
    phone: "+52 714 140 0000",
    whatsapp: "527141400000",
    googleMapsUrl: "https://maps.app.goo.gl/RpGz3QzEo9cP7oiT8",
    googlePlaceId: firebaseConfig.googlePlaceId || "",
    brand: {
      colors: {
        rosa: "#C94E8F",
        terracota: "#E87850",
        turquesa: "#159F9B",
        crema: "#FDF6EC"
      }
    },
    updatedAt: new Date()
  }, { merge: true });

  // 2. Sucursal Inicial
  console.log("Configurando sucursal Metepec...");
  await setDoc(doc(db, \`restaurants/\${restaurantId}/branches\`, "metepec"), {
    name: "La Curandera",
    address: "Tenancingo / Metepec, Edo. Méx.",
    phone: "+52 714 140 0000",
    whatsapp: "527141400000",
    isActive: true,
    hours: {
      desayuno: "9:00 AM - 1:30 PM",
      comida: "1:30 PM - 7:30 PM"
    }
  }, { merge: true });

  // 3. Categorías
  console.log("Cargando categorias...");
  for (const cat of categories) {
    await setDoc(doc(db, \`restaurants/\${restaurantId}/categories\`, cat.id), {
      ...cat,
      updatedAt: new Date()
    }, { merge: true });
  }

  // 4. Productos
  console.log("Cargando productos...");
  for (const prod of products) {
    await setDoc(doc(db, \`restaurants/\${restaurantId}/products\`, prod.id), {
      ...prod,
      updatedAt: new Date()
    }, { merge: true });
  }

  console.log("🎉 ¡Catálogo completo de La Curandera sembrado con éxito en Firestore!");
  process.exit(0);
}

runSeed().catch(err => {
  console.error("Error sembrando Firestore:", err);
  process.exit(1);
});
`;

fs.writeFileSync(path.join(__dirname, 'seed.js'), seedScript);
console.log('✅ scripts/seed.js generado exitosamente.');
