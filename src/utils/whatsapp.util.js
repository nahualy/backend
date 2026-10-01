/**
 * Utilidad para la normalización y generación de enlaces de WhatsApp (wa.me)
 */

export const normalizarTelefono = (telefono) => {
  if (!telefono || typeof telefono !== 'string') {
    return null;
  }

  let numeroLimpio = telefono.replace(/\D/g, '');

  if (!numeroLimpio) {
    return null;
  }

  if (numeroLimpio.startsWith('0')) {
    numeroLimpio = `58${numeroLimpio.slice(1)}`;
  }

  return numeroLimpio;
};

export const generarLinkWhatsApp = (telefono, mensaje = '') => {
  const numeroLimpio = normalizarTelefono(telefono);

  if (!numeroLimpio) {
    return null;
  }

  const mensajeCodificado = encodeURIComponent(mensaje || '');

  return `https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`;
};

export default {
  normalizarTelefono,
  generarLinkWhatsApp,
};
