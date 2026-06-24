import type { Destination, DestinationCategory } from './types'

export type { DestinationCategory }
export type { Destination }

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
  santorini: {
    id: 'santorini',
    name: 'Santorini',
    country: 'Greece',
    imageUrl: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Sunsets over the caldera',
    categories: ['beach', 'culture', 'food'],
    rating: 4.9,
    reviewCount: 4200,
    highlights: ['Oia sunset', 'Volcanic beaches', 'Wine tasting', 'Blue dome churches'],
    bestTimeToVisit: 'May – October',
    regionId: 6057649,
  },
  thessaloniki: {
    id: 'thessaloniki',
    name: 'Thessaloniki',
    country: 'Greece',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=1200&q=80',
    tagline: "Greece's cultural capital",
    categories: ['food', 'culture', 'history', 'nightlife'],
    rating: 4.7,
    reviewCount: 3100,
    highlights: ['White Tower', 'Ladadika district', 'Best food in Greece', 'Ano Poli old town'],
    bestTimeToVisit: 'April – November',
    regionId: 6057648,
  },
  athens: {
    id: 'athens',
    name: 'Athens',
    country: 'Greece',
    imageUrl: 'https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Where civilisation began',
    categories: ['culture', 'history', 'food'],
    rating: 4.6,
    reviewCount: 5400,
    highlights: ['Acropolis', 'Plaka district', 'Monastiraki flea market', 'Cape Sounion'],
    bestTimeToVisit: 'March – November',
    regionId: 6057647,
  },
  istanbul: {
    id: 'istanbul',
    name: 'Istanbul',
    country: 'Turkey',
    imageUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Where East meets West',
    categories: ['culture', 'history', 'food', 'adventure'],
    rating: 4.8,
    reviewCount: 6800,
    highlights: ['Hagia Sophia', 'Grand Bazaar', 'Bosphorus cruise', 'Turkish cuisine'],
    bestTimeToVisit: 'April – October',
    regionId: 6057672,
  },
  antalya: {
    id: 'antalya',
    name: 'Antalya',
    country: 'Turkey',
    imageUrl: 'https://images.unsplash.com/photo-1593352216840-1aee83c6e014?auto=format&fit=crop&w=1200&q=80',
    tagline: 'The Turkish Riviera',
    categories: ['beach', 'history', 'nature'],
    rating: 4.6,
    reviewCount: 3900,
    highlights: ['Konyaalti beach', 'Duden waterfalls', 'Old Town (Kaleici)', 'All-inclusive resorts'],
    bestTimeToVisit: 'May – October',
    regionId: 6057671,
  },
  rome: {
    id: 'rome',
    name: 'Rome',
    country: 'Italy',
    imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
    tagline: 'The Eternal City',
    categories: ['culture', 'history', 'food'],
    rating: 4.8,
    reviewCount: 7200,
    highlights: ['Colosseum', 'Vatican City', 'Trastevere dining', 'Trevi Fountain'],
    bestTimeToVisit: 'April – October',
    regionId: 6057660,
  },
  dubrovnik: {
    id: 'dubrovnik',
    name: 'Dubrovnik',
    country: 'Croatia',
    imageUrl: 'https://images.unsplash.com/photo-1518684079-3c85ef2bff08?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Pearl of the Adriatic',
    categories: ['culture', 'history', 'beach'],
    rating: 4.9,
    reviewCount: 3420,
    highlights: ['Ancient city walls', 'Stradun promenade', 'Cable car views', 'Island hopping'],
    bestTimeToVisit: 'April – October',
    regionId: 3953,
  },
  split: {
    id: 'split',
    name: 'Split',
    country: 'Croatia',
    imageUrl: 'https://images.unsplash.com/photo-1555990538-9a0e11b7a53f?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Living inside Roman ruins',
    categories: ['history', 'beach', 'culture'],
    rating: 4.7,
    reviewCount: 2340,
    highlights: ["Diocletian's Palace", 'Riva waterfront', 'Marjan Hill', 'Hvar day trip'],
    bestTimeToVisit: 'May – October',
    regionId: 3948,
  },
  budva: {
    id: 'budva',
    name: 'Budva',
    country: 'Montenegro',
    imageUrl: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Riviera of the Adriatic',
    categories: ['beach', 'nightlife'],
    rating: 4.5,
    reviewCount: 2100,
    highlights: ['Sandy beaches', 'Vibrant nightlife', 'Sveti Stefan island', 'Old Town'],
    bestTimeToVisit: 'June – September',
    regionId: 6057628,
  },
  kotor: {
    id: 'kotor',
    name: 'Kotor',
    country: 'Montenegro',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Medieval marvel on the bay',
    categories: ['history', 'nature', 'adventure'],
    rating: 4.7,
    reviewCount: 1890,
    highlights: ['Bay of Kotor', 'Fortress hike', 'Old Town', 'Perast day trip'],
    bestTimeToVisit: 'May – October',
    regionId: 6057628,
  },
  hurghada: {
    id: 'hurghada',
    name: 'Hurghada',
    country: 'Egypt',
    imageUrl: 'https://images.unsplash.com/photo-1539768942893-daf53e736b68?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Red Sea paradise',
    categories: ['beach', 'adventure', 'nature'],
    rating: 4.4,
    reviewCount: 2800,
    highlights: ['Coral reefs', 'Snorkeling', 'Desert safari', 'All-inclusive resorts'],
    bestTimeToVisit: 'October – April',
    regionId: 6057652,
  },
  paris: {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    tagline: 'The City of Light',
    categories: ['culture', 'food', 'history'],
    rating: 4.8,
    reviewCount: 8900,
    highlights: ['Eiffel Tower', 'Louvre Museum', 'Montmartre', 'Seine River cruise'],
    bestTimeToVisit: 'April – October',
    regionId: 6057653,
  },
  barcelona: {
    id: 'barcelona',
    name: 'Barcelona',
    country: 'Spain',
    imageUrl: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Gaudi, beaches & tapas',
    categories: ['beach', 'culture', 'food', 'nightlife'],
    rating: 4.7,
    reviewCount: 6100,
    highlights: ['Sagrada Familia', 'La Rambla', 'Barceloneta beach', 'Gothic Quarter'],
    bestTimeToVisit: 'May – September',
    regionId: 6057666,
  },
  ohrid: {
    id: 'ohrid',
    name: 'Ohrid',
    country: 'North Macedonia',
    imageUrl: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?auto=format&fit=crop&w=1200&q=80',
    tagline: 'The Jerusalem of the Balkans',
    categories: ['culture', 'nature', 'history'],
    rating: 4.8,
    reviewCount: 1240,
    highlights: ['UNESCO World Heritage', 'Crystal-clear lake', '365 churches', 'Sveti Naum'],
    bestTimeToVisit: 'May – September',
    regionId: 6053839,
  },
  prague: {
    id: 'prague',
    name: 'Prague',
    country: 'Czech Republic',
    imageUrl: 'https://images.unsplash.com/photo-1541849546-216549ae216d?auto=format&fit=crop&w=1200&q=80',
    tagline: 'City of a hundred spires',
    categories: ['culture', 'history', 'nightlife', 'food'],
    rating: 4.7,
    reviewCount: 5600,
    highlights: ['Charles Bridge', 'Old Town Square', 'Prague Castle', 'Czech beer culture'],
    bestTimeToVisit: 'April – October',
    regionId: 6057641,
  },
}

export function findDestination(text: string): Destination | null {
  const lower = text.toLowerCase()
  for (const dest of Object.values(DESTINATIONS)) {
    if (lower.includes(dest.name.toLowerCase()) || lower.includes(dest.country.toLowerCase())) {
      return dest
    }
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

export function getDestinationByRegionId(regionId: number): Destination | null {
  return Object.values(DESTINATIONS).find(d => d.regionId === regionId) ?? null
}
