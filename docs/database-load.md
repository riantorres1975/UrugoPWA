# Carga de lecturas en Supabase

El catálogo público se consulta desde el mapa, la geometría de cada ruta, el bot
y la comprobación de vigencia de viajes guardados. Cuando `ROUTE_DATA_SOURCE`
es `supabase`, esas entradas comparten el mismo resultado durante 300 segundos
mediante el Data Cache de Next.js. No dependen solamente de la memoria de una
instancia serverless. El identificador del proyecto forma parte de la clave.

La publicación, restauración o verificación desde el panel invalida la etiqueta
`urugo-published-routes` después de guardar correctamente en la base de datos.
Las escrituras fallidas y las solicitudes no autorizadas no invalidan la caché.
Los fallos de lectura conservan el respaldo estático como salida de emergencia,
pero ese respaldo no se almacena en la caché como si fuera el catálogo publicado.

Las opiniones mantienen la ventana de análisis de 30 días y las reglas de muestra
mínima existentes. Se comparte el resultado agregado durante 300 segundos;
los votos individuales y los identificadores de dispositivo no se guardan en
esta caché. Una lectura parcial o fallida no genera una señal de calidad.

Estas medidas reducen lecturas repetidas. No sustituyen un diagnóstico de la
instancia: no prueban por sí solas qué originó una alerta de Disk IO ni garantizan
que el presupuesto se recupere. Para comprobarlo, revisar Disk IO Balance,
memoria/swap, consultas con más lecturas de bloques y sus planes de ejecución.
No reiniciar estadísticas antes de guardar una referencia para comparar.

Validación automatizada: `public-data-cache`, `route-repository-cache`,
`admin-route-cache` y `journey-quality-server`. Cubren reutilización, concurrencia,
expiración, separación de proyectos, invalidación al publicar y recuperación
después de errores. No cambian tablas, índices, permisos ni el plan de Supabase.
