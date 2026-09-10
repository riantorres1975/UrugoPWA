# Datos comunitarios y administración

UruGo conserva `data/rutas_produccion_final.json` como respaldo. Supabase se usa para recibir reportes privados, moderarlos y, cuando se active explícitamente, servir únicamente recorridos publicados.

También conserva totales diarios anónimos de consultas por ruta para ordenar el bloque de rutas populares de la portada. Abrir una ficha o seleccionar una ruta en el mapa incrementa el total, con deduplicación diaria en el navegador. La tabla no contiene ubicación, IP ni identificadores de visitantes, y solo `service_role` puede leerla o escribirla.

## 1. Crear el proyecto

1. Crea un proyecto gratuito en Supabase.
2. Copia la URL, la publishable key y la secret key desde el diálogo **Connect**.
3. Configura en `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
ADMIN_EMAILS=tu-correo@ejemplo.com
REPORTER_HASH_SECRET=un-secreto-aleatorio-de-al-menos-32-bytes
ROUTE_DATA_SOURCE=static
```

La secret key y `REPORTER_HASH_SECRET` son secretos de servidor. Nunca deben llevar el prefijo `NEXT_PUBLIC_`.

## 2. Aplicar la migración

Vincula el proyecto con Supabase CLI y aplica las migraciones versionadas:

```bash
pnpm dlx supabase@2.115.0 login
pnpm dlx supabase@2.115.0 link --project-ref TU_PROJECT_REF
pnpm dlx supabase@2.115.0 db push
```

Después abre los advisors de seguridad y rendimiento desde Supabase o ejecuta las comprobaciones equivalentes de la CLI.

## 3. Configurar el acceso por correo

En **Authentication > URL Configuration** agrega:

- URL del sitio: `https://www.urugo.app`
- Redirect URL: `https://www.urugo.app/auth/callback`
- Desarrollo opcional: `http://localhost:3000/auth/callback`

Configura también el destino usado por el servidor:

```bash
ADMIN_AUTH_REDIRECT_URL=https://www.urugo.app/auth/callback
```

Supabase ignora `emailRedirectTo` cuando no coincide con una URL permitida y
en ese caso usa la URL del sitio. Por eso la URL de producción debe aparecer
exactamente en ambos lugares y la URL del sitio no debe quedar en localhost.

En **Authentication > Email Templates**, actualiza el enlace de las plantillas
**Confirm signup** y **Magic link** para que la sesión pueda validarse en el
servidor:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">
  Entrar al panel de UruGo
