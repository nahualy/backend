import jwt from 'jsonwebtoken';

export const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    return res.status(401).json({
      error: true,
      mensaje: 'Token no proporcionado',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: true,
      mensaje: 'Token no proporcionado',
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: true,
      mensaje: 'Token inválido o expirado',
    });
  }
};

export const verificarRol = (...rolesPermitidos) => (req, res, next) => {
  if (!req.usuario || !req.usuario.rol) {
    return res.status(401).json({
      error: true,
      mensaje: 'Token no proporcionado o usuario no autenticado',
    });
  }

  if (!rolesPermitidos.includes(req.usuario.rol)) {
    return res.status(403).json({
      error: true,
      mensaje: 'No tienes permisos para esta acción',
    });
  }

  next();
};

export default {
  verificarToken,
  verificarRol,
};
