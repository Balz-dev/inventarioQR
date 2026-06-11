import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, actualizarProducto, eliminarProducto, buscarProductos } from '../db/database';
import { 
  Search, Plus, Minus, Trash2, Edit3, 
  X, Check, Package, Filter,
  ChevronRight, DollarSign
} from 'lucide-react';

function Inventario({ showToast }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [sortBy, setSortBy] = useState('nombre'); // nombre, cantidad, fecha

  const allProducts = useLiveQuery(
    () => db.productos.toArray(),
    []
  );

  const categorias = useLiveQuery(() => db.categorias.toArray(), []);

  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];
    
    let filtered = allProducts;
    
    // Search filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.nombre?.toLowerCase().includes(lower) ||
        p.codigo?.toLowerCase().includes(lower) ||
        p.categoria?.toLowerCase().includes(lower)
      );
    }
    
    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(p => p.categoria === selectedCategory);
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'cantidad':
          return (b.cantidad || 0) - (a.cantidad || 0);
        case 'fecha':
          return new Date(b.ultimaActualizacion || 0) - new Date(a.ultimaActualizacion || 0);
        case 'nombre':
        default:
          return (a.nombre || '').localeCompare(b.nombre || '');
      }
    });
    
    return filtered;
  }, [allProducts, searchTerm, selectedCategory, sortBy]);

  const handleUpdateQty = async (product, delta) => {
    const newQty = Math.max(0, (product.cantidad || 0) + delta);
    await actualizarProducto(product.id, { cantidad: newQty });
    
    if (delta > 0) {
      // Log scan
      await db.escaneos.add({
        productoId: product.id,
        fecha: new Date().toISOString(),
        tipo: 'actualizacion',
        cantidadAgregada: delta,
      });
    }
  };

  const handleDelete = async (product) => {
    try {
      await eliminarProducto(product.id);
      showToast(`${product.nombre} eliminado`, 'info');
      setConfirmDelete(null);
    } catch (err) {
      showToast('Error al eliminar', 'error');
    }
  };

  const getCategoryEmoji = (catName) => {
    const cat = categorias?.find(c => c.nombre === catName);
    return cat?.icono || '📦';
  };

  const getCategoryColor = (catName) => {
    const cat = categorias?.find(c => c.nombre === catName);
    return cat?.color || '#94a3b8';
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    if (!allProducts) return {};
    const counts = {};
    allProducts.forEach(p => {
      const cat = p.categoria || 'Sin categoría';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [allProducts]);

  return (
    <div>
      <header className="page-header">
        <h1>Inventario</h1>
        <p>{allProducts?.length || 0} productos registrados</p>
      </header>

      {/* Search */}
      <div className="search-container">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, código o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="search-input"
          />
          {searchTerm && (
            <button 
              className="btn btn-ghost btn-icon"
              onClick={() => setSearchTerm('')}
              style={{ width: '1.5rem', height: '1.5rem' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="category-filter">
        <button
          className={`category-chip ${!selectedCategory ? 'active' : ''}`}
          onClick={() => setSelectedCategory(null)}
        >
          Todos ({allProducts?.length || 0})
        </button>
        {categorias?.filter(c => categoryCounts[c.nombre]).map(cat => (
          <button
            key={cat.id}
            className={`category-chip ${selectedCategory === cat.nombre ? 'active' : ''}`}
            onClick={() => setSelectedCategory(selectedCategory === cat.nombre ? null : cat.nombre)}
          >
            {cat.icono} {cat.nombre} ({categoryCounts[cat.nombre] || 0})
          </button>
        ))}
      </div>

      {/* Sort options */}
      <div style={{ 
        display: 'flex', 
        gap: 'var(--spacing-sm)', 
        padding: '0 var(--spacing-lg)',
        marginBottom: 'var(--spacing-md)',
      }}>
        <button
          className={`btn btn-sm ${sortBy === 'nombre' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSortBy('nombre')}
          style={{ fontSize: 'var(--font-size-xs)' }}
        >
          A-Z
        </button>
        <button
          className={`btn btn-sm ${sortBy === 'cantidad' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSortBy('cantidad')}
          style={{ fontSize: 'var(--font-size-xs)' }}
        >
          Cantidad
        </button>
        <button
          className={`btn btn-sm ${sortBy === 'fecha' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSortBy('fecha')}
          style={{ fontSize: 'var(--font-size-xs)' }}
        >
          Recientes
        </button>
      </div>

      {/* Product List */}
      {filteredProducts.length > 0 ? (
        <div className="product-list">
          {filteredProducts.map(product => (
            <div key={product.id} className="product-item" onClick={() => setEditingProduct(product)}>
              <div className="product-item-emoji">
                {getCategoryEmoji(product.categoria)}
              </div>
              <div className="product-item-info">
                <div className="product-item-name">{product.nombre}</div>
                <div className="product-item-code">{product.codigo}</div>
                <div className="product-item-meta">
                  <span className="product-item-badge" style={{
                    background: `${getCategoryColor(product.categoria)}20`,
                    color: getCategoryColor(product.categoria),
                  }}>
                    {product.categoria || 'Sin categoría'}
                  </span>
                  {product.precio && (
                    <span style={{ 
                      fontSize: 'var(--font-size-xs)', 
                      color: 'var(--color-success)',
                      fontWeight: 600,
                    }}>
                      ${product.precio.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <div className="product-item-qty">
                <span className="product-item-qty-value">{product.cantidad || 0}</span>
                <span className="product-item-qty-label">{product.unidad || 'uds'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            {searchTerm ? '🔍' : '📦'}
          </div>
          <div className="empty-state-title">
            {searchTerm ? 'Sin resultados' : 'Inventario vacío'}
          </div>
          <div className="empty-state-description">
            {searchTerm 
              ? `No se encontraron productos para "${searchTerm}"`
              : 'Escanea productos para agregarlos a tu inventario'
            }
          </div>
        </div>
      )}

      {/* Product Edit Modal */}
      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          categorias={categorias}
          onClose={() => setEditingProduct(null)}
          onSave={async (updates) => {
            await actualizarProducto(editingProduct.id, updates);
            showToast(`${editingProduct.nombre} actualizado`, 'success');
            setEditingProduct(null);
          }}
          onDelete={() => {
            setConfirmDelete(editingProduct);
            setEditingProduct(null);
          }}
          onUpdateQty={handleUpdateQty}
        />
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <>
          <div className="modal-backdrop" onClick={() => setConfirmDelete(null)} />
          <div className="confirm-dialog">
            <h3>¿Eliminar producto?</h3>
            <p>Se eliminará <strong>{confirmDelete.nombre}</strong> del inventario. Esta acción no se puede deshacer.</p>
            <div className="confirm-dialog-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>
                <Trash2 size={16} />
                Eliminar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProductEditModal({ product, categorias, onClose, onSave, onDelete, onUpdateQty }) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    nombre: product.nombre || '',
    categoria: product.categoria || 'Abarrotes',
    precio: product.precio || '',
    descripcion: product.descripcion || '',
    unidad: product.unidad || 'pieza',
  });

  const getCategoryEmoji = (catName) => {
    const cat = categorias?.find(c => c.nombre === catName);
    return cat?.icono || '📦';
  };

  const handleSave = () => {
    onSave({
      nombre: form.nombre,
      categoria: form.categoria,
      precio: form.precio ? parseFloat(form.precio) : null,
      descripcion: form.descripcion,
      unidad: form.unidad,
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet">
        <div className="modal-sheet-handle" />
        
        {!editMode ? (
          /* View Mode */
          <>
            <div className="product-detail-header">
              <div className="product-detail-emoji">
                {getCategoryEmoji(product.categoria)}
              </div>
              <div className="product-detail-info">
                <h3>{product.nombre}</h3>
                <p>{product.codigo}</p>
              </div>
            </div>

            {/* Quantity controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-lg)',
              padding: 'var(--spacing-lg)',
              background: 'var(--color-bg-input)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--spacing-lg)',
            }}>
              <button
                className="btn btn-icon btn-secondary"
                onClick={() => onUpdateQty(product, -1)}
                style={{ width: '3rem', height: '3rem', fontSize: '1.5rem' }}
              >
                <Minus size={20} />
              </button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-accent-hover)' }}>
                  {product.cantidad || 0}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  {product.unidad || 'unidades'}
                </div>
              </div>
              <button
                className="btn btn-icon btn-primary"
                onClick={() => onUpdateQty(product, 1)}
                style={{ width: '3rem', height: '3rem', fontSize: '1.5rem' }}
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Details */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <DetailRow label="Categoría" value={`${getCategoryEmoji(product.categoria)} ${product.categoria || 'Sin categoría'}`} />
              {product.precio && <DetailRow label="Precio" value={`$${product.precio.toFixed(2)}`} />}
              {product.descripcion && <DetailRow label="Notas" value={product.descripcion} />}
              <DetailRow label="Creado" value={formatDate(product.fechaCreacion)} />
              <DetailRow label="Actualizado" value={formatDate(product.ultimaActualizacion)} />
            </div>

            <div className="product-detail-actions">
              <button className="btn btn-secondary btn-full" onClick={() => setEditMode(true)}>
                <Edit3 size={16} />
                Editar
              </button>
              <button className="btn btn-danger btn-full" onClick={onDelete}>
                <Trash2 size={16} />
                Eliminar
              </button>
            </div>
          </>
        ) : (
          /* Edit Mode */
          <>
            <div className="modal-sheet-title">Editar Producto</div>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-name">Nombre</label>
                <input
                  id="edit-name"
                  className="form-input"
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-category">Categoría</label>
                <select
                  id="edit-category"
                  className="form-select"
                  value={form.categoria}
                  onChange={(e) => setForm(prev => ({ ...prev, categoria: e.target.value }))}
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
                  <label className="form-label" htmlFor="edit-price">Precio ($)</label>
                  <input
                    id="edit-price"
                    className="form-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.precio}
                    onChange={(e) => setForm(prev => ({ ...prev, precio: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-unit">Unidad</label>
                  <select
                    id="edit-unit"
                    className="form-select"
                    value={form.unidad}
                    onChange={(e) => setForm(prev => ({ ...prev, unidad: e.target.value }))}
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
                <label className="form-label" htmlFor="edit-notes">Notas</label>
                <input
                  id="edit-notes"
                  className="form-input"
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setEditMode(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-full">
                  <Check size={16} />
                  Guardar
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 'var(--spacing-sm) 0',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default Inventario;
