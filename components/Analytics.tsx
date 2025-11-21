import React, { useMemo, useState, useEffect } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { getRiskAssessment } from '../services/geminiService';
import { convertValue } from '../services/marketData';
import { Card } from './ui/Card';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine
} from 'recharts';
import { AssetType } from '../types';
import { AlertTriangle, PieChart as PieIcon, Sparkles, Gauge } from 'lucide-react';

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#f97316'];
const RISK_COLORS = {
  High: '#ef4444', // Crypto
  Medium: '#f59e0b', // Stock
  Low: '#10b981', // Fund/Cash/RealEstate
};

interface RiskData {
  riskScore: number;
  riskLevel: string;
  analysis: string;
}

export const Analytics: React.FC = () => {
  const { assets, settings, exchangeRates } = usePortfolio();
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [loadingRisk, setLoadingRisk] = useState(false);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.baseCurrency, notation: 'compact' }).format(val);

  useEffect(() => {
    let isMounted = true;

    const fetchRisk = async () => {
      if (assets.length === 0) return;
      
      setLoadingRisk(true);
      
      try {
        const data = await getRiskAssessment(assets);
        if (isMounted) {
          setRiskData(data);
        }
      } catch (e) {
        console.error("Failed to fetch risk assessment", e);
      } finally {
        if (isMounted) {
          setLoadingRisk(false);
        }
      }
    };

    fetchRisk();

    return () => {
      isMounted = false;
    };
  }, [assets]);

  // 1. Distribution by Asset Type (Converted, Excluding Liabilities)
  const typeDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    assets.forEach(a => {
      if (a.type === AssetType.LIABILITY) return; // Exclude debt from asset breakdown

      const rawVal = a.quantity * a.currentPrice;
      const val = convertValue(rawVal, a.currency, settings.baseCurrency, exchangeRates);
      dist[a.type] = (dist[a.type] || 0) + val;
    });
    return Object.entries(dist)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [assets, settings.baseCurrency, exchangeRates]);

  // 2. Top Assets by Value (Converted, Excluding Liabilities)
  const topAssets = useMemo(() => {
    return [...assets]
      .filter(a => a.type !== AssetType.LIABILITY)
      .sort((a, b) => {
          const valA = convertValue(a.quantity * a.currentPrice, a.currency, settings.baseCurrency, exchangeRates);
          const valB = convertValue(b.quantity * b.currentPrice, b.currency, settings.baseCurrency, exchangeRates);
          return valB - valA;
      })
      .slice(0, 6)
      .map(a => {
        const value = convertValue(a.quantity * a.currentPrice, a.currency, settings.baseCurrency, exchangeRates);
        const cost = convertValue(a.quantity * a.avgCost, a.currency, settings.baseCurrency, exchangeRates);
        return {
            name: a.symbol,
            value,
            cost,
            pnl: value - cost
        };
      });
  }, [assets, settings.baseCurrency, exchangeRates]);

  // 3. Visual Risk Distribution (Converted)
  const riskProfile = useMemo(() => {
    let high = 0, med = 0, low = 0;
    assets.forEach(a => {
        if (a.type === AssetType.LIABILITY) return; // Liabilities don't have standard "Risk" in this context

        const rawVal = a.quantity * a.currentPrice;
        const val = convertValue(rawVal, a.currency, settings.baseCurrency, exchangeRates);
        
        if(a.type === AssetType.CRYPTO) high += val;
        else if(a.type === AssetType.STOCK) med += val;
        else if(a.type === AssetType.REAL_ESTATE) low += val; // Real Estate treated as stable/low here
        else low += val; // Funds, Cash
    });
    
    const total = high + med + low;
    if (total === 0) return [];

    return [
        { name: 'High (Crypto)', value: high, color: RISK_COLORS.High },
        { name: 'Medium (Stocks)', value: med, color: RISK_COLORS.Medium },
        { name: 'Low (Cash/Real Estate)', value: low, color: RISK_COLORS.Low }
    ].filter(x => x.value > 0);
  }, [assets, settings.baseCurrency, exchangeRates]);

  // 4. P&L Ranking (Converted, Includes all because paying off debt is a "gain" in NW)
  const pnlRanking = useMemo(() => {
    return [...assets]
      .map(a => {
        const value = convertValue(a.quantity * a.currentPrice, a.currency, settings.baseCurrency, exchangeRates);
        const cost = convertValue(a.quantity * a.avgCost, a.currency, settings.baseCurrency, exchangeRates);
        const pnl = value - cost;
        return { name: a.symbol, pnl };
      })
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 8);
  }, [assets, settings.baseCurrency, exchangeRates]);

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
        <Card title={`Allocation (${settings.baseCurrency})`} className="lg:col-span-1">
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
        <Card className="lg:col-span-2" title="Risk Exposure Profile (Assets)">
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
             
             <div className="pr-4 pb-4 h-full flex flex-col justify-center">
                 <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-600 flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-500"/>
                        AI Risk Assessment
                    </h4>
                    {riskData && (
                        <div className={`text-xs font-bold px-2 py-1 rounded border ${
                            riskData.riskScore > 7 ? 'bg-red-50 text-red-600 border-red-100' : 
                            riskData.riskScore > 4 ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                            'bg-green-50 text-green-600 border-green-100'
                        }`}>
                            Level: {riskData.riskLevel}
                        </div>
                    )}
                 </div>

                 {loadingRisk && !riskData ? (
                     <div className="space-y-2 animate-pulse">
                         <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                         <div className="h-4 bg-slate-100 rounded w-full"></div>
                         <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                     </div>
                 ) : riskData ? (
                     <>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden relative">
                                <div 
                                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
                                        riskData.riskScore > 7 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                                        riskData.riskScore > 4 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                                        'bg-gradient-to-r from-green-400 to-green-600'
                                    }`}
                                    style={{ width: `${riskData.riskScore * 10}%` }}
                                ></div>
                            </div>
                            <div className="text-sm font-bold text-slate-700 w-8 text-right">{riskData.riskScore}/10</div>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed border-l-2 border-purple-200 pl-3">
                            "{riskData.analysis}"
                        </p>
                     </>
                 ) : (
                     <p className="text-sm text-slate-400 italic">Unable to generate risk analysis.</p>
                 )}
             </div>
           </div>
        </Card>
      </div>

      {/* Bottom Row: Performance & Values */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Cost vs Value */}
        <Card title="Top Assets: Cost vs Value">
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
                <YAxis tickFormatter={(v) => {
                    // Compact formatting for Y axis
                    if (v >= 1000 || v <= -1000) return `${(v/1000).toFixed(0)}k`;
                    return v.toString();
                }} width={40} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => formatCurrency(val)}
                />
                <Bar dataKey="pnl" name="Net P&L">
                   {pnlRanking.map((entry, index) => (
                      <Cell key={`cell-pnl-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
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