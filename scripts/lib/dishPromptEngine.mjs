// scripts/lib/dishPromptEngine.mjs
// Pure ESM prompt builder for standalone Node scripts

export function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DIETARY_NEGATIVE_GUARDS = {
  VEG: [
    'meat', 'poultry', 'chicken', 'mutton', 'lamb', 'beef', 'pork', 'fish',
    'salmon', 'tuna', 'pomfret', 'seafood', 'prawn', 'shrimp', 'crab', 'lobster',
    'squid', 'bacon', 'egg', 'eggs', 'non-vegetarian'
  ],
  NON_VEG: [],
};

const FAMILY_NEGATIVE_GUARDS = {
  DESSERT: ['meat', 'chicken', 'curry', 'rice', 'savory food', 'spicy sauce', 'onion', 'garlic', 'vegetables'],
  SUSHI: ['curry', 'gravy', 'naan', 'indian food', 'tandoori', 'pizza', 'burger', 'pasta'],
  PIZZA: ['curry', 'soup', 'rice', 'sushi', 'dessert'],
  PASTA: ['curry', 'rice', 'sushi', 'tandoori'],
  FISH: ['chicken', 'mutton', 'beef', 'pork'],
  SEAFOOD: ['chicken', 'mutton', 'beef', 'pork'],
  CHICKEN: ['fish', 'seafood', 'prawn', 'mutton', 'pork'],
  MUTTON: ['chicken', 'fish', 'seafood', 'prawn'],
};

export function analyzeDishProfile(dish) {
  const normName = normalizeText(dish.name);
  const normDesc = normalizeText(dish.description || '');
  const combined = `${normName} ${normDesc}`;

  let family = 'GENERAL';
  let specificProtein = '';
  let isDessert = false;
  let isSeafood = false;
  let isBeverage = false;
  let isSoup = false;
  let isBread = false;

  const courses = (dish.course_tags || []).map(c => c.toLowerCase());
  const isExplicitDessertCourse = courses.includes('dessert') || courses.includes('sweet');
  const isExplicitSoupCourse = courses.includes('soup');
  const isExplicitBeverageCourse = courses.includes('beverage') || courses.includes('drink');
  const isExplicitBreadCourse = courses.includes('bread');

  if (isExplicitDessertCourse || (!courses.includes('starter') && !courses.includes('soup') && !/quiche|pie|sandwich|samosa|chaat|curry|gravy|tikka|kebab/.test(normName) && /\b(dessert|mithai|halwa|kheer|kulfi|gulab jamun|rasmalai|rasgulla|pastry|pudding|ice cream|chocolate mousse|sorbet|brownie|falooda|jalebi|phirni|custard|cheesecake)\b/.test(combined))) {
    isDessert = true;
    family = 'DESSERT';
  } else if (isExplicitSoupCourse || /\b(soup|shorba|bisque|broth|chowder|consomme)\b/.test(normName)) {
    isSoup = true;
    family = 'SOUP';
  } else if (isExplicitBreadCourse || /\b(naan|roti|paratha|kulcha|focaccia|brioche|baguette|croissant|pita)\b/.test(normName)) {
    isBread = true;
    family = 'BREAD';
  } else if (isExplicitBeverageCourse || /\b(mocktail|cocktail drink|milkshake|smoothie|sherbet|cooler|iced tea|coffee latte|fresh juice)\b/.test(normName)) {
    isBeverage = true;
    family = 'BEVERAGE';
  }

  if (!isDessert && !isBeverage) {
    if (/\bpaneer\b|cottage cheese|chenna/.test(combined)) {
      family = 'PANEER';
    } else if (/\bchicken\b|murgh|murg|poultry|tangdi|tikka\b/.test(combined) && dish.dietary === 'NON_VEG') {
      family = 'CHICKEN';
      specificProtein = 'tender chicken';
    } else if (/\bmutton\b|gosht|lamb|boti|nihari|galouti|rogan josh|shank/.test(combined) && dish.dietary === 'NON_VEG') {
      family = 'MUTTON';
      specificProtein = 'prime mutton / lamb';
    } else if (/\bpomfret\b|salmon\b|tuna\b|fish\b|machli|sole\b|surmai\b|rawas\b|cod\b|sea bass|snapper/.test(combined)) {
      family = 'FISH';
      isSeafood = true;
      specificProtein = 'fresh fish / seafood';
    } else if (/\bprawn\b|shrimp\b|crab\b|lobster\b|squid\b|calamari\b|jhinga\b/.test(combined)) {
      family = 'SEAFOOD';
      isSeafood = true;
      specificProtein = 'succulent prawns / seafood';
    } else if (/\bsushi\b|sashimi\b|nigiri\b|maki\b|uramaki\b|temaki\b/.test(combined)) {
      family = 'SUSHI';
      isSeafood = true;
    } else if (/\bbiryani\b|pulao\b|pilaf\b|fried rice|risotto/.test(combined)) {
      family = 'RICE';
    } else if (/\bdal\b|daal\b|makhani\b|lentil\b|tadka\b|chana\b|rajma\b/.test(combined)) {
      family = 'DAL';
    } else if (/\bpasta\b|spaghetti\b|penne\b|fettuccine\b|ravioli\b|linguine\b|lasagna\b|gnocchi\b/.test(combined)) {
      family = 'PASTA';
    } else if (/\bpizza\b|flatbread\b|calzone\b/.test(combined)) {
      family = 'PIZZA';
    } else if (/\bsandwich\b|canap[eé]s?|crostini\b|bruschetta\b|slider\b|burger\b|taco\b/.test(combined)) {
      family = 'CANAPE';
    } else if (/\bchaat\b|samosa\b|pakoda\b|pakora\b|kachori\b|tikki\b/.test(combined)) {
      family = 'CHAAT';
    } else if (/\bsalad\b|greens\b|carpaccio\b|burrata\b/.test(combined)) {
      family = 'SALAD';
    }
  }

  return {
    family,
    specificProtein,
    isDessert,
    isSeafood,
    isBeverage,
    isSoup,
    isBread,
  };
}

