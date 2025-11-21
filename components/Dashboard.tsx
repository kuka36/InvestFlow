import React, { useMemo } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { Card } from './ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, EyeOff } from 'lucide-react';
import { convertValue } from '../services/marketData';

const COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

export const Dashboard: React.FC = () => {
  const { assets, settings, exchangeRates } = usePortfolio();

  // Calculate Summaries with Currency Conversion
  const summary = useMemo(() => {
    let totalBalance = 0;
    let totalCost = 0;
    let dayPnL = 0;

    assets.forEach(asset => {
      // Raw Value in Native Currency
      const nativeValue = asset.quantity * asset.currentPrice;
      const nativeCost = asset.quantity * asset.avgCost;

      // Convert to Base Currency
      const convertedValue = convertValue(nativeValue, asset.currency, settings.baseCurrency, exchangeRates);
      const convertedCost = convertValue(nativeCost, asset.currency, settings.baseCurrency, exchangeRates);

      totalBalance += convertedValue;
      totalCost += convertedCost;
      
      // Mocking Day PnL (since we don't store "yesterday's price" in this simple model)
      // In a real app, we would convert (currentPrice - prevClose) * qty
      dayPnL += convertedValue * (Math.random() * 0.03 - 0.01); 
    });

    const totalPnL = totalBalance - totalCost;
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    return { totalBalance, totalCost, totalPnL, totalPnLPercent, dayPnL };
  }, [assets, settings.baseCurrency, exchangeRates]);

  // Prepare Pie Chart Data (in Base Currency)
  const allocationData = useMemo(() => {
    return assets.map(asset => {
      const nativeValue = asset.quantity * asset.currentPrice;
      const convertedValue = convertValue(nativeValue, asset.currency, settings.baseCurrency, exchangeRates);
      return {
        name: asset.symbol,
        value: convertedValue
      };
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [assets, settings.baseCurrency, exchangeRates]);

  // Prepare Mock History Data for Area Chart
  const historyData = useMemo(() => {
    const data = [];
    let balance = summary.totalCost || 10000; 
    // If total cost is 0 (empty), default to a small number to show graph
    if (balance === 0 && assets.length > 0) balance = summary.totalBalance * 0.9;

    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Random walk for history
      const volatility = (Math.random() - 0.45) * (balance * 0.02);
      balance += volatility;
      
      // Force end point to match current
      if (i === 0) balance = summary.totalBalance;
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: Math.max(0, balance)
      });
    }
    return data;
  }, [summary.totalBalance, summary.totalCost, assets.length]);

  const formatCurrency = (val: number) => {
      if (settings.isPrivacyMode) return '****';
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.baseCurrency }).format(val);
  };
  
  const formatPercent = (val: number) => {
      if (settings.isPrivacyMode) return '**%';
      return `${val.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            {settings.isPrivacyMode && <EyeOff className="absolute top-6 right-6 text-blue-400 opacity-50" size={24} />}
            <div className="flex items-center justify-between mb-4">
                <span className="text-blue-100 font-medium">Total Net Worth</span>
                <div className="p-2 bg-white/20 rounded-lg"><DollarSign size={20} /></div>
            </div>
            <div className="text-3xl font-bold mb-1">{formatCurrency(summary.totalBalance)}</div>
            <div className="text-sm text-blue-100">
                In {settings.baseCurrency}
            </div>
        </div>

        <Card className="flex flex-col justify-center">
            <span className="text-slate-500 font-medium mb-2 flex items-center gap-2">
                Today's P&L <Activity size={16} />
            </span>
            <div className="text-2xl font-bold text-slate-800 mb-1">{formatCurrency(summary.dayPnL)}</div>
            <div className={`text-sm font-medium flex items-center gap-1 ${summary.dayPnL >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {summary.dayPnL >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                {formatPercent(Math.abs(summary.dayPnL / (summary.totalBalance || 1)) * 100)}
            </div>
        </Card>

        <Card className="flex flex-col justify-center">
            <span className="text-slate-500 font-medium mb-2">Unrealized P&L</span>
            <div className="text-2xl font-bold text-slate-800 mb-1">{formatCurrency(summary.totalPnL)}</div>
            <div className={`text-sm font-medium flex items-center gap-1 ${summary.totalPnL >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                 {summary.totalPnL >= 0 ? '+' : ''}{formatPercent(summary.totalPnLPercent)} All time
            </div>
        </Card>

        <Card className="flex flex-col justify-center">
            <span className="text-slate-500 font-medium mb-2">Active Assets</span>
            <div className="text-2xl font-bold text-slate-800 mb-1">{assets.length}</div>
            <div className="text-sm text-slate-400">Across {new Set(assets.map(a => a.type)).size} Categories</div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <Card title="Net Worth Trend (30D)" className="lg:col-span-2">
          <div className="h-[300px] w-full">
            {settings.isPrivacyMode ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <EyeOff size={48} className="mb-2"/>
                    <p>Chart Hidden in Privacy Mode</p>
                </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} tickLine={false} axisLine={false} tick={{fill: '#64748b', fontSize: 12}} width={40}/>
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), 'Net Worth']}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Pie Chart */}
        <Card title={`Allocation (${settings.baseCurrency})`}>
          <div className="h-[300px] w-full flex flex-col items-center justify-center relative">
            {settings.isPrivacyMode ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <EyeOff size={48} className="mb-2"/>
                    <p>Hidden</p>
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
                <div className="text-xs text-slate-400">Top Asset</div>
                <div className="font-bold text-slate-700">{allocationData[0]?.name || '-'}</div>
            </div>
            </>
            )}
          </div>
          {!settings.isPrivacyMode && (
            <div className="flex flex-wrap gap-2 justify-center pb-2">
                {allocationData.slice(0, 4).map((entry, idx) => (
                    <div key={entry.name} className="flex items-center gap-1 text-xs text-slate-500">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        {entry.name} {((entry.value / (summary.totalBalance || 1)) * 100).toFixed(0)}%
                    </div>
                ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};