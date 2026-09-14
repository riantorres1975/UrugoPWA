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

## Límites y siguiente etapa

Las caminatas siguen siendo distancias aproximadas en línea recta. No validan
banquetas, cruces, pendientes, puentes ni accesibilidad. Los enlaces del mapa no
son indicaciones peatonales por calles. La siguiente etapa es verificar los
accesos de las opciones finalistas con una red peatonal, con caché, límite de
consultas y respaldo sin conexión. No se incorporó un nuevo servicio de pago.

Para calibrar las preferencias, conviene revisar ejemplos reales donde los
usuarios indican que tuvieron que caminar demasiado; un voto aislado no debe
modificar automáticamente los trazados o las recomendaciones.

## Verificación

`tests/journey-ranking.test.ts` cubre cercanía frente a velocidad, tolerancia de
cinco minutos, esperas, separación entre puntuación y ETA, acceso alternativo,
cruces entre segmentos y competencia entre directas y transbordos.
`e2e/journey-preferences.spec.ts` comprueba selección y persistencia en móvil con
worker y con el cálculo de respaldo.
