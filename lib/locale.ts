export type CountryCode = 'us' | 'gb' | 'mk' | 'hr' | 'me' | 'ba' | 'rs' | 'al' | 'gr' | 'si' | 'bg'
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CHF' | 'RSD' | 'MKD' | 'BAM' | 'ALL' | 'HRK'

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
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'mk', name: 'North Macedonia', flag: '🇲🇰' },
  { code: 'hr', name: 'Croatia', flag: '🇭🇷' },
  { code: 'me', name: 'Montenegro', flag: '🇲🇪' },
  { code: 'ba', name: 'Bosnia & Herzegovina', flag: '🇧🇦' },
  { code: 'rs', name: 'Serbia', flag: '🇷🇸' },
  { code: 'al', name: 'Albania', flag: '🇦🇱' },
  { code: 'gr', name: 'Greece', flag: '🇬🇷' },
  { code: 'si', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'bg', name: 'Bulgaria', flag: '🇧🇬' },
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
