/**
 * LA CURANDERA — Motor de Traducción Culinaria Multilingüe (ES -> EN, FR)
 * Garantiza que cualquier platillo o categoría (nuevo, editado o movido)
 * cuente con traducción auténtica e inmediata en tiempo real.
 */

// Diccionario de términos culinarios, preparaciones, cortes, ingredientes y bebidas
const CULINARY_DICTIONARY = {
  // Categorías y Secciones
  "pa curar el alma": { en: "Soul Healers (Breakfast)", fr: "Pour Guérir l'Âme (Petits-déjeuners)" },
  "lo enchi-loso": { en: "Lo Enchi-loso (Spicy Delights)", fr: "Spécialités Épicées" },
  "lo enchiloso": { en: "Lo Enchi-loso (Spicy Delights)", fr: "Spécialités Épicées" },
  "tacos dorados": { en: "Crispy Tacos (Tacos Dorados)", fr: "Tacos Croustillants" },
  "pa' caldear": { en: "Hearty Warm Broths", fr: "Bouillons Chauds Réconfortants" },
  "pa caldear": { en: "Hearty Warm Broths", fr: "Bouillons Chauds Réconfortants" },
  "sandwich y algo mas": { en: "Sandwiches & More", fr: "Sandwichs & Plus Encore" },
  "sandwich y algo más": { en: "Sandwiches & More", fr: "Sandwichs & Plus Encore" },
  "pa' los peques": { en: "Kids Menu", fr: "Menu Enfants" },
  "pa los peques": { en: "Kids Menu", fr: "Menu Enfants" },
  "pa' los morrillos": { en: "Kids Menu", fr: "Menu Enfants" },
  "pa los morrillos": { en: "Kids Menu", fr: "Menu Enfants" },
  "dulce remedio": { en: "Sweet Remedy (Desserts)", fr: "Doux Remède (Desserts)" },
  "pa' calentar el espiritu": { en: "Coffee, Tea & Warm Spirits", fr: "Cafés, Thés & Spiritueux Chauds" },
  "pa calentar el espiritu": { en: "Coffee, Tea & Warm Spirits", fr: "Cafés, Thés & Spiritueux Chauds" },
  "pa' calentar el espíritu": { en: "Coffee, Tea & Warm Spirits", fr: "Cafés, Thés & Spiritueux Chauds" },
  "jugueria": { en: "Fresh Juices & Smoothies", fr: "Jus Frais & Smoothies" },
  "juguería": { en: "Fresh Juices & Smoothies", fr: "Jus Frais & Smoothies" },
  "bebidas sin alcohol": { en: "Non-Alcoholic Beverages", fr: "Boissons Sans Alcool" },
  "mockteleria": { en: "Handcrafted Mocktails", fr: "Mocktails Artisanaux" },
  "mocktelería": { en: "Handcrafted Mocktails", fr: "Mocktails Artisanaux" },
  "sabores de cuaresma": { en: "Fresh Seafood & Aguachiles", fr: "Saveurs Marines & Aguachiles" },
  "pa' empezar": { en: "Starters & Appetizers", fr: "Entrées à Partager" },
  "pa empezar": { en: "Starters & Appetizers", fr: "Entrées à Partager" },
  "pa' cuidarte": { en: "Salads & Light Fare", fr: "Salades & Plats Légers" },
  "pa cuidarte": { en: "Salads & Light Fare", fr: "Salades & Plats Légers" },
  "sopas y pastas": { en: "Soups & Artisan Pastas", fr: "Soupes & Pâtes Artisanales" },
  "snacks": { en: "Mexican Street Snacks", fr: "Snacks Mexicains" },
  "platos fuertes": { en: "Main Courses", fr: "Plats Principaux" },
  "taqueria": { en: "Artisanal Taquería", fr: "Taquería Artisanale" },
  "taquería": { en: "Artisanal Taquería", fr: "Taquería Artisanale" },
  "cortes": { en: "Prime Fire-Grilled Steaks", fr: "Viandes Grillées d'Exception" },
  "burritos": { en: "Generous Burritos", fr: "Burritos Généreux" },
  "burguers y jocho": { en: "Burgers & Hot Dogs", fr: "Burgers & Hot-Dogs Mexicains" },
  "burgers y jocho": { en: "Burgers & Hot Dogs", fr: "Burgers & Hot-Dogs Mexicains" },
  "cantina": { en: "Ancestral Mezcal & Cocktails", fr: "Mezcal & Cocktails de Cantina" },

  // Bases Culinarias y Platillos
  "enchiladas tradicionales": { en: "Traditional Enchiladas", fr: "Enchiladas Traditionnelles" },
  "enchiladas verdes": { en: "Traditional Green Enchiladas", fr: "Enchiladas Traditionnelles Vertes" },
  "enchiladas rojas": { en: "Traditional Red Enchiladas", fr: "Enchiladas Traditionnelles Rouges" },
  "enchiladas suizas": { en: "Swiss Enchiladas (Creamy Gratin)", fr: "Enchiladas Suisses Gratinées" },
  "enchiladas la curandera": { en: "La Curandera Enchiladas (Arrachera)", fr: "Enchiladas La Curandera (Arrachera)" },
  "chilaquiles tradicionales": { en: "Traditional Chilaquiles", fr: "Chilaquiles Traditionnels" },
  "chilaquiles verdes": { en: "Green Salsa Chilaquiles", fr: "Chilaquiles Sauce Verte" },
  "chilaquiles rojos": { en: "Red Salsa Chilaquiles", fr: "Chilaquiles Sauce Rouge" },
  "huevos al gusto": { en: "Eggs Cooked to Order", fr: "Œufs Préparés à Votre Goût" },
  "huevos con jamon": { en: "Eggs with Ham", fr: "Œufs au Jambon" },
  "huevos con jamón": { en: "Eggs with Ham", fr: "Œufs au Jambon" },
  "huevos con chorizo": { en: "Eggs with Mexican Chorizo", fr: "Œufs au Chorizo Mexicain" },
  "huevos rancheros": { en: "Ranchero-Style Fried Eggs", fr: "Œufs Façon Ranchero" },
  "huevos divorciados": { en: "Divorced Eggs (Red & Green Salsa)", fr: "Œufs Divorcés (Sauces Rouge & Verte)" },
  "tacos de arrachera": { en: "Grilled Skirt Steak Tacos", fr: "Tacos de Bavette Arrachera" },
  "tacos de cecina": { en: "Cecina Beef Tacos", fr: "Tacos de Cécina de Bœuf" },
  "tacos de bistec": { en: "Tender Beef Steak Tacos", fr: "Tacos de Steak de Bœuf" },
  "tacos de pollo": { en: "Grilled Chicken Tacos", fr: "Tacos de Poulet Grillé" },
  "tacos de longaniza": { en: "Artisan Longaniza Tacos", fr: "Tacos de Longaniza Artisanale" },
  "tacos de suadero": { en: "Slow-Braised Suadero Tacos", fr: "Tacos de Suadero Fondant" },
  "tacos de carnitas": { en: "Confit Pork Carnitas Tacos", fr: "Tacos de Carnitas de Porc" },
  "tacos al pastor": { en: "Marinated Pork Pastor Tacos", fr: "Tacos de Porc Mariné Al Pastor" },
  "quesadillas": { en: "Melted Cheese Quesadillas", fr: "Quesadillas au Fromage Fondu" },
  "quesadilla": { en: "Melted Cheese Quesadilla", fr: "Quesadilla au Fromage Fondu" },
  "sincronizadas": { en: "Ham & Cheese Sincronizadas", fr: "Sincronizadas Jambon-Fromage" },
  "molletes": { en: "Refried Beans & Melted Cheese Molletes", fr: "Molletes Haricots & Fromage Fondu" },
  "aguachile verde": { en: "Green Chili Lime Aguachile", fr: "Aguachile Vert Piment & Citron Vert" },
  "aguachile negro": { en: "Black Sauce House Aguachile", fr: "Aguachile Noir Signature" },
  "aguachile rojo": { en: "Fiery Red Chili Aguachile", fr: "Aguachile Rouge Épicé" },
  "hamburguesa clasica": { en: "Classic Gourmet Burger", fr: "Burger Gourmet Classique" },
  "hamburguesa clásica": { en: "Classic Gourmet Burger", fr: "Burger Gourmet Classique" },
  "hamburguesa con queso": { en: "Cheeseburger Deluxe", fr: "Burger au Fromage Deluxe" },
  "hamburguesa de la casa": { en: "House Signature Burger", fr: "Burger Signature de la Maison" },
  "rib eye a las brasas": { en: "Fire-Grilled Rib Eye Steak", fr: "Steak Rib Eye Grillé aux Braises" },
  "new york a las brasas": { en: "Fire-Grilled New York Strip", fr: "Faux-Filet New York aux Braises" },
  "arrachera a las brasas": { en: "Fire-Grilled Arrachera Skirt Steak", fr: "Bavette Arrachera Grillée aux Braises" },
  "papas a la francesa": { en: "Crispy French Fries", fr: "Frites Croustillantes" },
  "alitas bbq": { en: "Smoky BBQ Chicken Wings", fr: "Ailes de Poulet Sauce BBQ" },
  "alitas bufalo": { en: "Buffalo Spicy Chicken Wings", fr: "Ailes de Poulet Sauce Buffalo" },
  "alitas búfalo": { en: "Buffalo Spicy Chicken Wings", fr: "Ailes de Poulet Sauce Buffalo" },
  "boneless": { en: "Crispy Boneless Chicken Bites", fr: "Bouchées de Poulet Croustillantes" },
  "guacamole con totopos": { en: "Fresh Guacamole with Corn Chips", fr: "Guacamole Frais & Chips de Maïs" },
  "frijoles refritos": { en: "Refried Beans", fr: "Haricots Noirs Mijotés" },
  "cafe americano": { en: "Americano Coffee", fr: "Café Americano" },
  "café americano": { en: "Americano Coffee", fr: "Café Americano" },
  "cafe de olla": { en: "Traditional Cinnamon Spiced Coffee", fr: "Café Mexicain à la Cannelle" },
  "café de olla": { en: "Traditional Cinnamon Spiced Coffee", fr: "Café Mexicain à la Cannelle" },
  "cappuccino": { en: "Creamy Cappuccino", fr: "Cappuccino Mousseux" },
  "capuchino": { en: "Creamy Cappuccino", fr: "Cappuccino Mousseux" },
  "strudel de manzana": { en: "Warm Homemade Apple Strudel", fr: "Strudel aux Pommes Chaud Maison" },
  "cheesecake": { en: "Artisan New York Cheesecake", fr: "Cheesecake Crémeux Artisanal" },
  "pastel de chocolate": { en: "Rich Chocolate Fudge Cake", fr: "Gâteau Fondant au Chocolat" },
  "malteada de vainilla": { en: "Vanilla Bean Milkshake", fr: "Milk-Shake à la Vanille" },
  "malteada de chocolate": { en: "Dutch Chocolate Milkshake", fr: "Milk-Shake au Chocolat" },
  "malteada de fresa": { en: "Fresh Strawberry Milkshake", fr: "Milk-Shake aux Fraises Fraîches" },
  "limonada natural": { en: "Fresh Pressed Natural Lemonade", fr: "Limonade Fraîche Naturelle" },
  "limonada mineral": { en: "Sparkling Fresh Lemonade", fr: "Limonade Fraîche Pétillante" },
  "naranjada natural": { en: "Fresh Pressed Natural Orangeade", fr: "Orangeade Fraîche Naturelle" },
  "naranjada mineral": { en: "Sparkling Fresh Orangeade", fr: "Orangeade Fraîche Pétillante" },
  "cerveza artesanal": { en: "Artisanal Craft Beer", fr: "Bière Artisanale" },
  "cerveza nacional": { en: "Domestic Mexican Beer", fr: "Bière Mexicaine Classique" },
  "queso fundido": { en: "Melted Cheese Skillet", fr: "Fromage Fondu Chaud" },
  "especialidades al carbon": { en: "Charcoal-Grilled Specialties", fr: "Spécialités Grillées au Charbon" },
  "especialidades al carbón": { en: "Charcoal-Grilled Specialties", fr: "Spécialités Grillées au Charbon" },
  "especialidades de la casa": { en: "House Specialties", fr: "Spécialités de la Maison" },
  "al carbon": { en: "charcoal grilled", fr: "grillé au charbon" },
  "al carbón": { en: "charcoal grilled", fr: "grillé au charbon" },
  "a las brasas": { en: "fire-grilled", fr: "grillé aux braises" },
  "a la parrilla": { en: "grilled", fr: "grillé à la braise" },
  "al horno": { en: "oven-baked", fr: "cuit au four" },
  "mar y tierra": { en: "Surf & Turf", fr: "Terre & Mer" }
};

