export type DestinationCategory = 'beach' | 'mountain' | 'culture' | 'adventure' | 'nightlife' | 'nature' | 'history' | 'food'

export interface Destination {
  id: string
  name: string
  country: string
  imageUrl: string
  tagline: string
  aliases: string[]
  categories: DestinationCategory[]
  rating: number
  reviewCount: number
  highlights: string[]
  bestTimeToVisit: string
  averageBudgetPerDay: number
}

export const CATEGORIES: { id: DestinationCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all',       label: 'All',       icon: '✦' },
  { id: 'beach',     label: 'Beach',     icon: '🏖' },
  { id: 'mountain',  label: 'Mountain',  icon: '⛰' },
  { id: 'culture',   label: 'Culture',   icon: '🏛' },
  { id: 'adventure', label: 'Adventure', icon: '🧗' },
  { id: 'nightlife', label: 'Nightlife', icon: '🌙' },
  { id: 'nature',    label: 'Nature',    icon: '🌿' },
  { id: 'history',   label: 'History',   icon: '📜' },
  { id: 'food',      label: 'Food & Wine', icon: '🍷' },
]

export const DESTINATIONS: Record<string, Destination> = {
  ohrid: {
    id: 'ohrid',
    name: 'Ohrid',
    country: 'North Macedonia',
    imageUrl: 'https://picsum.photos/seed/ohrid-lake/1200/800',
    tagline: 'The Jerusalem of the Balkans',
    aliases: ['ohrid', 'lake ohrid', 'north macedonia', 'macedonian'],
    categories: ['culture', 'nature', 'history'],
    rating: 4.8,
    reviewCount: 1240,
    highlights: ['UNESCO World Heritage', 'Crystal-clear lake', '365 churches'],
    bestTimeToVisit: 'May – September',
    averageBudgetPerDay: 45,
  },
  dubrovnik: {
    id: 'dubrovnik',
    name: 'Dubrovnik',
    country: 'Croatia',
    imageUrl: 'https://picsum.photos/seed/dubrovnik-walls/1200/800',
    tagline: 'Pearl of the Adriatic',
    aliases: ['dubrovnik', 'croatia', 'dalmatian', 'adriatic coast'],
    categories: ['culture', 'history', 'beach'],
    rating: 4.9,
    reviewCount: 3420,
    highlights: ['Ancient city walls', 'Game of Thrones filming', 'Stradun promenade'],
    bestTimeToVisit: 'April – October',
    averageBudgetPerDay: 95,
  },
  kotor: {
    id: 'kotor',
    name: 'Kotor',
    country: 'Montenegro',
    imageUrl: 'https://picsum.photos/seed/kotor-bay-medieval/1200/800',
    tagline: 'Medieval Marvel on the Bay',
    aliases: ['kotor', 'bay of kotor', 'boka kotorska', 'boka bay'],
    categories: ['history', 'nature', 'adventure'],
    rating: 4.7,
    reviewCount: 1890,
    highlights: ['Bay of Kotor fjord', 'Fortress hike', 'Cat-filled old town'],
    bestTimeToVisit: 'May – October',
    averageBudgetPerDay: 65,
  },
  budva: {
    id: 'budva',
    name: 'Budva',
    country: 'Montenegro',
    imageUrl: 'https://picsum.photos/seed/budva-riviera/1200/800',
    tagline: 'Riviera of the Adriatic',
    aliases: ['budva', 'budva riviera', 'budvan'],
    categories: ['beach', 'nightlife'],
    rating: 4.5,
    reviewCount: 2100,
    highlights: ['Sandy beaches', 'Vibrant nightlife', 'Sveti Stefan island'],
    bestTimeToVisit: 'June – September',
    averageBudgetPerDay: 70,
  },
  sarajevo: {
    id: 'sarajevo',
    name: 'Sarajevo',
    country: 'Bosnia & Herzegovina',
    imageUrl: 'https://picsum.photos/seed/sarajevo-bazaar/1200/800',
    tagline: 'Where East Meets West',
    aliases: ['sarajevo', 'bosnia', 'bosnian', 'baščaršija', 'bascarsija'],
    categories: ['culture', 'history', 'food'],
    rating: 4.7,
    reviewCount: 1650,
    highlights: ['Ottoman bazaar', 'Tunnel of Hope', 'Bosnian coffee culture'],
    bestTimeToVisit: 'April – October',
    averageBudgetPerDay: 40,
  },
  belgrade: {
    id: 'belgrade',
    name: 'Belgrade',
    country: 'Serbia',
    imageUrl: 'https://picsum.photos/seed/belgrade-danube/1200/800',
    tagline: 'The White City',
    aliases: ['belgrade', 'beograd', 'serbian', 'kalemegdan'],
    categories: ['nightlife', 'culture', 'food'],
    rating: 4.6,
    reviewCount: 2800,
    highlights: ['Legendary nightlife', 'Kalemegdan Fortress', 'Danube riverfront'],
    bestTimeToVisit: 'April – October',
    averageBudgetPerDay: 45,
  },
  mostar: {
    id: 'mostar',
    name: 'Mostar',
    country: 'Bosnia & Herzegovina',
    imageUrl: 'https://picsum.photos/seed/mostar-bridge/1200/800',
    tagline: 'City of the Old Bridge',
    aliases: ['mostar', 'stari most', 'old bridge'],
    categories: ['history', 'culture', 'adventure'],
    rating: 4.7,
    reviewCount: 1320,
    highlights: ['Stari Most bridge diving', 'Ottoman old town', 'Kravice waterfalls nearby'],
    bestTimeToVisit: 'May – September',
    averageBudgetPerDay: 35,
  },
  tirana: {
    id: 'tirana',
    name: 'Tirana',
    country: 'Albania',
    imageUrl: 'https://picsum.photos/seed/tirana-colorful/1200/800',
    tagline: 'Europe\'s Most Colorful Capital',
    aliases: ['tirana', 'albania', 'albanian'],
    categories: ['culture', 'food', 'nightlife'],
    rating: 4.4,
    reviewCount: 980,
    highlights: ['Colorful buildings', 'Bunk\'Art museums', 'Blloku nightlife district'],
    bestTimeToVisit: 'April – October',
    averageBudgetPerDay: 30,
  },
  bled: {
    id: 'bled',
    name: 'Bled',
    country: 'Slovenia',
    imageUrl: 'https://picsum.photos/seed/bled-lake-island/1200/800',
    tagline: 'Fairy-Tale Alpine Lake',
    aliases: ['bled', 'lake bled', 'slovenian'],
    categories: ['nature', 'adventure', 'mountain'],
    rating: 4.9,
    reviewCount: 2650,
    highlights: ['Island church', 'Bled Castle', 'Vintgar Gorge'],
    bestTimeToVisit: 'June – September',
    averageBudgetPerDay: 80,
  },
  split: {
    id: 'split',
    name: 'Split',
    country: 'Croatia',
    imageUrl: 'https://picsum.photos/seed/split-palace/1200/800',
    tagline: 'Living Inside Roman Ruins',
    aliases: ['split', 'diocletian'],
    categories: ['history', 'beach', 'culture'],
    rating: 4.7,
    reviewCount: 2340,
    highlights: ['Diocletian\'s Palace', 'Riva waterfront', 'Island-hopping base'],
    bestTimeToVisit: 'May – October',
    averageBudgetPerDay: 75,
  },
  hvar: {
    id: 'hvar',
    name: 'Hvar',
    country: 'Croatia',
    imageUrl: 'https://picsum.photos/seed/hvar-island/1200/800',
    tagline: 'Lavender Island of the Adriatic',
    aliases: ['hvar', 'hvar island'],
    categories: ['beach', 'nightlife', 'nature'],
    rating: 4.6,
    reviewCount: 1780,
    highlights: ['Lavender fields', 'Secluded coves', 'Sunset from Spanjola fortress'],
    bestTimeToVisit: 'June – September',
    averageBudgetPerDay: 110,
  },
  skopje: {
    id: 'skopje',
    name: 'Skopje',
    country: 'North Macedonia',
    imageUrl: 'https://picsum.photos/seed/skopje-stone/1200/800',
    tagline: 'City of Statues & Stories',
    aliases: ['skopje', 'macedonian capital'],
    categories: ['culture', 'history', 'food'],
    rating: 4.3,
    reviewCount: 870,
    highlights: ['Old Bazaar', 'Stone Bridge', 'Matka Canyon nearby'],
    bestTimeToVisit: 'April – October',
    averageBudgetPerDay: 35,
  },
  thessaloniki: {
    id: 'thessaloniki',
    name: 'Thessaloniki',
    country: 'Greece',
    imageUrl: 'https://picsum.photos/seed/thessaloniki-tower/1200/800',
    tagline: 'Greece\'s Cultural Capital',
    aliases: ['thessaloniki', 'salonika', 'greek', 'greece'],
    categories: ['food', 'culture', 'history', 'nightlife'],
    rating: 4.7,
    reviewCount: 3100,
    highlights: ['White Tower', 'Ladadika district', 'Best food in Greece'],
    bestTimeToVisit: 'April – November',
    averageBudgetPerDay: 65,
  },
  berat: {
    id: 'berat',
    name: 'Berat',
    country: 'Albania',
    imageUrl: 'https://picsum.photos/seed/berat-windows/1200/800',
    tagline: 'City of a Thousand Windows',
    aliases: ['berat', 'thousand windows'],
    categories: ['history', 'culture', 'nature'],
    rating: 4.6,
    reviewCount: 720,
    highlights: ['UNESCO old town', 'Berat Castle', 'Osum Canyon'],
    bestTimeToVisit: 'April – October',
    averageBudgetPerDay: 25,
  },
  ljubljana: {
    id: 'ljubljana',
    name: 'Ljubljana',
    country: 'Slovenia',
    imageUrl: 'https://picsum.photos/seed/ljubljana-dragon/1200/800',
    tagline: 'Europe\'s Green Capital',
    aliases: ['ljubljana', 'slovenia'],
    categories: ['culture', 'food', 'nature'],
    rating: 4.7,
    reviewCount: 1950,
    highlights: ['Dragon Bridge', 'Car-free center', 'Ljubljana Castle'],
    bestTimeToVisit: 'May – September',
    averageBudgetPerDay: 70,
  },
}

export function findDestination(text: string): Destination | null {
  const lower = text.toLowerCase()
  for (const dest of Object.values(DESTINATIONS)) {
    if (dest.aliases.some(a => lower.includes(a))) return dest
  }
  return null
}

export function filterDestinations(
  category: DestinationCategory | 'all',
  searchQuery: string,
): Destination[] {
  const query = searchQuery.toLowerCase().trim()
  return Object.values(DESTINATIONS).filter(d => {
    if (category !== 'all' && !d.categories.includes(category)) return false
    if (query) {
      return d.name.toLowerCase().includes(query)
        || d.country.toLowerCase().includes(query)
        || d.tagline.toLowerCase().includes(query)
    }
    return true
  })
}
