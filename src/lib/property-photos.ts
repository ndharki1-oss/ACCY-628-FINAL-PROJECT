export type PropertyGalleryPhoto = { src: string; label: string };

type PhotoPools = { exterior: string[]; interior: string[] };

const U = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

/** Theme pools keyed by business/use cues in the property name. */
const THEME_PHOTOS: Record<string, PhotoPools> = {
  arcade: {
    exterior: [
      U("photo-1511882150382-421056c89033"),
      U("photo-1555448248-2571daf6344b"),
      U("photo-1515169067868-5387ec356754"),
      U("photo-1755141574265-56729859f20e"),
    ],
    interior: [
      U("photo-1550745165-9bc0b252726f"),
      U("photo-1598550476439-6847785fcea6"),
      U("photo-1534423861386-85a16f5d13fd"),
      U("photo-1493711662062-fa541adb3fc8"),
      U("photo-1612287230202-1ff1d85d1bdf"),
    ],
  },
  gallery: {
    exterior: [
      U("photo-1518998053901-5348d3961a04"),
      U("photo-1460661419201-fd4cecdf8a8b"),
      U("photo-1578301978693-85fa9c0320b9"),
      U("photo-1545167622-3a6ac756afa4"),
    ],
    interior: [
      U("photo-1536924940846-227afb31e2a5"),
      U("photo-1574269909862-7e1d70bb8078"),
      U("photo-1518998053901-5348d3961a04"),
      U("photo-1460661419201-fd4cecdf8a8b"),
    ],
  },
  market: {
    exterior: [
      U("photo-1488459716781-31db52582fe9"),
      U("photo-1555396273-367ea4eb4db5"),
      U("photo-1414235077428-338989a2e8c0"),
      U("photo-1472851294608-062f824d29cc"),
    ],
    interior: [
      U("photo-1488459716781-31db52582fe9"),
      U("photo-1542838132-92c53300491e"),
      U("photo-1555396273-367ea4eb4db5"),
      U("photo-1414235077428-338989a2e8c0"),
    ],
  },
  shops: {
    exterior: [
      U("photo-1441986300917-64674bd600d8"),
      U("photo-1472851294608-062f824d29cc"),
      U("photo-1555636222-cae831e670b3"),
      U("photo-1604719312566-8912e9227c6a"),
    ],
    interior: [
      U("photo-1441984904996-e0b6ba687e04"),
      U("photo-1555529669-e69e7aa0ba9a"),
      U("photo-1601924994987-69e26d50dc26"),
      U("photo-1567401893414-76b7b1e5a7a5"),
    ],
  },
  loft: {
    exterior: [
      U("photo-1507089947368-19c1da9775ae"),
      U("photo-1487958449943-2429e8be8625"),
      U("photo-1464146072230-91cabc968266"),
      U("photo-1416331108676-a22ccb276e35"),
    ],
    interior: [
      U("photo-1502672260266-1c1ef2d93688"),
      U("photo-1493809842364-78817add7ffb"),
      U("photo-1600607687939-ce8a6c25118c"),
      U("photo-1560448204-e02f11c3d0e2"),
    ],
  },
  studio: {
    exterior: [
      U("photo-1497366216548-37526070297c"),
      U("photo-1487958449943-2429e8be8625"),
      U("photo-1503387762-592deb58ef4e"),
      U("photo-1464146072230-91cabc968266"),
    ],
    interior: [
      U("photo-1524758631624-e2822e304c36"),
      U("photo-1497366811353-6870744d04b2"),
      U("photo-1497215728101-856f4ea42174"),
      U("photo-1604328698692-f76ea9498e76"),
    ],
  },
  tower: {
    exterior: [
      U("photo-1486406146926-c627a92ad1ab"),
      U("photo-1545324418-cc1a3fa10c00"),
      U("photo-1487958449943-2429e8be8625"),
      U("photo-1464146072230-91cabc968266"),
    ],
    interior: [
      U("photo-1497366754035-f200968a6e72"),
      U("photo-1497366811353-6870744d04b2"),
      U("photo-1497215728101-856f4ea42174"),
      U("photo-1556761175-5973dc0f32e7"),
    ],
  },
  yard: {
    exterior: [
      U("photo-1586528116311-ad8dd3c8310d"),
      U("photo-1565610222536-ef125c59da2e"),
      U("photo-1587293852726-70cdb56c2866"),
      U("photo-1553413077-190dd305871c"),
    ],
    interior: [
      U("photo-1586528116493-a029325540fa"),
      U("photo-1566576912321-d58ddd7a6088"),
      U("photo-1605745341112-85968b19335b"),
      U("photo-1504917595217-d4dc5ebe6122"),
    ],
  },
  works: {
    exterior: [
      U("photo-1504328345606-18bbc8c9d7d1"),
      U("photo-1504917595217-d4dc5ebe6122"),
      U("photo-1586528116311-ad8dd3c8310d"),
      U("photo-1565610222536-ef125c59da2e"),
    ],
    interior: [
      U("photo-1581091226825-a6a2a5aee158"),
      U("photo-1504328345606-18bbc8c9d7d1"),
      U("photo-1605745341112-85968b19335b"),
      U("photo-1586528116493-a029325540fa"),
    ],
  },
  flex: {
    exterior: [
      U("photo-1586528116311-ad8dd3c8310d"),
      U("photo-1486406146926-c627a92ad1ab"),
      U("photo-1504917595217-d4dc5ebe6122"),
      U("photo-1587293852726-70cdb56c2866"),
    ],
    interior: [
      U("photo-1497366811353-6870744d04b2"),
      U("photo-1586528116493-a029325540fa"),
      U("photo-1524758631624-e2822e304c36"),
      U("photo-1605745341112-85968b19335b"),
    ],
  },
  office: {
    exterior: [
      U("photo-1486406146926-c627a92ad1ab"),
      U("photo-1497366216548-37526070297c"),
      U("photo-1487958449943-2429e8be8625"),
      U("photo-1545324418-cc1a3fa10c00"),
      U("photo-1464146072230-91cabc968266"),
      U("photo-1503387762-592deb58ef4e"),
    ],
    interior: [
      U("photo-1497366811353-6870744d04b2"),
      U("photo-1497215728101-856f4ea42174"),
      U("photo-1497366754035-f200968a6e72"),
      U("photo-1524758631624-e2822e304c36"),
      U("photo-1556761175-5973dc0f32e7"),
      U("photo-1604328698692-f76ea9498e76"),
    ],
  },
  retail: {
    exterior: [
      U("photo-1441986300917-64674bd600d8"),
      U("photo-1555636222-cae831e670b3"),
      U("photo-1604719312566-8912e9227c6a"),
      U("photo-1472851294608-062f824d29cc"),
    ],
    interior: [
      U("photo-1441984904996-e0b6ba687e04"),
      U("photo-1555529669-e69e7aa0ba9a"),
      U("photo-1601924994987-69e26d50dc26"),
      U("photo-1567401893414-76b7b1e5a7a5"),
    ],
  },
  warehouse: {
    exterior: [
      U("photo-1586528116311-ad8dd3c8310d"),
      U("photo-1553413077-190dd305871c"),
      U("photo-1565891741441-64926e441838"),
      U("photo-1587293852726-70cdb56c2866"),
    ],
    interior: [
      U("photo-1586528116493-a029325540fa"),
      U("photo-1566576912321-d58ddd7a6088"),
      U("photo-1605745341112-85968b19335b"),
      U("photo-1553413077-190dd305871c"),
    ],
  },
  industrial: {
    exterior: [
      U("photo-1586528116311-ad8dd3c8310d"),
      U("photo-1504917595217-d4dc5ebe6122"),
      U("photo-1566576912321-d58ddd7a6088"),
      U("photo-1587293852726-70cdb56c2866"),
    ],
    interior: [
      U("photo-1581091226825-a6a2a5aee158"),
      U("photo-1586528116493-a029325540fa"),
      U("photo-1605745341112-85968b19335b"),
      U("photo-1504917595217-d4dc5ebe6122"),
    ],
  },
};

