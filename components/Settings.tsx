
import React, { useRef, useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { Card } from './ui/Card';
import { Currency, Language, AIProvider } from '../types';
import { 
  Download, Upload, Trash2, Shield, Globe, AlertTriangle, CheckCircle, Key, Languages, Activity, Lock, Github, ExternalLink, Bot
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { 
    assets, 
    transactions, 
    settings, 
    updateSettings, 
    importData, 
    clearData,
    t
  } = usePortfolio();

  const [importStatus, setImportStatus] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = {
      assets,
      transactions,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `panassetlite_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.assets || !Array.isArray(json.assets)) {
            throw new Error("Invalid backup file format");
        }
        importData({ assets: json.assets, transactions: json.transactions || [] });
        setImportStatus({ msg: t('importSuccess'), type: 'success' });
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        setImportStatus({ msg: t('importError'), type: 'error' });
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleClearData = () => {
      if (window.confirm(t('resetConfirm'))) {
          clearData();
          setImportStatus({ msg: t('resetSuccess'), type: 'success' });
          setTimeout(() => setImportStatus(null), 3000);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('settings')}</h1>
            <p className="text-slate-500">{t('managePreferences')}</p>
        </div>
      </div>

      {/* API Configuration */}
      <Card title={t('apiConfiguration')}>
        <div className="space-y-6">
            
            {/* AI Provider Selection */}
            <div className="flex items-start gap-3">
                 <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mt-1">
                    <Bot size={20} />
                </div>
                <div className="flex-1">
                     <div className="font-medium text-slate-800 mb-1">{t('aiProvider')}</div>
                     <div className="text-sm text-slate-500 mb-3">{t('aiProviderDesc')}</div>
                     
                     <div className="grid grid-cols-2 gap-4 max-w-md">
                        <label className={`border rounded-xl p-4 cursor-pointer transition-all ${settings.aiProvider === 'gemini' ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-purple-200'}`}>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="radio" 
                                    name="aiProvider"
                                    checked={settings.aiProvider === 'gemini'}
                                    onChange={() => updateSettings({ aiProvider: 'gemini' })}
                                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="font-medium text-slate-800">Google Gemini</span>
                            </div>
                        </label>

                        <label className={`border rounded-xl p-4 cursor-pointer transition-all ${settings.aiProvider === 'deepseek' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'}`}>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="radio" 
                                    name="aiProvider"
                                    checked={settings.aiProvider === 'deepseek'}
                                    onChange={() => updateSettings({ aiProvider: 'deepseek' })}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-medium text-slate-800">DeepSeek</span>
                            </div>
                        </label>
                     </div>
                </div>
            </div>

            <div className="border-t border-slate-100 pt-4"></div>

            {/* Dynamic AI Key Input */}
            <div className="flex items-start gap-3">
                 <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mt-1">
                    <Key size={20} />
                </div>
                <div className="flex-1">
                     {settings.aiProvider === 'gemini' ? (
                        <>
                            <div className="font-medium text-slate-800 mb-1">{t('geminiKey')}</div>
                            <div className="text-sm text-slate-500 mb-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                {t('geminiKeyDesc')}
                                <div className="mt-1">
                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">{t('getKey')}</a>
                                </div>
                            </div>
                            <input 
                                type="password" 
                                placeholder="Paste your Gemini API Key here..."
                                value={settings.geminiApiKey}
                                onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                            />
                        </>
                     ) : (
                        <>
                            <div className="font-medium text-slate-800 mb-1">{t('deepSeekKey')}</div>
                            <div className="text-sm text-slate-500 mb-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                {t('deepSeekKeyDesc')}
                                <div className="mt-1">
                                    <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">{t('getKey')}</a>
                                </div>
                            </div>
                            <input 
                                type="password" 
                                placeholder="Paste your DeepSeek API Key here..."
                                value={settings.deepSeekApiKey}
                                onChange={(e) => updateSettings({ deepSeekApiKey: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                            />
                        </>
                     )}
                </div>
            </div>

            <div className="border-t border-slate-100 pt-4"></div>

            {/* Alpha Vantage API Key */}
            <div className="flex items-start gap-3">
                 <div className="p-2 bg-teal-50 text-teal-600 rounded-lg mt-1">
                    <Activity size={20} />
                </div>
                <div className="flex-1">
                     <div className="font-medium text-slate-800 mb-1">{t('alphaVantageKey')}</div>
                     <div className="text-sm text-slate-500 mb-3">
                        {t('alphaVantageKeyDesc')}
                        <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline ml-1">{t('getKey')}</a>.
                     </div>
                     <input 
                        type="password" 
                        placeholder="Paste your Alpha Vantage API Key here..."
                        value={settings.alphaVantageApiKey}
                        onChange={(e) => updateSettings({ alphaVantageApiKey: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                     />
                </div>
            </div>
        </div>
      </Card>

      {/* Preferences Section */}
      <Card title={t('generalPreferences')}>
        <div className="space-y-6">
            {/* Currency */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Globe size={20} />
                    </div>
                    <div>
                        <div className="font-medium text-slate-800">{t('baseCurrency')}</div>
                        <div className="text-sm text-slate-500">{t('baseCurrencyDesc')}</div>
                    </div>
                </div>
                <select 
                    value={settings.baseCurrency}
                    onChange={(e) => updateSettings({ baseCurrency: e.target.value as Currency })}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none min-w-[120px]"
                >
                    <option value={Currency.USD}>USD ($)</option>
                    <option value={Currency.CNY}>CNY (¥)</option>
                    <option value={Currency.HKD}>HKD ($)</option>
                </select>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Languages size={20} />
                    </div>
                    <div>
                        <div className="font-medium text-slate-800">{t('language')}</div>
                        <div className="text-sm text-slate-500">{t('languageDesc')}</div>
                    </div>
                </div>
                <select 
                    value={settings.language}
                    onChange={(e) => updateSettings({ language: e.target.value as Language })}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none min-w-[120px]"
                >
                    <option value="en">English</option>
                    <option value="zh">中文 (简体)</option>
                </select>
            </div>

            {/* Privacy Mode */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                        <Shield size={20} />
                    </div>
                    <div>
                        <div className="font-medium text-slate-800">{t('privacyMode')}</div>
                        <div className="text-sm text-slate-500">{t('privacyModeDesc')}</div>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={settings.isPrivacyMode}
                        onChange={(e) => updateSettings({ isPrivacyMode: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>
        </div>
      </Card>

      {/* Feedback */}
      <Card title={t('feedback')}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg shrink-0">
                    <Github size={22} />
                </div>
                <div>
                    <div className="font-medium text-slate-800">{t('reportBug')}</div>
                    <div className="text-sm text-slate-500">{t('githubDesc')}</div>
                </div>
            </div>
            <a 
                href="https://github.com/kuka36/PanassetLite/issues"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0"
            >
                <Github size={16} />
                <span>{t('githubLinkText')}</span>
                <ExternalLink size={14} className="opacity-70"/>
            </a>
        </div>
      </Card>

      {/* Data Management Section */}
      <Card title={t('dataManagement')}>
        <div className="space-y-4">
            {importStatus && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${importStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {importStatus.type === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
                    {importStatus.msg}
                </div>
            )}

            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex items-start gap-3">
                <Lock size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <span className="text-sm text-blue-700">{t('localDataSecurity')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Export */}
                <button 
                    onClick={handleExport}
                    className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all group"
                >
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-full mb-3 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Download size={24} />
                    </div>
                    <span className="font-medium text-slate-700">{t('exportData')}</span>
                    <span className="text-xs text-slate-400 mt-1">{t('exportDesc')}</span>
                </button>

                {/* Import */}
                <button 
                    onClick={handleImportClick}
                    className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all group"
                >
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-full mb-3 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Upload size={24} />
                    </div>
                    <span className="font-medium text-slate-700">{t('importData')}</span>
                    <span className="text-xs text-slate-400 mt-1">{t('importDesc')}</span>
                    <input 
                        type="file" 
                        accept=".json" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                    />
                </button>

                {/* Reset */}
                <button 
                    onClick={handleClearData}
                    className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-200 transition-all group"
                >
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-full mb-3 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                        <Trash2 size={24} />
                    </div>
                    <span className="font-medium text-slate-700 group-hover:text-red-700">{t('resetData')}</span>
                    <span className="text-xs text-slate-400 mt-1 group-hover:text-red-400">{t('resetDesc')}</span>
                </button>
            </div>
        </div>
      </Card>

      <div className="text-center text-slate-400 text-sm pt-4">
          PanassetLite (盘资产·轻) v1.1.0 • Local Data Storage
      </div>
    </div>
  );
};