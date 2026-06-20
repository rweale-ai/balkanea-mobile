// Destination metadata + entity detection for the Voice HUD.
// Replace imageUrl values with real Balkans photography before production.

export interface Destination {
  id: string
  name: string
  country: string
  imageUrl: string
  tagline: string
  aliases: string[]
}

export const DESTINATIONS: Record<string, Destination> = {
  ohrid: {
    id: 'ohrid',
    name: 'Ohrid',
    country: 'North Macedonia',
    imageUrl: 'https://picsum.photos/seed/ohrid-lake/1200/800',
    tagline: 'The Jerusalem of the Balkans',
    aliases: ['ohrid', 'lake ohrid', 'north macedonia', 'macedonian'],
  },
  dubrovnik: {
    id: 'dubrovnik',
    name: 'Dubrovnik',
    country: 'Croatia',
    imageUrl: 'https://picsum.photos/seed/dubrovnik-walls/1200/800',
    tagline: 'Pearl of the Adriatic',
    aliases: ['dubrovnik', 'croatia', 'dalmatian', 'adriatic coast'],
  },
  kotor: {
    id: 'kotor',
    name: 'Kotor',
    country: 'Montenegro',
    imageUrl: 'https://picsum.photos/seed/kotor-bay-medieval/1200/800',
    tagline: 'Medieval Marvel on the Bay',
    aliases: ['kotor', 'bay of kotor', 'boka kotorska', 'boka bay'],
  },
  budva: {
    id: 'budva',
    name: 'Budva',
    country: 'Montenegro',
    imageUrl: 'https://picsum.photos/seed/budva-riviera/1200/800',
    tagline: 'Riviera of the Adriatic',
    aliases: ['budva', 'budva riviera', 'budvan'],
  },
  sarajevo: {
    id: 'sarajevo',
    name: 'Sarajevo',
    country: 'Bosnia & Herzegovina',
    imageUrl: 'https://picsum.photos/seed/sarajevo-bazaar/1200/800',
    tagline: 'Where East Meets West',
    aliases: ['sarajevo', 'bosnia', 'bosnian', 'baščaršija', 'bascarsija'],
  },
  belgrade: {
    id: 'belgrade',
    name: 'Belgrade',
    country: 'Serbia',
    imageUrl: 'https://picsum.photos/seed/belgrade-danube/1200/800',
    tagline: 'The White City',
    aliases: ['belgrade', 'beograd', 'serbian', 'kalemegdan'],
  },
}

export function findDestination(text: string): Destination | null {
  const lower = text.toLowerCase()
  for (const dest of Object.values(DESTINATIONS)) {
    if (dest.aliases.some(a => lower.includes(a))) return dest
  }
  return null
}
