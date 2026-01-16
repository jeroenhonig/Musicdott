// Currency localization utilities

interface CurrencyInfo {
  code: string;
  symbol: string;
  rate: number; // Exchange rate from EUR base
}

const CURRENCY_CONFIG: Record<string, CurrencyInfo> = {
  EUR: { code: 'EUR', symbol: '€', rate: 1.0 },
  USD: { code: 'USD', symbol: '$', rate: 1.1 }, // Approximate rate
};

// European country codes (ISO 3166-1 alpha-2)
const EUROPEAN_COUNTRIES = new Set([
  'AD', 'AL', 'AT', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK', 
  'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 
  'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 
  'RO', 'RS', 'RU', 'SE', 'SI', 'SK', 'SM', 'UA', 'VA'
]);

/**
 * Detect user's country and determine appropriate currency
 */
export function getUserCurrency(): CurrencyInfo {
  try {
    // Try to get country from browser locale
    const locale = navigator.language || navigator.languages?.[0] || 'en-US';
    const countryCode = locale.split('-')[1]?.toUpperCase();
    
    // Check if European country
    if (countryCode && EUROPEAN_COUNTRIES.has(countryCode)) {
      return CURRENCY_CONFIG.EUR;
    }
    
    // For specific European locales without country code
    if (locale.startsWith('de') || locale.startsWith('fr') || 
        locale.startsWith('es') || locale.startsWith('it') || 
        locale.startsWith('nl') || locale.startsWith('pl')) {
      return CURRENCY_CONFIG.EUR;
    }
    
    // Default to USD for non-European countries
    return CURRENCY_CONFIG.USD;
  } catch {
    // Fallback to USD if detection fails
    return CURRENCY_CONFIG.USD;
  }
}

/**
 * Format price in user's local currency
 */
export function formatPrice(euroPrice: number, options?: { 
  showCurrency?: boolean;
  precision?: number;
}): string {
  const currency = getUserCurrency();
  const localPrice = euroPrice * currency.rate;
  const precision = options?.precision ?? 2;
  
  if (options?.showCurrency !== false) {
    return `${currency.symbol}${localPrice.toFixed(precision)}`;
  }
  
  return localPrice.toFixed(precision);
}

/**
 * Get pricing text with currency context
 */
export function getPricingText(standardPrice: number, proPrice: number): {
  standard: string;
  pro: string;
  currency: string;
  extraStudents: string;
} {
  const currency = getUserCurrency();
  
  return {
    standard: formatPrice(standardPrice),
    pro: formatPrice(proPrice),
    currency: currency.code,
    extraStudents: formatPrice(4.50)
  };
}

/**
 * Convert EUR price to user's currency
 */
export function convertPrice(euroPrice: number): number {
  const currency = getUserCurrency();
  return euroPrice * currency.rate;
}