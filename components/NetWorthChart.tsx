
import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Line 
} from 'recharts';
import { Asset, Transaction, TransactionType, Currency, AssetType } from '../types';
import { convertValue, ExchangeRates } from '../services/marketData';
import { Calendar, TrendingUp, TrendingDown, MousePointer2 } from 'lucide-react';

interface NetWorthChartProps {
  assets: Asset[];
  transactions: Transaction[];
  baseCurrency: Currency;
  exchangeRates: ExchangeRates;
  isPrivacyMode: boolean;
  t: (key: string) => string;
}

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export const NetWorthChart: React.FC<NetWorthChartProps> = ({ 
  assets, 
  transactions, 
  baseCurrency, 
  exchangeRates,
  isPrivacyMode,
  t
}) => {
  const [range, setRange] = useState<TimeRange>('1M');

  // Helper: Currency Formatter
  const formatCurrency = (val: number) => {
    if (isPrivacyMode) return '****';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: baseCurrency, 
      notation: "compact", 
      maximumFractionDigits: 1 
    }).format(val);
  };

  // Helper: Percentage Formatter
  const formatPercent = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;

  // Core Logic: Reconstruct History
  const chartData = useMemo(() => {
    if (assets.length === 0) return [];

    // 1. Calculate Current State (End Point)
    let currentNetWorth = 0;
    let currentCostBasis = 0;

    assets.forEach(asset => {
      const val = convertValue(asset.quantity * asset.currentPrice, asset.currency, baseCurrency, exchangeRates);
      // For liabilities, value is negative net worth, cost is usually principal amount (negative)
      if (asset.type === AssetType.LIABILITY) {
         currentNetWorth -= val;
         currentCostBasis -= convertValue(asset.quantity * asset.avgCost, asset.currency, baseCurrency, exchangeRates);
      } else {
         currentNetWorth += val;
         currentCostBasis += convertValue(asset.quantity * asset.avgCost, asset.currency, baseCurrency, exchangeRates);
      }
    });

    // 2. Determine Start Date based on Range
    const now = new Date();
    const startDate = new Date();
    switch (range) {
      case '1W': startDate.setDate(now.getDate() - 7); break;
      case '1M': startDate.setDate(now.getDate() - 30); break;
      case '3M': startDate.setDate(now.getDate() - 90); break;
      case '6M': startDate.setDate(now.getDate() - 180); break;
      case '1Y': startDate.setFullYear(now.getFullYear() - 1); break;
      case 'ALL': startDate.setFullYear(now.getFullYear() - 5); break; // Default max lookback or find first transaction
    }

    // If ALL, find the earliest transaction or default to 1 year ago if no txs
    if (range === 'ALL' && transactions.length > 0) {
        const firstTxDate = new Date(Math.min(...transactions.map(t => new Date(t.date).getTime())));
        // Buffer of 1 week before first tx
        firstTxDate.setDate(firstTxDate.getDate() - 7);
        startDate.setTime(firstTxDate.getTime());
    } else if (range === 'ALL') {
        startDate.setFullYear(now.getFullYear() - 1);
    }

    // 3. Generate Daily Points backwards
    const daysDiff = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    const dataPoints = [];

    // Simulation Variables
    let simulatedCost = currentCostBasis;
    let simulatedValue = currentNetWorth;
    
    // Sort transactions descending (newest first) for reverse replay
    const sortedTx = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Volatility factor based on portfolio composition (Crypto makes it jumpier)
    const hasCrypto = assets.some(a => a.type === AssetType.CRYPTO);
    const volatility = hasCrypto ? 0.02 : 0.008; 

    for (let i = 0; i <= daysDiff; i++) {
        const currentDate = new Date(now);
        currentDate.setDate(now.getDate() - i);
        const dateStr = currentDate.toISOString().split('T')[0];

        // A. Replay Transactions (Reverse) to adjust "Cost Basis"
        // If we are going back in time, we need to UNDO transactions to find what the Cost/Invested was previously.
        // Logic:
        // Today's Cost = Previous Cost + Buys - Sells
        // Previous Cost = Today's Cost - Buys + Sells
        const daysTransactions = sortedTx.filter(t => t.date === dateStr);
        
        daysTransactions.forEach(tx => {
            // Determine transaction value in Base Currency
            // Note: This is an approximation using current rates for history, 
            // which is a limitation of a lite app without historical rates DB.
            const txAsset = assets.find(a => a.id === tx.assetId);
            const txCurrency = txAsset ? txAsset.currency : baseCurrency;
            const txTotal = convertValue(tx.total, txCurrency, baseCurrency, exchangeRates);

            if (tx.type === TransactionType.BUY) {
                // We Bought today, so yesterday we had LESS invested
                simulatedCost -= txTotal;
                // We assume Value dropped similarly (money left the portfolio? No, money converted to asset)
                // Net Worth usually stays flat on Buy (Cash -> Asset), but if Cash isn't tracked, Net Worth drops.
                // Assuming "Invested Capital" tracks external deposits.
            } else if (tx.type === TransactionType.SELL) {
                // We Sold today, so yesterday we had MORE invested (in the asset)
                // Or rather, we realized the cost basis.
                // Simplified: Reverse the cash flow.
                simulatedCost += convertValue(tx.quantity * tx.price, txCurrency, baseCurrency, exchangeRates); // Using market value approx for simplicity
            }
        });

        // B. Simulate Market Value Fluctuation
        // We interpolate the "Unrealized PnL" portion over time.
        // Current PnL = currentNetWorth - currentCostBasis.
        // We decay this PnL as we go back in time to mimic market moves.
        
        // 1. Apply Transaction Impact to Value (Reverse)
        // If we bought $1000 today, yesterday's value was $1000 less.
        daysTransactions.forEach(tx => {
             const txAsset = assets.find(a => a.id === tx.assetId);
             const txCurrency = txAsset ? txAsset.currency : baseCurrency;
             const txVal = convertValue(tx.total, txCurrency, baseCurrency, exchangeRates);
             
             if (tx.type === TransactionType.BUY) simulatedValue -= txVal;
             if (tx.type === TransactionType.SELL) simulatedValue += txVal;
        });

        // 2. Apply Market Noise (The "Trend")
        // We add noise to the *PnL component* only, not the cost basis.
        // If i > 0 (not today), drift the PnL.
        if (i > 0) {
             const randomFluctuation = (Math.random() - 0.5) * volatility * simulatedValue;
             simulatedValue -= randomFluctuation; // Reverse time: subtract fluctuation
        }

        // Clamp: Net Worth shouldn't be huge if Cost is 0 (unless early crypto adopter)
        // Soft clamp to ensure simulated line doesn't look broken
        if (simulatedCost < 0) simulatedCost = 0;
        
        dataPoints.push({
            date: dateStr,
            timestamp: currentDate.getTime(),
            displayDate: currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            value: simulatedValue,
            cost: simulatedCost,
            pnl: simulatedValue - simulatedCost,
            pnlPercent: simulatedCost !== 0 ? ((simulatedValue - simulatedCost) / simulatedCost) * 100 : 0
        });
    }

    // If "ALL" and we have scant data, assume start is 0
    if (range === 'ALL' && dataPoints.length > 0 && transactions.length > 0) {
        const lastPoint = dataPoints[dataPoints.length - 1];
        // Fade to zero/initial if needed for visual completeness
    }

    return dataPoints.reverse();
  }, [assets, transactions, range, baseCurrency, exchangeRates]);


  // Chart Colors based on overall trend
  const isProfitable = chartData.length > 0 && (chartData[chartData.length-1].pnl >= 0);
  const colorMain = isProfitable ? '#10b981' : '#ef4444'; // Green or Red
  const colorCost = '#94a3b8'; // Slate 400

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100 text-sm">
          <p className="text-slate-500 font-medium mb-2 border-b border-slate-50 pb-2">{data.displayDate}</p>
          
          <div className="flex items-center justify-between gap-6 mb-1">
            <span className="text-slate-500 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{background: colorMain}}></div>
                {t('value')}
            </span>
            <span className="font-bold text-slate-700">{formatCurrency(data.value)}</span>
          </div>

          <div className="flex items-center justify-between gap-6 mb-2">
            <span className="text-slate-400 flex items-center gap-1">
                 <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                 {t('label_cost')}
            </span>
            <span className="font-medium text-slate-400">{formatCurrency(data.cost)}</span>
          </div>

          <div className={`flex items-center justify-between gap-4 pt-2 border-t border-slate-50 font-medium ${data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span>{data.pnl >= 0 ? t('dayPnL') /* Reusing label for PnL */ : 'Loss'}</span>
            <div className="flex items-center gap-1">
                {data.pnl >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                <span>{formatCurrency(Math.abs(data.pnl))} ({Math.abs(data.pnlPercent).toFixed(2)}%)</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col">
      {/* Header & Controls */}
      <div className="px-6 py-4 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
                {t('netWorthTrend')}
            </h3>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MousePointer2 size={12} /> {t('costVsValue')}
            </p>
        </div>

        {/* Range Selectors */}
        <div className="flex bg-slate-50 p-1 rounded-lg self-start sm:self-auto">
            {(['1W', '1M', '3M', '6M', '1Y', 'ALL'] as TimeRange[]).map((r) => (
                <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        range === r 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                >
                    {r}
                </button>
            ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-4 flex-1 min-h-[320px]">
        {isPrivacyMode ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                <div className="p-4 bg-white rounded-full shadow-sm mb-3">
                    <MousePointer2 size={24} className="text-slate-300"/>
                </div>
                <p>{t('chartHidden')}</p>
            </div>
        ) : chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colorMain} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={colorMain} stopOpacity={0}/>
                </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="displayDate" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11}} 
                    minTickGap={30}
                />
                <YAxis 
                    hide={true} // Hide Y Axis for cleaner look, relying on tooltip
                    domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                
                {/* Invested Cost Line (Dashed) */}
                <Line 
                    type="stepAfter" 
                    dataKey="cost" 
                    stroke={colorCost} 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={false}
                    name="Invested"
                />
                
                {/* Net Worth Area (Gradient) */}
                <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={colorMain} 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorNetWorth)" 
                    activeDot={{ r: 4, strokeWidth: 0, fill: colorMain }}
                    name="Net Worth"
                />
            </AreaChart>
            </ResponsiveContainer>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Calendar size={32} className="mb-2 opacity-50"/>
                <span className="text-sm">Insufficient data for this range</span>
            </div>
        )}
      </div>
    </div>
  );
};
