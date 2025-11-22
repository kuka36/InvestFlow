
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Asset, AssetType, Currency, Transaction, TransactionType, Language, AIProvider } from '../types';
import { fetchExchangeRates, fetchCryptoPrices, fetchStockPrices, ExchangeRates } from '../services/marketData';
import { translations } from '../utils/i18n';

interface AppSettings {
  baseCurrency: Currency;
  isPrivacyMode: boolean;
  geminiApiKey: string;
  deepSeekApiKey: string;
  aiProvider: AIProvider;
  alphaVantageApiKey: string;
  language: Language;
}

interface PortfolioContextType {
  assets: Asset[];
  transactions: Transaction[];
  settings: AppSettings;
  exchangeRates: ExchangeRates;
  isRefreshing: boolean;
  addAsset: (asset: Asset) => void;
  editAsset: (asset: Asset) => void;
  deleteAsset: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  updateAssetPrice: (id: string, newPrice: number) => void;
  refreshPrices: (assetsOverride?: Asset[]) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  importData: (data: { assets: Asset[], transactions: Transaction[] }) => void;
  clearData: () => void;
  t: (key: string) => string;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

// Mock Initial Data
const INITIAL_ASSETS: Asset[] = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', type: AssetType.STOCK, quantity: 10, avgCost: 150, currentPrice: 175.5, currency: Currency.USD, lastUpdated: Date.now() },
  { id: '2', symbol: 'BTC', name: 'Bitcoin', type: AssetType.CRYPTO, quantity: 0.1, avgCost: 42000, currentPrice: 64000, currency: Currency.USD, lastUpdated: Date.now() },
  { id: '3', symbol: '0700.HK', name: 'Tencent', type: AssetType.STOCK, quantity: 100, avgCost: 300, currentPrice: 380, currency: Currency.HKD, lastUpdated: Date.now() },
  { id: '4', symbol: 'USD', name: 'Cash Reserve', type: AssetType.CASH, quantity: 5000, avgCost: 1, currentPrice: 1, currency: Currency.USD, lastUpdated: Date.now() },
];

const getBrowserLanguage = (): Language => {
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('zh')) return 'zh';
  return 'en';
};

const INITIAL_SETTINGS: AppSettings = {
  baseCurrency: Currency.USD,
  isPrivacyMode: false,
  geminiApiKey: '',
  deepSeekApiKey: '',
  aiProvider: 'gemini',
  alphaVantageApiKey: '',
  language: getBrowserLanguage(),
};

