
import React, { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AssetList } from './components/AssetList';
import { AddAssetModal } from './components/AddAssetModal';
import { AddTransactionModal } from './components/AddTransactionModal';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { GeminiAdvisor } from './components/GeminiAdvisor';
import { Plus, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { Asset } from './types';

const DashboardView: React.FC = () => {
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const { refreshPrices, isRefreshing } = usePortfolio();

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Overview</h1>
          <p className="text-slate-500">Welcome back, here's your portfolio performance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button 
            onClick={() => refreshPrices()}
            disabled={isRefreshing}
            className="px-4 py-2.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 font-medium rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
           >
             <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
             <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
           </button>
           
           <button 
            onClick={() => setIsTxModalOpen(true)}
            className="px-4 py-2.5 bg-white text-blue-600 border border-blue-100 hover:bg-blue-50 font-medium rounded-xl shadow-sm transition-all flex items-center gap-2"
           >
             <ArrowRightLeft size={18}/>
             <span>Record Transaction</span>
           </button>

           <button 
            onClick={() => setIsAssetModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
           >
             <Plus size={20}/>
             <span>Add Asset</span>
           </button>
        </div>
      </div>

      <GeminiAdvisor />
      <Dashboard />
      <AssetList />
      
      <AddAssetModal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} />
      <AddTransactionModal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} />
    </div>
  );
};

const AssetsView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const handleOpenAdd = () => {
      setEditingAsset(null);
      setIsModalOpen(true);
  };

  const handleEdit = (asset: Asset) => {
      setEditingAsset(asset);
      setIsModalOpen(true);
  };

  const handleClose = () => {
      setIsModalOpen(false);
      setEditingAsset(null);
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800">Assets Management</h1>
             <button 
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm flex items-center gap-2"
            >
                <Plus size={18}/> Add
            </button>
        </div>
        <AssetList onEdit={handleEdit} />
        <AddAssetModal 
            isOpen={isModalOpen} 
            onClose={handleClose} 
            initialAsset={editingAsset} 
        />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <PortfolioProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/assets" element={<AssetsView />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </HashRouter>
    </PortfolioProvider>
  );
};

export default App;
