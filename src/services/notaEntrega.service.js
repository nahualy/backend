import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Pedido, DetallePedido, Producto, Pago } from '../models/index.js';

/**
 * Genera una Nota de Entrega en formato PDF para un pedido específico.
 * @param {number|string} pedidoId
 * @returns {Promise<string>} Ruta absoluta del archivo PDF generado
 */
export const generarNotaEntregaPDF = async (pedidoId) => {
  const pedido = await Pedido.findByPk(pedidoId, {
    include: [
      {
        model: DetallePedido,
        as: 'detalles',
        include: [
          {
            model: Producto,
            as: 'producto',
          },
        ],
      },
      {
        model: Pago,
        as: 'pagos',
      },
    ],
  });

  if (!pedido) {
    const error = new Error('Pedido no encontrado');
    error.statusCode = 404;
    throw error;
  }

  // Asegurar que exista la carpeta uploads/notas-entrega
  const dirNotas = path.resolve(process.cwd(), 'uploads', 'notas-entrega');
  if (!fs.existsSync(dirNotas)) {
    fs.mkdirSync(dirNotas, { recursive: true });
  }

  const rutaArchivo = path.join(dirNotas, `pedido-${pedidoId}.pdf`);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 45, size: 'A4' });
      const stream = fs.createWriteStream(rutaArchivo);

      doc.pipe(stream);

      // --- ENCABEZADO ---
      doc
        .fillColor('#2c3e50')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('El Chiringuito de Lukas', 45, 45);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#7f8c8d')
        .text('Tienda de Accesorios y Productos para Mascotas', 45, 72);

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#e67e22')
        .text('NOTA DE ENTREGA', 350, 45, { align: 'right' });

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text(`Pedido N°: #${pedido.id}`, 350, 68, { align: 'right' });

      const fechaCreacion = new Date(pedido.createdAt || pedido.created_at || Date.now());
      const fechaFormateada = fechaCreacion.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#7f8c8d')
        .text(`Fecha: ${fechaFormateada}`, 350, 85, { align: 'right' });

      // Línea divisoria
      doc
        .moveTo(45, 105)
        .lineTo(550, 105)
        .strokeColor('#bdc3c7')
        .lineWidth(1)
        .stroke();

      // --- DATOS DEL CLIENTE ---
      doc.moveDown(2);
      let currentY = 120;

      doc
        .roundedRect(45, currentY, 505, 75, 4)
        .fillAndStroke('#f8f9fa', '#e9ecef');

      doc
        .fillColor('#2c3e50')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('DATOS DEL CLIENTE Y ENTREGA', 55, currentY + 8);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#333333');

      doc.text(`Nombre: ${pedido.nombre_cliente}`, 55, currentY + 26);
      doc.text(`Teléfono: ${pedido.telefono_cliente}`, 55, currentY + 41);

      if (pedido.email_cliente) {
        doc.text(`Email: ${pedido.email_cliente}`, 55, currentY + 56);
      }

      doc.text(`Dirección: ${pedido.direccion_entrega}`, 300, currentY + 26, {
        width: 240,
      });

      // --- TABLA DE PRODUCTOS ---
      currentY = 215;

      // Encabezado de la tabla
      doc
        .rect(45, currentY, 505, 22)
        .fill('#34495e');

      doc
        .fillColor('#ffffff')
        .fontSize(9)
        .font('Helvetica-Bold');

      doc.text('PRODUCTO / DETALLE', 55, currentY + 6, { width: 250 });
      doc.text('CANT.', 315, currentY + 6, { width: 45, align: 'center' });
      doc.text('PRECIO UNIT.', 370, currentY + 6, { width: 80, align: 'right' });
      doc.text('SUBTOTAL', 460, currentY + 6, { width: 80, align: 'right' });

      currentY += 24;

      // Filas de productos
      const detalles = pedido.detalles || [];
      doc.font('Helvetica').fontSize(9);

      detalles.forEach((detalle, index) => {
        const filaBg = index % 2 === 0 ? '#ffffff' : '#fcfcfc';
        
        let desc = detalle.producto?.nombre || 'Producto';
        if (detalle.variante_snapshot) {
          const vs = typeof detalle.variante_snapshot === 'string'
            ? JSON.parse(detalle.variante_snapshot)
            : detalle.variante_snapshot;
          const partes = [];
          if (vs.talla) partes.push(`Talla: ${vs.talla}`);
          if (vs.color) partes.push(`Color: ${vs.color}`);
          if (vs.sku) partes.push(`SKU: ${vs.sku}`);
          if (partes.length > 0) {
            desc += ` (${partes.join(', ')})`;
          }
        }

        const cant = Number(detalle.cantidad);
        const precioUnit = Number(detalle.precio_unitario);
        const subtotal = cant * precioUnit;

        const altoFila = 24;

        doc.rect(45, currentY, 505, altoFila).fill(filaBg);

        doc
          .fillColor('#2c3e50')
          .text(desc, 55, currentY + 6, { width: 250, ellipsis: true });

        doc
          .fillColor('#333333')
          .text(cant.toString(), 315, currentY + 6, { width: 45, align: 'center' });

        doc
          .text(`$${precioUnit.toFixed(2)}`, 370, currentY + 6, { width: 80, align: 'right' });

        doc
          .font('Helvetica-Bold')
          .text(`$${subtotal.toFixed(2)}`, 460, currentY + 6, { width: 80, align: 'right' })
          .font('Helvetica');

        // Borde inferior sutil
        doc
          .moveTo(45, currentY + altoFila)
          .lineTo(550, currentY + altoFila)
          .strokeColor('#ecf0f1')
          .lineWidth(0.5)
          .stroke();

        currentY += altoFila;
      });

      // --- TOTAL ---
      currentY += 10;
      doc
        .moveTo(350, currentY)
        .lineTo(550, currentY)
        .strokeColor('#2c3e50')
        .lineWidth(1)
        .stroke();

      currentY += 8;
      const totalNum = Number(pedido.total || 0);

      doc
        .fillColor('#2c3e50')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('TOTAL:', 350, currentY, { width: 100, align: 'right' });

      doc
        .fillColor('#27ae60')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(`$${totalNum.toFixed(2)}`, 460, currentY - 1, { width: 80, align: 'right' });

      // --- INFORMACIÓN DE PAGO ---
      currentY += 35;
      const pagoAprobado = (pedido.pagos || []).find((p) => p.estado === 'aprobado');

      doc
        .roundedRect(45, currentY, 505, 45, 4)
        .fillAndStroke('#f8f9fa', '#e9ecef');

      doc
        .fillColor('#2c3e50')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('INFORMACIÓN DE PAGO', 55, currentY + 8);

      if (pagoAprobado) {
        const metodoTexto = pagoAprobado.metodo.replace('_', ' ').toUpperCase();
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#27ae60')
          .text(`✓ Pago Aprobado vía ${metodoTexto} - Monto: $${Number(pagoAprobado.monto).toFixed(2)}`, 55, currentY + 24);
      } else {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#d35400')
          .text('⏳ Pago pendiente de verificación', 55, currentY + 24);
      }

      // --- PIE DE PÁGINA ---
      currentY = 700;

      doc
        .moveTo(45, currentY)
        .lineTo(550, currentY)
        .strokeColor('#bdc3c7')
        .lineWidth(0.5)
        .stroke();

      doc
        .fillColor('#7f8c8d')
        .fontSize(9)
        .font('Helvetica')
        .text(`Estado actual del pedido: ${pedido.estado.toUpperCase()}`, 45, currentY + 12);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#e67e22')
        .text('¡Gracias por tu compra! 🐾', 45, currentY + 28, { align: 'center' });

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#95a5a6')
        .text('El Chiringuito de Lukas - Sistema de Gestión', 45, currentY + 45, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve(rutaArchivo);
      });

      stream.on('error', (err) => {
        reject(err);
      });

      doc.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

export default {
  generarNotaEntregaPDF,
};
