import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, exportarInventario } from '../db/database';
import { 
  Download, Trash2, Database, Info, 
  ChevronRight, Shield, Smartphone, 
  RefreshCw, FileSpreadsheet, FileJson
} from 'lucide-react';

function Ajustes({ showToast }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const productCount = useLiveQuery(() => db.productos.count(), []);
  const scanCount = useLiveQuery(() => db.escaneos.count(), []);

  const handleExportCSV = async () => {
    try {
      const productos = await exportarInventario();
      
      if (productos.length === 0) {
        showToast('No hay productos para exportar', 'info');
        return;
      }

      const headers = ['Código', 'Nombre', 'Categoría', 'Cantidad', 'Unidad', 'Precio', 'Notas', 'Fecha Creación', 'Última Actualización'];
      const rows = productos.map(p => [
        p.codigo,
        p.nombre,
        p.categoria || '',
        p.cantidad || 0,
        p.unidad || 'pieza',
        p.precio || '',
        p.descripcion || '',
        p.fechaCreacion || '',
        p.ultimaActualizacion || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventario_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      showToast(`${productos.length} productos exportados como CSV`, 'success');
    } catch (err) {
      showToast('Error al exportar', 'error');
    }
  };

  const handleExportJSON = async () => {
    try {
      const productos = await exportarInventario();
      
      if (productos.length === 0) {
        showToast('No hay productos para exportar', 'info');
        return;
      }

      const jsonContent = JSON.stringify(productos, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventario_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      showToast(`${productos.length} productos exportados como JSON`, 'success');
    } catch (err) {
      showToast('Error al exportar', 'error');
    }
  };

  const handleClearData = async () => {
    try {
      await db.productos.clear();
      await db.escaneos.clear();
      showToast('Todos los datos han sido eliminados', 'info');
      setConfirmClear(false);
    } catch (err) {
      showToast('Error al limpiar datos', 'error');
    }
  };

  return (
    <div>
      <header className="page-header">
        <h1>Ajustes</h1>
        <p>Configuración y herramientas</p>
      </header>

      {/* Data Section */}
      <div className="settings-group">
        <div className="settings-group-title">Datos</div>

        <div className="settings-item" onClick={handleExportCSV} id="export-csv-btn">
          <div className="settings-item-icon" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success)' }}>
            <FileSpreadsheet size={18} />
          </div>
          <div className="settings-item-content">
            <div className="settings-item-title">Exportar CSV</div>
            <div className="settings-item-description">Descarga el inventario en formato de hoja de cálculo</div>
          </div>
          <ChevronRight size={16} className="settings-item-chevron" />
        </div>

        <div className="settings-item" onClick={handleExportJSON} id="export-json-btn">
          <div className="settings-item-icon" style={{ background: 'var(--color-info-subtle)', color: 'var(--color-info)' }}>
            <FileJson size={18} />
          </div>
          <div className="settings-item-content">
            <div className="settings-item-title">Exportar JSON</div>
            <div className="settings-item-description">Descarga el inventario en formato JSON</div>
          </div>
          <ChevronRight size={16} className="settings-item-chevron" />
        </div>

        <div className="settings-item" onClick={() => setConfirmClear(true)} id="clear-data-btn">
          <div className="settings-item-icon" style={{ background: 'var(--color-danger-subtle)', color: 'var(--color-danger)' }}>
            <Trash2 size={18} />
          </div>
          <div className="settings-item-content">
            <div className="settings-item-title">Borrar todos los datos</div>
            <div className="settings-item-description">Eliminar inventario y escaneos</div>
          </div>
          <ChevronRight size={16} className="settings-item-chevron" />
        </div>
      </div>

      {/* Storage Section */}
      <div className="settings-group">
        <div className="settings-group-title">Almacenamiento</div>

        <div className="settings-item" style={{ cursor: 'default' }}>
          <div className="settings-item-icon" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
            <Database size={18} />
          </div>
          <div className="settings-item-content">
            <div className="settings-item-title">Base de datos local</div>
            <div className="settings-item-description">
              {productCount || 0} productos · {scanCount || 0} escaneos
            </div>
          </div>
        </div>

        <div className="settings-item" style={{ cursor: 'default' }}>
          <div className="settings-item-icon" style={{ background: 'var(--color-warning-subtle)', color: 'var(--color-warning)' }}>
            <Shield size={18} />
          </div>
          <div className="settings-item-content">
            <div className="settings-item-title">Modo offline</div>
            <div className="settings-item-description">
              Los datos se guardan localmente en tu dispositivo
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="settings-group">
        <div className="settings-group-title">Acerca de</div>

        <div className="settings-item" onClick={() => setShowAbout(true)} id="about-btn">
          <div className="settings-item-icon" style={{ background: 'rgba(99, 102, 241, 0.08)', color: 'var(--color-accent)' }}>
            <Info size={18} />
          </div>
          <div className="settings-item-content">
            <div className="settings-item-title">InventarioQR</div>
            <div className="settings-item-description">Versión 1.0.0</div>
          </div>
          <ChevronRight size={16} className="settings-item-chevron" />
        </div>
      </div>

      {/* PWA Install hint */}
      <div style={{ 
        padding: '0 var(--spacing-lg)', 
        marginBottom: 'var(--spacing-xl)',
      }}>
        <div style={{
          background: 'var(--color-accent-subtle)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--spacing-md)',
        }}>
          <Smartphone size={20} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
              Instalar como App
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Puedes instalar InventarioQR en tu teléfono. Busca la opción "Agregar a pantalla de inicio" o "Instalar" en el menú de tu navegador.
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Clear Dialog */}
      {confirmClear && (
        <>
          <div className="modal-backdrop" onClick={() => setConfirmClear(false)} />
          <div className="confirm-dialog">
            <h3>⚠️ ¿Borrar todos los datos?</h3>
            <p>Se eliminarán <strong>{productCount || 0} productos</strong> y <strong>{scanCount || 0} registros de escaneo</strong>. Esta acción no se puede deshacer.</p>
            <div className="confirm-dialog-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmClear(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleClearData}>
                <Trash2 size={16} />
                Borrar todo
              </button>
            </div>
          </div>
        </>
      )}

      {/* About Modal */}
      {showAbout && (
        <>
          <div className="modal-backdrop" onClick={() => setShowAbout(false)} />
          <div className="modal-sheet">
            <div className="modal-sheet-handle" />
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl) 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}>📱</div>
              <h2 style={{ 
                fontSize: 'var(--font-size-2xl)', 
                fontWeight: 800,
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: 'var(--spacing-sm)',
              }}>
                InventarioQR
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-lg)' }}>
                Versión 1.0.0
              </p>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.6, maxWidth: '300px', margin: '0 auto var(--spacing-xl)' }}>
                Aplicación de gestión de inventario para tiendas de abarrotes. 
                Escanea códigos QR y de barras para llevar control de tus productos. 
                Funciona sin conexión a internet.
              </p>
              <div style={{ 
                display: 'flex', 
                gap: 'var(--spacing-lg)', 
                justifyContent: 'center',
                padding: 'var(--spacing-md)',
                background: 'var(--color-bg-input)',
                borderRadius: 'var(--radius-lg)',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-accent)' }}>
                    {productCount || 0}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Productos</div>
                </div>
                <div style={{ width: 1, background: 'var(--color-border)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-success)' }}>
                    {scanCount || 0}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Escaneos</div>
                </div>
              </div>
              <button 
                className="btn btn-secondary btn-full" 
                onClick={() => setShowAbout(false)}
                style={{ marginTop: 'var(--spacing-xl)' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Ajustes;
