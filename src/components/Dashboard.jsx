import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, obtenerEstadisticas } from '../db/database';
import { 
  Package, BarChart3, ScanLine, TrendingUp, 
  Clock, ArrowRight 
} from 'lucide-react';

function Dashboard({ onNavigate, showToast }) {
  const [stats, setStats] = useState({
    totalProductos: 0,
    totalUnidades: 0,
    escaneos24h: 0,
    categorias: {},
  });

  const recentProducts = useLiveQuery(
    () => db.productos.toArray().then(arr =>
      arr.sort((a, b) => new Date(b.ultimaActualizacion || 0) - new Date(a.ultimaActualizacion || 0)).slice(0, 5)
    ),
    []
  );

  const recentScans = useLiveQuery(
    () => db.escaneos.toArray().then(arr =>
      arr.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)).slice(0, 10)
    ),
    []
  );

  useEffect(() => {
    const loadStats = async () => {
      try {
        const s = await obtenerEstadisticas();
        setStats(s);
      } catch (err) {
        console.error('Error loading stats:', err);
      }
    };
    loadStats();
  }, [recentProducts]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const categorias = useLiveQuery(() => db.categorias.toArray(), []);

  const getCategoryEmoji = (catName) => {
    const cat = categorias?.find(c => c.nombre === catName);
    return cat?.icono || '📦';
  };

  return (
    <div>
      <header className="page-header">
        <h1>InventarioQR</h1>
        <p>Gestión de inventario de abarrotes</p>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon accent">
            <Package size={18} />
          </div>
          <div className="stat-card-value">{stats.totalProductos}</div>
          <div className="stat-card-label">Productos</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon success">
            <BarChart3 size={18} />
          </div>
          <div className="stat-card-value">{stats.totalUnidades}</div>
          <div className="stat-card-label">Unidades</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon warning">
            <ScanLine size={18} />
          </div>
          <div className="stat-card-value">{stats.escaneos24h}</div>
          <div className="stat-card-label">Escaneos 24h</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon info">
            <TrendingUp size={18} />
          </div>
          <div className="stat-card-value">
            {Object.keys(stats.categorias).length}
          </div>
          <div className="stat-card-label">Categorías</div>
        </div>
      </div>

      {/* Quick Action */}
      <div style={{ padding: '0 var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
        <button 
          className="btn btn-primary btn-lg btn-full"
          onClick={() => onNavigate('scanner')}
          id="quick-scan-btn"
          style={{ fontSize: 'var(--font-size-lg)', gap: 'var(--spacing-md)' }}
        >
          <ScanLine size={24} />
          Escanear Producto
        </button>
      </div>

      {/* Recent Products */}
      <div className="section-header">
        <h2 className="section-title">Productos Recientes</h2>
        <button 
          className="section-action" 
          onClick={() => onNavigate('inventario')}
          id="view-all-products-btn"
        >
          Ver todos <ArrowRight size={14} style={{ verticalAlign: 'middle' }} />
        </button>
      </div>

      {recentProducts && recentProducts.length > 0 ? (
        <div className="product-list" style={{ marginBottom: 'var(--spacing-xl)' }}>
          {recentProducts.map(product => (
            <div 
              key={product.id} 
              className="product-item"
              onClick={() => onNavigate('inventario')}
            >
              <div className="product-item-emoji">
                {getCategoryEmoji(product.categoria)}
              </div>
              <div className="product-item-info">
                <div className="product-item-name">{product.nombre}</div>
                <div className="product-item-code">{product.codigo}</div>
                <div className="product-item-meta">
                  <span className="product-item-badge">{product.categoria || 'Sin categoría'}</span>
                </div>
              </div>
              <div className="product-item-qty">
                <span className="product-item-qty-value">{product.cantidad || 0}</span>
                <span className="product-item-qty-label">uds</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ minHeight: '20vh' }}>
          <div className="empty-state-icon">📦</div>
          <div className="empty-state-title">Sin productos aún</div>
          <div className="empty-state-description">
            Escanea tu primer código QR o de barras para empezar a crear tu inventario
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => onNavigate('scanner')}
          >
            <ScanLine size={18} />
            Empezar a escanear
          </button>
        </div>
      )}

      {/* Recent Activity */}
      {recentScans && recentScans.length > 0 && (
        <>
          <div className="section-header">
            <h2 className="section-title">
              <Clock size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
              Actividad Reciente
            </h2>
          </div>
          <div className="activity-list" style={{ marginBottom: 'var(--spacing-xl)' }}>
            {recentScans.slice(0, 5).map(scan => (
              <ActivityItem key={scan.id} scan={scan} formatTime={formatTime} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ActivityItem({ scan, formatTime }) {
  const producto = useLiveQuery(
    () => scan.productoId ? db.productos.get(scan.productoId) : null,
    [scan.productoId]
  );

  return (
    <div className="activity-item">
      <div className={`activity-dot ${scan.tipo === 'creacion' ? 'create' : 'update'}`} />
      <div className="activity-content">
        <div className="activity-title">
          {scan.tipo === 'creacion' ? 'Nuevo producto: ' : 'Actualizado: '}
          <strong>{producto?.nombre || 'Producto'}</strong>
          {scan.cantidadAgregada > 0 && ` (+${scan.cantidadAgregada})`}
        </div>
        <div className="activity-time">{formatTime(scan.fecha)}</div>
      </div>
    </div>
  );
}

export default Dashboard;
