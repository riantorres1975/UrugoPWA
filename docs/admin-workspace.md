# Espacio de trabajo administrativo

## Editar una ruta o un tramo

El inventario agrupa los registros de cada ruta y muestra sus sentidos por
separado. Los filtros de nombre, estado y sentido se conservan al cambiar entre
«Todas» y «Por revisar». La publicación afecta únicamente al registro abierto.

«Cambiar un tramo» abre el mapa y guía la selección de las conexiones A y B. Se
dibujan los puntos intermedios en orden y «Unir al recorrido» sustituye solo ese
tramo, conservando ambos extremos y el resto de la ruta. El editor permite elegir
un punto por número, centrar el recorrido y mostrar su etiqueta en el mapa.

Hay hasta 20 pasos de deshacer y rehacer del trazado. Los atajos Ctrl/Cmd+Z y
Ctrl/Cmd+Mayús+Z se aplican fuera de los campos de texto. Durante la creación de
un tramo se puede quitar el último punto nuevo o cancelar el cambio.

## Borradores y publicación

El borrador se guarda en el navegador tras 600 ms sin cambios y también al salir
de la pantalla. Se separa por registro de ruta y reporte vinculado. Conserva los
campos y un tramo sin terminar, pero no cambia la ruta pública ni se comparte
con otros administradores. Se ofrece su recuperación durante siete días.

Si la ruta tiene una versión posterior, el borrador solo se puede descargar o
descartar: nunca se aplica automáticamente sobre la versión actual. Después de
una publicación confirmada, un borrador enviado cuyo contenido coincide con la
nueva versión se limpia. Si falta espacio local se avisa y la publicación sigue
disponible. La versión esperada y los permisos se vuelven a validar en el servidor.

Antes de publicar se revisan el sentido, el nombre, el estado y el número de
puntos. El resumen es obligatorio y cada publicación conserva su historial.
Una modificación del recorrido queda pendiente de verificación de campo.

## Revisar reportes y señales

Los reportes admiten búsqueda por ruta, lugar o descripción, filtros por tipo y
orden por antigüedad, y páginas de 20 filas. Las señales usan páginas de 30.
Los filtros se conservan al paginar; si la última fila cambia de estado, se
regresa a la última página existente. En reportes, los pendientes antiguos aparecen primero.

«Aprobar y editar ruta» conserva el vínculo con el reporte. Una publicación
asociada muestra «Corrección publicada» y su versión; aprobar por sí solo no
publica un recorrido. Los botones se bloquean mientras se guarda una decisión,
y descartar un reporte requiere abrir su confirmación.
«Volver al reporte» abre el aviso concreto aunque se encuentre fuera de la
primera página de la bandeja.

El encabezado y las bandejas comparten los contadores pendientes dentro de cada
petición. El inventario consulta las señales en páginas para evitar truncarlas
al límite de la API, hasta 5,000 filas y 20 peticiones. Si la lectura es parcial
o falla, se informa y no se etiqueta una ruta como «Sin alertas» por falta de datos.

## Validación

- `pnpm test` cubre filtros, borradores, separación por sentido/reporte y paginación de señales.
- `pnpm test:admin-integration` usa Supabase aislado y cubre moderación, edición de tramos, recuperación y publicación vinculada.
- La suite de espacio de trabajo se ejecuta solo contra `127.0.0.1:54321`. Su
  limpieza elimina únicamente los registros de prueba mediante una transacción
  local, habilitando de nuevo el bloqueo de revisiones inmutables antes de terminar.
- No se requieren migraciones ni cambios de permisos para estas funciones.
