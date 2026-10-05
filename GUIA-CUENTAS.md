# Cuenta, perfiles y base de datos de Barraca Uno

## Uso cotidiano
1. Entrá al sitio y abrí el menú de usuario, arriba a la derecha.
2. Elegí Mi cuenta. El acceso usa **Iniciar sesión con ChatGPT**. Si ya tenés una sesión activa verás tu perfil directamente.
3. Editá nombre, empresa, teléfono, presentación, avatar, acento, tema y densidad.
4. Pulsá Guardar perfil y esperá la confirmación. El perfil se conserva al recargar y en futuras sesiones de la misma cuenta.
5. El botón de sol/luna cambia el tema y recuerda la elección en ese navegador. El tema guardado en el perfil se usa en dispositivos sin una preferencia local.

El sitio sigue siendo privado. Iniciar sesión identifica al visitante; no concede acceso al sitio a personas que no estén autorizadas en Sites. Para invitar a alguien, el propietario debe modificar explícitamente los permisos del sitio.

## Qué almacena
Cloudflare D1 guarda la tabla `profiles` con un registro por identidad: user_id, email, display_name, company, phone, bio, avatar, accent, theme, density y updated_at. El servidor recibe la identidad de ChatGPT, nunca acepta un user_id enviado por el formulario y usa consultas parametrizadas. No almacena contraseñas. Cada usuario lee y actualiza su propio perfil.

El catálogo continúa usando datos de ejemplo; las órdenes no se guardan ni se envían a proveedores. Las imágenes son ilustrativas, con créditos en /creditos. No hay un panel para editar cuentas ajenas.

## Código
- db/schema.ts: definición de tabla.
- drizzle/0000_thick_shiva.sql y drizzle/meta/: migración de esquema.
- .openai/hosting.json: conexión lógica DB. Sites administra la base de producción.
- db/profiles.ts: acceso servidor al binding D1.
- app/api/profile/route.ts: GET y PUT autenticados. El PUT valida origen y campos.
- app/chatgpt-auth.ts: identidad y navegación de acceso administradas por Sites.
- app/profile-panel.tsx: panel de edición y selector de tema.
- /guia: guía dentro de la aplicación.

## Desarrollo local
La vista de desarrollo usa una identidad simulada de Sites, separada de la identidad real de producción. No copies datos privados de producción para probar.

```powershell
pnpm install
pnpm exec tsc --noEmit
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_thick_shiva.sql
pnpm dev
```

Aplicá la migración local una sola vez, únicamente en una base local vacía. No la repitas en una base que ya tenga la tabla. La publicación aplica las migraciones de producción por separado.

Para cambiar la estructura, editá db/schema.ts y ejecutá `pnpm exec drizzle-kit generate`. Revisá el SQL nuevo, compilá y publicá. No borres o modifiques migraciones ya aplicadas; agregá una nueva. No hace falta configurar cuentas de Cloudflare ni claves de base de datos para el sitio publicado.

## Consulta del propietario
Para revisar los perfiles guardados, podés pedirme una consulta de la base de este sitio indicando qué necesitás. Las herramientas de administración de Sites permiten revisar tablas al propietario. La aplicación no expone un endpoint de SQL ni funciones para administrar otras cuentas.

Si guardar falla, el formulario conserva los cambios y permite reintentar. Esperá el mensaje de éxito antes de cerrar el panel.

## Administración de la empresa
La cuenta propietaria del sitio está autorizada en el servidor como administradora. Abrí el menú de usuario → Administrar cuentas (/administracion).

El registro muestra correo, nombre, empresa, estado, fecha de registro y último acceso, con búsqueda y filtros. Las cuentas se registran al entrar autenticadas; los perfiles anteriores también aparecen. Las acciones se guardan en account_events.

- Bloquear impide entrar al catálogo y guardar el perfil; conserva los datos.
- Reactivar devuelve el acceso.
- Eliminar exige escribir el correo exacto, borra el perfil y conserva una entrada mínima deshabilitada para impedir el reingreso. No elimina la cuenta de ChatGPT.
- Restaurar una cuenta eliminada devuelve acceso para crear un perfil nuevo; no recupera los datos borrados.
- Las cuentas administradoras están protegidas contra bloqueo y eliminación.

BARRACA_ADMIN_EMAILS es una variable secreta del servidor con los correos autorizados, separados por comas. No va en el cliente ni se puede editar desde el perfil. Para probar localmente, copiá .env.example a .dev.vars y poné únicamente los correos simulados que usarás. Aplicá todas las migraciones nuevas además de la inicial. Para la vista compilada de Wrangler, copiá .dev.vars a dist/server/.dev.vars después del build. Nunca publiques .dev.vars ni incluyas credenciales en Git.

## Galería de materiales
Tocá una foto en tarjetas, tabla o la orden para ampliarla. La galería trae miniaturas, flechas y zoom de 100% a 300%; desplazá la foto al acercarla. El fondo se desenfoca. Escape, la cruz o tocar fuera cierra la galería.

## Control de stock
El administrador tiene acceso a /stock desde su menu o la barra lateral. Puede registrar entradas (sumar), salidas (restar sin saldo negativo) y conteos (fijar total). Cada movimiento exige un motivo y acepta una referencia de remito o factura. Se conserva el responsable, fecha y cantidades antes/despues.

product_stock guarda el saldo y su version; stock_movements guarda el historial. La migracion 0002 crea las tablas e inicializa los doce materiales con las cantidades del catalogo de ejemplo. No modifica perfiles ni cuentas. El catalogo autenticado lee estos saldos y los refresca cada 30 segundos al estar visible y al recuperar foco. Las ordenes siguen siendo de ejemplo y no reservan ni descuentan stock automaticamente.

Cada envio tiene un identificador unico para reintentar sin duplicar, y una version del saldo para detectar modificaciones concurrentes. Saldo e historial se escriben juntos en una transaccion D1. Solo el administrador puede modificar stock; los usuarios habilitados pueden consultar el catalogo.
