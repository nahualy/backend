import multer from 'multer';

export const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: true,
        mensaje: 'El archivo excede el tamaño máximo permitido de 5MB',
      });
    }

    return res.status(400).json({
      error: true,
      mensaje: `Error al subir el archivo: ${err.message}`,
    });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: true,
      mensaje: err.message,
    });
  }

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const mensajes = err.errors.map((e) => e.message);
    return res.status(400).json({
      error: true,
      mensaje: mensajes.join(', '),
    });
  }

  console.error('💥 [Error no controlado]:', err);

  const statusCode = err.status || 500;
  return res.status(statusCode).json({
    error: true,
    mensaje:
      process.env.NODE_ENV === 'production'
        ? 'Ha ocurrido un error interno en el servidor'
        : err.message || 'Error interno del servidor',
  });
};

export default errorHandler;
