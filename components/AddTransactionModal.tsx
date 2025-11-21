
import React, { useState, useEffect } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { TransactionType } from '../types';
import { X, Save, Calendar, DollarSign, Hash } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTransactionModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { assets, addTransaction } = usePortfolio();
  
  const [assetId, setAssetId] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.BUY);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fee, setFee] = useState('0');

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
        setAssetId('');
        setType(TransactionType.BUY);
        setDate(new Date().toISOString().split('T')[0]);
        setQuantity('');
        setPrice('');
        setFee('0');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const qtyNum = parseFloat(quantity);
    const priceNum = parseFloat(price);
    const feeNum = parseFloat(fee) || 0;

    if (!assetId || isNaN(qtyNum) || isNaN(priceNum)) return;

    const selectedAsset = assets.find(a => a.id === assetId);
    if (!selectedAsset) return;

    addTransaction({
      assetId,
      type,
      date,
      quantity: qtyNum,
      price: priceNum,
      fee: feeNum,
      total: (qtyNum * priceNum) + feeNum // Simple total calc
    });

    onClose();
  };

  // Filter assets to show in dropdown (e.g. only current holdings, though usually you can buy more of what you have or add new via Add Asset)
  // For transaction mode on existing assets, we list available assets.
  const availableAssets = assets.sort((a, b) => a.symbol.localeCompare(b.symbol));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
        
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Record Transaction</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Transaction Type */}
          <div className="flex p-1 bg-slate-100 rounded-lg">
            {(['BUY', 'SELL', 'DIVIDEND'] as TransactionType[]).map((t) => (
                <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${type === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {t}
                </button>
            ))}
          </div>

          {/* Asset Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Asset</label>
            <select 
                value={assetId} 
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
            >
                <option value="" disabled>Select an asset...</option>
                {availableAssets.map(asset => (
                    <option key={asset.id} value={asset.id}>
                        {asset.symbol} - {asset.name}
                    </option>
                ))}
            </select>
            {availableAssets.length === 0 && (
                <p className="text-xs text-red-500 mt-1">No assets found. Add an asset first.</p>
            )}
          </div>

          {/* Date */}
          <div>
             <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Date</label>
             <div className="relative">
                 <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                 <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                 />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {/* Quantity */}
             <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Quantity</label>
                <div className="relative">
                    <Hash className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                    <input 
                        type="number" step="any" placeholder="0.00"
                        value={quantity} onChange={e => setQuantity(e.target.value)}
                        className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                    />
                </div>
             </div>
             
             {/* Price */}
             <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Price per Unit</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                    <input 
                        type="number" step="any" placeholder="0.00"
                        value={price} onChange={e => setPrice(e.target.value)}
                        className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                    />
                </div>
             </div>
          </div>

          {/* Fees */}
          <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Fees</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                    <input 
                        type="number" step="any" placeholder="0.00"
                        value={fee} onChange={e => setFee(e.target.value)}
                        className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
          </div>

          {/* Summary */}
          <div className="p-3 bg-slate-100 rounded-lg flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Total Estimate</span>
              <span className="font-bold text-slate-800">
                  ${((parseFloat(quantity) || 0) * (parseFloat(price) || 0) + (parseFloat(fee) || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}
              </span>
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
          >
            <Save size={18}/>
            Record Transaction
          </button>

        </form>
      </div>
    </div>
  );
};
