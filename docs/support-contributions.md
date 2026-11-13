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
