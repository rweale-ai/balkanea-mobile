export type CountryCode = 'us' | 'gb' | 'mk' | 'hr' | 'me' | 'ba' | 'rs' | 'al' | 'gr' | 'si' | 'bg'
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CHF' | 'RSD' | 'MKD' | 'BAM' | 'ALL' | 'HRK'

export interface Country {
  code: CountryCode
  name: string
  flag: string
  flagUrl: string
}

export interface Currency {
  code: CurrencyCode
  symbol: string
  name: string
}

const FLAG_CDN = 'https://flagcdn.com/w80'

export const COUNTRIES: Country[] = [
  { code: 'us', name: 'United States', flag: '🇺🇸', flagUrl: `${FLAG_CDN}/us.png` },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧', flagUrl: `${FLAG_CDN}/gb.png` },
  { code: 'mk', name: 'North Macedonia', flag: '🇲🇰', flagUrl: `${FLAG_CDN}/mk.png` },
  { code: 'hr', name: 'Croatia', flag: '🇭🇷', flagUrl: `${FLAG_CDN}/hr.png` },
  { code: 'me', name: 'Montenegro', flag: '🇲🇪', flagUrl: `${FLAG_CDN}/me.png` },
  { code: 'ba', name: 'Bosnia & Herzegovina', flag: '🇧🇦', flagUrl: `${FLAG_CDN}/ba.png` },
  { code: 'rs', name: 'Serbia', flag: '🇷🇸', flagUrl: `${FLAG_CDN}/rs.png` },
  { code: 'al', name: 'Albania', flag: '🇦🇱', flagUrl: `${FLAG_CDN}/al.png` },
  { code: 'gr', name: 'Greece', flag: '🇬🇷', flagUrl: `${FLAG_CDN}/gr.png` },
  { code: 'si', name: 'Slovenia', flag: '🇸🇮', flagUrl: `${FLAG_CDN}/si.png` },
  { code: 'bg', name: 'Bulgaria', flag: '🇧🇬', flagUrl: `${FLAG_CDN}/bg.png` },
]

export const CURRENCIES: Currency[] = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'RSD', symbol: 'din.', name: 'Serbian Dinar' },
  { code: 'MKD', symbol: 'ден', name: 'Macedonian Denar' },
  { code: 'BAM', symbol: 'KM', name: 'Convertible Mark' },
  { code: 'ALL', symbol: 'L', name: 'Albanian Lek' },
  { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna' },
]

export const DEFAULT_CURRENCY: Record<CountryCode, CurrencyCode> = {
  us: 'USD',
  gb: 'GBP',
  mk: 'MKD',
  hr: 'EUR',
  me: 'EUR',
  ba: 'BAM',
  rs: 'RSD',
  al: 'ALL',
  gr: 'EUR',
  si: 'EUR',
  bg: 'EUR',
}
