import React, { useState, useEffect } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { AssetType, TransactionType, Currency } from '../types';
import { X, Save, ArrowRightLeft } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTransactionModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { assets, addAsset, addTransaction } = usePortfolio();
  
  // Transaction State
  const [type, setType] = useState<TransactionType>(TransactionType.BUY);
  const [assetId, setAssetId] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fee, setFee] = useState('0');

  // New Asset State (if creating new during buy)
  const [isNewAsset, setIsNewAsset] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AssetType>(AssetType.STOCK);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setType(TransactionType.BUY);
      setAssetId(assets.length > 0 ? assets[0].id : 'NEW');
      setIsNewAsset(assets.length === 0);
      setDate(new Date().toISOString().split('T')[0]);
      setQuantity('');
      setPrice('');
      setFee('0');
      setNewSymbol('');
      setNewName('');
      setNewType(AssetType.STOCK);
    }
  }, [isOpen, assets]);

  // Handle Asset Selection Change
  const handleAssetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'NEW') {
      setIsNewAsset(true);
      setAssetId('NEW');
      setType(TransactionType.BUY); // Can't sell a new asset
    } else {
      setIsNewAsset(false);
      setAssetId(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const qtyNum = parseFloat(quantity);
    const priceNum = parseFloat(price);
    const feeNum = parseFloat(fee) || 0;

    if (isNaN(qtyNum) || isNaN(priceNum) || qtyNum <= 0 || priceNum < 0) return;

    let targetAssetId = assetId;

    // 1. Create Asset if New
    if (isNewAsset) {
      if (!newSymbol) return;
      const newId = crypto.randomUUID();
      addAsset({
        id: newId,
        symbol: newSymbol.toUpperCase(),
        name: newName || newSymbol.toUpperCase(),
        type: newType,
        quantity: 0, // Transaction will fill this
        avgCost: 0,
        currentPrice: priceNum, // Use buy price as initial current price
        currency: Currency.USD
      });
      targetAssetId = newId;
    }

    // 2. Create Transaction
    addTransaction({
      assetId: targetAssetId,
      type,
      date,
      quantity: qtyNum,
      price: priceNum,
      fee: feeNum,
      total: (qtyNum * priceNum) + (type === TransactionType.BUY ? feeNum : -feeNum)
    });

    onClose();
  };

  if (!isOpen) return null;

  const total = (parseFloat(quantity) || 0) * (parseFloat(price) || 0);
  const grandTotal = type === TransactionType.BUY 
    ? total + (parseFloat(fee) || 0) 
    : total - (parseFloat(fee) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <ArrowRightLeft size={20} />
            </div>
            <h2 className="text-lg font-bold">Record Transaction</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Transaction Type Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
             <button
                type="button"
                onClick={() => setType(TransactionType.BUY)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${type === TransactionType.BUY ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 Buy
             </button>
             <button
                type="button"
                onClick={() => {
                    setType(TransactionType.SELL);
                    if (isNewAsset) {
                        setIsNewAsset(false);
                        setAssetId(assets.length > 0 ? assets[0].id : '');
                    }
                }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${type === TransactionType.SELL ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 Sell
             </button>
          </div>

          {/* Asset Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Asset</label>
            <select 
                value={assetId} 
                onChange={handleAssetChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
                {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.symbol} - {a.name}</option>
                ))}
                {type === TransactionType.BUY && <option value="NEW">+ Add New Asset...</option>}
            </select>
          </div>

          {/* New Asset Fields */}
          {isNewAsset && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3 animate-slide-up">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Asset Details</h4>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <input 
                            placeholder="Symbol (e.g. TSLA)"
                            value={newSymbol}
                            onChange={e => setNewSymbol(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            required={isNewAsset}
                        />
                    </div>
                    <div>
                         <select 
                            value={newType} 
                            onChange={(e) => setNewType(e.target.value as AssetType)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value={AssetType.STOCK}>Stock</option>
                            <option value={AssetType.CRYPTO}>Crypto</option>
                            <option value={AssetType.FUND}>Fund / ETF</option>
                            <option value={AssetType.CASH}>Cash / FX</option>
                        </select>
                    </div>
                    <div className="col-span-2">
                         <input 
                            placeholder="Name (e.g. Tesla Inc)"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>
          )}

          {/* Transaction Details */}
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Date</label>
                <input 
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                />
             </div>
             <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Quantity</label>
                <input 
                    type="number" step="any" placeholder="0.00"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                />
             </div>
             <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Price per Unit</label>
                <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400">$</span>
                    <input 
                        type="number" step="any" placeholder="0.00"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        className="w-full pl-8 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                    />
                </div>
             </div>
             <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Fees (Optional)</label>
                <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400">$</span>
                    <input 
                        type="number" step="any" placeholder="0.00"
                        value={fee}
                        onChange={e => setFee(e.target.value)}
                        className="w-full pl-8 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
             </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <span className="text-slate-500 font-medium">Total {type === TransactionType.BUY ? 'Cost' : 'Proceeds'}</span>
              <span className="text-xl font-bold text-slate-800">
                  ${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </span>
          </div>

          <button 
            type="submit" 
            className={`w-full py-3.5 rounded-xl text-white font-semibold shadow-lg transition-all flex items-center justify-center gap-2 ${type === TransactionType.BUY ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
          >
            <Save size={18}/>
            Record {type === TransactionType.BUY ? 'Buy' : 'Sell'}
          </button>

        </form>
      </div>
    </div>
  );
};