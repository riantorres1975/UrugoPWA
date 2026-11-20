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

## Incidente del 20 de noviembre de 2026

El diagnóstico de producción encontró un bucle de PostgREST 14.5 en
`publish_route_revision`: los registros repetían `route version changed during
review`. La función usaba SQLSTATE `40001` para un conflicto determinista de
versión. PostgREST 14 lo trata como un fallo transitorio y vuelve a ejecutar la
transacción, aunque la versión esperada nunca pueda coincidir.

Entre 19:14:36.929975 y 19:18:26.451021 UTC, el contador de inicialización de
contexto pasó de 916358038 a 916604375: 246337 ejecuciones en 229.52 segundos,
aproximadamente 64400 por minuto. Los rollbacks acumulados tenían un volumen
similar. El backend observado ejecutaba la RPC de publicación y las fases de
configuración de PostgREST; las consultas normales de la aplicación estaban
varios órdenes de magnitud por debajo.

La migración `20261120192046_stop_rpc_conflict_retry_loops.sql` sustituye el código
de conflicto por `PT409` en las siete RPC de rutas, borradores y apoyos que lo
usaban. Conserva firmas, cuerpos, propietarios y permisos mediante
`CREATE OR REPLACE FUNCTION`. No cambia recorridos ni desactiva sus comprobaciones
de versión. Se aplicó en producción y quedó registrada en el historial de
migraciones. Los manejadores aceptan `PT409` y el código anterior durante el
despliegue; no reintentan automáticamente ninguno.

Verificación directa después del cambio:

- Las siete funciones usan `PT409`; ninguna función pública conserva `40001`.
- Siguen siendo `SECURITY INVOKER`, sin ejecución para `anon` ni `authenticated`;
  `service_role` conserva acceso.
- Publicar, verificar y guardar un borrador con una versión anterior devolvieron
  `PT409` en una transacción de prueba que se revirtió, sin modificar rutas.
- El backend del bucle desapareció después del cambio. No fue necesario
  terminar sesiones ni reiniciar el proyecto.
- Entre 19:25:10.612546 y 19:26:49.748108 UTC no hubo nuevos rollbacks ni nuevas
  inicializaciones de contexto: 99 segundos sin la actividad repetitiva.

La base ocupaba aproximadamente 30 MB. Las estadísticas históricas mostraban
que casi todas las lecturas se atendían desde caché; no justificaban añadir
índices indiscriminadamente. El consumo anómalo de reintentos está confirmado;
la recuperación completa de Disk IO Balance debe comprobarse en las métricas
posteriores, que incluyen ventanas anteriores al arreglo. No se cambió el plan
gratuito ni se reiniciaron los contadores.

Referencia oficial: [SQLSTATE 40001 e infinitos reintentos en PostgREST 14](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).
Para futuros conflictos de negocio usar `PT409`, nunca `40001` o `40P01`.

Las pruebas administrativas de integración comprueban que los conflictos de
publicación, verificación y borradores regresen `PT409` antes de dos segundos.
La suite local de integración requiere Docker; no estaba disponible en esta
revisión. Sí se ejecutaron las tres comprobaciones SQL contra producción y las
538 pruebas unitarias, además de TypeScript, ESLint y la compilación.
