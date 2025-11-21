import React from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { Card } from './ui/Card';
import { ArrowUpRight, ArrowDownRight, Pencil, Trash2 } from 'lucide-react';
import { Asset, AssetType, Currency } from '../types';

interface AssetListProps {
    onEdit?: (asset: Asset) => void;
}

export const AssetList: React.FC<AssetListProps> = ({ onEdit }) => {
  const { assets, deleteAsset } = usePortfolio();

  // Helper for conditional styling
  const getTypeColor = (type: AssetType) => {
    switch(type) {
        case AssetType.STOCK: return 'bg-blue-100 text-blue-700';
        case AssetType.CRYPTO: return 'bg-purple-100 text-purple-700';
        case AssetType.FUND: return 'bg-orange-100 text-orange-700';
        case AssetType.CASH: return 'bg-green-100 text-green-700';
        default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Helper to get currency symbol
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

  return (
    <Card title="Portfolio Holdings" className="animate-slide-up">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
              <th className="pb-3 font-medium pl-2">Asset</th>
              <th className="pb-3 font-medium">Price (Native)</th>
              <th className="pb-3 font-medium">Avg Cost</th>
              <th className="pb-3 font-medium">Holdings</th>
              <th className="pb-3 font-medium text-right">Value (Native)</th>
              <th className="pb-3 font-medium text-right pr-2">P&L</th>
              {onEdit && <th className="pb-3 font-medium text-right pr-2">Actions</th>}
            </tr>
          </thead>
          <tbody className="text-sm">
            {assets.map((asset) => {
              const symbol = getCurrencySymbol(asset.currency);
              const currentValue = asset.quantity * asset.currentPrice;
              const costBasis = asset.quantity * asset.avgCost;
              const pnl = currentValue - costBasis;
              const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

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
                    <div className="font-medium text-slate-700">
                        {symbol}{asset.currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="font-medium text-slate-700">
                        {symbol}{asset.avgCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="font-medium text-slate-700">{asset.quantity.toLocaleString()}</div>
                  </td>
                  <td className="py-4 text-right font-semibold text-slate-800">
                    {symbol}{currentValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td className="py-4 text-right pr-2">
                    <div className={`flex items-center justify-end gap-1 font-medium ${pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {pnl >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {Math.abs(pnlPercent).toFixed(2)}%
                    </div>
                    <div className={`text-xs ${pnl >= 0 ? 'text-green-600/70' : 'text-red-500/70'}`}>
                      {pnl >= 0 ? '+' : '-'}{symbol}{Math.abs(pnl).toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </div>
                  </td>
                  {onEdit && (
                    <td className="py-4 text-right pr-2">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => onEdit(asset)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                            >
                                <Pencil size={16} />
                            </button>
                            <button 
                                onClick={() => handleDelete(asset.id, asset.symbol)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {assets.length === 0 && (
                <tr>
                    <td colSpan={onEdit ? 7 : 6} className="text-center py-8 text-slate-400 italic">
                        No assets found. Click "Add Asset" to start tracking.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};