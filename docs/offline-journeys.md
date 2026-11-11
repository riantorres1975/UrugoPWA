# Viajes guardados sin conexión

«Guardar en la app» conserva hasta diez fichas HTML en el dispositivo, junto con
los extremos del viaje, la tarifa total y una huella SHA-256 de cada recorrido y
sus referencias. Los viajes guardados no se envían a Supabase.

Al abrir «Viajes sin conexión», una consulta a `/api/journeys/freshness` compara las
huellas y las tarifas con el catálogo publicado. La respuesta no se almacena en
caché y no incluye coordenadas del usuario. Cambiar el color o verificar la ruta
no invalida una ficha; cambiar el trazado, el nombre o las referencias sí lo hace.
Una ruta retirada del catálogo también requiere volver a planear el viaje.

El aviso conserva las indicaciones anteriores y permite recalcular desde los
mismos extremos. Recalcular no reemplaza automáticamente una ficha: hay que
guardarla de nuevo después de revisar el nuevo plan. Las fichas anteriores a esta
función siguen abriendo, pero no se presentan como verificadas.

Sin conexión, ante un error o si el servidor está usando su respaldo estático por
fallo de Supabase, no se afirma que el recorrido siga vigente. El cotejo comprueba
el catálogo de UruGo; no garantiza que el servicio esté circulando ni actualiza el
documento HTML descargado. Las fichas de más de siete días muestran su antigüedad.
