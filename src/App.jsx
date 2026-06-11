import { useState, useEffect, useCallback } from 'react';
import { 
  Home, ScanLine, Package, Settings, 
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import Inventario from './components/Inventario';
import Ajustes from './components/Ajustes';
import Toast from './components/Toast';
import OfflineIndicator from './components/OfflineIndicator';

const TABS = {
  DASHBOARD: 'dashboard',
  SCANNER: 'scanner',
  INVENTARIO: 'inventario',
  AJUSTES: 'ajustes',
};

function App() {
  const [activeTab, setActiveTab] = useState(TABS.DASHBOARD);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const navigateTo = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    // Handle back button on mobile
    const handlePopState = (e) => {
      e.preventDefault();
      if (activeTab !== TABS.DASHBOARD) {
        setActiveTab(TABS.DASHBOARD);
        window.history.pushState(null, '', '/');
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case TABS.DASHBOARD:
        return <Dashboard onNavigate={navigateTo} showToast={showToast} />;
      case TABS.SCANNER:
        return <Scanner showToast={showToast} onNavigate={navigateTo} />;
      case TABS.INVENTARIO:
        return <Inventario showToast={showToast} />;
      case TABS.AJUSTES:
        return <Ajustes showToast={showToast} />;
      default:
        return <Dashboard onNavigate={navigateTo} showToast={showToast} />;
    }
  };

  return (
    <div className="app-layout">
      <OfflineIndicator />
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      <main className="app-content">
        {renderContent()}
      </main>

      <nav className="bottom-nav" id="main-navigation">
        <button 
          className={`nav-item ${activeTab === TABS.DASHBOARD ? 'active' : ''}`}
          onClick={() => navigateTo(TABS.DASHBOARD)}
          id="nav-dashboard"
          aria-label="Inicio"
        >
          <Home size={22} />
          <span className="nav-item-label">Inicio</span>
        </button>

        <button 
          className={`nav-item ${activeTab === TABS.INVENTARIO ? 'active' : ''}`}
          onClick={() => navigateTo(TABS.INVENTARIO)}
          id="nav-inventario"
          aria-label="Inventario"
        >
          <Package size={22} />
          <span className="nav-item-label">Inventario</span>
        </button>

        <button 
          className={`nav-item nav-item-scan ${activeTab === TABS.SCANNER ? 'active' : ''}`}
          onClick={() => navigateTo(TABS.SCANNER)}
          id="nav-scanner"
          aria-label="Escanear"
        >
          <div className="scan-fab">
            <ScanLine size={24} />
          </div>
          <span className="nav-item-label">Escanear</span>
        </button>

        <button 
          className={`nav-item ${activeTab === TABS.AJUSTES ? 'active' : ''}`}
          onClick={() => navigateTo(TABS.AJUSTES)}
          id="nav-ajustes"
          aria-label="Ajustes"
        >
          <Settings size={22} />
          <span className="nav-item-label">Ajustes</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
