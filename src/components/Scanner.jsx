import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, agregarProducto } from '../db/database';
import { 
  X, Check, Camera, CameraOff, Plus, Minus, 
  Zap, FlashlightOff 
} from 'lucide-react';

function Scanner({ showToast, onNavigate }) {
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const processingRef = useRef(false);

  const categorias = useLiveQuery(() => db.categorias.toArray(), []);

  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'Abarrotes',
    precio: '',
    cantidad: 1,
    descripcion: '',
    unidad: 'pieza',
  });

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        if (state === 2) { // SCANNING
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (!scannerRef.current) return;
    
    setCameraError(null);
    
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader', { verbose: false });
      }
      
      const state = html5QrCodeRef.current.getState();
      if (state === 2) {
        await html5QrCodeRef.current.stop();
      }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minEdge * 0.7);
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText, result) => {
          if (!processingRef.current) {
            processingRef.current = true;
            handleScanSuccess(decodedText, result);
          }
        },
        () => {} // ignore errors during scanning
      );
      
      setScanning(true);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError(
        err.toString().includes('NotAllowedError')
          ? 'Permiso de cámara denegado. Habilita el acceso a la cámara en la configuración del navegador.'
          : err.toString().includes('NotFoundError')
          ? 'No se encontró ninguna cámara en este dispositivo.'
          : `Error al iniciar la cámara: ${err.message || err}`
      );
    }
  }, []);

  const handleScanSuccess = async (decodedText) => {
    // Vibrate on mobile for haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    setScannedCode(decodedText);

    // Check if product already exists
    const existente = await db.productos.where('codigo').equals(decodedText).first();
    
    if (existente) {
      // Product exists - auto-add quantity
      const result = await agregarProducto({
        codigo: decodedText,
        nombre: existente.nombre,
        categoria: existente.categoria,
        cantidad: 1,
      });
      
      setLastResult({
        ...result,
        esNuevo: false,
        nombre: existente.nombre,
        cantidad: result.cantidad,
      });
      
      showToast(`+1 ${existente.nombre} (Total: ${result.cantidad})`, 'success');
      
      // Allow next scan after a brief pause
      setTimeout(() => {
        processingRef.current = false;
        setLastResult(null);
      }, 2000);
    } else {
      // New product - show form
      await stopScanner();
      setFormData(prev => ({
        ...prev,
        nombre: '',
        categoria: 'Abarrotes',
        precio: '',
        cantidad: 1,
        descripcion: '',
      }));
      setShowForm(true);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      showToast('Ingresa un nombre para el producto', 'error');
      return;
    }

    try {
      const result = await agregarProducto({
        codigo: scannedCode,
        nombre: formData.nombre.trim(),
        categoria: formData.categoria,
        precio: formData.precio ? parseFloat(formData.precio) : null,
        cantidad: formData.cantidad,
        descripcion: formData.descripcion.trim(),
        unidad: formData.unidad,
      });

      showToast(`${formData.nombre} agregado al inventario`, 'success');
      
      setLastResult({
        ...result,
        esNuevo: true,
        nombre: formData.nombre,
      });
      
      setShowForm(false);
      setScannedCode(null);
      processingRef.current = false;
      
      // Restart scanner
      setTimeout(() => startScanner(), 500);
    } catch (err) {
      console.error('Error adding product:', err);
      showToast('Error al guardar el producto', 'error');
      processingRef.current = false;
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setScannedCode(null);
    processingRef.current = false;
    setTimeout(() => startScanner(), 300);
  };

  useEffect(() => {
    // Auto-start scanner when component mounts
    const timer = setTimeout(() => startScanner(), 300);
    
    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, []);

  return (
    <div className="scanner-page">
      <div className="scanner-header">
        <h2>Escanear Código</h2>
        <button 
          className="btn btn-ghost btn-icon"
          onClick={() => {
            stopScanner();
            onNavigate('dashboard');
          }}
          id="scanner-close-btn"
          aria-label="Cerrar escáner"
        >
          <X size={24} />
        </button>
      </div>

      <div className="scanner-viewport">
        <div id="qr-reader" ref={scannerRef} style={{ width: '100%', height: '100%' }} />
        
        {scanning && (
          <div className="scanner-overlay">
            <div className="scanner-frame">
              <div className="scanner-frame-corner tl" />
              <div className="scanner-frame-corner tr" />
              <div className="scanner-frame-corner bl" />
              <div className="scanner-frame-corner br" />
              <div className="scanner-laser" />
            </div>
          </div>
        )}
        
        {cameraError && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--spacing-xl)',
            textAlign: 'center',
            background: 'var(--color-bg-secondary)',
          }}>
            <CameraOff size={48} style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-lg)' }}>
              {cameraError}
            </p>
            <button className="btn btn-primary btn-sm" onClick={startScanner}>
              <Camera size={16} />
              Reintentar
            </button>
          </div>
        )}
      </div>

      <div className="scanner-instructions">
        {scanning ? (
          <p>
            <Zap size={14} style={{ verticalAlign: 'middle', color: 'var(--color-accent)' }} />
            {' '}Apunta la cámara al código QR o de barras del producto
          </p>
        ) : !cameraError ? (
          <p className="animate-pulse">Iniciando cámara...</p>
        ) : null}
        
        {!scanning && !cameraError && (
          <button className="btn btn-primary" onClick={startScanner}>
            <Camera size={18} />
            Iniciar cámara
          </button>
        )}
      </div>

      {/* Last scan result indicator */}
      {lastResult && !showForm && (
        <div className="scan-result-toast">
          <div className="scan-result-toast-header">
            <Check size={20} />
            <span>{lastResult.esNuevo ? 'Nuevo Producto' : 'Producto Actualizado'}</span>
          </div>
          <div style={{ fontWeight: 600 }}>{lastResult.nombre}</div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            Cantidad total: {lastResult.cantidad}
          </div>
        </div>
      )}

      {/* New Product Form */}
      {showForm && (
        <>
          <div className="modal-backdrop" onClick={handleCancelForm} />
          <div className="modal-sheet">
            <div className="modal-sheet-handle" />
            <div className="modal-sheet-title">Nuevo Producto</div>
            
            <div style={{ 
              background: 'var(--color-accent-subtle)', 
              padding: 'var(--spacing-md)', 
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--spacing-lg)',
              fontSize: 'var(--font-size-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
            }}>
              <ScanCodeIcon />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-accent-hover)' }}>Código escaneado</div>
                <div style={{ fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{scannedCode}</div>
              </div>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="product-name">Nombre del Producto *</label>
                <input
                  id="product-name"
                  className="form-input"
                  type="text"
                  placeholder="Ej: Coca-Cola 600ml"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="product-category">Categoría</label>
                <select
                  id="product-category"
                  className="form-select"
                  value={formData.categoria}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                >
                  {categorias?.map(cat => (
                    <option key={cat.id} value={cat.nombre}>
                      {cat.icono} {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="product-price">Precio ($)</label>
                  <input
                    id="product-price"
                    className="form-input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.precio}
                    onChange={(e) => setFormData(prev => ({ ...prev, precio: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="product-unit">Unidad</label>
                  <select
                    id="product-unit"
                    className="form-select"
                    value={formData.unidad}
                    onChange={(e) => setFormData(prev => ({ ...prev, unidad: e.target.value }))}
                  >
                    <option value="pieza">Pieza</option>
                    <option value="kg">Kilogramo</option>
                    <option value="litro">Litro</option>
                    <option value="paquete">Paquete</option>
                    <option value="caja">Caja</option>
                    <option value="bolsa">Bolsa</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cantidad</label>
                <div className="qty-controls">
                  <button
                    type="button"
                    className="btn btn-icon"
                    onClick={() => setFormData(prev => ({ ...prev, cantidad: Math.max(1, prev.cantidad - 1) }))}
                    style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    <Minus size={18} />
                  </button>
                  <span className="qty-value">{formData.cantidad}</span>
                  <button
                    type="button"
                    className="btn btn-icon"
                    onClick={() => setFormData(prev => ({ ...prev, cantidad: prev.cantidad + 1 }))}
                    style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="product-description">Notas (opcional)</label>
                <input
                  id="product-description"
                  className="form-input"
                  type="text"
                  placeholder="Detalles adicionales..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={handleCancelForm}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-full" id="save-product-btn">
                  <Check size={18} />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function ScanCodeIcon() {
  return (
    <div style={{
      width: '2.5rem',
      height: '2.5rem',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-accent-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--color-accent)',
      flexShrink: 0,
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="7" y1="8" x2="7" y2="16" />
        <line x1="10" y1="8" x2="10" y2="16" />
        <line x1="13" y1="8" x2="13" y2="16" />
        <line x1="16" y1="8" x2="16" y2="12" />
      </svg>
    </div>
  );
}

export default Scanner;
