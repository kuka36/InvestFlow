
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PieChart, Wallet, Settings, Menu, X, History, MessageSquarePlus } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = usePortfolio();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const NavItem = ({ to, icon, label, onClick }: { to: string, icon: React.ReactNode, label: string, onClick?: () => void }) => (
    <NavLink 
      to={to} 
      onClick={onClick}
      className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-slate-100'}`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 h-screen fixed left-0 top-0 z-20">
        <div className="p-6 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-800 tracking-tight leading-tight">PanassetLite</span>
                <span className="text-[10px] text-slate-400 font-medium">盘资产·轻</span>
            </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem to="/" icon={<LayoutDashboard size={20}/>} label={t('dashboard')} />
          <NavItem to="/assets" icon={<Wallet size={20}/>} label={t('assets')} />
          <NavItem to="/history" icon={<History size={20}/>} label={t('history')} />
          <NavItem to="/analytics" icon={<PieChart size={20}/>} label={t('analytics')} />
          <NavItem to="/settings" icon={<Settings size={20}/>} label={t('settings')} />
        </nav>
        <div className="p-6 border-t border-slate-100">
            <a 
                href="https://github.com/kuka36/PanassetLite/issues"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors mb-4 group"
            >
                <MessageSquarePlus size={18} className="text-slate-400 group-hover:text-blue-500"/>
                {t('haveFeedback')}
            </a>
            <div className="text-xs text-slate-400">
                {t('disclaimer')}
            </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white z-30 px-4 py-3 border-b border-slate-100 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">PL</span>
            </div>
            <span className="text-lg font-bold text-slate-800">PanassetLite</span>
        </div>
        <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-20 bg-slate-900/20 backdrop-blur-sm md:hidden pt-16" onClick={() => setIsMobileMenuOpen(false)}>
           <div className="bg-white border-b border-slate-100 shadow-xl p-4 animate-in slide-in-from-top-5 duration-200" onClick={e => e.stopPropagation()}>
              <nav className="space-y-2">
                 <NavItem to="/" icon={<LayoutDashboard size={20}/>} label={t('dashboard')} onClick={() => setIsMobileMenuOpen(false)} />
                 <NavItem to="/assets" icon={<Wallet size={20}/>} label={t('assets')} onClick={() => setIsMobileMenuOpen(false)} />
                 <NavItem to="/history" icon={<History size={20}/>} label={t('history')} onClick={() => setIsMobileMenuOpen(false)} />
                 <NavItem to="/analytics" icon={<PieChart size={20}/>} label={t('analytics')} onClick={() => setIsMobileMenuOpen(false)} />
                 <NavItem to="/settings" icon={<Settings size={20}/>} label={t('settings')} onClick={() => setIsMobileMenuOpen(false)} />
                 
                 <div className="pt-4 mt-4 border-t border-slate-100">
                    <a 
                        href="https://github.com/kuka36/PanassetLite/issues"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        <MessageSquarePlus size={20}/>
                        <span className="font-medium">{t('haveFeedback')}</span>
                    </a>
                 </div>
              </nav>
           </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-20 md:p-8 p-4 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};
