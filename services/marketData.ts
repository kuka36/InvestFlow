import { Asset, AssetType, Currency } from '../types';

const ALPHA_VANTAGE_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY;
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

// Cache Keys
const CACHE_RATES_KEY = 'investflow_rates';
const CACHE_CRYPTO_KEY = 'investflow_crypto_prices';
const CACHE_STOCKS_KEY = 'investflow_stock_prices';

// Cache Duration (ms)
// Rates: 24 hours
const RATES_TTL = 24 * 3600 * 1000; 
// Crypto: 10 minutes
const CRYPTO_TTL = 10 * 60 * 1000; 
// Stocks: 4 hours (Increased to save API calls and use "manual/stale" data longer)
const STOCK_TTL = 4 * 60 * 60 * 1000;

// Simple Crypto Mapping
const CRYPTO_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'SOL': 'solana',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'LINK': 'chainlink'
};

export interface ExchangeRates {
  [key: string]: number;
}

export interface StockPriceResult {
  price: number;
  currency: Currency;
  lastUpdated?: number;
}

export const detectCurrencyFromSymbol = (symbol: string): Currency => {
  const upper = symbol.toUpperCase();
  if (upper.endsWith('.SS') || upper.endsWith('.SZ')) return Currency.CNY;
  if (upper.endsWith('.HK')) return Currency.HKD;
  return Currency.USD;
};

// --- Helper: Cache Access ---
const getFromCache = <T>(key: string): { data: T | null, timestamp: number } => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return { data: null, timestamp: 0 };
    const { timestamp, data } = JSON.parse(cached);
    return { data, timestamp };
  } catch (e) {
    return { data: null, timestamp: 0 };
  }
};

const saveToCache = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
  } catch (e) {
    console.warn("Failed to save to localStorage", e);
  }
};

// --- 1. Exchange Rates ---
export const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  const { data: cachedRates, timestamp } = getFromCache<ExchangeRates>(CACHE_RATES_KEY);
  const isStale = (Date.now() - timestamp) > RATES_TTL;
  
  // If fresh, use cache
  if (cachedRates && !isStale) return cachedRates;

  try {
    const res = await fetch(EXCHANGE_RATE_API);
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    saveToCache(CACHE_RATES_KEY, data.rates);
    return data.rates;
  } catch (error) {
    console.warn("Exchange Rate API failed, using fallback cache", error);
    // Fallback: Return stale cache if exists, else default
    return cachedRates || { USD: 1, CNY: 7.2, HKD: 7.8 };
  }
};

// --- 2. Crypto Prices ---
export const fetchCryptoPrices = async (assets: Asset[]): Promise<Record<string, number>> => {
  const cryptoAssets = assets.filter(a => a.type === AssetType.CRYPTO);
  if (cryptoAssets.length === 0) return {};

  const { data: cachedPrices, timestamp } = getFromCache<Record<string, number>>(CACHE_CRYPTO_KEY);
  const isStale = (Date.now() - timestamp) > CRYPTO_TTL;

  // Use cache if fresh and complete
  if (cachedPrices && !isStale) {
    const allCovered = cryptoAssets.every(a => cachedPrices[a.id] !== undefined);
    if (allCovered) return cachedPrices;
  }

  const ids = cryptoAssets
    .map(a => CRYPTO_MAP[a.symbol.toUpperCase()] || a.name.toLowerCase().replace(/\s+/g, '-'))
    .join(',');

  if (!ids) return cachedPrices || {};

  try {
    const res = await fetch(`${COINGECKO_API}?ids=${ids}&vs_currencies=usd`);
    if (!res.ok) throw new Error("CoinGecko API Error");
    const data = await res.json();
    
    const newPriceMap: Record<string, number> = { ...(cachedPrices || {}) };
    cryptoAssets.forEach(asset => {
      const id = CRYPTO_MAP[asset.symbol.toUpperCase()] || asset.name.toLowerCase().replace(/\s+/g, '-');
      if (data[id] && data[id].usd) {
        newPriceMap[asset.id] = data[id].usd;
      }
    });

    saveToCache(CACHE_CRYPTO_KEY, newPriceMap);
    return newPriceMap;
  } catch (error) {
    console.warn("Crypto API failed, using stale cache", error);
    return cachedPrices || {};
  }
};

