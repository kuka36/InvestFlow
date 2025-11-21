import React, { useRef, useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { Card } from './ui/Card';
import { Currency } from '../types';
import { 
  Download, Upload, Trash2, Shield, Globe, AlertTriangle, CheckCircle, Key
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { 
    assets, 
    transactions, 
    settings, 
    updateSettings, 
    importData, 
    clearData 
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
    a.download = `investflow_backup_${new Date().toISOString().split('T')[0]}.json`;
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
        setImportStatus({ msg: "Data imported successfully!", type: 'success' });
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        setImportStatus({ msg: "Failed to parse file. Invalid JSON.", type: 'error' });
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleClearData = () => {
      if (window.confirm("Are you sure? This will permanently delete all your assets and transactions. This action cannot be undone.")) {
          clearData();
          setImportStatus({ msg: "All data has been reset.", type: 'success' });
          setTimeout(() => setImportStatus(null), 3000);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
            <p className="text-slate-500">Manage your preferences and data.</p>
        </div>
      </div>

      {/* API Configuration */}
      <Card title="API Configuration">
        <div className="flex items-start gap-3">
             <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mt-1">
                <Key size={20} />
            </div>
            <div className="flex-1">
                 <div className="font-medium text-slate-800 mb-1">Gemini API Key</div>
                 <div className="text-sm text-slate-500 mb-3">
                    Required for AI Insights and Risk Analysis. Your key is stored locally in your browser. 
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline ml-1">Get a key here</a>.
                 </div>
                 <input 
                    type="password" 
                    placeholder="Paste your API Key here..."
                    value={settings.geminiApiKey}
                    onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                 />
            </div>
        </div>
      </Card>

      {/* Preferences Section */}
      <Card title="General Preferences">
        <div className="space-y-6">
            {/* Currency */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Globe size={20} />
                    </div>
                    <div>
                        <div className="font-medium text-slate-800">Base Currency</div>
                        <div className="text-sm text-slate-500">Default currency for portfolio display</div>
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

            {/* Privacy Mode */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                        <Shield size={20} />
                    </div>
                    <div>
                        <div className="font-medium text-slate-800">Privacy Mode</div>
                        <div className="text-sm text-slate-500">Mask financial values on the dashboard</div>
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

      {/* Data Management Section */}
      <Card title="Data Management">
        <div className="space-y-4">
            {importStatus && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${importStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {importStatus.type === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
                    {importStatus.msg}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Export */}
                <button 
                    onClick={handleExport}
                    className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all group"
                >
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-full mb-3 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Download size={24} />
                    </div>
                    <span className="font-medium text-slate-700">Export Data</span>
                    <span className="text-xs text-slate-400 mt-1">Download JSON backup</span>
                </button>

                {/* Import */}
                <button 
                    onClick={handleImportClick}
                    className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all group"
                >
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-full mb-3 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Upload size={24} />
                    </div>
                    <span className="font-medium text-slate-700">Import Data</span>
                    <span className="text-xs text-slate-400 mt-1">Restore from JSON</span>
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
                    <span className="font-medium text-slate-700 group-hover:text-red-700">Reset Data</span>
                    <span className="text-xs text-slate-400 mt-1 group-hover:text-red-400">Clear all assets</span>
                </button>
            </div>
        </div>
      </Card>

      <div className="text-center text-slate-400 text-sm pt-4">
          InvestFlow v1.0.3 • Local Data Storage
      </div>
    </div>
  );
};