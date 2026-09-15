# Recomendaciones de viaje

El planificador compara rutas directas y viajes con un transbordo. La preferencia
se guarda en el dispositivo (`urugo:journey-preference:v1`) y se envía al worker;
el cálculo de respaldo utiliza los mismos parámetros.

## Preferencias

- **Menos caminata**, predeterminada: pondera un minuto caminando como tres en
  transporte. Prioriza opciones dentro de 5, 10 o 15 minutos de la más rápida
  disponible que cumpla el límite de caminata. El valor inicial es 5 minutos.
- **Equilibrada**: pondera un minuto caminando como dos en transporte.
- **Más rápida**: ordena por el tiempo estimado de puerta a puerta.

Las dos primeras añaden cuatro puntos por transbordo, para representar la
incomodidad de cambiar de vehículo. Estos puntos **no se suman a la duración**.
Los parámetros están en `lib/journey-ranking.ts`.

En Menos caminata y Equilibrada, si encabeza la lista un transbordo se compara
con la mejor directa que esté dentro de la tolerancia elegida respecto a la opción más rápida.
Se recomienda la directa si el cambio ahorra menos de 300 m a pie y menos de
cinco minutos de viaje. El transbordo sigue disponible para elección manual.
La regla se repite después de verificar las caminatas por calles, sin modificar
la duración ni el modo Más rápida. No se elimina un cambio por la longitud del
tramo en camión: un tramo corto podría evitar una barrera peatonal.

Los ajustes adicionales se guardan en `urugo:journey-settings:v1`, separados de
la preferencia existente. La caminata máxima puede ser 300, 500, 800 metros o
sin límite (predeterminado) e incluye subida, cambio y bajada. Se prioriza cumplir
este límite en los tres modos. Si ninguna candidata lo cumple, se ordenan por
menor caminata y se muestra un aviso; el usuario puede elegir otra alternativa.
El mismo ajuste se aplica al worker, al cálculo de respaldo y a la verificación
por calles. Valores almacenados inválidos vuelven a los predeterminados.

La ficha explica la diferencia de caminata y tiempo frente a la alternativa más
rápida dentro del límite. Los mensajes distinguen la falta de opciones que cumplan
el límite de una selección manual que lo supera. Se señalan las comparaciones
que aún incluyen accesos aproximados.

La duración incluye caminar desde el origen, caminar al cambiar de ruta, caminar
hasta el destino, viajar y esperar cada vehículo. Se asumen 75 m/min caminando,
300 m/min en transporte y una espera de la mitad de la frecuencia media conocida
(7.5 min por vehículo si falta el horario). Son estimaciones, no llegadas en vivo.

## Subida, bajada y transbordo

Se proyectan los puntos sobre varios segmentos cercanos, conservando hasta ocho
accesos separados por al menos 100 m de avance sobre cada trazado. Se comprueban
combinaciones válidas en el sentido de circulación. El Teleférico permite ambos
sentidos, pero solo admite acceso y cambios en las estaciones guardadas.

Los enlaces entre rutas se buscan entre segmentos, incluidos cruces sin vértices
coincidentes. Se conserva el límite de 200 m en el cambio y los filtros de recorrido
del motor anterior. Un índice espacial y cachés por geometría evitan comparar
todos los segmentos de todas las rutas en cada búsqueda.

Inicialmente se muestran hasta tres opciones distintas: recomendada, menor caminata y
menor duración, conservando una directa si existe. La ficha permite comparar
tiempo, tarifa y caminata desglosada antes de cambiar de opción.

## Caminatas por calles

Después del cálculo local se verifican los accesos de las tres opciones finalistas
con el perfil `mapbox/walking` de Directions: subida, cambio y bajada. Se actualizan
distancias, duración y orden con la geometría peatonal. El mapa dibuja esas calles;
los pequeños enlaces entre puntos ajustados a la red se señalan como aproximados.
Los cálculos pendientes se cancelan al cambiar el viaje y no sustituyen una opción
elegida manualmente ni una sesión de viaje ya iniciada.

Si una finalista es inalcanzable, la caminata crece al menos 200 metros y un 50%,
o ninguna cumple el límite elegido, se verifican hasta tres reservas adicionales.
No hay reintentos recursivos. Se conservan las opciones iniciales alcanzables para
respetar elecciones manuales, por lo que pueden quedar hasta seis opciones.

Hay como máximo 18 consultas por cálculo (9 sin reservas), dos concurrentes y 24 por minuto
por sesión del navegador. Los accesos repetidos se deduplican y se reutilizan hasta
15 minutos en memoria (128 entradas), sin persistir coordenadas ni respuestas.
Cada consulta tiene tres segundos de espera máxima. Errores de autorización o
cuota suspenden las consultas durante un minuto. Las peticiones usan el token
público de Mapbox existente y cuentan en su consumo de Directions; no pasan por
una función de Vercel. El límite local no sustituye los controles de la cuenta Mapbox.

Un `NoRoute` confirmado descarta esa opción. Fallos de red, ausencia de segmentos
cartografiados o puntos ajustados demasiado lejos mantienen una aproximación
identificada como tal. No se afirma que una calle tenga banqueta o que sea accesible:
la cobertura depende de la cartografía. Sin conexión funciona el cálculo local;
la geometría peatonal previamente consultada se reutiliza solo mientras siga en memoria.

Referencia de parámetros y respuestas: [Mapbox Directions](https://docs.mapbox.com/api/navigation/directions/).

Las opiniones agregadas añaden una señal limitada de confiabilidad; véase
`docs/journey-feedback.md` para umbrales y controles. Un voto aislado no cambia el
orden. Las geometrías requieren revisión explícita antes de ser modificadas.

## Verificación

`tests/journey-ranking.test.ts` cubre cercanía frente a velocidad, tolerancia de
cinco minutos, esperas, separación entre puntuación y ETA, acceso alternativo,
cruces entre segmentos y competencia entre directas y transbordos.
`e2e/journey-preferences.spec.ts` comprueba selección y persistencia en móvil con
worker y con el cálculo de respaldo.

`tests/walking-directions.test.ts` y `tests/refine-journeys.test.ts` cubren la
consulta peatonal, caché, cancelación, errores, accesos imposibles y reordenación.
`e2e/journey-walking.spec.ts` comprueba los resultados tardíos y la comparación
por calles en móvil. Las pruebas generales simulan Directions para evitar consumo
y resultados variables. Una consulta real del 14 de septiembre de 2026 validó
275 m para la Ruta 6 y 947 m para la Ruta 176 en el caso antes estimado en 210/522 m.

`tests/journey-settings.test.ts` cubre tolerancia, límites, datos dañados y
explicaciones. La prueba móvil de preferencias comprueba los nuevos ajustes con
worker y sin worker, incluyendo persistencia. Las pruebas de refinamiento cubren
reservas acotadas, deduplicación, accesos imposibles y cancelación entre tandas.
