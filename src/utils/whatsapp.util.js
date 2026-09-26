/**
 * Utilidad para la generación de enlaces de WhatsApp (wa.me)
 */

export const generarLinkWhatsApp = (telefono, mensaje = '') => {
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

  const mensajeCodificado = encodeURIComponent(mensaje || '');

  return `https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`;
};

export default {
  generarLinkWhatsApp,
};
