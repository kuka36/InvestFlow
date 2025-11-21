import { Asset, AssetType, Currency } from '../types';

const ALPHA_VANTAGE_KEY = 'R855D2A1KSKT0CUS'; // Provided Key
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

// Cache Keys
const CACHE_RATES_KEY = 'investflow_rates';
const CACHE_PRICES_KEY = 'investflow_prices';

// Cache Duration (ms)
const RATES_TTL = 3600 * 1000; // 1 hour
const PRICE_TTL = 60 * 1000; // 1 minute (to avoid hitting rate limits too hard)

// Simple Crypto Mapping (Symbol -> CoinGecko ID)
const CRYPTO_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'SOL': 'solana',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot'
};

export interface ExchangeRates {
  [key: string]: number; // USD relative rates (e.g., USD: 1, CNY: 7.2)
}

// --- 1. Exchange Rates ---

export const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  const now = Date.now();
  const cached = localStorage.getItem(CACHE_RATES_KEY);

  if (cached) {
    const { timestamp, rates } = JSON.parse(cached);
    if (now - timestamp < RATES_TTL) {
      return rates;
    }
  }

  try {
    const res = await fetch(EXCHANGE_RATE_API);
    const data = await res.json();
    const rates = data.rates;
    
    // Save to cache
    localStorage.setItem(CACHE_RATES_KEY, JSON.stringify({ timestamp: now, rates }));
    return rates;
  } catch (error) {
    console.error("Failed to fetch exchange rates", error);
    // Fallback default rates if offline
    return { USD: 1, CNY: 7.2, HKD: 7.8 };
  }
};

// --- 2. Crypto Prices (CoinGecko) ---

export const fetchCryptoPrices = async (assets: Asset[]): Promise<Record<string, number>> => {
  const cryptoAssets = assets.filter(a => a.type === AssetType.CRYPTO);
  if (cryptoAssets.length === 0) return {};

  const ids = cryptoAssets
    .map(a => CRYPTO_MAP[a.symbol.toUpperCase()] || a.name.toLowerCase()) // Try map, then name
    .join(',');

  if (!ids) return {};

  try {
    const res = await fetch(`${COINGECKO_API}?ids=${ids}&vs_currencies=usd`);
    const data = await res.json();
    
    const priceMap: Record<string, number> = {};
    
    cryptoAssets.forEach(asset => {
      const id = CRYPTO_MAP[asset.symbol.toUpperCase()] || asset.name.toLowerCase();
      if (data[id] && data[id].usd) {
        priceMap[asset.id] = data[id].usd;
      }
    });

    return priceMap;
  } catch (error) {
    console.warn("CoinGecko API Limit or Error", error);
    return {};
  }
};

// --- 3. Stock Prices (Alpha Vantage) ---

// Helper to delay execution to respect rate limits (approx 5 calls/minute for free tier)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchStockPrices = async (assets: Asset[]): Promise<Record<string, number>> => {
  const stockAssets = assets.filter(a => a.type === AssetType.STOCK || a.type === AssetType.FUND);
  const priceMap: Record<string, number> = {};
  
  // Only fetch the first 3 to avoid instant rate limit on free tier during demo
  // In production, you would need a backend queue or paid tier.
  const limitedQueue = stockAssets.slice(0, 3);

  for (const asset of limitedQueue) {
    try {
      // Basic check to see if it's likely a US stock (no suffix) or HK (.HK) or CN (.SS/.SZ)
      // Alpha Vantage symbols: IBM, 0700.HK, 600000.SS
      let querySymbol = asset.symbol; 
      
      // Heuristic: If currency is HKD and no suffix, add .HK
      if (asset.currency === Currency.HKD && !asset.symbol.includes('.')) {
          querySymbol = `${asset.symbol}.HK`;
      }

      const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${querySymbol}&apikey=${ALPHA_VANTAGE_KEY}`);
      const data = await res.json();

      if (data['Global Quote'] && data['Global Quote']['05. price']) {
        priceMap[asset.id] = parseFloat(data['Global Quote']['05. price']);
      } else if (data['Note']) {
          console.warn("Alpha Vantage Rate Limit reached");
          break; // Stop processing loop
      }

      await delay(12000); // 12 seconds delay to stay under 5 calls/min
    } catch (e) {
      console.error(`Failed to fetch stock ${asset.symbol}`, e);
    }
  }

  return priceMap;
};

/**
 * Converts a value from an Asset's currency to the Base Currency
 */
export const convertValue = (
  value: number, 
  fromCurrency: Currency, 
  toBase: Currency, 
  rates: ExchangeRates
): number => {
  if (fromCurrency === toBase) return value;
  
  // Rates are USD based. 
  // Formula: ValueInUSD = Value / Rate(From)
  //          ValueInBase = ValueInUSD * Rate(To)
  
  const rateFrom = rates[fromCurrency] || 1;
  const rateTo = rates[toBase] || 1;

  // Avoid division by zero
  if (rateFrom === 0) return value;

  return (value / rateFrom) * rateTo;
};