import { describe, it, expect, beforeEach } from 'vitest';
import { db, agregarProducto, actualizarProducto, eliminarProducto, buscarProductos } from './database';

describe('Funciones de Base de Datos (Dexie)', () => {
  beforeEach(async () => {
    // Limpiar las tablas antes de cada test para asegurar aislamiento
    await db.productos.clear();
    await db.escaneos.clear();
    await db.categorias.clear();
  });

  it('debe agregar un producto nuevo correctamente', async () => {
    const productoMock = {
      codigo: '12345',
      nombre: 'Refresco Cola',
      categoria: 'Bebidas',
      cantidad: 2,
    };

    const result = await agregarProducto(productoMock);
    
    expect(result.id).toBeDefined();
    expect(result.nombre).toBe('Refresco Cola');
    expect(result.cantidad).toBe(2);
    expect(result.esNuevo).toBe(true);

    const guardado = await db.productos.get(result.id);
    expect(guardado).toBeDefined();
    expect(guardado.codigo).toBe('12345');
  });

  it('debe incrementar la cantidad si el producto ya existe', async () => {
    const productoMock = {
      codigo: '67890',
      nombre: 'Galletas',
      categoria: 'Snacks',
      cantidad: 1,
    };

    // Agregar primera vez
    await agregarProducto(productoMock);
    
    // Agregar segunda vez (mismo código)
    const result2 = await agregarProducto(productoMock);

    expect(result2.esNuevo).toBe(false);
    expect(result2.cantidad).toBe(2); // 1 + 1

    const todos = await db.productos.toArray();
    expect(todos.length).toBe(1); // No debe duplicarse
  });

  it('debe actualizar los campos de un producto', async () => {
    const nuevo = await agregarProducto({
      codigo: '111',
      nombre: 'Pan',
      cantidad: 1,
    });

    await actualizarProducto(nuevo.id, {
      nombre: 'Pan Integral',
      cantidad: 5,
      caducidad: '2027-01-01',
    });

    const actualizado = await db.productos.get(nuevo.id);
    expect(actualizado.nombre).toBe('Pan Integral');
    expect(actualizado.cantidad).toBe(5);
    expect(actualizado.caducidad).toBe('2027-01-01');
  });

  it('debe eliminar un producto y sus escaneos asociados', async () => {
    const nuevo = await agregarProducto({
      codigo: '222',
      nombre: 'Leche',
      cantidad: 1,
    });

    // Validar que se creó un registro de escaneo
    const escaneosIniciales = await db.escaneos.where('productoId').equals(nuevo.id).toArray();
    expect(escaneosIniciales.length).toBe(1);

    await eliminarProducto(nuevo.id);

    const productoEliminado = await db.productos.get(nuevo.id);
    expect(productoEliminado).toBeUndefined();

    // Validar que se eliminaron los escaneos en cascada
    const escaneosFinales = await db.escaneos.where('productoId').equals(nuevo.id).toArray();
    expect(escaneosFinales.length).toBe(0);
  });

  it('debe buscar productos por término', async () => {
    await agregarProducto({ codigo: '111', nombre: 'Manzana Roja', categoria: 'Frutas' });
    await agregarProducto({ codigo: '222', nombre: 'Jugo de Manzana', categoria: 'Bebidas' });
    await agregarProducto({ codigo: '333', nombre: 'Plátano', categoria: 'Frutas' });

    const resultados = await buscarProductos('manzana');
    expect(resultados.length).toBe(2);

    const resultadosCategoria = await buscarProductos('bebidas');
    expect(resultadosCategoria.length).toBe(1);
    expect(resultadosCategoria[0].nombre).toBe('Jugo de Manzana');
  });
});