</a>
```

El callback acepta este flujo con `token_hash` y conserva compatibilidad con
enlaces PKCE que entreguen un parámetro `code`.

Los correos incluidos en `ADMIN_EMAILS` pueden entrar directamente. Para autorizar a otra persona sin cambiar variables, registra su correo en minúsculas:

```sql
insert into public.admin_members (email, display_name)
values ('persona@ejemplo.com', 'Nombre');
```

## 4. Importar las rutas actuales

Con la migración aplicada y las variables locales configuradas:

```bash
pnpm db:seed-routes
```

El comando importa el estado actual y crea la revisión inicial. Es idempotente: se puede volver a ejecutar sin duplicar la versión 1.

## 5. Activar Supabase como fuente pública

Primero compara `/api/v1/routes` con `/api/rutas-polyline`. Cuando los 81 recorridos estén completos, cambia en Vercel:

```bash
ROUTE_DATA_SOURCE=supabase
```

Si Supabase no responde, el servidor vuelve automáticamente al JSON incluido en la aplicación. Los reportes y confirmaciones nunca forman parte de la respuesta pública hasta que se traduzcan en una revisión aprobada.

## Endpoints

| Endpoint | Acceso | Uso |
| --- | --- | --- |
| `POST /api/community/reports` | Público, limitado | Crea un reporte pendiente |
| `POST /api/community/confirmations` | Público, limitado | Registra una observación de una ruta |
| `GET /api/v1/routes` | Público, cacheado | Entrega recorridos aprobados y versión |
| `GET /api/v1/routes/[key]/geometry` | Público, cacheado | Entrega la geometría publicada de una ruta para el editor de propuestas |
| `GET /api/v1/routes/[key]/community-status` | Público, cacheado | Resume sólo señales aceptadas, sin datos del dispositivo |
| `POST /api/v1/community/reports` | Clave Bearer, limitado | Recibe propuestas externas siempre pendientes de moderación |
| `GET /api/v1/openapi` | Público, cacheado | Publica el contrato OpenAPI 3.1 de lectura y aportes externos |
| `/admin` | Administradores | Revisa y clasifica reportes |
| `/admin/routes` | Administradores | Consulta señales y prepara revisiones |
| `/admin/signals` | Administradores | Acepta o descarta confirmaciones rápidas |
| `/admin/integrations` | Administradores | Crea, limita y revoca claves para aportes externos |
| `/admin/routes/[id]` | Administradores | Publica y restaura versiones de una ruta |
| `GET /api/admin/routes/export` | Administradores | Descarga rutas y revisiones en JSON, sin datos comunitarios |

En `/reportar-error`, la persona puede elegir cualquiera de las rutas disponibles aunque entre directamente al formulario. Para cambios de recorrido puede comparar la línea publicada y dibujar sobre el mapa las calles por donde pasa realmente; esa propuesta permanece privada hasta la revisión administrativa.

La navegación administrativa muestra contadores de reportes y señales pendientes para que la bandeja de revisión sea visible desde cualquier sección del panel.
Cada ficha de ruta permite registrar una verificación de campo con fecha, administrador y nota. El registro es inmutable y no crea una versión de geometría; editar otros datos de una ruta no renueva esa fecha.
Cada aporte también muestra al administrador un historial agregado de aceptados, descartados y pendientes de la misma instalación anónima. El hash técnico nunca se presenta en pantalla ni se expone en endpoints públicos.
Los reportes externos muestran en la bandeja el nombre de la integración que los envió. La clave completa nunca se almacena ni aparece en el panel.
El inventario prioriza rutas con estado operativo especial, alertas aceptadas posteriores a la última verificación, aportes pendientes o verificaciones de más de seis meses. Las confirmaciones aceptadas se deduplican por instalación antes de contar evidencia.
El botón **Respaldo** del inventario descarga únicamente rutas y revisiones. Los reportes, contactos, agentes de usuario y hashes anónimos quedan fuera del archivo.

## Resumen diario por correo

Vercel ejecuta `GET /api/cron/admin-digest` diariamente a las `14:00 UTC`, aproximadamente a las `08:00` en Uruapan. La hora exacta puede variar en el plan gratuito. Configura estas variables en producción:

```bash
CRON_SECRET=un-secreto-aleatorio-de-al-menos-16-caracteres
RESEND_API_KEY=re_...
ADMIN_NOTIFICATION_FROM="UruGo <avisos@auth.urugo.app>"
ADMIN_NOTIFICATION_EMAILS=destino@ejemplo.com
```

`ADMIN_NOTIFICATION_EMAILS` es opcional y, si se omite, se reutilizan los correos de `ADMIN_EMAILS`. El remitente debe pertenecer a un dominio verificado en Resend. La tarea no envía correo cuando no hay pendientes y usa una clave de idempotencia por fecha para evitar duplicados durante reintentos del mismo día.

La misma ejecución también aplica el mantenimiento de privacidad. Cada tarea está aislada: si una falla, el resumen diario sigue enviándose y el mantenimiento se reintenta en la próxima corrida.

## Retención de datos privados

- Los contadores técnicos de `rate_limit_buckets` se eliminan después de vencer.
- Los reportes aprobados o rechazados y las señales aceptadas o descartadas se eliminan 180 días después de su revisión.
- Los reportes y señales que permanezcan abiertos se eliminan después de 365 días.
- Las bitácoras privadas de moderación se eliminan después de 365 días.
- Las rutas publicadas y sus revisiones no forman parte de esta limpieza: se conservan como historial público versionado.
- Los miembros administrativos se conservan mientras estén autorizados y deben desactivarse o eliminarse manualmente cuando pierdan acceso.

Al eliminar un aporte también desaparecen su contacto opcional, agente de usuario, evidencia, texto libre y hash anónimo. Las referencias desde revisiones o bitácoras usan `ON DELETE SET NULL`, por lo que la ruta publicada no se pierde.

## Prueba administrativa aislada

`pnpm test:admin-integration` comprueba el flujo real de acceso, bandeja, moderación, auditoría, verificación de campo y ciclo de credenciales externas. La prueba crea un administrador, una ruta, un reporte y una integración temporales y los elimina al terminar. Debe ejecutarse únicamente contra un segundo proyecto Supabase dedicado a pruebas, con todas las migraciones aplicadas.

Configura estas variables sólo en tu terminal o en un entorno de CI protegido:

```bash
ALLOW_TEST_SUPABASE_WRITES=1
TEST_SUPABASE_PROJECT_REF=referencia-del-proyecto-de-pruebas
TEST_SUPABASE_URL=https://referencia-del-proyecto-de-pruebas.supabase.co
TEST_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
TEST_SUPABASE_SECRET_KEY=sb_secret_...
```

El ejecutor rechaza el identificador conocido de producción y también rechaza una URL que no coincida exactamente con `TEST_SUPABASE_PROJECT_REF`. No reutilices las variables ni las claves de producción. La prueba queda fuera del comando E2E normal hasta que sus secretos se configuren en GitHub Actions.

El workflow usa un entorno de GitHub llamado `integration-test`. Agrega allí los cuatro secretos `TEST_SUPABASE_*`; si alguno falta, el trabajo termina correctamente sin ejecutar escrituras. Conviene proteger ese entorno y no habilitar sus secretos para pull requests de forks.

## Publicar una corrección

1. Comprueba el reporte y márcalo como aprobado.
2. Abre **Preparar cambio de ruta** desde el reporte o entra al inventario de rutas.
3. Ajusta los metadatos o pega el recorrido como matriz de coordenadas, `LineString` o `Feature` GeoJSON.
4. Describe qué cambió y cómo se verificó antes de publicar.

La publicación se ejecuta en una transacción: bloquea la versión actual, crea una revisión inmutable y actualiza la ruta pública. Si otro administrador publicó mientras la pantalla estaba abierta, el cambio se rechaza hasta volver a cargar. Restaurar una revisión antigua nunca borra historia; crea una versión nueva con los datos anteriores.

## Seguridad operativa

- Todas las tablas tienen RLS y los roles `anon` y `authenticated` carecen de acceso directo.
- Las escrituras públicas pasan por Route Handlers con validación, límite de tamaño, mismo origen y rate limiting.
- El rate limiting usa contadores atómicos de Supabase entre instancias y guarda sólo claves HMAC; si Supabase no responde, conserva el límite local en memoria.
- La IP no se guarda; se transforma mediante HMAC para reconocer abuso sin conservar la dirección original.
- Una misma instalación sólo aporta una señal por ruta y día; los reintentos se aceptan sin duplicar el conteo.
- El estado público exige dos colaboradores independientes con señales aceptadas; una sola se muestra como verificación en curso.
- Aceptar o descartar una señal queda registrado en una bitácora privada y no modifica el mapa.
- Los reportes abiertos desde una ficha guardan su `route_key`; el administrador decide después qué dirección (`route_id`) corregir.
- Las fuentes HTTPS y los recorridos aproximados enviados por la comunidad son privados. El editor sólo los carga como borrador y exige una publicación administrativa versionada.
- El contacto opcional y la bitácora de moderación son privados.
- Aprobar un reporte no publica una geometría. La publicación versionada se implementa como una acción separada para permitir revisión y rollback.

## Integraciones para aportes externos

Después de aplicar la migración `community_api_clients`, crea una credencial en `/admin/integrations`. El panel muestra la clave completa una sola vez y después conserva únicamente su prefijo.

El script queda disponible como alternativa operativa desde un entorno seguro:

```bash
pnpm api-key:create -- "Nombre de la integración"
```

La terminal muestra la clave una sola vez. Compártela mediante un canal privado; Supabase conserva únicamente su hash SHA-256 y un prefijo reconocible. La cuota inicial es de 30 reportes por hora.

Una integración envía propuestas mediante `POST /api/v1/community/reports` con `Authorization: Bearer urugo_sk_...`. El endpoint está pensado para llamadas servidor a servidor, limita intentos de autenticación, valida el tamaño y contenido del JSON y devuelve `202` cuando el reporte queda pendiente.

El contrato legible por máquinas está disponible en `GET /api/v1/openapi`. Puede importarse en Postman, Insomnia o un generador compatible con OpenAPI 3.1, y también se descarga desde `/datos-api`.

Para revocar una clave sin borrarla de la auditoría operativa:

```sql
update public.community_api_clients
set active = false, revoked_at = now()
where id = 'UUID_DE_LA_INTEGRACION';
```

Para cambiar su cuota, actualiza `hourly_limit` con un valor entre 1 y 1000. Una integración no tiene permisos de lectura directa sobre Supabase ni puede aprobar reportes o publicar recorridos.
