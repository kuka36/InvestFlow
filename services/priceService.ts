import { Asset, AssetType, Currency } from '../types';

// 价格数据缓存，避免频繁请求
interface PriceCache {
  price: number;
  timestamp: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_DURATION = 60000; // 1分钟缓存

/**
 * 获取加密货币价格 - 使用 CoinGecko API (免费，无需密钥)
 */
async function getCryptoPrice(symbol: string): Promise<number | null> {
  try {
    const symbolMap: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDT': 'tether',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'DOGE': 'dogecoin',
    };

    const coinId = symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
    );

    if (!response.ok) throw new Error('CoinGecko API failed');
    
    const data = await response.json();
    return data[coinId]?.usd || null;
  } catch (error) {
    console.error(`Failed to fetch crypto price for ${symbol}:`, error);
    return null;
  }
}

/**
 * 获取股票价格 - 使用 Twelve Data API (免费，支持CORS)
 * 备选方案：使用 Finnhub API 或 Alpha Vantage
 */
async function getStockPrice(symbol: string): Promise<number | null> {
//   try {
//     // 方案1: 使用 Finnhub 的免费公开API (支持CORS，无需密钥的演示端点)
//     // 注意：生产环境建议使用 Alpha Vantage 或 Twelve Data 的免费API密钥
//     const response = await fetch(
//       `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=demo`
//     );

//     if (!response.ok) {
//       // 备选方案：使用 polygon.io 的聚合数据（免费层）
//       throw new Error('Finnhub API failed');
//     }
    
//     const data = await response.json();
//     // Finnhub 返回格式: { c: currentPrice, h: high, l: low, o: open, pc: previousClose }
//     const price = data?.c;
    
//     if (!price || price === 0) {
//       // 如果获取失败，尝试使用 CoinCap API（某些股票ETF也支持）
//       return await getStockPriceFallback(symbol);
//     }
    
//     return price;
//   } catch (error) {
//     console.error(`Failed to fetch stock price for ${symbol}:`, error);
//     // 降级到备用方案
//     return await getStockPriceFallback(symbol);
//   }
    return await getStockPriceFallback(symbol);
}

/**
 * 股票价格备用方案 - 使用模拟数据或其他API
 */
async function getStockPriceFallback(symbol: string): Promise<number | null> {
  try {
    // 可以使用 Alpha Vantage 的免费API (需要注册获取密钥)
    const apiKey = import.meta.env.VITE_ALPHA_VANTAGE_KEY;
    if (apiKey) {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
      );
      const data = await response.json();
      return parseFloat(data['Global Quote']?.['05. price']) || null;
    }
    
    console.warn(`Using fallback for ${symbol} - consider adding API key`);
    return null;
  } catch (error) {
    console.error(`Fallback failed for ${symbol}:`, error);
    return null;
  }
}

/**
 * 获取基金价格 - 使用 Yahoo Finance
 */
async function getFundPrice(symbol: string): Promise<number | null> {
  // 优先检查是否是中国基金（6位数字代码）
  if (/^\d{6}$/.test(symbol)) {
    return getChinaFundPrice(symbol);
  }
  
  // 其他基金使用股票API
  return getStockPrice(symbol);
}

/**
 * 获取中国基金净值 - 使用天天基金API
 * 支持场内ETF和场外基金
 */
async function getChinaFundPrice(fundCode: string): Promise<number | null> {
  try {
    const timestamp = Date.now();
    const response = await fetch(
      `/api/ttfund/js/${fundCode}.js?rt=${timestamp}`
    );

    if (!response.ok) throw new Error('天天基金API请求失败');
    
    const text = await response.text();
    
    // 解析JSONP格式: jsonpgz({...})
    const jsonMatch = text.match(/jsonpgz\((.+)\)/);
    if (!jsonMatch) throw new Error('解析基金数据失败');
    
    const data = JSON.parse(jsonMatch[1]);
    
    // gsz: 估算净值（实时）, dwjz: 单位净值（上一交易日）
    // 优先使用估算净值，如果没有则使用单位净值
    const price = parseFloat(data.gsz || data.dwjz);
    
    if (isNaN(price) || price <= 0) {
      throw new Error('基金净值数据无效');
    }
    
    return price;
  } catch (error) {
    console.error(`获取中国基金 ${fundCode} 净值失败:`, error);
    return null;
  }
}

/**
 * 获取汇率 - 使用 ExchangeRate-API (免费)
 */
async function getExchangeRate(from: Currency, to: Currency = Currency.USD): Promise<number> {
  if (from === to) return 1;

  try {
    const response = await fetch(
      `/api/exchangerate/https://api.exchangerate-api.com/v4/latest/${from}`
    );

    if (!response.ok) throw new Error('ExchangeRate API failed');
    
    const data = await response.json();
    return data.rates[to] || 1;
  } catch (error) {
    console.error(`Failed to fetch exchange rate ${from} to ${to}:`, error);
    return 1;
  }
}

/**
 * 从缓存获取价格
 */
function getCachedPrice(key: string): number | null {
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price;
  }
  return null;
}

/**
 * 缓存价格
 */
function setCachedPrice(key: string, price: number): void {
  priceCache.set(key, {
    price,
    timestamp: Date.now()
  });
}

/**
 * 根据资产类型获取最新价格
 */
export async function fetchAssetPrice(asset: Asset): Promise<number | null> {
  // 现金类资产不需要更新价格
  if (asset.type === AssetType.CASH) {
    return asset.currentPrice;
  }

  const cacheKey = `${asset.type}_${asset.symbol}`;
  
  // 先尝试从缓存获取
  const cachedPrice = getCachedPrice(cacheKey);
  if (cachedPrice !== null) {
    return cachedPrice;
  }

  let price: number | null = null;

  // 根据资产类型调用不同的API
  switch (asset.type) {
    case AssetType.CRYPTO:
      price = await getCryptoPrice(asset.symbol);
      break;
    case AssetType.STOCK:
      price = await getStockPrice(asset.symbol);
      break;
    case AssetType.FUND:
      price = await getFundPrice(asset.symbol);
      break;
    default:
      return asset.currentPrice;
  }

  // 如果获取价格失败，返回当前价格
  if (price === null) {
    return asset.currentPrice;
  }

  // 如果资产使用非美元货币，需要进行汇率转换
  if (asset.currency !== Currency.USD) {
    const rate = await getExchangeRate(Currency.USD, asset.currency);
    price = price * rate;
  }

  // 缓存价格
  setCachedPrice(cacheKey, price);

  return price;
}

/**
 * 批量刷新所有资产价格
 */
export async function refreshAllAssetPrices(assets: Asset[]): Promise<Asset[]> {
  // 使用 Promise.allSettled 以便即使某些请求失败，其他的也能继续
  const results = await Promise.allSettled(
    assets.map(async (asset) => {
      const newPrice = await fetchAssetPrice(asset);
      return {
        ...asset,
        currentPrice: newPrice !== null ? newPrice : asset.currentPrice
      };
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`Failed to refresh price for ${assets[index].symbol}:`, result.reason);
      return assets[index]; // 失败时返回原资产
    }
  });
}

/**
 * 清除价格缓存
 */
export function clearPriceCache(): void {
  priceCache.clear();
}
