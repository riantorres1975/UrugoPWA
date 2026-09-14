# Recomendaciones de viaje

El planificador compara rutas directas y viajes con un transbordo. La preferencia
se guarda en el dispositivo (`urugo:journey-preference:v1`) y se envía al worker;
el cálculo de respaldo utiliza los mismos parámetros.

## Preferencias

- **Menos caminata**, predeterminada: pondera un minuto caminando como tres en
  transporte. Prioriza opciones dentro de cinco minutos de la más rápida disponible.
- **Equilibrada**: pondera un minuto caminando como dos en transporte.
- **Más rápida**: ordena por el tiempo estimado de puerta a puerta.

Las dos primeras añaden cuatro puntos por transbordo, para representar la
incomodidad de cambiar de vehículo. Estos puntos **no se suman a la duración**.
Los parámetros están en `lib/journey-ranking.ts`.

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

Se muestran hasta tres alternativas distintas: recomendada, menor caminata y
menor duración, conservando una directa si existe. La ficha permite comparar
tiempo, tarifa y caminata desglosada antes de cambiar de opción.

## Caminatas por calles

Después del cálculo local se verifican los accesos de las tres opciones finalistas
con el perfil `mapbox/walking` de Directions: subida, cambio y bajada. Se actualizan
distancias, duración y orden con la geometría peatonal. El mapa dibuja esas calles;
los pequeños enlaces entre puntos ajustados a la red se señalan como aproximados.
Los cálculos pendientes se cancelan al cambiar el viaje y no sustituyen una opción
elegida manualmente ni una sesión de viaje ya iniciada.

Hay como máximo nueve consultas por cálculo, dos concurrentes y 24 por minuto
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
