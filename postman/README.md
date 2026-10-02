# Postman API Collection & Environment - El Chiringuito de Lukas 🐾

Este directorio contiene la suite completa de documentación y pruebas para la API REST de **El Chiringuito de Lukas**, estructurada para Postman y automatizada mediante entornos (Environments).

---

## 📁 Archivos incluidos

1. **`ElChiringuitoDeLukas.postman_collection.json`**: Colección con todas las carpetas, endpoints, ejemplos de payloads, parámetros de consulta y documentación de reglas de negocio.
2. **`ElChiringuitoDeLukas.postman_environment.json`**: Entorno local preconfigurado con variables dinámicas de conexión y autenticación.

---

## 🚀 Guía de Instalación y Uso

### 1. Importar la Colección y el Environment en Postman
1. Abre **Postman**.
2. En la esquina superior izquierda, haz clic en el botón **Import** (o presiona `Ctrl + O` / `Cmd + O`).
3. Arrastra y suelta ambos archivos (`ElChiringuitoDeLukas.postman_collection.json` y `ElChiringuitoDeLukas.postman_environment.json`), o selecciónalos con **Files**.
4. Haz clic en **Import**.

### 2. Seleccionar el Environment
En la esquina superior derecha de la interfaz de Postman, abre el menú desplegable de ambientes y selecciona:
> **"El Chiringuito de Lukas - Local"**

Este ambiente expone las siguientes variables:
- `base_url`: Dirección base del servidor backend (`http://localhost:4000`).
- `token`: Token JWT que se sincroniza automáticamente al hacer login.
- `pedido_id_prueba`: ID opcional para pruebas de pedidos existentes.
- `producto_id_prueba`: ID opcional para pruebas de productos existentes.

---

### 3. Autenticación y Flujo Inicial Recomendado
> ⚠️ **Paso Obligatorio**: El **PRIMER** request que debes ejecutar siempre es:
> **`Auth > Login (Iniciar Sesión)`**

- Al ejecutar `POST {{base_url}}/api/auth/login` con las credenciales del usuario, el script de **Tests** configurado en el request capturará automáticamente el token JWT y lo asignará a la variable de entorno `token`:
  ```javascript
  pm.test("Login exitoso", function () {
      pm.response.to.have.status(200);
  });

  const jsonData = pm.response.json();
  if (jsonData.token) {
      pm.environment.set("token", jsonData.token);
  }
  ```
- Todos los requests bajo las carpetas **Admin - *** ya están configurados para usar el header:
  `Authorization: Bearer {{token}}`
- Por lo tanto, **NO necesitas copiar ni pegar manualmente ningún token**. Una vez hecho el login, puedes invocar cualquier endpoint administrativo de inmediato.

---

## 🔒 Nota de Seguridad

- El archivo de environment (`ElChiringuitoDeLukas.postman_environment.json`) se distribuye **vacío en el campo `token` y sin contraseñas de producción**.
- **NUNCA hagas commit ni compartas archivos de environment con tokens reales o credenciales privadas.**
- El endpoint de login cuenta con un limitador estricto de seguridad de **5 intentos por IP cada 15 minutos**. En caso de excederlo, la API retornará un código HTTP `429 Too Many Requests`.

---

## 📂 Estructura de Endpoints de la Colección

| Carpeta | Endpoints Incluidos | Descripción |
| :--- | :--- | :--- |
| **Auth** | `POST /api/auth/login` | Inicio de sesión con script de guardado de token JWT |
| **Público** | `GET /api/categorias`<br>`GET /api/productos`<br>`GET /api/productos/:id`<br>`POST /api/pedidos`<br>`POST /api/pedidos/:id/pagos`<br>`GET /api/pedidos/:id` | Catálogo público, búsqueda, creación de pedidos y consulta de estatus |
| **Admin - Productos** | `GET /api/admin/productos`<br>`POST /api/admin/productos`<br>`PUT /api/admin/productos/:id`<br>`DELETE /api/admin/productos/:id`<br>`GET /api/admin/productos/alertas-stock`<br>`POST /api/admin/productos/:id/variantes`<br>`PUT /api/admin/productos/:id/variantes/:varianteId`<br>`DELETE /api/admin/productos/:id/variantes/:varianteId` | CRUD de productos, variantes por SKU, stock y alertas de reposición |
| **Admin - Pedidos y Pagos** | `GET /api/admin/pedidos`<br>`POST /api/admin/pedidos/manual`<br>`GET /api/admin/pedidos/:id`<br>`PUT /api/admin/pedidos/:id/estado`<br>`GET /api/admin/pedidos/:id/nota-entrega`<br>`GET /api/admin/pedidos/:id/nota-entrega?regenerar=true`<br>`GET /api/admin/pagos/pendientes`<br>`PUT /api/admin/pagos/:pagoId/verificar` | Gestión de pedidos, venta manual por WhatsApp, verificación de pagos con WhatsApp/Email y descarga de Nota de Entrega PDF |
| **Admin - Usuarios y Perfil** | `GET /api/admin/perfil`<br>`PUT /api/admin/perfil/password`<br>`POST /api/admin/usuarios`<br>`GET /api/admin/usuarios`<br>`PUT /api/admin/usuarios/:id/estado` | Perfil propio, cambio de clave obligatorio, alta de personal y activación/desactivación |
| **Admin - Estadísticas** | `GET /api/admin/estadisticas/ingresos`<br>`GET /api/admin/estadisticas/productos-mas-vendidos`<br>`GET /api/admin/estadisticas/pedidos-por-estado` | Métricas de ingresos por período (hoy, semana, mes), top productos vendidos y distribución por estado |
