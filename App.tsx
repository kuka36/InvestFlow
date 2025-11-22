
import React, { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AssetList } from './components/AssetList';
import { TransactionHistory } from './components/TransactionHistory';
import { AddAssetModal } from './components/AddAssetModal';
import { AddTransactionModal } from './components/AddTransactionModal';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { GeminiAdvisor } from './components/GeminiAdvisor';
import { Plus } from 'lucide-react';
import { Asset } from './types';

const DashboardView: React.FC = () => {
  const { t } = usePortfolio();
  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">{t('overview')}</h1>
        </div>
      </div>

      <GeminiAdvisor />
      <Dashboard />
    </div>
  );
};

const AssetsView: React.FC = () => {
  const { t } = usePortfolio();
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAssetIdForTx, setSelectedAssetIdForTx] = useState<string | undefined>(undefined);

  // Asset CRUD Handlers
  const handleOpenAddAsset = () => {
      setEditingAsset(null);
      setIsAssetModalOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
      setEditingAsset(asset);
      setIsAssetModalOpen(true);
  };

  // Transaction Handler - Now only called from AssetList
  const handleRecordTransaction = (asset: Asset) => {
      setSelectedAssetIdForTx(asset.id);
      setIsTxModalOpen(true);
  };

  const closeAssetModal = () => {
      setIsAssetModalOpen(false);
      setEditingAsset(null);
  };

  const closeTxModal = () => {
      setIsTxModalOpen(false);
      setSelectedAssetIdForTx(undefined);
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{t('assetsManagement')}</h1>
                <p className="text-slate-500">{t('assetsSubtitle')}</p>
            </div>
            <div>
                <button 
                    onClick={handleOpenAddAsset}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                >
                    <Plus size={20}/> {t('addNewAsset')}
                </button>
            </div>
        </div>

        <AssetList 
            onEdit={handleEditAsset} 
            onTransaction={handleRecordTransaction}
        />

        {/* Modals */}
        <AddAssetModal 
            isOpen={isAssetModalOpen} 
            onClose={closeAssetModal} 
            initialAsset={editingAsset} 
        />
        <AddTransactionModal 
            isOpen={isTxModalOpen} 
            onClose={closeTxModal}
            preselectedAssetId={selectedAssetIdForTx}
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
            <Route path="/history" element={<TransactionHistory />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </HashRouter>
    </PortfolioProvider>
  );
};

export default App;