// --- 3. Stock Prices ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchStockPrices = async (assets: Asset[]): Promise<Record<string, StockPriceResult>> => {
  const stockAssets = assets.filter(a => a.type === AssetType.STOCK || a.type === AssetType.FUND);
  if (stockAssets.length === 0) return {};

  // 1. Load existing cache (we will update this object)
  const { data: cachedMap } = getFromCache<Record<string, StockPriceResult>>(CACHE_STOCKS_KEY);
  const priceMap: Record<string, StockPriceResult> = { ...(cachedMap || {}) };
  
  const now = Date.now();
  const assetsToFetch: Asset[] = [];

  // 2. Identify assets that strictly NEED update (Older than TTL)
  for (const asset of stockAssets) {
    const cachedItem = priceMap[asset.id];
    if (!cachedItem || !cachedItem.lastUpdated || (now - cachedItem.lastUpdated > STOCK_TTL)) {
      assetsToFetch.push(asset);
    }
  }

  // 3. Batch processing (Max 3 to save limits)
  const limitedQueue = assetsToFetch.slice(0, 3);
  let dataUpdated = false;

  for (const asset of limitedQueue) {
    try {
      // Check if API Key is present
      if (!ALPHA_VANTAGE_KEY) {
        console.warn("Alpha Vantage API Key is missing. Please set VITE_ALPHA_VANTAGE_KEY in your environment.");
        break;
      }

      let querySymbol = asset.symbol; 
      if (asset.currency === Currency.HKD && !querySymbol.includes('.')) {
          querySymbol = `${querySymbol}.HK`;
      } else if (asset.currency === Currency.CNY && !querySymbol.includes('.')) {
          // Heuristic for Shanghai/Shenzhen
          querySymbol = querySymbol.startsWith('6') ? `${querySymbol}.SS` : `${querySymbol}.SZ`;
      }

      const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${querySymbol}&apikey=${ALPHA_VANTAGE_KEY}`);
      const data = await res.json();

      // Check for Rate Limit Note
      if (data['Note'] || data['Information']) {
          console.warn("Alpha Vantage Rate Limit hit:", data['Note'] || data['Information']);
          break; // Stop processing, keep existing cache
      }

      if (data['Global Quote'] && data['Global Quote']['05. price']) {
        const price = parseFloat(data['Global Quote']['05. price']);
        const detectedCurrency = detectCurrencyFromSymbol(data['Global Quote']['01. symbol'] || querySymbol);
        
        priceMap[asset.id] = {
          price,
          currency: detectedCurrency,
          lastUpdated: Date.now()
        };
        dataUpdated = true;
      } else {
        console.warn(`No price data found for ${querySymbol}`);
      }
      
      // Only delay if we actually made a call and plan to make another
      if (limitedQueue.length > 1) await delay(12000); 

    } catch (e) {
      console.error(`Failed to fetch stock ${asset.symbol}`, e);
      // Continue to next asset, keep existing value in map
    }
  }

  // 4. Always save if we updated anything
  if (dataUpdated) {
    saveToCache(CACHE_STOCKS_KEY, priceMap);
  }

  // 5. Return the map (which contains a mix of fresh and stale data)
  return priceMap;
};

export const convertValue = (
  value: number, 
  fromCurrency: Currency, 
  toBase: Currency, 
  rates: ExchangeRates
): number => {
  if (fromCurrency === toBase) return value;
  const rateFrom = rates[fromCurrency] || 1;
  const rateTo = rates[toBase] || 1;
  if (rateFrom === 0) return value;
  return (value / rateFrom) * rateTo;
};