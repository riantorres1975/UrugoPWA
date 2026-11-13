# Apoyos voluntarios

La página `/apoyar` abre los medios de pago configurados en `lib/support.ts`.
Los montos sugeridos no realizan cargos ni suscripciones. PayPal.me recibe el
monto en MXN; los enlaces de pago personalizados conservan su configuración.
Cuando `SUPPORT_MERCADOPAGO_URL` está configurado, Mercado Pago es la opción
principal y la selección inicial del aviso; el monto se elige en ese proveedor.
PayPal y sus montos sugeridos quedan como alternativa desplegable. Si no hay un
enlace válido de Mercado Pago, PayPal continúa disponible como opción principal.

## Confirmación y reconocimiento

1. La persona completa el pago en el proveedor externo.
2. Opcionalmente envía un aviso con la referencia del comprobante en `/apoyar`.
   El aviso siempre se crea como **pendiente**; no prueba que se haya pagado.
3. En `/admin/apoyos`, un administrador comprueba la referencia y el monto en la
   cuenta receptora antes de confirmar. Puede corregir el monto al valor recibido.
4. Inicio y apoyo muestran únicamente aportaciones confirmadas y con permiso
   público: nombre/seudónimo o anónimo. El monto es opcional. Los apoyos privados,
   referencias, notas y datos de revisión no salen del servidor.
5. Rechazar o retirar un reconocimiento lo oculta. Las decisiones quedan en
   `support_contribution_reviews`. Las revisiones concurrentes requieren recargar.

No hay webhooks ni confirmación automática de PayPal. Abrir el enlace o enviar
el formulario nunca aumenta el contador público. No se incluyen donaciones de
ejemplo en producción. El contador representa aportaciones públicas verificadas,
no personas únicas, ni todo el dinero recibido.

## Base de datos

Aplicar `20261113152952_verified_support_contributions.sql` antes del despliegue.
Las tablas y las funciones tienen RLS/permisos restringidos al servidor con
`service_role`; ninguna clave secreta se entrega al navegador. El endpoint valida
origen, tamaño, datos y frecuencia; deduplica referencias por medio de pago. Los
pagos duplicados devuelven la misma respuesta sin publicar otra aportación.
El muro usa una proyección explícita de datos públicos y se regenera cada cinco
minutos; una revisión invalida también inicio y apoyo.

Para solicitudes de privacidad, verificar la referencia en privado y retirar el
reconocimiento desde administración. No incluir comprobantes ni referencias en
reportes públicos ni commits. Los avisos no crean cuentas de usuario.

## Recordatorio del mapa

Solo aparece a partir del segundo uso separado al menos seis horas, después de
un minuto en la sesión y con el mapa en reposo. No aparece sobre diálogos, teclado,
búsquedas activas, resultados, viajes ni recuperación de viajes. Se oculta a los
20 segundos salvo que tenga el foco. Mostrarlo o cerrarlo aplaza el siguiente por
30 días; abrir apoyo o enviar un aviso lo aplaza por 90 días. No bloquea funciones
ni envía eventos de analítica. Sin almacenamiento local disponible no se muestra.
Las animaciones respetan `prefers-reduced-motion`.

## Consulta y privacidad del aportante

Aplicar también `20261113172211_support_self_service_and_goals.sql` antes de
desplegar la consulta privada. Cada aviso nuevo recibe un secreto aleatorio de
192 bits con prefijo `UG-`; Supabase conserva solo SHA-256. El código se entrega
al navegador y no se guarda automáticamente en almacenamiento local. El enlace
privado lo lleva en un fragmento que la página elimina de la barra de direcciones.
Nunca usarlo en parámetros de consulta, analítica, logs ni enlaces de compartir.

`/apoyar/mi-aporte` consulta por POST y permite cambiar exclusivamente privacidad,
nombre y autorización del monto. No permite modificar el pago ni confirmarlo.
Pasar a anónimo u ocultar datos se aplica inmediatamente; un nombre nuevo queda
oculto hasta revisión. La confirmación del pago se conserva. Los datos privados
de consulta usan `no-store`; referencias y notas de moderación no se devuelven.
La ruta privada se excluye de Analytics y Speed Insights. Una tarjeta PNG se
genera localmente sin importe, referencia ni código; el nombre requiere elección
explícita de quien descarga. Compartir siempre usa el enlace público `/apoyar`.

Los avisos anteriores a esta función siguen visibles según su consentimiento,
pero no tienen código. Desde administración se puede crear o rotar el acceso
después de comprobar a quién se entrega. El código anterior queda revocado.

## Herramientas administrativas y metas

El panel permite registrar un pago recibido sin formulario. Requiere comprobación
real y nota privada; comienza anónimo, sin monto público. Publicar un nombre o un
monto exige autorización. La transacción crea el apoyo y su revisión de forma
atómica. Las referencias duplicadas no crean otro aporte.

El contador de Apoyos incluye pagos pendientes y nombres nuevos por revisar.
En la bandeja se consulta cada minuto mientras la pestaña está visible; una
notificación pide actualizar, conservando formularios en curso.

Las metas se definen por mes de Uruapan con importe y motivo reales. No hay metas
predeterminadas ni registros de ejemplo. Solo se publica una meta habilitada para
el mes actual. Su avance suma aportes confirmados durante ese mes que también
tienen reconocimiento aprobado y monto visible; nunca importes ocultos o privados.
Las revisiones concurrentes de metas y privacidad usan versiones para impedir
sobrescrituras silenciosas.
