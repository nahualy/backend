import express from 'express';
import * as adminProductoController from '../controllers/admin.producto.controller.js';
import * as adminPedidoController from '../controllers/admin.pedido.controller.js';
import * as adminUsuarioController from '../controllers/admin.usuario.controller.js';
import * as perfilController from '../controllers/perfil.controller.js';
import * as estadisticasController from '../controllers/estadisticas.controller.js';
import { verificarToken, verificarRol } from '../middlewares/auth.middleware.js';
import { uploadProducto } from '../middlewares/upload.middleware.js';

const router = express.Router();

// 1. Todas las rutas de administración requieren autenticación con token válido
router.use(verificarToken);

// 2. Rutas de Perfil Propio (accesibles por CUALQUIER usuario autenticado: admin o personal)
router.get('/perfil', perfilController.verPerfil);
router.put('/perfil/password', perfilController.cambiarPassword);

// 3. Rutas de Gestión de Usuarios (EXCLUSIVAS para rol 'admin')
router.post('/usuarios', verificarRol('admin'), adminUsuarioController.crearUsuarioPersonal);
router.get('/usuarios', verificarRol('admin'), adminUsuarioController.listarUsuarios);
router.put('/usuarios/:id', verificarRol('admin'), adminUsuarioController.actualizarUsuarioPersonal);
router.delete('/usuarios/:id', verificarRol('admin'), adminUsuarioController.desactivarUsuario);
router.put('/usuarios/:id/reactivar', verificarRol('admin'), adminUsuarioController.reactivarUsuario);

// 4. Resto de rutas de administración (productos, pedidos, pagos, estadísticas) - accesibles por 'admin' y 'personal'
router.use(verificarRol('admin', 'personal'));

// Productos
router.get('/productos/alertas-stock', adminProductoController.getAlertasStock);
router.get('/productos', adminProductoController.getProductosAdmin);
router.post('/productos', uploadProducto.single('foto'), adminProductoController.crearProducto);
router.put('/productos/:id', uploadProducto.single('foto'), adminProductoController.actualizarProducto);
router.delete('/productos/:id', adminProductoController.eliminarProducto);

// Variantes de productos
router.post('/productos/:id/variantes', adminProductoController.crearVariante);
router.put('/productos/:id/variantes/:sku', adminProductoController.actualizarVariante);
router.delete('/productos/:id/variantes/:sku', adminProductoController.eliminarVariante);

// Pedidos
router.get('/pedidos', adminPedidoController.getPedidosAdmin);
router.get('/pedidos/:id', adminPedidoController.getPedidoByIdAdmin);
router.get('/pedidos/:id/nota-entrega', adminPedidoController.descargarNotaEntrega);
router.put('/pedidos/:id/cancelar', adminPedidoController.cancelarPedido);
router.put('/pedidos/:id/estado', adminPedidoController.actualizarEstadoPedido);

// Pagos
router.get('/pagos/pendientes', adminPedidoController.getPagosPendientes);
router.put('/pagos/:id/aprobar', adminPedidoController.aprobarPago);
router.put('/pagos/:id/rechazar', adminPedidoController.rechazarPago);

// Estadísticas de ventas
router.get('/estadisticas/ingresos', estadisticasController.getIngresos);
router.get('/estadisticas/productos-mas-vendidos', estadisticasController.getProductosMasVendidos);
router.get('/estadisticas/pedidos-por-estado', estadisticasController.getPedidosPorEstado);

export default router;
