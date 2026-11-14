# Asistente de movilidad y lugares de Uruapan

Las respuestas de transporte y turismo se construyen en `lib/chat-assistant.ts`.
Los datos del viaje provienen de `getPublishedRouteData`, igual que el mapa, y el
motor compartido respeta el orden del trazado y los transbordos. La cercanía se
mide contra segmentos; en el Teleférico solo cuentan las estaciones. No se
convierten referencias en paradas fijas ni se supone que una ruta cercana al
destino sirve desde cualquier origen.

El chat conserva origen y destino a partir de los mensajes del usuario. Un nuevo
destino desconocido invalida el anterior. Un origen explícito no reconocido no
se sustituye por GPS. Para lugares ambiguos o sin coordenadas comprobadas pide
confirmación en el mapa. Las distancias y tiempos son estimaciones del trazado;
el mapa debe comprobar las caminatas por calles y las entradas a los recintos.

La IA solo clasifica intenciones en JSON mediante una lista cerrada. Nunca se
publica texto generado como si fuera una indicación. Se usa `deepseek-flash` sin
razonamiento, con hasta 64 tokens y los límites globales existentes. Las
preguntas habituales no llaman al proveedor y funcionan sin su clave. Un fallo
de la IA conserva las opciones de ayuda. No se envía el campo de ubicación del dispositivo al proveedor; el mensaje y el historial escrito pueden procesarse para clasificar una pregunta.

## Catálogo turístico

`lib/chat-places.ts` contiene seis fichas revisadas el 13 de noviembre de 2026:
Parque Nacional Barranca del Cupatitzio, La Huatápera, Fábrica de San Pedro, Casa
Más Angosta, Mercado de Antojitos y Parque Lineal La Camelina. No se publican
precios, horarios de apertura ni eventos que no se hayan verificado.

Fuentes primarias:

- https://uruapan.gob.mx/turismo-cultural-y-natural/
- https://uruapan.gob.mx/turismo-gastronomico/
- https://fabricadesanpedro.com/
- Dirección de La Huatápera: directorio del INPI y su publicación
  https://www.gob.mx/inpi/es/articulos/instala-inpi-centros-de-acopio-en-oficinas-de-representacion-centros-coordinadores-y-radiodifusoras-para-damnificados-por-las-lluvias?idiom=es

Los puntos de Parque Nacional, Fábrica y Casa Angosta provienen de los enlaces
cartográficos de Turismo municipal. Identifican los sitios, no accesos exactos.
El Mercado conserva el punto del índice local existente. Huatápera y La Camelina
requieren ubicar el lugar en el mapa; no se inventaron coordenadas. Las fichas
deben revisarse cuando cambien los recintos o sus fuentes.

## Privacidad y conversación

La portada reutiliza el mismo asistente con un botón flotante: etiqueta en
escritorio e icono en móvil. El panel se carga de forma diferida y solo se abre
al activarlo. Abrirlo no envía preguntas ni solicita ubicación automáticamente.

La conversación no se persiste en el navegador. La ubicación es optativa, se
rechaza si es imprecisa o está fuera de cobertura y caduca a los cinco minutos.
Se puede retirar o empezar otra conversación, cancelando la solicitud pendiente.
Las respuestas del API usan `private, no-store`. Los enlaces provienen del
catálogo y del planificador, nunca del proveedor de IA. No se envían reportes
automáticamente; el formulario solo prepara un correo o issue para que el
usuario elija enviarlo.

## Comprobación

Las pruebas del asistente cubren la confusión de precios/horarios, la Ruta 2 y el
Centro, alias y destinos ambiguos, seguimiento del origen, coordenadas privadas,
un viaje real, disponibilidad de IA y rechazo de instrucciones generadas. Las
pruebas de navegador cubren fichas en móvil, accesibilidad, contexto de viaje,
reinicio y el posicionamiento del panel de escritorio.
