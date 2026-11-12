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

«Guardar en mi cuenta» inicia la sincronización con Supabase tras 1.4 segundos
sin cambios. Cada administrador tiene una copia por sentido y puede continuarla
en otro dispositivo. El primer guardado es explícito; recuperar la copia también
activa la sincronización. Consultar la copia no reemplaza el trabajo local.
Si otro dispositivo cambia esa copia, el servidor rechaza la revisión antigua.
Si cambia la versión publicada, también bloquea el guardado hasta revisar la nueva
versión. Una copia vinculada a otro reporte se abre en su contexto original.
Las sesiones recientes se muestran mediante un aviso y se actualizan cada 30 segundos.
La presencia caduca a los 90 segundos sin actividad; no bloquea la edición.
Las tablas y el RPC solo están disponibles para el servidor, después de validar
la sesión administrativa. No se exponen correos ni borradores de otros administradores.

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

## Buscar, revisar y probar

El buscador centra el mapa en calles, colonias y referencias. Usa el catálogo
local y Search Box; sus resultados temporales no se guardan en los borradores.
La comparación identifica segmentos dirigidos retirados (rojo) y agregados
(verde), con la diferencia de longitud. Conserva la multiplicidad al repetir calles.

«Probar un viaje antes de publicar» permite marcar origen y destino sobre el mapa.
El servidor usa el cálculo habitual de la PWA, con este sentido sustituido por
el borrador y los demás recorridos publicados. Muestra rutas directas, transbordos,
caminata aproximada, subidas y bajadas. Al cambiar la geometría o los puntos, el
resultado anterior deja de ser válido. No publica ni modifica el mapa público.

Entre A y B, «Proponer trazado por calles» consulta OSRM y respeta el orden de
circulación, incluso al seleccionar B antes de A. Admite hasta 23 puntos intermedios.
La propuesta primero se revisa, después se carga en el mapa y finalmente se une.
No sustituye automáticamente el trazado. El perfil es para automóvil y no garantiza
restricciones de autobús; el administrador debe comprobar el paso. Se conserva
atribución a OpenStreetMap y OSRM. `ADMIN_OSRM_URL` permite usar un servicio propio;
por defecto se consulta `https://router.project-osrm.org` solo a petición manual.
Referencia del proveedor: https://project-osrm.org/docs/v26.5.0/http

## Revisar reportes y señales

«Marcar como resuelto» exige una explicación de 10–1000 caracteres y registra
fecha y administrador. El estado de aprobación se conserva para compatibilidad
con el historial; la bandeja separa Aprobados (sin solución) y Resueltos mediante
`resolved_at`. Los controles de moderación ya no permiten editar reportes cerrados.
El seguimiento público muestra «Resuelto» sin revelar la nota ni el administrador.

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
- Se requiere `20261112183128_admin_editor_workspace.sql` para borradores,
  presencia y resoluciones. Las nuevas tablas tienen RLS, sin permisos para anon
  ni authenticated; el RPC usa SECURITY INVOKER y solo permite service_role.
