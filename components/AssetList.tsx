import React, { useState, useMemo } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { Card } from './ui/Card';
import { ArrowUpRight, ArrowDownRight, Pencil, Trash2, History, ArrowUp, ArrowDown, ArrowRightLeft } from 'lucide-react';
import { Asset, AssetType, Currency } from '../types';
import { convertValue } from '../services/marketData';

interface AssetListProps {
    onEdit?: (asset: Asset) => void;
    onTransaction?: (asset: Asset) => void;
}

type SortKey = 'symbol' | 'price' | 'cost' | 'quantity' | 'value' | 'pnl';
type SortDirection = 'asc' | 'desc';

export const AssetList: React.FC<AssetListProps> = ({ onEdit, onTransaction }) => {
  const { assets, deleteAsset, updateAssetPrice, settings, exchangeRates } = usePortfolio();
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'value', // Default sort by value
    direction: 'desc'
  });

  // Quick valuation update state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newValuation, setNewValuation] = useState('');

  // Sort Logic
  const sortedAssets = useMemo(() => {
    const sorted = [...assets];
    sorted.sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;

      const getPnl = (asset: Asset) => (asset.quantity * asset.currentPrice) - (asset.quantity * asset.avgCost);

      switch (sortConfig.key) {
        case 'symbol':
          aValue = a.symbol.toLowerCase();
          bValue = b.symbol.toLowerCase();
          break;
        case 'price':
          aValue = a.currentPrice;
          bValue = b.currentPrice;
          break;
        case 'cost':
          aValue = a.avgCost;
          bValue = b.avgCost;
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'value':
          // Sort by Converted Value. 
          // CRITICAL: Treat Liabilities as negative values so they appear at bottom in Descending sort (Positive -> Zero -> Negative)
          const valA = convertValue(a.quantity * a.currentPrice, a.currency, settings.baseCurrency, exchangeRates);
          const valB = convertValue(b.quantity * b.currentPrice, b.currency, settings.baseCurrency, exchangeRates);
          aValue = a.type === AssetType.LIABILITY ? -valA : valA;
          bValue = b.type === AssetType.LIABILITY ? -valB : valB;
          break;
        case 'pnl':
          aValue = getPnl(a);
          bValue = getPnl(b);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [assets, sortConfig, settings.baseCurrency, exchangeRates]);

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const renderSortIcon = (columnKey: SortKey) => {
    if (sortConfig.key !== columnKey) return <div className="w-4 h-4" />; // Placeholder to prevent layout jump
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  // Helper for conditional styling
  const getTypeColor = (type: AssetType) => {
    switch(type) {
        case AssetType.STOCK: return 'bg-blue-100 text-blue-700';
        case AssetType.CRYPTO: return 'bg-purple-100 text-purple-700';
        case AssetType.FUND: return 'bg-orange-100 text-orange-700';
        case AssetType.CASH: return 'bg-green-100 text-green-700';
        case AssetType.REAL_ESTATE: return 'bg-amber-100 text-amber-800';
        case AssetType.LIABILITY: return 'bg-red-100 text-red-700';
        default: return 'bg-slate-100 text-slate-700';
    }
  };

  const isManualValuation = (type: AssetType) => 
    type === AssetType.REAL_ESTATE || type === AssetType.LIABILITY || type === AssetType.OTHER || type === AssetType.CASH;

  const getCurrencySymbol = (curr: Currency) => {
      switch(curr) {
          case Currency.USD: return '$';
          case Currency.CNY: return '¥';
          case Currency.HKD: return 'HK$';
          default: return '$';
      }
  };

  const handleDelete = (id: string, symbol: string) => {
      if (window.confirm(`Are you sure you want to delete ${symbol}? This action cannot be undone.`)) {
          deleteAsset(id);
      }
  };

  const handleUpdateClick = (asset: Asset) => {
    setUpdatingId(asset.id);
    setNewValuation(asset.currentPrice.toString());
  };

  const handleSaveValuation = (id: string) => {
    const price = parseFloat(newValuation);
    if (!isNaN(price)) {
        updateAssetPrice(id, price);
        setUpdatingId(null);
    }
  };

  const formatLastUpdated = (timestamp?: number) => {
      if (!timestamp) return 'N/A';
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Table Header Helper
  const SortableHeader = ({ label, sortKey, alignRight = false }: { label: string, sortKey: SortKey, alignRight?: boolean }) => (
    <th 
      className={`pb-3 font-medium cursor-pointer group select-none ${alignRight ? 'text-right' : 'text-left'} ${alignRight ? 'pr-2' : 'pl-2'}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className={`flex items-center gap-1 ${alignRight ? 'justify-end' : 'justify-start'} text-slate-500 group-hover:text-blue-600 transition-colors`}>
        {label}
        <span className="text-slate-400 group-hover:text-blue-500">
            {renderSortIcon(sortKey)}
        </span>
      </div>
    </th>
  );

  return (
    <Card title="Portfolio Holdings" className="animate-slide-up">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
              <SortableHeader label="Asset" sortKey="symbol" />
              <SortableHeader label="Current Price" sortKey="price" />
              <SortableHeader label="Avg Cost" sortKey="cost" />
              <SortableHeader label="Holdings" sortKey="quantity" />
              <SortableHeader label="Value" sortKey="value" alignRight />
              <SortableHeader label="Status / P&L" sortKey="pnl" alignRight />
              {(onEdit || onTransaction) && <th className="pb-3 font-medium text-right pr-2">Actions</th>}
            </tr>
          </thead>
          <tbody className="text-sm">
            {sortedAssets.map((asset) => {
              const symbol = getCurrencySymbol(asset.currency);
              const baseCurrencySymbol = getCurrencySymbol(settings.baseCurrency);
              
              const currentValue = asset.quantity * asset.currentPrice;
              const baseValue = convertValue(currentValue, asset.currency, settings.baseCurrency, exchangeRates);
              
              const costBasis = asset.quantity * asset.avgCost;
              const pnl = currentValue - costBasis;
              const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
              const isLiability = asset.type === AssetType.LIABILITY;
              const isManual = isManualValuation(asset.type);
              const isUpdating = updatingId === asset.id;

              return (
                <tr key={asset.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 pl-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${getTypeColor(asset.type)}`}>
                        {asset.symbol.substring(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                            <div className="font-semibold text-slate-800">{asset.symbol}</div>
                            <span className="text-[10px] px-1 py-0.5 bg-slate-100 text-slate-500 rounded">{asset.currency}</span>
                        </div>
                        <div className="text-xs text-slate-400 max-w-[100px] truncate">{asset.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    {isUpdating ? (
                         <div className="flex items-center gap-1">
                            <span className="text-slate-400 text-xs">{symbol}</span>
                            <input 
                                type="number" 
                                autoFocus
                                className="w-20 p-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={newValuation}
                                onChange={(e) => setNewValuation(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveValuation(asset.id);
                                    if (e.key === 'Escape') setUpdatingId(null);
                                }}
                                onBlur={() => handleSaveValuation(asset.id)}
                            />
                         </div>
                    ) : (
                        <div className="font-medium text-slate-700 flex items-center gap-2">
                            {symbol}{asset.currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}
                            {isManual && onEdit && (
                                <button 
                                    onClick={() => handleUpdateClick(asset)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-blue-600"
                                    title="Update Valuation"
                                >
                                    <History size={14} />
                                </button>
                            )}
                        </div>
                    )}
                  </td>
                  <td className="py-4">
                    <div className="font-medium text-slate-700">
                        {symbol}{asset.avgCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="font-medium text-slate-700">{asset.quantity.toLocaleString()}</div>
                  </td>
                  {/* Base Currency Value */}
                  <td className={`py-4 text-right pr-2 font-bold ${isLiability ? 'text-red-700' : 'text-slate-800'}`}>
                    {isLiability ? '-' : ''}{baseCurrencySymbol}{baseValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td className="py-4 text-right pr-2">
                    {isManual && !pnl ? (
                        <div className="text-right">
                             <div className="text-xs font-medium text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded-md">
                                Last val: {formatLastUpdated(asset.lastUpdated)}
                             </div>
                        </div>
                    ) : (
                        <>
                            <div className={`flex items-center justify-end gap-1 font-medium ${pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {pnl >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {Math.abs(pnlPercent).toFixed(2)}%
                            </div>
                            <div className={`text-xs ${pnl >= 0 ? 'text-green-600/70' : 'text-red-500/70'}`}>
                            {pnl >= 0 ? '+' : '-'}{symbol}{Math.abs(pnl).toLocaleString(undefined, {maximumFractionDigits: 0})}
                            </div>
                        </>
                    )}
                  </td>
                  {(onEdit || onTransaction) && (
                    <td className="py-4 text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                            {onTransaction && (
                                <button 
                                    onClick={() => onTransaction(asset)}
                                    className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Record Trade/Transaction"
                                >
                                    <ArrowRightLeft size={16} />
                                </button>
                            )}
                            {onEdit && (
                                <button 
                                    onClick={() => onEdit(asset)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit Details"
                                >
                                    <Pencil size={16} />
                                </button>
                            )}
                            {onEdit && (
                                <button 
                                    onClick={() => handleDelete(asset.id, asset.symbol)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {sortedAssets.length === 0 && (
                <tr>
                    <td colSpan={onEdit ? 7 : 6} className="text-center py-8 text-slate-400 italic">
                        No assets found. Click "Add New Asset" to start.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};