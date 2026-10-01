import express from 'express';
import * as adminProductoController from '../controllers/admin.producto.controller.js';
import * as adminPedidoController from '../controllers/admin.pedido.controller.js';
import { verificarToken, verificarRol } from '../middlewares/auth.middleware.js';
import { uploadProducto } from '../middlewares/upload.middleware.js';

const router = express.Router();

router.use(verificarToken);
router.use(verificarRol('admin', 'personal'));

router.get('/productos/alertas-stock', adminProductoController.getAlertasStock);
router.get('/productos', adminProductoController.getProductosAdmin);
router.post('/productos', uploadProducto.single('foto'), adminProductoController.crearProducto);
router.put('/productos/:id', uploadProducto.single('foto'), adminProductoController.actualizarProducto);
router.delete('/productos/:id', adminProductoController.eliminarProducto);

router.post('/productos/:id/variantes', adminProductoController.crearVariante);
router.put('/productos/:id/variantes/:sku', adminProductoController.actualizarVariante);
router.delete('/productos/:id/variantes/:sku', adminProductoController.eliminarVariante);

router.get('/pedidos', adminPedidoController.getPedidosAdmin);
router.get('/pedidos/:id', adminPedidoController.getPedidoByIdAdmin);
router.put('/pedidos/:id/cancelar', adminPedidoController.cancelarPedido);
router.put('/pedidos/:id/estado', adminPedidoController.actualizarEstadoPedido);

router.get('/pagos/pendientes', adminPedidoController.getPagosPendientes);
router.put('/pagos/:id/aprobar', adminPedidoController.aprobarPago);
router.put('/pagos/:id/rechazar', adminPedidoController.rechazarPago);

export default router;