export const PortfolioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('investflow_assets');
    return saved ? JSON.parse(saved) : INITIAL_ASSETS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('investflow_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('investflow_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...INITIAL_SETTINGS,
        ...parsed,
        // Ensure default values if missing in saved data
        geminiApiKey: parsed.geminiApiKey || '',
        deepSeekApiKey: parsed.deepSeekApiKey || '',
        aiProvider: parsed.aiProvider || 'gemini',
        alphaVantageApiKey: parsed.alphaVantageApiKey || '',
        language: parsed.language || INITIAL_SETTINGS.language
      };
    }
    return INITIAL_SETTINGS;
  });

  // Use ref to access latest settings in async functions without triggering re-runs
  const settingsRef = useRef(settings);
  useEffect(() => {
      settingsRef.current = settings;
  }, [settings]);

  // Default rates (will be updated by API)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ USD: 1, CNY: 7.2, HKD: 7.8 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    localStorage.setItem('investflow_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('investflow_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('investflow_settings', JSON.stringify(settings));
  }, [settings]);

  // Initial Data Fetch
  useEffect(() => {
    refreshPrices();
    // Auto-refresh every 10 minutes
    const intervalId = setInterval(() => {
      refreshPrices();
    }, 600000);
    return () => clearInterval(intervalId);
  }, []);

  const addAsset = (newAsset: Asset) => {
    // Ensure lastUpdated is set
    const assetWithMeta = { ...newAsset, lastUpdated: newAsset.lastUpdated || Date.now() };
    
    // 1. Update State immediately
    const updatedList = [...assets, assetWithMeta];
    setAssets(updatedList);

    // 2. Trigger immediate price fetch for the new list to ensure fresh data
    refreshPrices(updatedList);
  };

  const editAsset = (updatedAsset: Asset) => {
    setAssets(prev => prev.map(asset => asset.id === updatedAsset.id ? updatedAsset : asset));
  };

  const deleteAsset = (id: string) => {
    setAssets(prev => prev.filter(asset => asset.id !== id));
    setTransactions(prev => prev.filter(t => t.assetId !== id));
  };

  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    const newTx = { ...tx, id: crypto.randomUUID() };
    setTransactions(prev => [...prev, newTx]);

    // Update asset holding logic
    setAssets(prev => prev.map(asset => {
      if (asset.id !== tx.assetId) return asset;

      let newQty = asset.quantity;
      let newCost = asset.avgCost;

      if (tx.type === TransactionType.BUY) {
        const totalValue = (asset.quantity * asset.avgCost) + (tx.quantity * tx.price) + tx.fee;
        newQty = asset.quantity + tx.quantity;
        newCost = totalValue / newQty;
      } else if (tx.type === TransactionType.SELL) {
        newQty = asset.quantity - tx.quantity;
      }

      return { ...asset, quantity: newQty, avgCost: newCost };
    }));
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    // Attempt to reverse the transaction's effect on the asset
    const asset = assets.find(a => a.id === tx.assetId);
    if (asset) {
      let newQty = asset.quantity;
      let newAvgCost = asset.avgCost;

      if (tx.type === TransactionType.BUY) {
        // Reverse BUY: Remove quantity and subtract cost basis
        const currentTotalCost = asset.quantity * asset.avgCost;
        const txCostContribution = (tx.quantity * tx.price) + tx.fee;
        
        const newTotalCost = currentTotalCost - txCostContribution;
        newQty = asset.quantity - tx.quantity;
        
        if (newQty > 0 && newTotalCost > 0) {
          newAvgCost = newTotalCost / newQty;
        } else {
          // If quantity becomes 0 or negative, reset cost to 0 or keep simplified
          newAvgCost = newQty <= 0 ? 0 : newAvgCost; 
        }
      } else if (tx.type === TransactionType.SELL) {
        // Reverse SELL: Add quantity back. Average cost per unit usually doesn't change on Sell.
        newQty = asset.quantity + tx.quantity;
      }
      
      // Update asset
      setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, quantity: newQty, avgCost: newAvgCost } : a));
    }

    // Remove from history
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateAssetPrice = (id: string, newPrice: number) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, currentPrice: newPrice, lastUpdated: Date.now() } : a));
  };

  // Modified: Accept optional assets list to support immediate fetch after add
  const refreshPrices = async (assetsOverride?: Asset[]) => {
    setIsRefreshing(true);
    const targetAssets = assetsOverride || assets;

    try {
      // 1. Fetch Rates
      const rates = await fetchExchangeRates();
      setExchangeRates(rates);

      // 2. Fetch Asset Prices (Parallel)
      const [cryptoPrices, stockData] = await Promise.all([
        fetchCryptoPrices(targetAssets),
        fetchStockPrices(targetAssets, settingsRef.current.alphaVantageApiKey)
      ]);

      // 3. Update State
      setAssets(prev => prev.map(asset => {
        let newPrice = asset.currentPrice;
        let newCurrency = asset.currency;
        let timestamp = asset.lastUpdated || Date.now();

        if (asset.type === AssetType.CRYPTO && cryptoPrices[asset.id]) {
          newPrice = cryptoPrices[asset.id];
          newCurrency = Currency.USD; 
          timestamp = Date.now();
        } else if ((asset.type === AssetType.STOCK || asset.type === AssetType.FUND) && stockData[asset.id]) {
          newPrice = stockData[asset.id].price;
          newCurrency = stockData[asset.id].currency;
          timestamp = Date.now();
        } else if (asset.type === AssetType.CASH) {
            // Smart Cash: Fetch exchange rate against USD automatically
            const rate = rates[asset.symbol];
            if (rate && rate > 0) {
                newPrice = 1 / rate;
                newCurrency = Currency.USD; 
                timestamp = Date.now();
            }
        }

        return { ...asset, currentPrice: newPrice, currency: newCurrency, lastUpdated: timestamp };
      }));

    } catch (error) {
      console.error("Failed to refresh prices:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const importData = (data: { assets: Asset[], transactions: Transaction[] }) => {
    if (Array.isArray(data.assets)) {
      const assetsWithMeta = data.assets.map(a => ({ ...a, lastUpdated: a.lastUpdated || Date.now() }));
      setAssets(assetsWithMeta);
    }
    if (Array.isArray(data.transactions)) setTransactions(data.transactions);
  };

  const clearData = () => {
    setAssets([]);
    setTransactions([]);
    localStorage.removeItem('investflow_assets');
    localStorage.removeItem('investflow_transactions');
  };

  // Translation Helper
  const t = (key: string): string => {
    const lang = settings.language || 'en';
    return translations[lang]?.[key] || key;
  };

  return (
    <PortfolioContext.Provider value={{ 
      assets, 
      transactions, 
      settings,
      exchangeRates,
      isRefreshing,
      addAsset, 
      editAsset,
      deleteAsset,
      addTransaction,
      deleteTransaction,
      updateAssetPrice, 
      refreshPrices,
      updateSettings,
      importData,
      clearData,
      t
    }}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};