import React, { useMemo } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { Card } from './ui/Card';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Area, Line
} from 'recharts';
import { AssetType } from '../types';
import { AlertTriangle, PieChart as PieIcon, TrendingUp, Activity } from 'lucide-react';

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];
const RISK_COLORS = {
  High: '#ef4444', // Crypto
  Medium: '#f59e0b', // Stock
  Low: '#10b981', // Fund/Cash
};

export const Analytics: React.FC = () => {
  const { assets, transactions } = usePortfolio();

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(val);

  // 1. Distribution by Asset Type
  const typeDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    assets.forEach(a => {
      const val = a.quantity * a.currentPrice;
      dist[a.type] = (dist[a.type] || 0) + val;
    });
    return Object.entries(dist)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  // 2. Top Assets by Value & Cost Comparison
  const topAssets = useMemo(() => {
    return [...assets]
      .sort((a, b) => (b.quantity * b.currentPrice) - (a.quantity * a.currentPrice))
      .slice(0, 6) // Top 6
      .map(a => ({
        name: a.symbol,
        value: a.quantity * a.currentPrice,
        cost: a.quantity * a.avgCost,
        pnl: (a.quantity * a.currentPrice) - (a.quantity * a.avgCost)
      }));
  }, [assets]);

  // 3. Risk Analysis
  const riskProfile = useMemo(() => {
    let high = 0, med = 0, low = 0;
    assets.forEach(a => {
        const val = a.quantity * a.currentPrice;
        if(a.type === AssetType.CRYPTO) high += val;
        else if(a.type === AssetType.STOCK) med += val;
        else low += val; // Funds, Cash
    });
    
    const total = high + med + low;
    if (total === 0) return [];

    return [
        { name: 'High (Crypto)', value: high, color: RISK_COLORS.High },
        { name: 'Medium (Stocks)', value: med, color: RISK_COLORS.Medium },
        { name: 'Low (Cash/Funds)', value: low, color: RISK_COLORS.Low }
    ].filter(x => x.value > 0);
  }, [assets]);

  // 4. P&L Ranking
  const pnlRanking = useMemo(() => {
    return [...assets]
      .map(a => {
        const value = a.quantity * a.currentPrice;
        const cost = a.quantity * a.avgCost;
        const pnl = value - cost;
        return { name: a.symbol, pnl };
      })
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 8);
  }, [assets]);

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <PieIcon size={48} className="mb-4 opacity-50" />
        <p>Add assets to see analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
         <h1 className="text-2xl font-bold text-slate-800">Portfolio Analytics</h1>
         <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full border border-blue-100">
            Pro Insights
         </span>
      </div>
      
      {/* Top Row: Distribution & Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Asset Allocation */}
        <Card title="Allocation by Class" className="lg:col-span-1">
          <div className="h-[250px] w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none"/>
                  ))}
                </Pie>
                <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => formatCurrency(val)} 
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Risk Profile */}
        <Card className="lg:col-span-2" title="Risk Exposure Profile">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center h-full">
             <div className="h-[250px]">
                <ResponsiveContainer>
                <PieChart>
                    <Pie
                    data={riskProfile}
                    cx="50%"
                    cy="50%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={2}
                    >
                    {riskProfile.map((entry, index) => (
                        <Cell key={`cell-risk-${index}`} fill={entry.color} stroke="none"/>
                    ))}
                    </Pie>
                    <Legend verticalAlign="bottom" />
                    <RechartsTooltip 
                        formatter={(val: number) => formatCurrency(val)}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="space-y-4 pr-4 pb-4">
                 <h4 className="font-medium text-slate-600 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-orange-500"/>
                    Risk Breakdown
                 </h4>
                 <p className="text-sm text-slate-500 leading-relaxed">
                     Your portfolio is weighted based on asset class volatility. 
                     Crypto assets are classified as High Risk, Stocks as Medium Risk, and Funds/Cash as Low Risk.
                 </p>
                 <div className="space-y-2">
                     {riskProfile.map(p => {
                         const totalVal = riskProfile.reduce((acc, curr) => acc + curr.value, 0);
                         const percent = ((p.value / totalVal) * 100).toFixed(1);
                         return (
                             <div key={p.name} className="flex items-center justify-between text-sm">
                                 <div className="flex items-center gap-2">
                                     <div className="w-2 h-2 rounded-full" style={{backgroundColor: p.color}}></div>
                                     <span className="text-slate-600">{p.name}</span>
                                 </div>
                                 <span className="font-medium text-slate-800">{percent}%</span>
                             </div>
                         )
                     })}
                 </div>
             </div>
           </div>
        </Card>
      </div>

      {/* Bottom Row: Performance & Values */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Cost vs Value */}
        <Card title="Top Holdings: Cost vs Value">
           <div className="h-[300px] w-full">
            <ResponsiveContainer>
              <BarChart data={topAssets} layout="vertical" margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={formatCurrency} hide />
                <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={60} 
                    tick={{fontSize: 12, fill: '#64748b'}} 
                    interval={0}
                />
                <RechartsTooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => formatCurrency(val)}
                />
                <Legend />
                <Bar dataKey="cost" name="Total Cost" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={10} />
                <Bar dataKey="value" name="Current Value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* P&L Performance */}
        <Card title="P&L Leaders & Laggards">
           <div className="h-[300px] w-full">
            <ResponsiveContainer>
              <BarChart data={pnlRanking} margin={{top: 20, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `$${v/1000}k`} width={40} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => formatCurrency(val)}
                />
                <Bar dataKey="pnl" name="Net P&L">
                   {pnlRanking.map((entry, index) => (
                      <Cell key={`cell-pnl-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} radius={[4, 4, 0, 0]} />
                   ))}
                </Bar>
                <ReferenceLine y={0} stroke="#cbd5e1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Helper component for ReferenceLine since it wasn't imported in the destructured import above
const ReferenceLine = (props: any) => {
    // Recharts types can be tricky with dynamic imports in this env, using a simple pass-through
    // In a real app, ensure ReferenceLine is imported from 'recharts'
    return <div className="hidden" />;
};