export function buildDishImagePrompt(dish) {
  const profile = analyzeDishProfile(dish);
  const dishName = dish.name.trim();
  const description = (dish.description || '').trim();
  const cuisine = (dish.cuisine_tags && dish.cuisine_tags.length > 0) ? dish.cuisine_tags.join(', ') : 'Gourmet';
  const isVeg = dish.dietary === 'VEG';

  let presentationStyle = 'plated with precision on fine ceramic tableware, gourmet catering presentation';
  if (profile.family === 'SUSHI') {
    presentationStyle = 'arranged artfully on a traditional dark slate sushi platter with pickled ginger and fresh wasabi';
  } else if (profile.family === 'PIZZA') {
    presentationStyle = 'served fresh on a rustic wooden pizza peel with melted bubbling cheese and crisp crust';
  } else if (profile.family === 'BIRYANI') {
    presentationStyle = 'presented in a traditional luxury handi with fragrant saffron-infused grains and delicate garnish';
  } else if (profile.family === 'DESSERT') {
    presentationStyle = 'elegantly composed on modern dessert porcelain with delicate confectionery garnish';
  } else if (profile.family === 'CANAPE') {
    presentationStyle = 'arranged on a sleek luxury cocktail party pass-around silver platter';
  } else if (profile.family === 'SOUP') {
    presentationStyle = 'served in a deep artisan soup bowl with refined garnish and subtle steam';
  }

  let dietaryNote = isVeg
    ? 'Strictly 100% vegetarian culinary dish, completely free of meat, chicken, fish, seafood, or egg'
    : profile.specificProtein
      ? `Authentic non-vegetarian preparation featuring ${profile.specificProtein}`
      : 'Authentic non-vegetarian gourmet dish';

  let descriptionSnippet = '';
  if (description && description.length > 5) {
    const cleanDesc = description.replace(/[^\w\s,.-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanDesc.length <= 140) {
      descriptionSnippet = `featuring ${cleanDesc}`;
    } else {
      descriptionSnippet = `featuring ${cleanDesc.substring(0, 130).trim()}...`;
    }
  }

  const promptParts = [
    `Professional award-winning luxury catering food photography of "${dishName}"`,
    descriptionSnippet,
    `(${cuisine} cuisine, ${dietaryNote})`,
    presentationStyle,
    `appetizing realistic textures, exquisite culinary detailing, warm soft natural side lighting, subtle depth of field, high-end editorial food magazine aesthetic`,
    `ultra-high definition, 8k resolution, crisp focus, clean appetizing background`,
    `no text, no watermark, no logos, no humans, no hands, no menus`
  ].filter(Boolean);

  const prompt = promptParts.join(', ');

  const baseNegatives = [
    'text', 'words', 'watermark', 'signature', 'logo', 'letters', 'labels',
    'people', 'hands', 'fingers', 'face', 'human', 'cartoon', 'illustration',
    '3d render', 'cgi', 'drawing', 'painting', 'sketch', 'anime', 'blurry',
    'out of focus', 'oversaturated', 'distorted', 'disfigured', 'bad quality',
    'unappetizing', 'messy plate', 'dirty dishes', 'plastic'
  ];

  const dietaryNegatives = isVeg ? (DIETARY_NEGATIVE_GUARDS['VEG'] || []) : [];
  const familyNegatives = FAMILY_NEGATIVE_GUARDS[profile.family] || [];

  const combinedNegatives = Array.from(new Set([...baseNegatives, ...dietaryNegatives, ...familyNegatives]));
  const negativePrompt = combinedNegatives.join(', ');

  return {
    prompt,
    negativePrompt,
    aspectRatio: '4:3',
    family: profile.family,
    dietaryClassification: isVeg ? 'VEG' : (profile.isSeafood ? 'SEAFOOD' : 'NON_VEG'),
  };
}
