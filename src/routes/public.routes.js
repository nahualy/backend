import express from 'express';
import * as publicController from '../controllers/public.controller.js';
import * as pedidoController from '../controllers/pedido.controller.js';
import { uploadComprobante } from '../middlewares/upload.middleware.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    mensaje: 'API de El Chiringuito de Lukas 🐾',
    rutas: ['/api/categorias', '/api/productos', '/api/pedidos', '/api/health']
  });
});

router.get('/categorias', publicController.getCategorias);
router.get('/productos', publicController.getProductos);
router.get('/productos/:id', publicController.getProductoById);
router.post('/pedidos', uploadComprobante.single('comprobante'), pedidoController.crearPedido);
router.post('/pedidos/:id/pagos', uploadComprobante.single('comprobante'), pedidoController.agregarPago);
router.get('/pedidos/:id', pedidoController.getPedidoPublico);

export default router;
