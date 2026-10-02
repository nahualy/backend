import fs from 'fs';
import path from 'path';

const collection = {
  info: {
    _postman_id: 'a8b79210-9f15-4fa8-b21a-e90fc6a40df1',
    name: 'El Chiringuito de Lukas API',
    description: 'Colección completa de endpoints para la API de El Chiringuito de Lukas (E-commerce para mascotas). Incluye flujos públicos de catálogo y compra, administración de productos e inventario, procesamiento de pedidos y pagos, notas de entrega en PDF, gestión de usuarios con control de roles (admin y personal) y panel de analíticas y estadísticas de ventas.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: [
    {
      name: 'Auth',
      description: 'Endpoints de autenticación y control de acceso.',
      item: [
        {
          name: 'Login (Iniciar Sesión)',
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Login exitoso", function () {',
                  '    pm.response.to.have.status(200);',
                  '});',
                  '',
                  'const jsonData = pm.response.json();',
                  'if (jsonData.token) {',
                  '    pm.environment.set("token", jsonData.token);',
                  '}'
                ],
                type: 'text/javascript'
              }
            }
          ],
          request: {
            method: 'POST',
            header: [
              {
                key: 'Content-Type',
                value: 'application/json'
              }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                email: 'admin@chiringuitodelukas.com',
                password: 'CAMBIAR_ESTA_CLAVE'
              }, null, 2)
            },
            url: {
              raw: '{{base_url}}/api/auth/login',
              host: ['{{base_url}}'],
              path: ['api', 'auth', 'login']
            },
            description: 'Autentica a un usuario (administrador o personal). Sujeto a limitador estricto de seguridad (máximo 5 intentos por IP cada 15 min). La pestaña Tests guarda de forma automática el token JWT retornado en la variable de entorno {{token}}. Devuelve datos del usuario incluyendo la bandera debe_cambiar_password.'
          },
          response: []
        }
      ]
    },
    {
      name: 'Público',
      description: 'Endpoints públicos accesibles sin credenciales de autenticación.',
      item: [
        {
          name: 'Listar Categorías',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/categorias',
              host: ['{{base_url}}'],
              path: ['api', 'categorias']
            },
            description: 'Obtiene el listado de categorías activas junto con la cantidad de productos asociados a cada una.'
          },
          response: []
        },
        {
          name: 'Listar Productos',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/productos?categoria_id=1&nombre=camisa&pagina=1&limite=12',
              host: ['{{base_url}}'],
              path: ['api', 'productos'],
              query: [
                { key: 'categoria_id', value: '1', description: 'ID de la categoría para filtrar (opcional)' },
                { key: 'nombre', value: 'camisa', description: 'Término de búsqueda por nombre (opcional)' },
                { key: 'pagina', value: '1', description: 'Número de página para paginación (opcional)' },
                { key: 'limite', value: '12', description: 'Cantidad de elementos por página (opcional)' }
              ]
            },
            description: 'Obtiene el catálogo público de productos activos y con stock disponible. Soporta filtros por categoría, búsqueda por nombre y paginación.'
          },
          response: []
        },
        {
          name: 'Obtener Producto por ID',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/productos/:id',
              host: ['{{base_url}}'],
              path: ['api', 'productos', ':id'],
              variable: [
                { key: 'id', value: '{{producto_id_prueba}}', description: 'ID numérico del producto' }
              ]
            },
            description: 'Consulta los detalles de un producto público específico, incluyendo su categoría y lista de variantes activas con stock.'
          },
          response: []
        },
        {
          name: 'Crear Pedido con Comprobante',
          request: {
            method: 'POST',
            header: [],
            body: {
              mode: 'formdata',
              formdata: [
                { key: 'nombre_cliente', value: 'María Pérez', type: 'text' },
                { key: 'telefono_cliente', value: '+584121234567', type: 'text' },
                { key: 'email_cliente', value: 'maria.perez@example.com', type: 'text' },
                { key: 'direccion_entrega', value: 'Av. Francisco de Miranda, Edif. Centro, Apto 4B, Caracas', type: 'text' },
                { key: 'notas', value: 'Por favor entregar en horario de la tarde', type: 'text' },
                { key: 'metodo', value: 'pago_movil', type: 'text' },
                { key: 'monto', value: '25.00', type: 'text' },
                { key: 'items', value: '[{"producto_id": 1, "cantidad": 2}]', type: 'text' },
                { key: 'comprobante', type: 'file', src: [] }
              ]
            },
            url: {
              raw: '{{base_url}}/api/pedidos',
              host: ['{{base_url}}'],
              path: ['api', 'pedidos']
            },
            description: 'Crea un nuevo pedido de compra en estado "pendiente", descuenta el inventario de manera transaccional y registra el primer comprobante de pago para verificación administrativa.'
          },
          response: []
        },
        {
          name: 'Registrar Pago de Pedido',
          request: {
            method: 'POST',
            header: [],
            body: {
              mode: 'formdata',
              formdata: [
                { key: 'metodo', value: 'pago_movil', type: 'text' },
                { key: 'monto', value: '25.00', type: 'text' },
                { key: 'comprobante', type: 'file', src: [] }
              ]
            },
            url: {
              raw: '{{base_url}}/api/pedidos/:id/pagos',
              host: ['{{base_url}}'],
              path: ['api', 'pedidos', ':id', 'pagos'],
              variable: [
                { key: 'id', value: '{{pedido_id_prueba}}', description: 'ID del pedido al cual asociar el comprobante' }
              ]
            },
            description: 'Registra un pago adicional o un nuevo intento de comprobante para un pedido en estado "pendiente" (máximo 3 intentos de pago por pedido).'
          },
          response: []
        },
        {
          name: 'Consultar Estado Público de Pedido',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/pedidos/:id',
              host: ['{{base_url}}'],
              path: ['api', 'pedidos', ':id'],
              variable: [
                { key: 'id', value: '{{pedido_id_prueba}}', description: 'ID del pedido a consultar' }
              ]
            },
            description: 'Permite al cliente consultar el estado actual de su pedido, sus productos y el estado de revisión de sus pagos (pendiente, aprobado, rechazado).'
          },
          response: []
        }
      ]
    },
    {
      name: 'Admin - Productos',
      description: 'Gestión administrativa de catálogo, variantes e inventario. Requiere autenticación con rol admin o personal.',
      auth: {
        type: 'bearer',
        bearer: [
          { key: 'token', value: '{{token}}', type: 'string' }
        ]
      },
      item: [
        {
          name: 'Listar Productos (Admin)',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/admin/productos?categoria_id=1&busqueda=collar&activo=true&pagina=1&limite=20',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'productos'],
              query: [
                { key: 'categoria_id', value: '1', description: 'Filtrar por categoría (opcional)' },
                { key: 'busqueda', value: 'collar', description: 'Búsqueda por nombre o descripción (opcional)' },
                { key: 'activo', value: 'true', description: 'Filtrar por activos ("true") o inactivos ("false")' },
                { key: 'pagina', value: '1', description: 'Página a consultar' },
                { key: 'limite', value: '20', description: 'Cantidad de registros por página' }
              ]
            },
            description: 'Lista todos los productos del inventario (incluyendo inactivos y sin stock) con paginación y filtros. Accesible por rol admin y personal.'
          },
          response: []
        },
        {
          name: 'Crear Producto',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'POST',
            header: [],
            body: {
              mode: 'formdata',
              formdata: [
                { key: 'nombre', value: 'Bandana Tropical Lukas', type: 'text' },
                { key: 'categoria_id', value: '1', type: 'text' },
                { key: 'precio', value: '12.50', type: 'text' },
                { key: 'descripcion_corta', value: 'Bandana de algodón para perros medianos y grandes', type: 'text' },
                { key: 'stock', value: '15', type: 'text' },
                { key: 'activo', value: 'true', type: 'text' },
                { key: 'foto', type: 'file', src: [] }
              ]
            },
            url: {
              raw: '{{base_url}}/api/admin/productos',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'productos']
            },
            description: 'Crea un nuevo producto en el catálogo. Soporta subida de imagen (foto) vía multipart/form-data. Accesible por rol admin y personal.'
          },
          response: []
        },
        {
          name: 'Actualizar Producto',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'PUT',
            header: [],
            body: {
              mode: 'formdata',
              formdata: [
                { key: 'nombre', value: 'Bandana Tropical Lukas Edición Especial', type: 'text' },
                { key: 'precio', value: '14.00', type: 'text' },
                { key: 'stock', value: '20', type: 'text' },
                { key: 'activo', value: 'true', type: 'text' },
                { key: 'foto', type: 'file', src: [] }
              ]
            },
            url: {
              raw: '{{base_url}}/api/admin/productos/:id',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'productos', ':id'],
              variable: [
                { key: 'id', value: '{{producto_id_prueba}}', description: 'ID del producto a actualizar' }
              ]
            },
            description: 'Actualiza campos de un producto existente. NOTA: Si el producto posee variantes activas, el stock general no se puede editar directamente (se gestiona por variante). Accesible por rol admin y personal.'
          },
          response: []
        },
        {
          name: 'Eliminar Producto',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'DELETE',
            header: [],
            url: {
              raw: '{{base_url}}/api/admin/productos/:id',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'productos', ':id'],
              variable: [
                { key: 'id', value: '{{producto_id_prueba}}', description: 'ID del producto a desactivar' }
              ]
            },
            description: 'Desactiva un producto (soft delete, activo: false). Preserva el registro para no corromper el historial de pedidos previos. Accesible por rol admin y personal.'
          },
          response: []
        },
        {
          name: 'Alertas de Stock Bajo',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/admin/productos/alertas-stock',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'productos', 'alertas-stock']
            },
            description: 'Genera reporte de alertas de inventario para productos simples y variantes cuyo stock sea menor o igual a 5 unidades o se encuentre agotado. Accesible por rol admin y personal.'
          },
          response: []
        },
        {
          name: 'Crear Variante de Producto',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'POST',
            header: [
              { key: 'Content-Type', value: 'application/json' }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                sku: 'BAN-TROP-M',
                talla: 'M',
                color: 'Verde Tropical',
                stock: 10,
                precio_override: 13.00
              }, null, 2)
            },
            url: {
              raw: '{{base_url}}/api/admin/productos/:id/variantes',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'productos', ':id', 'variantes'],
              variable: [
                { key: 'id', value: '{{producto_id_prueba}}', description: 'ID del producto padre' }
              ]
            },
            description: 'Añade una variante a un producto. El SKU debe ser único dentro de dicho producto. Al crearse, el stock del producto pasa a administrarse por sus variantes. Accesible por rol admin y personal.'
          },
          response: []
        },
        {
          name: 'Actualizar Variante',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'PUT',
            header: [
              { key: 'Content-Type', value: 'application/json' }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                talla: 'M',
                color: 'Verde Selva',
                stock: 15,
                precio_override: 14.50,
                activo: true
              }, null, 2)
            },
            url: {
              raw: '{{base_url}}/api/admin/productos/:id/variantes/:varianteId',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'productos', ':id', 'variantes', ':varianteId'],
              variable: [
                { key: 'id', value: '{{producto_id_prueba}}', description: 'ID del producto padre' },
                { key: 'varianteId', value: 'BAN-TROP-M', description: 'SKU identificador de la variante' }
              ]
            },
            description: 'Actualiza los atributos, stock, precio diferencial o estado activo de una variante existente. Accesible por rol admin y personal.'
          },
          response: []
        },
        {
          name: 'Eliminar Variante',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'DELETE',
            header: [],
            url: {
              raw: '{{base_url}}/api/admin/productos/:id/variantes/:varianteId',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'productos', ':id', 'variantes', ':varianteId'],
              variable: [
                { key: 'id', value: '{{producto_id_prueba}}', description: 'ID del producto padre' },
                { key: 'varianteId', value: 'BAN-TROP-M', description: 'SKU identificador de la variante' }
              ]
            },
            description: 'Desactiva una variante de producto (activo: false). Accesible por rol admin y personal.'
          },
          response: []
        }
      ]
    },
    {
      name: 'Admin - Pedidos y Pagos',
      description: 'Gestión y verificación de pedidos, comprobantes de pago y generación de notas de entrega en PDF.',
      auth: {
        type: 'bearer',
        bearer: [
          { key: 'token', value: '{{token}}', type: 'string' }
        ]
      },
      item: [
        {
          name: 'Listar Pedidos (Admin)',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/admin/pedidos?estado=confirmado&fecha_desde=2026-10-01&fecha_hasta=2026-10-31&limite=20&pagina=1',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'pedidos'],
              query: [
                { key: 'estado', value: 'confirmado', description: 'Filtrar por estado: pendiente, confirmado, en_proceso, entregado, cancelado' },
                { key: 'fecha_desde', value: '2026-10-01', description: 'Fecha inicial (YYYY-MM-DD)' },
                { key: 'fecha_hasta', value: '2026-10-31', description: 'Fecha final (YYYY-MM-DD)' },
                { key: 'limite', value: '20', description: 'Cantidad de registros' },
                { key: 'pagina', value: '1', description: 'Número de página' }
              ]
            },
            description: 'Listado administrativo de pedidos con paginación y filtros por estado y rango de fechas. Accesible por rol admin y personal.'
          },
          response: []
        },
        {
          name: 'Registrar Pedido Manual (WhatsApp)',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'POST',
            header: [],
            body: {
              mode: 'formdata',
              formdata: [
                { key: 'nombre_cliente', value: 'Cliente WhatsApp', type: 'text' },
                { key: 'telefono_cliente', value: '+584141234567', type: 'text' },
                { key: 'email_cliente', value: 'cliente.wa@example.com', type: 'text' },
                { key: 'direccion_entrega', value: 'Urb. Las Mercedes, Calle París, Edif. Apto 2B', type: 'text' },
                { key: 'notas', value: 'Venta cerrada y pagada vía WhatsApp', type: 'text' },
                { key: 'metodo', value: 'pago_movil', type: 'text' },
                { key: 'monto', value: '30.00', type: 'text' },
                { key: 'items', value: '[{"producto_id": 1, "cantidad": 1}]', type: 'text' },
                { key: 'comprobante', type: 'file', src: [] }
              ]
            },
            url: {
              raw: '{{base_url}}/api/admin/pedidos/manual',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'pedidos', 'manual']
            },
            description: 'Permite al personal o administrador registrar manualmente una venta acordada y cerrada por WhatsApp. Nace directamente con estado "confirmado" y pago "aprobado" (origen: "manual_whatsapp"). Valida y descuenta stock bajo transacción. Envía confirmación automática por WhatsApp y correo.'
          },
          response: []
        },
        {
          name: 'Detalle de Pedido (Admin)',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/admin/pedidos/:id',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'pedidos', ':id'],
              variable: [
                { key: 'id', value: '{{pedido_id_prueba}}', description: 'ID del pedido a consultar' }
              ]
            },
            description: 'Retorna la información completa de un pedido, incluyendo sus detalles con productos, snapshots de variantes e historial de pagos con los datos del usuario verificador. Accesible por rol admin y personal.'
          },
          response: []
        },
        {
          name: 'Actualizar Estado de Pedido',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'PUT',
            header: [
              { key: 'Content-Type', value: 'application/json' }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                estado: 'en_proceso'
              }, null, 2)
            },
            url: {
              raw: '{{base_url}}/api/admin/pedidos/:id/estado',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'pedidos', ':id', 'estado'],
              variable: [
                { key: 'id', value: '{{pedido_id_prueba}}', description: 'ID del pedido' }
              ]
            },
            description: 'Actualiza el estado de un pedido (valores válidos: "confirmado", "en_proceso", "entregado"). REGLA DE NEGOCIO: No se permite modificar el estado de pedidos que ya se encuentren en "entregado" o "cancelado". Para cancelar, debe usarse la ruta de cancelación. Accesible por rol admin y personal.'
          },
          response: []
        },
        {
          name: 'Descargar Nota de Entrega PDF',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/admin/pedidos/:id/nota-entrega',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'pedidos', ':id', 'nota-entrega'],
              variable: [
                { key: 'id', value: '{{pedido_id_prueba}}', description: 'ID del pedido' }
              ]
            },
            description: 'Genera o descarga la nota de entrega oficial en formato PDF para el pedido especificado. Si ya fue generada previamente, se sirve directamente del disco para máximo rendimiento. Accesible por rol admin y personal.'
          },
          response: []
        },
        {
          name: 'Regenerar Nota de Entrega PDF',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/admin/pedidos/:id/nota-entrega?regenerar=true',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'pedidos', ':id', 'nota-entrega'],
              query: [
                { key: 'regenerar', value: 'true', description: 'Fuerza la recreación del documento PDF' }
              ],
              variable: [
                { key: 'id', value: '{{pedido_id_prueba}}', description: 'ID del pedido' }
              ]
            },
            description: 'Fuerza la re-generación inmediata del archivo PDF de Nota de Entrega con los datos actualizados del pedido y lo descarga. Accesible por rol admin y personal.'
          },
          response: []
        },
        {
          name: 'Listar Pagos Pendientes',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/admin/pagos/pendientes',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'pagos', 'pendientes']
            },
            description: 'Lista todos los comprobantes de pago en estado "pendiente" pendientes de revisión, con los datos del pedido y cliente asociado. Accesible por rol admin y personal.'
          },
          response: []
        },
        {
          name: 'Verificar Pago (Aprobar o Rechazar)',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'PUT',
            header: [
              { key: 'Content-Type', value: 'application/json' }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                accion: 'aprobar',
                notas: 'Comprobante verificado exitosamente en cuenta bancaria'
              }, null, 2)
            },
            url: {
              raw: '{{base_url}}/api/admin/pagos/:pagoId/verificar',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'pagos', ':pagoId', 'verificar'],
              variable: [
                { key: 'pagoId', value: '1', description: 'ID del comprobante de pago' }
              ]
            },
            description: 'Verifica un comprobante de pago pendiente. "accion": "aprobar" confirma el pedido y notifica al cliente por WhatsApp y Email; "rechazar" (con motivo en "notas") descuenta 1 intento. Si se acumulan 3 rechazos, el pedido se cancela automáticamente y se devuelve el stock. Accesible por rol admin y personal.'
          },
          response: []
        }
      ]
    },
    {
      name: 'Admin - Usuarios y Perfil',
      description: 'Gestión de perfil personal y administración de usuarios del sistema con control de roles.',
      auth: {
        type: 'bearer',
        bearer: [
          { key: 'token', value: '{{token}}', type: 'string' }
        ]
      },
      item: [
        {
          name: 'Ver Mi Perfil',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/admin/perfil',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'perfil']
            },
            description: 'Retorna la información del usuario autenticado actual (id, nombre_completo, email, rol, activo, debe_cambiar_password). Accesible por cualquier usuario autenticado (admin o personal).'
          },
          response: []
        },
        {
          name: 'Cambiar Mi Contraseña',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'PUT',
            header: [
              { key: 'Content-Type', value: 'application/json' }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                password_actual: 'PasswordActual123',
                nuevo_password: 'NuevaPasswordSegura2026!'
              }, null, 2)
            },
            url: {
              raw: '{{base_url}}/api/admin/perfil/password',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'perfil', 'password']
            },
            description: 'Permite al usuario autenticado cambiar su propia contraseña. Valida la contraseña actual contra bcrypt y actualiza "debe_cambiar_password" a false. Accesible por admin y personal.'
          },
          response: []
        },
        {
          name: 'Crear Usuario Personal',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'POST',
            header: [
              { key: 'Content-Type', value: 'application/json' }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                nombre_completo: 'Carlos Rodríguez',
                email: 'carlos.personal@chiringuitodelukas.com',
                password: 'PasswordTemporal123!'
              }, null, 2)
            },
            url: {
              raw: '{{base_url}}/api/admin/usuarios',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'usuarios']
            },
            description: 'Crea una nueva cuenta de usuario con rol FIJO "personal", activo: true y debe_cambiar_password: true. Envía correo automático de bienvenida con credenciales temporales. REGLA: SOLO accesible por rol "admin". NUNCA se crea otro admin.'
          },
          response: []
        },
        {
          name: 'Listar Usuarios',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/admin/usuarios?estado=todos&pagina=1&limite=10',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'usuarios'],
              query: [
                { key: 'estado', value: 'todos', description: 'Filtrar por estado: "activos", "inactivos", "todos"' },
                { key: 'pagina', value: '1', description: 'Número de página' },
                { key: 'limite', value: '10', description: 'Cantidad de usuarios por página' }
              ]
            },
            description: 'Lista los usuarios del sistema (admin y personal) con paginación y filtro de estado. NUNCA incluye password_hash. REGLA: SOLO accesible por rol "admin".'
          },
          response: []
        },
        {
          name: 'Cambiar Estado de Usuario (Activar/Desactivar)',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'PUT',
            header: [
              { key: 'Content-Type', value: 'application/json' }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                activo: false
              }, null, 2)
            },
            url: {
              raw: '{{base_url}}/api/admin/usuarios/:id/estado',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'usuarios', ':id', 'estado'],
              variable: [
                { key: 'id', value: '2', description: 'ID del usuario a activar o desactivar' }
              ]
            },
            description: 'Activa o desactiva (soft delete) una cuenta de personal mediante el booleano "activo". REGLA CRÍTICA: SOLO accesible por rol "admin". El usuario administrador NUNCA puede desactivarse a sí mismo (responde 403 Forbidden).'
          },
          response: []
        }
      ]
    },
    {
      name: 'Admin - Estadísticas',
      description: 'Métricas, analíticas e informes de ventas para el panel de control administrativo.',
      auth: {
        type: 'bearer',
        bearer: [
          { key: 'token', value: '{{token}}', type: 'string' }
        ]
      },
      item: [
        {
          name: 'Estadísticas de Ingresos',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/admin/estadisticas/ingresos?periodo=mes',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'estadisticas', 'ingresos'],
              query: [
                { key: 'periodo', value: 'mes', description: 'Período de cálculo: "hoy", "semana", "mes" (default: "mes")' }
              ]
            },
            description: 'Calcula la suma de ingresos totales y cantidad de pedidos cuya creación se encuentre en el período solicitado. REGLA: Cuenta ÚNICAMENTE pedidos en estado "confirmado", "en_proceso" o "entregado". Accesible por rol admin y personal.'
          },
          response: []
        },
        {
          name: 'Productos Más Vendidos',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/admin/estadisticas/productos-mas-vendidos?limite=10',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'estadisticas', 'productos-mas-vendidos'],
              query: [
                { key: 'limite', value: '10', description: 'Límite máximo de productos a retornar (default: 10, máximo: 50)' }
              ]
            },
            description: 'Retorna el ranking de productos con mayor número de unidades vendidas en pedidos válidos. Agrupa las variantes bajo el producto padre para simplificar el análisis comercial. Accesible por rol admin y personal.'
          },
          response: []
        },
        {
          name: 'Pedidos por Estado',
          request: {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
            },
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/admin/estadisticas/pedidos-por-estado',
              host: ['{{base_url}}'],
              path: ['api', 'admin', 'estadisticas', 'pedidos-por-estado']
            },
            description: 'Genera el conteo total de pedidos agrupados por cada estado ("pendiente", "confirmado", "en_proceso", "entregado", "cancelado"), ideal para gráficos de torta o barras. Accesible por rol admin y personal.'
          },
          response: []
        }
      ]
    }
  ]
};

