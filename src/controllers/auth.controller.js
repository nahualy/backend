import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models/index.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: true,
        mensaje: 'Email y contraseña son obligatorios',
      });
    }

    const usuario = await Usuario.findOne({ where: { email } });

    if (!usuario) {
      return res.status(401).json({
        error: true,
        mensaje: 'Credenciales inválidas',
      });
    }

    if (!usuario.activo) {
      return res.status(401).json({
        error: true,
        mensaje: 'Usuario inactivo. Contacta al administrador',
      });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      return res.status(401).json({
        error: true,
        mensaje: 'Credenciales inválidas',
      });
    }

    const payload = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '2h',
    });

    return res.status(200).json({
      error: false,
      token,
      usuario: {
        id: usuario.id,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol,
        debe_cambiar_password: usuario.debe_cambiar_password,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  login,
};
