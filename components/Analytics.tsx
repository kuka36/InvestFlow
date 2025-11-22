
import React, { useMemo, useState, useEffect } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { getRiskAssessment } from '../services/geminiService';
import { convertValue } from '../services/marketData';
import { Card } from './ui/Card';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, LabelList
} from 'recharts';
import { AssetType } from '../types';
import { PieChart as PieIcon, Sparkles, Scale, RefreshCw, Zap } from 'lucide-react';

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
  const { assets, settings, exchangeRates, t } = usePortfolio();
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [riskError, setRiskError] = useState(false);

  const formatCurrency = (val: number) => {
    if (settings.isPrivacyMode) return '****';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.baseCurrency, notation: 'compact' }).format(val);
  };

  const handleRefreshRisk = async () => {
    if (assets.length === 0) return;
    
    if (!settings.geminiApiKey) {
        setRiskError(true);
        return;
    }
    
    setLoadingRisk(true);
    setRiskError(false);

    try {
        // Force refresh or fetch
        const data = await getRiskAssessment(assets, settings.geminiApiKey, settings.language, true);
        setRiskData(data);
    } catch (e) {
        console.error("Failed to refresh risk assessment", e);
        setRiskError(true);
    } finally {
        setLoadingRisk(false);
    }
  };

  // --- Data Preparations ---

  // 1. Distribution by Asset Type (Excluding Liabilities)
  const typeDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    assets.forEach(a => {
      if (a.type === AssetType.LIABILITY) return; // Exclude debt

      const rawVal = a.quantity * a.currentPrice;
      const val = convertValue(rawVal, a.currency, settings.baseCurrency, exchangeRates);
      dist[a.type] = (dist[a.type] || 0) + val;
    });
    return Object.entries(dist)
      .map(([name, value]) => ({ name: t(`type_${name.toLowerCase()}`), value }))
      .sort((a, b) => b.value - a.value);
  }, [assets, settings.baseCurrency, exchangeRates, t]);

  // 2. Liabilities Distribution
  const liabilityDistribution = useMemo(() => {
    return assets
      .filter(a => a.type === AssetType.LIABILITY)
      .map(a => {
        const rawVal = a.quantity * a.currentPrice;
        const val = convertValue(rawVal, a.currency, settings.baseCurrency, exchangeRates);
        return { name: a.name || a.symbol, value: val };
      })
      .sort((a, b) => b.value - a.value);
  }, [assets, settings.baseCurrency, exchangeRates]);

  // 3. Balance Sheet Summary (Assets vs Liabilities)
  const balanceSheet = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;

    assets.forEach(a => {
      const rawVal = a.quantity * a.currentPrice;
      const val = convertValue(rawVal, a.currency, settings.baseCurrency, exchangeRates);
      
      if (a.type === AssetType.LIABILITY) {
        totalLiabilities += val;
      } else {
        totalAssets += val;
      }
    });

    return { 
      data: [
        { name: t('label_assets'), value: totalAssets, fill: '#10b981' }, // Green
        { name: t('label_liabilities'), value: totalLiabilities, fill: '#ef4444' } // Red
      ],
      totalAssets,
      totalLiabilities,
      ratio: totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0
    };
  }, [assets, settings.baseCurrency, exchangeRates, t]);

  // 4. Top Assets by Value (Excluding Liabilities)
  const topAssets = useMemo(() => {
    return [...assets]
      .filter(a => a.type !== AssetType.LIABILITY) 
      .map(a => {
        const value = convertValue(a.quantity * a.currentPrice, a.currency, settings.baseCurrency, exchangeRates);
        const cost = convertValue(a.quantity * a.avgCost, a.currency, settings.baseCurrency, exchangeRates);
        return {
            name: a.symbol,
            value,
            cost,
            pnl: value - cost
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [assets, settings.baseCurrency, exchangeRates]);

  // 5. Visual Risk Distribution (Assets Only)
  const riskProfile = useMemo(() => {
    let high = 0, med = 0, low = 0;
    assets.forEach(a => {
        if (a.type === AssetType.LIABILITY) return; 

        const rawVal = a.quantity * a.currentPrice;
        const val = convertValue(rawVal, a.currency, settings.baseCurrency, exchangeRates);
        
        if(a.type === AssetType.CRYPTO) high += val;
        else if(a.type === AssetType.STOCK) med += val;
        else if(a.type === AssetType.REAL_ESTATE) low += val; 
        else low += val; 
    });
    
    const total = high + med + low;
    if (total === 0) return [];

    return [
        { name: t('risk_high'), value: high, color: RISK_COLORS.High },
        { name: t('risk_medium'), value: med, color: RISK_COLORS.Medium },
        { name: t('risk_low'), value: low, color: RISK_COLORS.Low }
    ].filter(x => x.value > 0);
  }, [assets, settings.baseCurrency, exchangeRates, t]);

  // 6. P&L Ranking
  const pnlRanking = useMemo(() => {
    return [...assets]
      .filter(a => a.type !== AssetType.LIABILITY)
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
        <p>{t('noAssetsAnalytics')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-2">
         <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('analytics')}</h1>
            <p className="text-slate-500 text-sm">{t('analyticsSubtitle')}</p>
         </div>
      </div>

      {/* --- Section 1: Financial Health (The Big Picture) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Net Worth Structure */}
          <Card title={t('netWorthStructure')} className="md:col-span-2 min-w-0">
             <div className="h-[200px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={balanceSheet.data} layout="vertical" margin={{left: 0, right: 40, top: 0, bottom: 0}} barSize={32}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" tickFormatter={formatCurrency} tick={{fontSize: 11, fill: '#94a3b8'}} axisLine={false} tickLine={false}/>
                        <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 12, fontWeight: 500, fill: '#64748b'}} axisLine={false} tickLine={false}/>
                        <RechartsTooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(val: number) => formatCurrency(val)}
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                            { balanceSheet.data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                            {!settings.isPrivacyMode && (
                                <LabelList dataKey="value" position="right" formatter={formatCurrency} style={{fontSize: '11px', fill: '#64748b', fontWeight: 600}} />
                            )}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             </div>
          </Card>

          {/* 2. Debt Ratio Indicator */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col justify-center items-center md:col-span-1 relative overflow-hidden">
              <h3 className="text-slate-500 text-sm font-medium mb-3 flex items-center gap-2 z-10">
                  <Scale size={16} /> {t('debtRatio')}
              </h3>
              
              <div className="relative z-10 text-center mb-2">
                 <div className={`text-3xl font-bold mb-1 ${balanceSheet.ratio > 50 ? 'text-red-500' : (balanceSheet.ratio > 30 ? 'text-orange-500' : 'text-slate-800')}`}>
                     {balanceSheet.ratio.toFixed(1)}%
                 </div>
                 <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                     balanceSheet.ratio > 30 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                 }`}>
                     {balanceSheet.ratio > 30 ? t('highLeverage') : t('healthy')}
                 </div>
              </div>
              {/* Visual Progress Bar at bottom */}
              <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${balanceSheet.ratio > 50 ? 'bg-red-500' : 'bg-green-500'}`} 
                    style={{width: `${Math.min(balanceSheet.ratio, 100)}%`}}
                  ></div>
              </div>
          </div>
      </div>

      {/* --- Section 2: Composition & Risk (The Characteristics) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Asset Allocation */}
        <Card title={t('assetAllocation')} className="lg:col-span-1 min-w-0">
          <div className="h-[240px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
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
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{fontSize: '11px'}}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Risk Profile & AI Insight - UPDATED */}
        <Card className="lg:col-span-2 min-w-0" title={t('riskAnalysis')}>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
             <div className="h-[240px] min-w-0 flex flex-col justify-center">
                <ResponsiveContainer width="100%" height="100%">
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
                    <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{fontSize: '11px'}} />
                    <RechartsTooltip 
                        formatter={(val: number) => formatCurrency(val)}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                </PieChart>
                </ResponsiveContainer>
             </div>
             
             <div className="flex flex-col justify-center pr-2 py-2">
                 <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 h-full flex flex-col relative overflow-hidden">
                     {/* Background Decoration */}
                     <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Sparkles size={64} className="text-purple-600"/>
                     </div>

                     <div className="flex items-center justify-between mb-4 relative z-10">
                        <h4 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
                            <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                                <Sparkles size={14} />
                            </div>
                            {t('aiAssessment')}
                        </h4>
                        
                        {riskData && (
                           <button 
                                onClick={handleRefreshRisk} 
                                disabled={loadingRisk}
                                className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-purple-600 transition-all"
                                title={t('recalculate')}
                            >
                                <RefreshCw size={14} className={loadingRisk ? "animate-spin" : ""} />
                            </button>
                        )}
                     </div>

                     <div className="flex-1 flex flex-col justify-center relative z-10">
                         {riskError ? (
                            <div className="text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                                {t('unableToGenerate')} {t('apiKeyMissing')}
                            </div>
                         ) : loadingRisk && !riskData ? (
                             <div className="space-y-3 animate-pulse px-1">
                                 <div className="h-2 bg-slate-200 rounded w-full"></div>
                                 <div className="h-2 bg-slate-200 rounded w-3/4"></div>
                                 <div className="h-2 bg-slate-200 rounded w-5/6"></div>
                             </div>
                         ) : riskData ? (
                             <div className="animate-fade-in">
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                        riskData.riskScore > 7 ? 'bg-red-50 text-red-600 border-red-100' : 
                                        riskData.riskScore > 4 ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                                        'bg-green-50 text-green-600 border-green-100'
                                    }`}>
                                        {riskData.riskLevel}
                                    </span>
                                    <div className="text-right">
                                         <span className="text-sm font-bold text-slate-800">{riskData.riskScore}</span>
                                         <span className="text-xs text-slate-400">/10</span>
                                    </div>
                                </div>

                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                            riskData.riskScore > 7 ? 'bg-red-500' :
                                            riskData.riskScore > 4 ? 'bg-orange-500' :
                                            'bg-green-500'
                                        }`}
                                        style={{ width: `${riskData.riskScore * 10}%` }}
                                    ></div>
                                </div>
                                
                                <div className="text-xs text-slate-600 leading-relaxed italic relative pl-3">
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-purple-200 rounded-full"></div>
                                    {riskData.analysis}
                                </div>
                             </div>
                         ) : (
                             <div className="text-center">
                                <button 
                                    onClick={handleRefreshRisk}
                                    className="px-5 py-2.5 bg-white hover:bg-purple-50 text-purple-600 border border-purple-100 hover:border-purple-200 text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow flex items-center gap-2 mx-auto group"
                                >
                                    <Zap size={16} className="group-hover:fill-purple-600 transition-colors" />
                                    {t('startRiskAnalysis')}
                                </button>
                             </div>
                         )}
                     </div>
                 </div>
             </div>
           </div>
        </Card>
      </div>

      {/* --- Section 3: Performance (The Details) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Cost vs Value */}
        <Card title={t('costVsValue')} className="min-w-0">
           <div className="h-[250px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAssets} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={formatCurrency} hide />
                <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={50} 
                    tick={{fontSize: 11, fill: '#64748b'}} 
                    interval={0}
                />
                <RechartsTooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => formatCurrency(val)}
                />
                <Legend iconSize={8} wrapperStyle={{fontSize: '11px'}}/>
                <Bar dataKey="cost" name={t('label_cost')} fill="#cbd5e1" radius={[0, 3, 3, 0]} barSize={8} />
                <Bar dataKey="value" name={t('label_value')} fill="#3b82f6" radius={[0, 3, 3, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* P&L Performance */}
        <Card title={t('topMovers')} className="min-w-0">
           <div className="h-[250px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnlRanking} margin={{top: 20, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis hide />
                <RechartsTooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => formatCurrency(val)}
                />
                <Bar dataKey="pnl" name={t('label_net_pnl')} radius={[4, 4, 0, 0]}>
                   {pnlRanking.map((entry, index) => (
                      <Cell key={`cell-pnl-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                   ))}
                   {!settings.isPrivacyMode && (
                        <LabelList 
                            dataKey="pnl" 
                            position="top" 
                            formatter={(val: number) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(val)} 
                            style={{fontSize: '10px', fill: '#94a3b8'}}
                        />
                   )}
                </Bar>
                <ReferenceLine y={0} stroke="#cbd5e1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Liability Breakdown (Conditional Row) */}
        {liabilityDistribution.length > 0 && (
            <Card title={t('liabilityBreakdown')} className="md:col-span-2 min-w-0">
                 <div className="h-[180px] w-full flex items-center justify-center min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={liabilityDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                            >
                            {liabilityDistribution.map((entry, index) => (
                                <Cell key={`cell-liab-${index}`} fill={index % 2 === 0 ? '#ef4444' : '#f87171'} stroke="none" />
                            ))}
                            </Pie>
                            <RechartsTooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(val: number) => formatCurrency(val)}
                            />
                            <Legend iconSize={8} wrapperStyle={{fontSize: '11px'}} layout="vertical" align="right" verticalAlign="middle"/>
                        </PieChart>
                    </ResponsiveContainer>
                 </div>
            </Card>
        )}
      </div>
    </div>
  );
};
