
import React, { useMemo } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { Card } from './ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, EyeOff, Wallet, CreditCard } from 'lucide-react';
import { convertValue } from '../services/marketData';
import { AssetType, Currency } from '../types';
import { NetWorthChart } from './NetWorthChart';

const COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#f97316'];

// Manual valuation assets should not have "fake" market noise
const isManualValuation = (type: AssetType) => 
  type === AssetType.REAL_ESTATE || type === AssetType.LIABILITY || type === AssetType.OTHER;

export const Dashboard: React.FC = () => {
  const { assets, transactions, settings, exchangeRates, t } = usePortfolio();

  // Calculate Summaries with Currency Conversion (Handling Liabilities)
  const summary = useMemo(() => {
    let totalAssetsValue = 0;
    let totalLiabilitiesValue = 0;
    let totalCost = 0;
    let dayPnL = 0;

    assets.forEach(asset => {
      // Raw Value in Native Currency
      const nativeValue = asset.quantity * asset.currentPrice;
      const nativeCost = asset.quantity * asset.avgCost;

      // Convert to Base Currency
      const convertedValue = convertValue(nativeValue, asset.currency, settings.baseCurrency, exchangeRates);
      const convertedCost = convertValue(nativeCost, asset.currency, settings.baseCurrency, exchangeRates);

      if (asset.type === AssetType.LIABILITY) {
        // For Liabilities:
        // Value is debt (positive number in data, conceptually negative for Net Worth)
        totalLiabilitiesValue += convertedValue;
        // Cost basis for liability (Principal) is tracked but PnL calc logic differs
        // For simplicity in this view, we subtract liability cost from total Cost Basis of Net Worth
        totalCost -= convertedCost; 
      } else {
        totalAssetsValue += convertedValue;
        totalCost += convertedCost;
        
        // Mocking Day P&L for Market Assets only
        if (!isManualValuation(asset.type)) {
            dayPnL += convertedValue * (Math.random() * 0.03 - 0.01); 
        }
      }
    });

    const totalNetWorth = totalAssetsValue - totalLiabilitiesValue;
    const totalPnL = totalNetWorth - totalCost;
    const totalPnLPercent = totalCost !== 0 ? (totalPnL / Math.abs(totalCost)) * 100 : 0;

    return { totalNetWorth, totalAssetsValue, totalLiabilitiesValue, totalCost, totalPnL, totalPnLPercent, dayPnL };
  }, [assets, settings.baseCurrency, exchangeRates]);

  // Prepare Pie Chart Data (Assets Only - Exclude Liabilities for Allocation)
  const allocationData = useMemo(() => {
    return assets
      .filter(a => a.type !== AssetType.LIABILITY)
      .map(asset => {
        const nativeValue = asset.quantity * asset.currentPrice;
        const convertedValue = convertValue(nativeValue, asset.currency, settings.baseCurrency, exchangeRates);
        return {
          name: asset.symbol,
          value: convertedValue
        };
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [assets, settings.baseCurrency, exchangeRates]);

  const formatCurrency = (val: number) => {
      if (settings.isPrivacyMode) return '****';
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.baseCurrency, maximumFractionDigits: 0 }).format(val);
  };
  
  const formatPercent = (val: number) => {
      if (settings.isPrivacyMode) return '**%';
      return `${val.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Net Worth */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            {settings.isPrivacyMode && <EyeOff className="absolute top-6 right-6 text-blue-400 opacity-50" size={24} />}
            <div className="flex items-center justify-between mb-4">
                <span className="text-blue-100 font-medium">{t('netWorth')}</span>
                <div className="p-2 bg-white/20 rounded-lg"><DollarSign size={20} /></div>
            </div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(summary.totalNetWorth)}</div>
            <div className="text-sm text-blue-100 flex items-center gap-2">
                <span className={summary.totalPnL >= 0 ? "text-green-300" : "text-red-300"}>
                    {summary.totalPnL >= 0 ? '+' : ''}{formatPercent(summary.totalPnLPercent)}
                </span>
                {t('allTime')}
            </div>
        </div>

        {/* 2. Total Assets */}
        <Card className="flex flex-col justify-center">
            <span className="text-slate-500 font-medium mb-2 flex items-center gap-2">
                <Wallet size={16} className="text-blue-500"/> {t('totalAssets')}
            </span>
            <div className="text-2xl font-bold text-slate-800 mb-1">{formatCurrency(summary.totalAssetsValue)}</div>
            <div className="text-xs text-slate-400">
                {t('grossValue')}
            </div>
        </Card>

        {/* 3. Total Liabilities (Red styled if exists) */}
        <Card className={`flex flex-col justify-center ${summary.totalLiabilitiesValue > 0 ? 'border-red-100 bg-red-50/30' : ''}`}>
            <span className="text-slate-500 font-medium mb-2 flex items-center gap-2">
                <CreditCard size={16} className="text-red-500"/> {t('totalLiabilities')}
            </span>
            <div className={`text-2xl font-bold mb-1 ${summary.totalLiabilitiesValue > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {summary.totalLiabilitiesValue > 0 ? '-' : ''}{formatCurrency(summary.totalLiabilitiesValue)}
            </div>
            <div className="text-xs text-slate-400">
                {t('outstandingDebt')}
            </div>
        </Card>

        {/* 4. Day P&L */}
        <Card className="flex flex-col justify-center">
            <span className="text-slate-500 font-medium mb-2 flex items-center gap-2">
               {t('dayPnL')} <Activity size={16} />
            </span>
            <div className="text-2xl font-bold text-slate-800 mb-1">{formatCurrency(summary.dayPnL)}</div>
            <div className={`text-sm font-medium flex items-center gap-1 ${summary.dayPnL >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {summary.dayPnL >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                {formatPercent(summary.dayPnL !== 0 ? Math.abs(summary.dayPnL / (summary.totalNetWorth || 1)) * 100 : 0)}
            </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* NEW: Professional Net Worth Chart */}
        <div className="lg:col-span-2 min-w-0 h-[400px]">
           <NetWorthChart 
              assets={assets}
              transactions={transactions}
              baseCurrency={settings.baseCurrency}
              exchangeRates={exchangeRates}
              isPrivacyMode={settings.isPrivacyMode}
              t={t}
           />
        </div>

        {/* Pie Chart */}
        <Card title={`${t('assetAllocation')} (${settings.baseCurrency})`} className="min-w-0 h-[400px] flex flex-col">
          <div className="flex-1 w-full relative min-w-0">
            {settings.isPrivacyMode ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                    <EyeOff size={48} className="mb-2"/>
                    <p>{t('hidden')}</p>
                </div>
            ) : (
             <>
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                     formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Legend Overlay */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="text-xs text-slate-400">{t('topAsset')}</div>
                <div className="font-bold text-slate-700">{allocationData[0]?.name || '-'}</div>
            </div>
            </>
            )}
          </div>
          {!settings.isPrivacyMode && (
            <div className="flex flex-wrap gap-2 justify-center pb-4 mt-2">
                {allocationData.slice(0, 4).map((entry, idx) => (
                    <div key={entry.name} className="flex items-center gap-1 text-xs text-slate-500">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        {entry.name} {((entry.value / (allocationData.reduce((acc, c) => acc + c.value, 0) || 1)) * 100).toFixed(0)}%
                    </div>
                ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
