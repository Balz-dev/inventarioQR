import Dexie from 'dexie';

export const db = new Dexie('InventarioQR');

db.version(2).stores({
  productos: '++id, nombre, categoria, &codigo, ultimaActualizacion',
  escaneos: '++id, productoId, fecha, tipo',
  categorias: '++id, &nombre',
});

db.version(3).stores({
  productos: '++id, nombre, categoria, &codigo, ultimaActualizacion, caducidad',
  escaneos: '++id, productoId, fecha, tipo',
  categorias: '++id, &nombre',
});

// Seed default categories
db.on('populate', () => {
  db.categorias.bulkAdd([
    { nombre: 'Bebidas', icono: '🥤', color: '#3b82f6' },
    { nombre: 'Lácteos', icono: '🥛', color: '#8b5cf6' },
    { nombre: 'Panadería', icono: '🍞', color: '#f59e0b' },
    { nombre: 'Carnes', icono: '🥩', color: '#ef4444' },
    { nombre: 'Frutas y Verduras', icono: '🥬', color: '#22c55e' },
    { nombre: 'Snacks', icono: '🍿', color: '#f97316' },
    { nombre: 'Limpieza', icono: '🧹', color: '#06b6d4' },
    { nombre: 'Higiene Personal', icono: '🧴', color: '#ec4899' },
    { nombre: 'Abarrotes', icono: '🛒', color: '#64748b' },
    { nombre: 'Enlatados', icono: '🥫', color: '#dc2626' },
    { nombre: 'Cereales', icono: '🌾', color: '#eab308' },
    { nombre: 'Condimentos', icono: '🌶️', color: '#b91c1c' },
    { nombre: 'Congelados', icono: '🧊', color: '#0ea5e9' },
    { nombre: 'Otros', icono: '📦', color: '#94a3b8' },
  ]);
});

// Helper functions
export async function agregarProducto(producto) {
  const existente = await db.productos.where('codigo').equals(producto.codigo).first();
  
  if (existente) {
    // Update quantity
    await db.productos.update(existente.id, {
      cantidad: (existente.cantidad || 0) + (producto.cantidad || 1),
      ultimaActualizacion: new Date().toISOString(),
    });
    
    await db.escaneos.add({
      productoId: existente.id,
      fecha: new Date().toISOString(),
      tipo: 'actualizacion',
      cantidadAgregada: producto.cantidad || 1,
    });
    
    return { ...existente, cantidad: (existente.cantidad || 0) + (producto.cantidad || 1), esNuevo: false };
  }
  
  const nuevoProducto = {
    ...producto,
    cantidad: producto.cantidad || 1,
    fechaCreacion: new Date().toISOString(),
    ultimaActualizacion: new Date().toISOString(),
  };
  
  const id = await db.productos.add(nuevoProducto);
  
  await db.escaneos.add({
    productoId: id,
    fecha: new Date().toISOString(),
    tipo: 'creacion',
    cantidadAgregada: producto.cantidad || 1,
  });
  
  return { ...nuevoProducto, id, esNuevo: true };
}

export async function actualizarProducto(id, cambios) {
  await db.productos.update(id, {
    ...cambios,
    ultimaActualizacion: new Date().toISOString(),
  });
}

export async function eliminarProducto(id) {
  await db.productos.delete(id);
  await db.escaneos.where('productoId').equals(id).delete();
}

export async function obtenerEstadisticas() {
  const totalProductos = await db.productos.count();
  const totalUnidades = await db.productos.toArray().then(prods => 
    prods.reduce((sum, p) => sum + (p.cantidad || 0), 0)
  );
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const escaneos24h = await db.escaneos.toArray().then(arr =>
    arr.filter(e => e.fecha > cutoff).length
  );
  const categorias = await db.productos.toArray().then(prods => {
    const map = {};
    prods.forEach(p => {
      const cat = p.categoria || 'Sin categoría';
      map[cat] = (map[cat] || 0) + (p.cantidad || 0);
    });
    return map;
  });
  
  return { totalProductos, totalUnidades, escaneos24h, categorias };
}

export async function exportarInventario() {
  const productos = await db.productos.toArray();
  return productos;
}

export async function buscarProductos(termino) {
  if (!termino) return db.productos.toArray();
  const lower = termino.toLowerCase();
  return db.productos.filter(p => 
    p.nombre?.toLowerCase().includes(lower) || 
    p.codigo?.toLowerCase().includes(lower) ||
    p.categoria?.toLowerCase().includes(lower)
  ).toArray();
}