// Mapeo léxico de términos recurrentes para traducción granular
const LEXICON = {
  // Sustantivos
  "especialidad": { en: "specialty", fr: "spécialité" },
  "especialidades": { en: "specialties", fr: "spécialités" },
  "carbon": { en: "charcoal", fr: "charbon" },
  "carbón": { en: "charcoal", fr: "charbon" },
  "horno": { en: "oven", fr: "four" },
  "parrilla": { en: "grill", fr: "gril" },
  "guisado": { en: "stew", fr: "ragoût" },
  "guisados": { en: "stews", fr: "ragoûts" },
  "molcajete": { en: "stone-mortar dish (molcajete)", fr: "poêlon de pierre (molcajete)" },
  "sarten": { en: "skillet", fr: "poêlon" },
  "sartén": { en: "skillet", fr: "poêlon" },
  "taco": { en: "taco", fr: "taco" },
  "tacos": { en: "tacos", fr: "tacos" },
  "orden": { en: "order", fr: "portion" },
  "pza": { en: "pc", fr: "pièce" },
  "pzas": { en: "pcs", fr: "pièces" },
  "pieza": { en: "piece", fr: "pièce" },
  "piezas": { en: "pieces", fr: "pièces" },
  "arrachera": { en: "skirt steak (arrachera)", fr: "bavette arrachera" },
  "bistec": { en: "beef steak", fr: "bifteck de bœuf" },
  "cecina": { en: "cured beef (cecina)", fr: "cécina de bœuf" },
  "costilla": { en: "rib", fr: "côte" },
  "costillas": { en: "ribs", fr: "côtes" },
  "longaniza": { en: "spiced longaniza", fr: "longaniza épicée" },
  "chorizo": { en: "Mexican chorizo", fr: "chorizo mexicain" },
  "pollo": { en: "chicken", fr: "poulet" },
  "pechuga": { en: "chicken breast", fr: "blanc de poulet" },
  "carne": { en: "meat", fr: "viande" },
  "res": { en: "beef", fr: "bœuf" },
  "puerco": { en: "pork", fr: "porc" },
  "cerdo": { en: "pork", fr: "porc" },
  "camaron": { en: "shrimp", fr: "crevette" },
  "camarones": { en: "shrimp", fr: "crevettes" },
  "pescado": { en: "fish", fr: "poisson" },
  "atun": { en: "tuna", fr: "thon" },
  "atún": { en: "tuna", fr: "thon" },
  "salmon": { en: "salmon", fr: "saumon" },
  "salmón": { en: "salmon", fr: "saumon" },
  "pulpo": { en: "octopus", fr: "poulpe" },
  "mariscos": { en: "seafood", fr: "fruits de mer" },
  "huevo": { en: "egg", fr: "œuf" },
  "huevos": { en: "eggs", fr: "œufs" },
  "queso": { en: "cheese", fr: "fromage" },
  "manchego": { en: "manchego cheese", fr: "fromage manchego" },
  "oaxaca": { en: "Oaxaca string cheese", fr: "fromage Oaxaca" },
  "frescal": { en: "fresh farmer's cheese", fr: "fromage frais" },
  "frijoles": { en: "refried beans", fr: "haricots frits" },
  "frijol": { en: "beans", fr: "haricots" },
  "arroz": { en: "rice", fr: "riz" },
  "tortilla": { en: "corn tortilla", fr: "tortilla de maïs" },
  "tortillas": { en: "corn tortillas", fr: "tortillas de maïs" },
  "harina": { en: "flour", fr: "farine" },
  "maiz": { en: "corn", fr: "maïs" },
  "maíz": { en: "corn", fr: "maïs" },
  "salsa": { en: "salsa", fr: "sauce" },
  "salsas": { en: "salsas", fr: "sauces" },
  "crema": { en: "sour cream", fr: "crème fraîche" },
  "aguacate": { en: "avocado", fr: "avocat" },
  "cebolla": { en: "onion", fr: "oignon" },
  "cebollas": { en: "onions", fr: "oignons" },
  "cebollitas": { en: "grilled spring onions", fr: "oignons nouveaux grillés" },
  "cilantro": { en: "fresh cilantro", fr: "coriandre fraîche" },
  "jitomate": { en: "ripe tomato", fr: "tomate mûre" },
  "tomate": { en: "tomato", fr: "tomate" },
  "limon": { en: "lime", fr: "citron vert" },
  "limón": { en: "lime", fr: "citron vert" },
  "chile": { en: "chili", fr: "piment" },
  "chiles": { en: "chilies", fr: "piments" },
  "papas": { en: "potatoes", fr: "pommes de terre" },
  "papa": { en: "potato", fr: "pomme de terre" },
  "ensalada": { en: "salad", fr: "salade" },
  "guarnicion": { en: "side dish", fr: "accompagnement" },
  "guarnición": { en: "side dish", fr: "accompagnement" },
  "pan": { en: "artisan bread", fr: "pain artisanal" },
  "bolillo": { en: "crusty roll (bolillo)", fr: "petit pain croustillant" },
  "aderezo": { en: "dressing", fr: "vinaigrette" },
  "cafe": { en: "coffee", fr: "café" },
  "café": { en: "coffee", fr: "café" },
  "leche": { en: "milk", fr: "lait" },
  "chocolate": { en: "chocolate", fr: "chocolat" },
  "fresa": { en: "strawberry", fr: "fraise" },
  "fresas": { en: "strawberries", fr: "fraises" },
  "vainilla": { en: "vanilla", fr: "vanille" },
  "naranja": { en: "orange", fr: "orange" },
  "manzana": { en: "apple", fr: "pomme" },
  "agua": { en: "water", fr: "eau" },
  "cerveza": { en: "beer", fr: "bière" },
  "mezcal": { en: "mezcal", fr: "mezcal" },
  "vino": { en: "wine", fr: "vin" },
  "refresco": { en: "soda", fr: "soda" },
  "postre": { en: "dessert", fr: "dessert" },
  "pastel": { en: "cake", fr: "gâteau" },
  "nieve": { en: "sorbet", fr: "sorbet" },
  "helado": { en: "ice cream", fr: "glace" },

  // Adjetivos y Modificadores
  "gratinado": { en: "au gratin (melted cheese)", fr: "gratiné au fromage" },
  "gratinada": { en: "au gratin (melted cheese)", fr: "gratinée au fromage" },
  "gratinados": { en: "au gratin (melted cheese)", fr: "gratinés au fromage" },
  "gratinadas": { en: "au gratin (melted cheese)", fr: "gratinées au fromage" },
  "fundido": { en: "melted", fr: "fondu" },
  "fundida": { en: "melted", fr: "fondue" },
  "fundidos": { en: "melted", fr: "fondus" },
  "fundidas": { en: "melted", fr: "fondues" },
  "dorado": { en: "crisp-golden", fr: "croustillant doré" },
  "dorada": { en: "crisp-golden", fr: "croustillante dorée" },
  "dorados": { en: "crisp-golden", fr: "croustillants dorés" },
  "doradas": { en: "crisp-golden", fr: "croustillantes dorées" },
  "asado": { en: "fire-grilled", fr: "grillé aux braises" },
  "asada": { en: "fire-grilled", fr: "grillée aux braises" },
  "asados": { en: "fire-grilled", fr: "grillés aux braises" },
  "asadas": { en: "fire-grilled", fr: "grillées aux braises" },
  "frito": { en: "fried", fr: "frit" },
  "frita": { en: "fried", fr: "frite" },
  "fritos": { en: "fried", fr: "frits" },
  "fritas": { en: "fried", fr: "frites" },
  "refrito": { en: "refried", fr: "frit" },
  "refrita": { en: "refried", fr: "frite" },
  "refritos": { en: "refried", fr: "frits" },
  "refritas": { en: "refried", fr: "frites" },
  "empanizado": { en: "breaded", fr: "pané" },
  "empanizada": { en: "breaded", fr: "panée" },
  "bañado": { en: "smothered", fr: "nappé" },
  "bañada": { en: "smothered", fr: "nappée" },
  "bañados": { en: "smothered", fr: "nappés" },
  "bañadas": { en: "smothered", fr: "nappées" },
  "casero": { en: "homemade", fr: "maison" },
  "casera": { en: "homemade", fr: "maison" },
  "caseros": { en: "homemade", fr: "maison" },
  "caseras": { en: "homemade", fr: "maison" },
  "artesanal": { en: "artisanal handcrafted", fr: "artisanal fait maison" },
  "artesanales": { en: "artisanal handcrafted", fr: "artisanaux faits maison" },
  "tradicional": { en: "traditional", fr: "traditionnel" },
  "tradicionales": { en: "traditional", fr: "traditionnels" },
  "especial": { en: "special signature", fr: "signature spécial" },
  "especiales": { en: "special signature", fr: "signature spéciaux" },
  "fresco": { en: "fresh", fr: "frais" },
  "fresca": { en: "fresh", fr: "fraîche" },
  "frescos": { en: "fresh", fr: "frais" },
  "frescas": { en: "fresh", fr: "fraîches" },
  "picante": { en: "spicy hot", fr: "épicé et relevé" },
  "picantes": { en: "spicy hot", fr: "épicés et relevés" },
  "verde": { en: "green tomatillo", fr: "vert tomatillo" },
  "verdes": { en: "green tomatillo", fr: "verts tomatillo" },
  "rojo": { en: "roasted red", fr: "rouge rôti" },
  "roja": { en: "roasted red", fr: "rouge rôtie" },
  "rojos": { en: "roasted red", fr: "rouges rôtis" },
  "rojas": { en: "roasted red", fr: "rouges rôties" },
  "caliente": { en: "warm & piping hot", fr: "bien chaud" },
  "frio": { en: "chilled", fr: "bien frais" },
  "frío": { en: "chilled", fr: "bien frais" },
  "del chef": { en: "Chef's Signature", fr: "Signature du Chef" },
  "de la casa": { en: "House Special", fr: "Spécialité Maison" },

  // Conectores
  "con": { en: "with", fr: "avec" },
  "sin": { en: "without", fr: "sans" },
  "y": { en: "&", fr: "&" },
  "a la": { en: "style", fr: "façon" },
  "al": { en: "style", fr: "façon" },
  "en": { en: "in", fr: "en" },
  "de": { en: "of", fr: "de" },
  "del": { en: "of the", fr: "du" }
};

