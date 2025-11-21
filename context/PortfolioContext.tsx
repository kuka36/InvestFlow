import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Asset, AssetType, Currency, Transaction, TransactionType } from '../types';
import { fetchExchangeRates, fetchCryptoPrices, fetchStockPrices, ExchangeRates } from '../services/marketData';

interface AppSettings {
  baseCurrency: Currency;
  isPrivacyMode: boolean;
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
  updateAssetPrice: (id: string, newPrice: number) => void;
  refreshPrices: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  importData: (data: { assets: Asset[], transactions: Transaction[] }) => void;
  clearData: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

// Mock Initial Data
const INITIAL_ASSETS: Asset[] = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', type: AssetType.STOCK, quantity: 10, avgCost: 150, currentPrice: 175.5, currency: Currency.USD },
  { id: '2', symbol: 'BTC', name: 'Bitcoin', type: AssetType.CRYPTO, quantity: 0.1, avgCost: 42000, currentPrice: 64000, currency: Currency.USD },
  { id: '3', symbol: '0700', name: 'Tencent', type: AssetType.STOCK, quantity: 100, avgCost: 300, currentPrice: 380, currency: Currency.HKD },
  { id: '4', symbol: 'USD', name: 'Cash Reserve', type: AssetType.CASH, quantity: 5000, avgCost: 1, currentPrice: 1, currency: Currency.USD },
];

const INITIAL_SETTINGS: AppSettings = {
  baseCurrency: Currency.USD,
  isPrivacyMode: false,
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
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

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
    setAssets(prev => [...prev, newAsset]);
  };

  const editAsset = (updatedAsset: Asset) => {
    setAssets(prev => prev.map(asset => asset.id === updatedAsset.id ? updatedAsset : asset));
  };

  const deleteAsset = (id: string) => {
    setAssets(prev => prev.filter(asset => asset.id !== id));
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

  const updateAssetPrice = (id: string, newPrice: number) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, currentPrice: newPrice } : a));
  };

  const refreshPrices = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch Rates
      const rates = await fetchExchangeRates();
      setExchangeRates(rates);

      // 2. Fetch Asset Prices (Parallel)
      const [cryptoPrices, stockPrices] = await Promise.all([
        fetchCryptoPrices(assets),
        fetchStockPrices(assets)
      ]);

      // 3. Update State
      setAssets(prev => prev.map(asset => {
        if (asset.type === AssetType.CASH) return asset; // Cash is always 1 relative to itself

        let newPrice = asset.currentPrice;

        if (asset.type === AssetType.CRYPTO && cryptoPrices[asset.id]) {
          newPrice = cryptoPrices[asset.id];
        } else if ((asset.type === AssetType.STOCK || asset.type === AssetType.FUND) && stockPrices[asset.id]) {
          newPrice = stockPrices[asset.id];
        } 
        // else: keep existing price (or mocked fallback if needed, but here we prefer stale data over bad random data)

        return { ...asset, currentPrice: newPrice };
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
    if (Array.isArray(data.assets)) setAssets(data.assets);
    if (Array.isArray(data.transactions)) setTransactions(data.transactions);
  };

  const clearData = () => {
    setAssets([]);
    setTransactions([]);
    localStorage.removeItem('investflow_assets');
    localStorage.removeItem('investflow_transactions');
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
      updateAssetPrice, 
      refreshPrices,
      updateSettings,
      importData,
      clearData
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