/** Exact demo property names → theme (checked before keyword rules). */
const PROPERTY_NAME_THEMES: Record<string, string> = {
  "andersonville arcade": "arcade",
  "gold coast gallery": "gallery",
  "logan square market": "market",
  "lincoln square shops": "shops",
  "old town retail": "shops",
  "fulton market lofts": "loft",
  "wicker park studios": "studio",
  "south loop tower": "tower",
  "magnolia industrial": "industrial",
  "pilsen warehouse": "warehouse",
  "ravenswood yard": "yard",
  "canal street works": "works",
  "irving park flex": "flex",
  "oak brook offices": "office",
  "hyde park professional": "office",
  "michigan avenue suites": "office",
  "harbor point center": "office",
  "lakeview exchange": "office",
  "river north plaza": "retail",
  "westport commons": "office",
  "bridgeport center": "office",
  "clybourn commerce": "office",
};

const NAME_KEYWORD_THEMES: Array<{ pattern: RegExp; theme: string }> = [
  { pattern: /\barcade\b/, theme: "arcade" },
  { pattern: /\bgallery\b/, theme: "gallery" },
  { pattern: /\bmarket\b/, theme: "market" },
  { pattern: /\b(shops?|retail)\b/, theme: "shops" },
  { pattern: /\blofts?\b/, theme: "loft" },
  { pattern: /\bstudios?\b/, theme: "studio" },
  { pattern: /\btower\b/, theme: "tower" },
  { pattern: /\byard\b/, theme: "yard" },
  { pattern: /\bworks\b/, theme: "works" },
  { pattern: /\bflex\b/, theme: "flex" },
  { pattern: /\bwarehouse\b/, theme: "warehouse" },
  { pattern: /\bindustrial\b/, theme: "industrial" },
  { pattern: /\b(offices?|professional|suites?)\b/, theme: "office" },
  { pattern: /\bplaza\b/, theme: "retail" },
];

