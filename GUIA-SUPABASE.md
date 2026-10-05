# Acceso con Supabase — Barraca Uno

Supabase Auth guarda las identidades y administra las contraseñas. No se guardan contraseñas en Cloudflare D1. Las existencias, movimientos, perfiles y estados de bloqueo permanecen en D1. La clave publicable no concede acceso administrador a la aplicación.

## Configuración del proyecto

En Authentication → URL Configuration:
- Site URL: https://barraca-uno-inventario.brunosaravia9.chatgpt.site
- Redirect URLs: https://barraca-uno-inventario.brunosaravia9.chatgpt.site/auth/callback

El registro requiere confirmar el correo. Con las plantillas predeterminadas, el enlace PKCE se abre en el mismo navegador donde se inició el registro o la recuperación. Para aceptar el enlace desde otro navegador/dispositivo, editar Authentication → Email Templates:

Confirm signup, enlace de confirmación:
`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup`

Reset password, enlace de recuperación:
`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery`

La plantilla HTML debe conservar el enlace dentro de un elemento <a href="...">. No pegar credenciales en las plantillas. Supabase verifica el token de un solo uso.

El envío de correos a usuarios fuera de los correos autorizados por el servicio SMTP de prueba requiere configurar SMTP propio en Supabase. Para uso de empresa, configurar un remitente verificado y revisar los límites de Auth.

## Uso

Abrir /ingresar → Registrate → nombre, correo y contraseña de al menos 10 caracteres → confirmar el correo. Después entrar con correo y contraseña. Recuperar acceso con «¿Olvidaste tu contraseña?». No usar la contraseña del correo.

La tabla D1 account_identities vincula permanentemente el UUID de Supabase con la cuenta de la aplicación, conservando los bloqueos aunque el usuario cambie de correo.

Los administradores configurados siguen siendo brunosaravia9@gmail.com y brunosaravia09@gmail.com. El servidor solo reconoce ese permiso tras verificar la identidad y el correo con Supabase. El perfil y los bloqueos anteriores se conservan vinculando el correo confirmado a la cuenta anterior. Una cuenta eliminada sigue bloqueada, aunque se vuelva a registrar en Supabase.

La eliminación desde Barraca Uno elimina el perfil y deshabilita el acceso, conservando el registro mínimo y el historial. No elimina la identidad en Supabase; para eliminar esa identidad también, usar Authentication → Users en el dashboard. No se ha solicitado ni almacenado una clave de servicio.

## Google / X

En Authentication → Sign In / Providers, configurar el proveedor con credenciales OAuth propias. Google requiere una aplicación OAuth en Google Cloud; X requiere una aplicación OAuth en su portal de desarrolladores. Usar la URL de callback de Supabase que indica cada proveedor. Los botones aparecen automáticamente en /ingresar solamente cuando el proveedor está habilitado en Supabase. La clave publicable entregada no configura los proveedores.

## Seguridad y despliegue

Variables de entorno del servidor: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, BARRACA_ADMIN_EMAILS y BARRACA_JWT_SECRET. Se configuran mediante Sites; no contienen contraseñas de usuarios. Después de validar una identidad local o de Supabase, la aplicación emite su propio JWT HS256 en una cookie HttpOnly, SameSite=Lax y Secure en HTTPS. La firma, la expiración, el emisor, la audiencia y la versión de autenticación se comprueban en el servidor. El proxy conserva el refresh de Supabase para sus proveedores; las respuestas privadas no se almacenan en caché. Los endpoints de escritura validan origen, tamaño y formato.

El formulario de acceso debe ser accesible sin ChatGPT para reemplazar esa pantalla. El catálogo, perfiles, stock y administración siguen protegidos por la sesión Supabase y los permisos de la aplicación. Publicar el código antes de quitar la protección ChatGPT de Sites. El ejecutable actual carga la misma web y necesita conexión a Internet. Para activar Google/X en el ejecutable habrá que verificar además el comportamiento OAuth en WebView2; para pruebas usar el navegador del sistema.