// Memoria caché para rendimiento instantáneo (0ms)
const TRANSLATION_CACHE = new Map();

function normalizeKey(str) {
  if (!str) return '';
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Traduce un texto culinario al idioma solicitado ('en' o 'fr').
 * Si ya viene en español o targetLang es 'es', lo devuelve sin alterar.
 */
export function translateCulinaryText(text, targetLang = 'es', isTitle = false) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed || targetLang === 'es') return trimmed;

  const cacheKey = `${targetLang}:${isTitle ? '1' : '0'}:${trimmed}`;
  if (TRANSLATION_CACHE.has(cacheKey)) {
    return TRANSLATION_CACHE.get(cacheKey);
  }

  const norm = normalizeKey(trimmed);

  // 1. Coincidencia exacta en diccionario gastronómico principal
  if (CULINARY_DICTIONARY[norm] && CULINARY_DICTIONARY[norm][targetLang]) {
    const res = CULINARY_DICTIONARY[norm][targetLang];
    TRANSLATION_CACHE.set(cacheKey, res);
    return res;
  }

  // 2. Traducción inteligente de frases compuestas con placeholders protegidos
  let translated = trimmed;
  const placeholders = [];
  function protect(val) {
    const id = `___LC_PH_${placeholders.length}___`;
    placeholders.push({ id, val });
    return id;
  }

  // Reemplazar patrones de cantidades comunes: "3 piezas", "3 pzas", "3 pza"
  translated = translated.replace(/(\d+)\s*(pzas?|piezas?)/gi, (match, num) => {
    return protect(targetLang === 'fr' ? `${num} pièces` : `${num} pcs`);
  });

  // Reemplazar términos conocidos del diccionario dentro de la frase
  const sortedDictKeys = Object.keys(CULINARY_DICTIONARY).sort((a, b) => b.length - a.length);
  for (const phrase of sortedDictKeys) {
    if (phrase.includes(' ') && norm.includes(phrase)) {
      const regex = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi');
      if (regex.test(translated)) {
        translated = translated.replace(regex, () => protect(CULINARY_DICTIONARY[phrase][targetLang]));
      }
    }
  }

  // Reemplazo token por token con lexicon
  const words = translated.split(/(\s+|[,.;:()&/+\-])/);
  const translatedWords = words.map(w => {
    if (!w || /^\s+$/.test(w) || /^[,.;:()&/+\-]+$/.test(w) || w.startsWith('___LC_PH_')) {
      return w;
    }
    const cleanWord = normalizeKey(w);
    if (LEXICON[cleanWord] && LEXICON[cleanWord][targetLang]) {
      const match = LEXICON[cleanWord][targetLang];
      if (w[0] === w[0].toUpperCase()) {
        return match.charAt(0).toUpperCase() + match.slice(1);
      }
      return match;
    }
    return w;
  });

  let result = translatedWords.join('');

  // Restaurar placeholders protegidos
  for (const ph of placeholders) {
    result = result.replace(ph.id, ph.val);
  }

  // Asegurar que la primera letra del resultado esté en mayúscula
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  TRANSLATION_CACHE.set(cacheKey, result);
  return result;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normaliza y enriquece un objeto producto para que siempre tenga { es, en, fr } completos
 */