function normalizePropertyType(type: string) {
  const key = type.trim().toLowerCase().replaceAll(" ", "_");
  if (key === "warehouses") return "warehouse";
  if (key in THEME_PHOTOS) return key;
  return "office";
}

export function resolvePropertyPhotoTheme(name: string, type: string): string {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
  const exact = PROPERTY_NAME_THEMES[normalized];
  if (exact) return exact;

  for (const rule of NAME_KEYWORD_THEMES) {
    if (rule.pattern.test(normalized)) return rule.theme;
  }

  return normalizePropertyType(type);
}

function hashSeed(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickDistinct(pool: string[], seed: number, offset: number) {
  const first = pool[seed % pool.length];
  let second = pool[(seed + offset) % pool.length];
  if (second === first && pool.length > 1) {
    second = pool[(seed + offset + 1) % pool.length];
  }
  return [first, second] as const;
}

export function photosForProperty(property: {
  id: string;
  name: string;
  type: string;
}): PropertyGalleryPhoto[] {
  const theme = resolvePropertyPhotoTheme(property.name, property.type);
  const pools = THEME_PHOTOS[theme] ?? THEME_PHOTOS.office;
  const seed = hashSeed(`${property.id}:${theme}`);
  const [exteriorA, exteriorB] = pickDistinct(pools.exterior, seed, 2);
  const [interiorA, interiorB] = pickDistinct(pools.interior, seed, 3);

  return [
    { src: exteriorA, label: "Exterior" },
    { src: exteriorB, label: "Exterior" },
    { src: interiorA, label: "Interior" },
    { src: interiorB, label: "Interior" },
  ];
}
