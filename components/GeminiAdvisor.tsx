import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { usePortfolio } from '../context/PortfolioContext';
import { getPortfolioAnalysis, generatePortfolioHash, ADVISOR_CACHE_KEY, ADVISOR_CACHE_TTL } from '../services/geminiService';
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, CheckCircle, Key } from 'lucide-react';
import { Link } from 'react-router-dom';

export const GeminiAdvisor: React.FC = () => {
  const { assets, settings } = usePortfolio();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canAnalyze, setCanAnalyze] = useState(false);

  useEffect(() => {
    const checkCache = () => {
        if (assets.length === 0) {
            setCanAnalyze(false);
            return;
        }

        const currentHash = generatePortfolioHash(assets);
        const cachedRaw = localStorage.getItem(ADVISOR_CACHE_KEY);
        
        if (!cachedRaw) {
            // No cache -> Enable Analysis
            setCanAnalyze(true);
        } else {
            try {
                const { hash, timestamp, data } = JSON.parse(cachedRaw);
                const age = Date.now() - timestamp;
                const isStale = age > ADVISOR_CACHE_TTL;
                const hasChanged = hash !== currentHash;

                // Load cached data into view if available and we haven't generated new data yet
                if (!analysis && data) {
                    setAnalysis(data);
                }

                // The button is enabled ONLY if the portfolio changed OR the data is > 24h old
                setCanAnalyze(isStale || hasChanged);

            } catch (e) {
                setCanAnalyze(true);
            }
        }
    };

    checkCache();
  }, [assets, analysis]);

  const handleAnalyze = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!settings.geminiApiKey) {
      setError("API Key is missing. Please set it in Settings.");
      setIsExpanded(true);
      return;
    }

    if (assets.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    // Force UI expansion to show loading state
    setIsExpanded(true);

    try {
      // The service handles the logic, but calling this will fetch fresh data 
      // if we are in a 'canAnalyze' state (hash diff or stale).
      // We also force localStorage update inside the service.
      const result = await getPortfolioAnalysis(assets, settings.geminiApiKey);
      setAnalysis(result);
      setCanAnalyze(false); // Analysis is now fresh
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not generate analysis. Check API Key.");
    } finally {
      setLoading(false);
    }
  };

  if (assets.length === 0) return null;

  return (
    <Card className="border-purple-100 bg-gradient-to-br from-white to-purple-50/50 transition-all duration-300">
      <div 
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-600 rounded-lg shadow-lg shadow-purple-200">
                <Sparkles className="text-white" size={20} />
            </div>
            <div>
                <h3 className="font-bold text-slate-800">AI Portfolio Insights</h3>
                <p className="text-xs text-slate-500">Wealth Management & Optimization</p>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            {canAnalyze ? (
                <button 
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="text-sm px-4 py-2 bg-white border border-slate-200 hover:border-purple-300 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all flex items-center gap-2 shadow-sm z-10 font-medium"
                >
                    {loading ? <RefreshCw className="animate-spin" size={16}/> : <><Sparkles size={16} /> Analyze Now</>}
                </button>
            ) : (
                <div className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg border border-green-100 flex items-center gap-1">
                    <CheckCircle size={12} /> Up to date
                </div>
            )}
            <div className="text-slate-400 hover:text-purple-600 transition-colors p-1">
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-purple-100/50 animate-fade-in">
            {loading && !analysis && (
                <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-purple-100 rounded w-3/4"></div>
                <div className="h-4 bg-purple-100 rounded w-1/2"></div>
                <div className="h-4 bg-purple-100 rounded w-5/6"></div>
                </div>
            )}

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex justify-between items-center">
                  <span>{error}</span>
                  {!settings.geminiApiKey && (
                    <Link to="/settings" className="flex items-center gap-1 text-blue-600 hover:underline font-medium">
                       <Key size={14}/> Set Key
                    </Link>
                  )}
                </div>
            )}

            {analysis && (
                <div className="prose prose-sm prose-purple max-w-none text-slate-600">
                <div className="whitespace-pre-wrap leading-relaxed">{analysis}</div>
                </div>
            )}
        </div>
      )}
    </Card>
  );
};