const postmanDir = path.resolve(process.cwd(), 'postman');
const collectionPath = path.join(postmanDir, 'ElChiringuitoDeLukas.postman_collection.json');
fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2), 'utf-8');
console.log(`✅ Colección Postman generada en: ${collectionPath}`);

const readmeContent = `# Postman API Collection & Environment - El Chiringuito de Lukas 🐾

Este directorio contiene la suite completa de documentación y pruebas para la API REST de **El Chiringuito de Lukas**, estructurada para Postman y automatizada mediante entornos (Environments).

---

## 📁 Archivos incluidos

1. **\`ElChiringuitoDeLukas.postman_collection.json\`**: Colección con todas las carpetas, endpoints, ejemplos de payloads, parámetros de consulta y documentación de reglas de negocio.
2. **\`ElChiringuitoDeLukas.postman_environment.json\`**: Entorno local preconfigurado con variables dinámicas de conexión y autenticación.

---

## 🚀 Guía de Instalación y Uso

### 1. Importar la Colección y el Environment en Postman
1. Abre **Postman**.
2. En la esquina superior izquierda, haz clic en el botón **Import** (o presiona \`Ctrl + O\` / \`Cmd + O\`).
3. Arrastra y suelta ambos archivos (\`ElChiringuitoDeLukas.postman_collection.json\` y \`ElChiringuitoDeLukas.postman_environment.json\`), o selecciónalos con **Files**.
4. Haz clic en **Import**.

### 2. Seleccionar el Environment
En la esquina superior derecha de la interfaz de Postman, abre el menú desplegable de ambientes y selecciona:
> **"El Chiringuito de Lukas - Local"**

Este ambiente expone las siguientes variables:
- \`base_url\`: Dirección base del servidor backend (\`http://localhost:4000\`).
- \`token\`: Token JWT que se sincroniza automáticamente al hacer login.
- \`pedido_id_prueba\`: ID opcional para pruebas de pedidos existentes.
- \`producto_id_prueba\`: ID opcional para pruebas de productos existentes.

---

### 3. Autenticación y Flujo Inicial Recomendado
> ⚠️ **Paso Obligatorio**: El **PRIMER** request que debes ejecutar siempre es:
> **\`Auth > Login (Iniciar Sesión)\`**

- Al ejecutar \`POST {{base_url}}/api/auth/login\` con las credenciales del usuario, el script de **Tests** configurado en el request capturará automáticamente el token JWT y lo asignará a la variable de entorno \`token\`:
  \`\`\`javascript
  pm.test("Login exitoso", function () {
      pm.response.to.have.status(200);
  });

  const jsonData = pm.response.json();
  if (jsonData.token) {
      pm.environment.set("token", jsonData.token);
  }
  \`\`\`
- Todos los requests bajo las carpetas **Admin - \*** ya están configurados para usar el header:
  \`Authorization: Bearer {{token}}\`
- Por lo tanto, **NO necesitas copiar ni pegar manualmente ningún token**. Una vez hecho el login, puedes invocar cualquier endpoint administrativo de inmediato.

---

## 🔒 Nota de Seguridad

- El archivo de environment (\`ElChiringuitoDeLukas.postman_environment.json\`) se distribuye **vacío en el campo \`token\` y sin contraseñas de producción**.
- **NUNCA hagas commit ni compartas archivos de environment con tokens reales o credenciales privadas.**
- El endpoint de login cuenta con un limitador estricto de seguridad de **5 intentos por IP cada 15 minutos**. En caso de excederlo, la API retornará un código HTTP \`429 Too Many Requests\`.

---

## 📂 Estructura de Endpoints de la Colección

| Carpeta | Endpoints Incluidos | Descripción |
| :--- | :--- | :--- |
| **Auth** | \`POST /api/auth/login\` | Inicio de sesión con script de guardado de token JWT |
| **Público** | \`GET /api/categorias\`<br>\`GET /api/productos\`<br>\`GET /api/productos/:id\`<br>\`POST /api/pedidos\`<br>\`POST /api/pedidos/:id/pagos\`<br>\`GET /api/pedidos/:id\` | Catálogo público, búsqueda, creación de pedidos y consulta de estatus |
| **Admin - Productos** | \`GET /api/admin/productos\`<br>\`POST /api/admin/productos\`<br>\`PUT /api/admin/productos/:id\`<br>\`DELETE /api/admin/productos/:id\`<br>\`GET /api/admin/productos/alertas-stock\`<br>\`POST /api/admin/productos/:id/variantes\`<br>\`PUT /api/admin/productos/:id/variantes/:varianteId\`<br>\`DELETE /api/admin/productos/:id/variantes/:varianteId\` | CRUD de productos, variantes por SKU, stock y alertas de reposición |
| **Admin - Pedidos y Pagos** | \`GET /api/admin/pedidos\`<br>\`POST /api/admin/pedidos/manual\`<br>\`GET /api/admin/pedidos/:id\`<br>\`PUT /api/admin/pedidos/:id/estado\`<br>\`GET /api/admin/pedidos/:id/nota-entrega\`<br>\`GET /api/admin/pedidos/:id/nota-entrega?regenerar=true\`<br>\`GET /api/admin/pagos/pendientes\`<br>\`PUT /api/admin/pagos/:pagoId/verificar\` | Gestión de pedidos, venta manual por WhatsApp, verificación de pagos con WhatsApp/Email y descarga de Nota de Entrega PDF |
| **Admin - Usuarios y Perfil** | \`GET /api/admin/perfil\`<br>\`PUT /api/admin/perfil/password\`<br>\`POST /api/admin/usuarios\`<br>\`GET /api/admin/usuarios\`<br>\`PUT /api/admin/usuarios/:id/estado\` | Perfil propio, cambio de clave obligatorio, alta de personal y activación/desactivación |
| **Admin - Estadísticas** | \`GET /api/admin/estadisticas/ingresos\`<br>\`GET /api/admin/estadisticas/productos-mas-vendidos\`<br>\`GET /api/admin/estadisticas/pedidos-por-estado\` | Métricas de ingresos por período (hoy, semana, mes), top productos vendidos y distribución por estado |
`;

const readmePath = path.join(postmanDir, 'README.md');
fs.writeFileSync(readmePath, readmeContent, 'utf-8');
console.log(`✅ README generado en: ${readmePath}`);