export function ensureProductTranslations(productData) {
  if (!productData) return productData;

  const rawName = productData.name;
  let nameEs = '';
  let nameEn = '';
  let nameFr = '';

  if (typeof rawName === 'object' && rawName !== null) {
    nameEs = (rawName.es || '').trim();
    nameEn = (rawName.en || '').trim();
    nameFr = (rawName.fr || '').trim();
  } else if (typeof rawName === 'string') {
    nameEs = rawName.trim();
  }

  if (nameEs && (!nameEn || nameEn.toLowerCase() === nameEs.toLowerCase())) {
    nameEn = translateCulinaryText(nameEs, 'en', true);
  }
  if (nameEs && (!nameFr || nameFr.toLowerCase() === nameEs.toLowerCase())) {
    nameFr = translateCulinaryText(nameEs, 'fr', true);
  }

  const rawDesc = productData.description;
  let descEs = '';
  let descEn = '';
  let descFr = '';

  if (typeof rawDesc === 'object' && rawDesc !== null) {
    descEs = (rawDesc.es || '').trim();
    descEn = (rawDesc.en || '').trim();
    descFr = (rawDesc.fr || '').trim();
  } else if (typeof rawDesc === 'string') {
    descEs = rawDesc.trim();
  }

  if (descEs && (!descEn || descEn.toLowerCase() === descEs.toLowerCase())) {
    descEn = translateCulinaryText(descEs, 'en', false);
  }
  if (descEs && (!descFr || descFr.toLowerCase() === descEs.toLowerCase())) {
    descFr = translateCulinaryText(descEs, 'fr', false);
  }

  return {
    ...productData,
    name: {
      es: nameEs,
      en: nameEn || nameEs,
      fr: nameFr || nameEs
    },
    description: {
      es: descEs,
      en: descEn || descEs,
      fr: descFr || descEs
    }
  };
}

/**
 * Normaliza y enriquece un objeto categoría para que siempre tenga { es, en, fr } completos
 */
export function ensureCategoryTranslations(catData) {
  if (!catData) return catData;

  const rawName = catData.name;
  let nameEs = '';
  let nameEn = '';
  let nameFr = '';

  if (typeof rawName === 'object' && rawName !== null) {
    nameEs = (rawName.es || '').trim();
    nameEn = (rawName.en || '').trim();
    nameFr = (rawName.fr || '').trim();
  } else if (typeof rawName === 'string') {
    nameEs = rawName.trim();
  }

  if (nameEs && (!nameEn || nameEn.toLowerCase() === nameEs.toLowerCase())) {
    nameEn = translateCulinaryText(nameEs, 'en', true);
  }
  if (nameEs && (!nameFr || nameFr.toLowerCase() === nameEs.toLowerCase())) {
    nameFr = translateCulinaryText(nameEs, 'fr', true);
  }

  return {
    ...catData,
    name: {
      es: nameEs,
      en: nameEn || nameEs,
      fr: nameFr || nameEs
    }
  };
}
