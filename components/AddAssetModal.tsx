import React, { useState, useEffect } from 'react';
import { Asset, AssetType, Currency } from '../types';
import { usePortfolio } from '../context/PortfolioContext';
import { X, Save, TrendingUp, Bitcoin, PieChart, Building, Banknote, CreditCard, Box } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialAsset?: Asset | null;
}

const ASSET_TYPES = [
  { id: AssetType.STOCK, label: 'Stock', icon: TrendingUp, desc: 'US, HK, CN Stocks', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { id: AssetType.CRYPTO, label: 'Crypto', icon: Bitcoin, desc: 'Coins & Tokens', color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { id: AssetType.FUND, label: 'Fund / ETF', icon: PieChart, desc: 'Mutual Funds', color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { id: AssetType.REAL_ESTATE, label: 'Real Estate', icon: Building, desc: 'Property', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { id: AssetType.CASH, label: 'Cash', icon: Banknote, desc: 'Fiat Reserves', color: 'bg-green-50 text-green-600 border-green-200' },
  { id: AssetType.LIABILITY, label: 'Liability', icon: CreditCard, desc: 'Loans & Debt', color: 'bg-red-50 text-red-600 border-red-200' },
  { id: AssetType.OTHER, label: 'Custom', icon: Box, desc: 'Art, Watches...', color: 'bg-slate-50 text-slate-600 border-slate-200' },
];

export const AddAssetModal: React.FC<Props> = ({ isOpen, onClose, initialAsset }) => {
  const { addAsset, editAsset } = usePortfolio();
  
  // Form State
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<AssetType>(AssetType.STOCK);
  
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState(''); // Avg Cost
  const [currentVal, setCurrentVal] = useState(''); // For manual assets
  const [currency, setCurrency] = useState<Currency>(Currency.USD);

  useEffect(() => {
    if (isOpen) {
      if (initialAsset) {
        // Editing Mode
        setType(initialAsset.type);
        setSymbol(initialAsset.symbol);
        setName(initialAsset.name);
        setQuantity(initialAsset.quantity.toString());
        setCost(initialAsset.avgCost.toString());
        setCurrentVal(initialAsset.currentPrice.toString());
        setCurrency(initialAsset.currency);
        setStep(2); // Skip type selection when editing
      } else {
        // Add Mode - Reset
        setStep(1);
        setType(AssetType.STOCK);
        setSymbol(''); 
        setName(''); 
        setQuantity(''); 
        setCost('');
        setCurrentVal('');
        setCurrency(Currency.USD);
      }
    }
  }, [isOpen, initialAsset]);

  if (!isOpen) return null;

  // Strict manual assets (No API fetch). 
  // CASH is excluded because we want to treat it as a Market Asset for pricing (fetched from API)
  // but still allow the user to input their own cost basis.
  const isStrictManualAsset = (t: AssetType) => 
    t === AssetType.REAL_ESTATE || t === AssetType.LIABILITY || t === AssetType.OTHER;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const qtyNum = parseFloat(quantity);
    let costNum = parseFloat(cost);
    let currentPriceNum = parseFloat(currentVal);

    if (isStrictManualAsset(type)) {
        // For manual assets, cost is often not relevant or equal to current value if just tracking balance
        if (isNaN(costNum) && !isNaN(currentPriceNum)) costNum = currentPriceNum; 
        if (isNaN(currentPriceNum) && !isNaN(costNum)) currentPriceNum = costNum;
    } else {
        // For market assets (Stock, Crypto, Cash), we don't set currentPrice manually (it comes from API)
        // unless it's the very first entry and we want a fallback, we default to cost
        if (isNaN(currentPriceNum)) currentPriceNum = costNum || 0;
    }

    if (!symbol || isNaN(qtyNum)) return;

    const assetData: Asset = {
      id: initialAsset ? initialAsset.id : crypto.randomUUID(),
      symbol: symbol.toUpperCase(),
      name: name || symbol.toUpperCase(),
      type,
      quantity: qtyNum,
      avgCost: costNum || 0,
      currentPrice: currentPriceNum || 0,
      // Manual assets use selected currency. Market assets (Stock/Crypto/Cash) default to USD logic until API updates them
      currency: isStrictManualAsset(type) ? currency : Currency.USD, 
      lastUpdated: Date.now()
    };

    if (initialAsset) {
      // Preserve current price for market assets if we are editing just meta
      if (!isStrictManualAsset(type)) {
          assetData.currentPrice = initialAsset.currentPrice;
          assetData.currency = initialAsset.currency;
      }
      editAsset(assetData);
    } else {
      addAsset(assetData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
                {initialAsset ? 'Edit Holding' : (step === 1 ? 'Select Asset Type' : 'Asset Details')}
            </h2>
            <p className="text-xs text-slate-500">
                {initialAsset ? 'Update your holding parameters' : (step === 1 ? 'What kind of asset do you want to track?' : `Enter details for ${type}`)}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
        </div>

        {/* Content Scrollable Area */}
        <div className="overflow-y-auto p-6">
            
            {/* Step 1: Type Selection */}
            {step === 1 && !initialAsset && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ASSET_TYPES.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => { setType(t.id); setStep(2); }}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all hover:scale-[1.02] ${t.id === type ? 'ring-2 ring-blue-500 bg-blue-50/50 border-blue-200' : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'}`}
                        >
                            <div className={`p-3 rounded-full mb-3 ${t.color}`}>
                                <t.icon size={24} />
                            </div>
                            <span className="font-semibold text-slate-700 text-sm">{t.label}</span>
                            <span className="text-[10px] text-slate-400 mt-1">{t.desc}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Step 2: Details Form */}
            {(step === 2 || initialAsset) && (
                <form id="asset-form" onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* Identity Section */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                         <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                1. Identification
                            </h3>
                            {!initialAsset && (
                                <button type="button" onClick={() => setStep(1)} className="text-xs text-blue-600 hover:underline">Change Type</button>
                            )}
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                                    {type === AssetType.LIABILITY ? 'Loan Name' : (type === AssetType.REAL_ESTATE ? 'Property Name' : 'Ticker / Currency Code')}
                                </label>
                                <input 
                                    type="text" 
                                    placeholder={type === AssetType.STOCK ? "AAPL" : (type === AssetType.CASH ? "CNY" : "BTC")}
                                    value={symbol} onChange={e => setSymbol(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    autoFocus
                                    required
                                />
                                {type === AssetType.CASH && (
                                    <p className="text-[10px] text-slate-400 mt-1">Enter Code (e.g., CNY, HKD, EUR)</p>
                                )}
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Full Name (Optional)</label>
                                <input 
                                    type="text" 
                                    placeholder={type === AssetType.CASH ? "Chinese Yuan" : "e.g. Apple Inc."}
                                    value={name} onChange={e => setName(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                             </div>
                         </div>

                         {isStrictManualAsset(type) && (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Currency</label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value as Currency)}
                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value={Currency.USD}>USD - US Dollar</option>
                                    <option value={Currency.CNY}>CNY - Chinese Yuan</option>
                                    <option value={Currency.HKD}>HKD - HK Dollar</option>
                                </select>
                            </div>
                         )}
                    </div>

                    {/* Financials Section */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                        <h3 className="text-sm font-semibold text-slate-700">2. Valuation & Holdings</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                                    {type === AssetType.CASH ? 'Balance' : (type === AssetType.LIABILITY ? 'Principal Remaining' : 'Quantity')}
                                </label>
                                <input 
                                    type="number" step="any" 
                                    placeholder="0.00"
                                    value={quantity} onChange={e => setQuantity(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>

                            {/* Logic: Strict Manual Assets show "Current Price". Market Assets AND CASH show Average Cost input. */}
                            {isStrictManualAsset(type) ? (
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                                        Current Unit Price
                                    </label>
                                    <input 
                                        type="number" step="any" 
                                        placeholder="0.00"
                                        value={currentVal} onChange={e => setCurrentVal(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                                        {type === AssetType.CASH ? 'Avg Cost (USD Basis)' : 'Average Cost / Unit'}
                                    </label>
                                    <input 
                                        type="number" step="any" 
                                        placeholder="0.00"
                                        value={cost} onChange={e => setCost(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    {type === AssetType.CASH && (
                                        <p className="text-[10px] text-slate-400 mt-1">Your cost basis per unit in USD</p>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {!isStrictManualAsset(type) && (
                            <p className="text-xs text-slate-400 italic">
                                {type === AssetType.CASH 
                                  ? "* Live exchange rates (USD) will be fetched automatically."
                                  : "* Live prices will be fetched automatically based on ticker symbol."}
                            </p>
                        )}
                    </div>

                </form>
            )}
        </div>

        {/* Footer Actions */}
        {(step === 2 || initialAsset) && (
            <div className="p-6 pt-0 bg-white shrink-0">
                <button 
                    onClick={handleSubmit}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                >
                    <Save size={18}/>
                    {initialAsset ? 'Save Changes' : 'Add Asset to Portfolio'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};