import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Asset, AssetType, Currency, Transaction, TransactionType } from '../types';
import { refreshAllAssetPrices } from '../services/priceService';

interface PortfolioContextType {
  assets: Asset[];
  transactions: Transaction[];
  addAsset: (asset: Asset) => void;
  editAsset: (asset: Asset) => void;
  deleteAsset: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateAssetPrice: (id: string, newPrice: number) => void;
  refreshPrices: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

// Mock Initial Data
const INITIAL_ASSETS: Asset[] = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', type: AssetType.STOCK, quantity: 50, avgCost: 150, currentPrice: 175.5, currency: Currency.USD },
  { id: '2', symbol: 'BTC', name: 'Bitcoin', type: AssetType.CRYPTO, quantity: 0.45, avgCost: 42000, currentPrice: 64000, currency: Currency.USD },
  { id: '3', symbol: 'VOO', name: 'Vanguard S&P 500', type: AssetType.FUND, quantity: 20, avgCost: 380, currentPrice: 410, currency: Currency.USD },
  { id: '4', symbol: '000217', name: '华安黄金ETF联接C', type: AssetType.FUND, quantity: 1000, avgCost: 2.85, currentPrice: 3.19, currency: Currency.CNY },
  { id: '5', symbol: 'USD', name: 'Cash Reserve', type: AssetType.CASH, quantity: 15000, avgCost: 1, currentPrice: 1, currency: Currency.USD },
];

export const PortfolioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('investflow_assets');
    return saved ? JSON.parse(saved) : INITIAL_ASSETS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('investflow_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('investflow_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('investflow_transactions', JSON.stringify(transactions));
  }, [transactions]);

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

    // Update asset holding logic (Weighted average cost)
    setAssets(prev => prev.map(asset => {
      if (asset.id !== tx.assetId) return asset;

      let newQty = asset.quantity;
      let newAvgCost = asset.avgCost;

      if (tx.type === TransactionType.BUY) {
        const currentTotalCost = asset.quantity * asset.avgCost;
        const txCost = (tx.quantity * tx.price) + tx.fee;
        
        newQty = asset.quantity + tx.quantity;
        // Prevent division by zero if newQty is 0 (shouldn't happen on buy but good to be safe)
        newAvgCost = newQty > 0 ? (currentTotalCost + txCost) / newQty : 0;
      } else if (tx.type === TransactionType.SELL) {
        newQty = Math.max(0, asset.quantity - tx.quantity);
        // Avg cost remains the same on Sell in simple weighted average accounting
        // If we sold everything, reset avg cost to 0 to avoid confusion if we buy back later
        if (newQty === 0) newAvgCost = 0;
      }

      return { ...asset, quantity: newQty, avgCost: newAvgCost };
    }));
  };

  const updateAssetPrice = (id: string, newPrice: number) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, currentPrice: newPrice } : a));
  };

  const refreshPrices = async () => {
    // 使用真实的市场数据API刷新价格
    try {
      const updatedAssets = await refreshAllAssetPrices(assets);
      setAssets(updatedAssets);
    } catch (error) {
      console.error('Failed to refresh prices:', error);
      // 失败时保持当前价格不变
    }
  };

  return (
    <PortfolioContext.Provider value={{ 
      assets, 
      transactions, 
      addAsset, 
      editAsset,
      deleteAsset,
      addTransaction, 
      updateAssetPrice, 
      refreshPrices 
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