# Opiniones de viajes

Las respuestas Sí/No del mapa se envían a `/api/community/journey-feedback` y se guardan en Supabase. Este flujo no usa Vercel Analytics.

## Activación

1. Aplicar `supabase/migrations/20260912182324_add_journey_feedback.sql` al proyecto de UruGo con una cuenta autorizada (CLI de Supabase o editor SQL).
2. Publicar la aplicación con las variables de Supabase existentes, incluida la clave secreta solo en el servidor.
3. Enviar una opinión desde el mapa y comprobarla en `/admin/feedback`.

La migración crea una tabla y dos funciones nuevas; no modifica las rutas ni los reportes existentes. Si se aplica manualmente mediante el editor SQL, registrar después su versión en el historial de migraciones con el CLI para evitar intentar crear los mismos objetos otra vez.

La versión `20260912182324` se aplicó al proyecto UruGo el 12 de septiembre de 2026 y se registró en `supabase_migrations.schema_migrations`. Se verificó el guardado y la actualización del motivo dentro de una transacción revertida, sin conservar opiniones de prueba.

## Uso y límites

- La opinión se guarda inmediatamente. El motivo negativo es opcional y actualiza la misma fila.
- Hay una opinión por dispositivo, combinación ordenada de rutas y día de Uruapan. Los reintentos son idempotentes dentro del día; una nueva respuesta sustituye la anterior. Invertir las rutas constituye otro transbordo.
- El navegador conserva un UUID aleatorio. El servidor almacena únicamente su HMAC, sin coordenadas, IP en claro ni agente del navegador en la tabla de opiniones. Borrar los datos del navegador crea otra identidad; también existe un límite de solicitudes por IP.
- No se muestra agradecimiento hasta confirmar el guardado. Sin conexión se informa del fallo y se permite reintentar; las opiniones no se guardan en la bandeja de reportes pendientes.
- La vista administrativa agrupa todas las filas del periodo en Postgres, sin truncarlas al límite de resultados de la API. Las fechas son inclusivas y se comparan con el periodo inmediatamente anterior de igual duración.
- Las opiniones orientan revisiones manuales y, con suficiente evidencia, un ajuste limitado del orden de las opciones (ver abajo). Los votos anteriores que solo se enviaron a Vercel no se recuperan con esta migración.
- RLS está activado. `anon` y `authenticated` no pueden leer, escribir ni ejecutar las funciones. El servidor valida las rutas, el origen, el cuerpo y el acceso administrativo.

## Calibración de recomendaciones

El servidor consulta la tabla existente, en páginas de 1,000 filas, y agrupa los
últimos 30 días. Cada dispositivo cuenta una sola vez por combinación ordenada,
usando su respuesta más reciente. No necesita otra migración. Los agregados se
reutilizan cinco minutos; los identificadores se mantienen solo durante la consulta
del servidor y nunca se incluyen en `/api/community/journey-quality`.

Un aviso requiere 20 dispositivos, opiniones en al menos tres días, 60% negativas
y al menos cinco con el mismo motivo específico. Produce un ajuste de 1 a 2 puntos
en Menos caminata y Equilibrada. No cambia la duración, no elimina rutas, no edita
trazados y no altera el modo Más rápida. Solo afecta a la combinación exacta;
las opiniones de un transbordo no se atribuyen automáticamente a sus dos rutas.

La página `/admin/feedback` muestra estos umbrales, la evidencia actual y la
comprobación sugerida. El filtro de fechas del informe no cambia la ventana de
30 días utilizada por el planificador.

Si falla la lectura, vence la señal o la consulta supera 50,000 filas/5 segundos,
el planificador sigue con tiempos y caminatas, sin penalizaciones. Nunca se usa
una muestra truncada para penalizar una ruta. A ese volumen conviene trasladar
este agregado a una función de Postgres. La comprobación del 14 de septiembre de
2026 respondió correctamente y encontró cero opiniones recientes.

## Validación

`tests/journey-quality*.test.ts` cubre deduplicación, umbrales, API pública y efecto
acotado en el orden. No se insertan votos de prueba en producción.

Pruebas de validación/API/administración: `pnpm exec vitest run tests/journey-feedback*.test.ts`.
Pruebas móviles: `pnpm exec playwright test e2e/journey-feedback.spec.ts`.
`tests/sql/journey-feedback.sql` verifica el guardado, los reintentos, los motivos, los agregados y los permisos en una base **aislada y vacía** con la migración aplicada; revierte sus datos al terminar.
