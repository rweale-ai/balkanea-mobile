export type CountryCode = 'us' | 'mk'
export type CurrencyCode = 'USD' | 'EUR'

export interface Country {
  code: CountryCode
  name: string
  flag: string
}

export interface Currency {
  code: CurrencyCode
  symbol: string
  name: string
}

export const COUNTRIES: Country[] = [
  { code: 'us', name: 'United States', flag: '🇺🇸' },
  { code: 'mk', name: 'North Macedonia', flag: '🇲🇰' },
]

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
]

// Selecting a country auto-suggests this currency
export const DEFAULT_CURRENCY: Record<CountryCode, CurrencyCode> = {
  us: 'USD',
  mk: 'EUR',
}
