import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { usePortfolio } from '../context/PortfolioContext';
import { getPortfolioAnalysis } from '../services/geminiService';
import { Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

export const GeminiAdvisor: React.FC = () => {
  const { assets } = usePortfolio();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false); // Default collapsed

  const handleAnalyze = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Prevent toggling the card when clicking the button
    
    if (assets.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getPortfolioAnalysis(assets);
      setAnalysis(result);
      if (!isExpanded) setIsExpanded(true);
    } catch (err) {
      setError("Could not generate analysis. Please check your API Key.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const initAnalysis = async () => {
        if (assets.length === 0) return;
        try {
            const result = await getPortfolioAnalysis(assets);
            if (isMounted) setAnalysis(result);
        } catch (e) {
            // Ignore auto-fetch errors
        }
    };

    // Auto-fetch only on mount if we have assets
    initAnalysis();

    return () => {
      isMounted = false;
    };
  }, [assets]);

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
                <p className="text-xs text-slate-500">Daily Analysis • Powered by Gemini</p>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
              onClick={handleAnalyze}
              disabled={loading}
              className="text-sm px-4 py-2 bg-white border border-slate-200 hover:border-purple-300 text-slate-600 hover:text-purple-600 rounded-lg transition-all flex items-center gap-2 shadow-sm z-10"
            >
              {loading ? <RefreshCw className="animate-spin" size={16}/> : "Analyze Now"}
            </button>
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
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
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