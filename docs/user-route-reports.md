# Reportar un recorrido desde celular

La página `/reportar-error` y el reporte del viaje en `/mapa` comparten el editor.
El usuario selecciona la ruta, abre el mapa y marca únicamente el tramo que
conoce, en el orden en que pasa el camión. La propuesta requiere de 2 a 120 puntos.

- Mover, acercar o tocar el mapa no agrega puntos. La mira central indica dónde
  se colocará el siguiente al pulsar **Agregar punto**.
- Los números permiten mover un punto, eliminarlo o insertar uno después sin
  cambiar el orden de los demás. Deshacer y rehacer conservan hasta 50 cambios
  durante esa apertura del editor.
- La línea azul muestra el sentido publicado elegido; la ámbar une la propuesta.
  Se puede ocultar la referencia. La propuesta se conserva al cambiarla o volver
  al formulario; cambiar de ruta o tipo de problema la descarta.
- No se ajusta automáticamente a las calles: hay que marcar cada esquina o giro.
  El buscador centra el mapa y no agrega puntos ni envía el reporte.
- Con un tramo válido, la explicación es opcional. Si se escribe, conserva el
  mínimo de 10 caracteres. Un solo punto debe completarse o quitarse.
- Borrar todo pide confirmación. Cerrar el editor mantiene lo marcado en el
  formulario, pero no lo envía. El borrador del formulario no sobrevive a recargar.

Se conserva el contrato existente de `/api/community/reports`: `proposedPath`
contiene los puntos y `expectedResult` identifica el sentido de referencia y el
carácter parcial de la corrección. No sustituye automáticamente la ruta publicada.
El administrador sigue revisando el reporte y uniendo el tramo al recorrido.
No requiere una migración de base de datos.

En la PWA se conserva el guardado explícito de reportes pendientes sin conexión,
incluido el tramo y su sentido. Un error de envío mantiene el dibujo para reintentar.
Si no se puede cargar el mapa, se puede volver y enviar una descripción.

`e2e/report-drawing.spec.ts` usa el canvas real con un fondo y geometría locales
para comprobar gestos, edición, teclado, accesibilidad y envío sin consumir mapas
de pago ni crear reportes reales.
