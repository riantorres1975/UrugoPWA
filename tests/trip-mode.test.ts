import { describe, expect, it } from "vitest";
import {
  calculateTripProgress,
  createTripTrackingState,
  getTripJourneyKey,
  getTripMilestone,
  updateTripTrackingState,
  type DirectTripJourney,
  type TransferTripJourney,
} from "@/lib/trip-mode";

const direct: DirectTripJourney = {
  kind: "direct",
  routeId: 25,
  routeName: "Ruta 25",
  segment: [
    [-102.08, 19.42],
    [-102.07, 19.42],
    [-102.06, 19.42],
  ],
  destination: [-102.06, 19.42],
};

const transfer: TransferTripJourney = {
  kind: "transfer",
  routeAId: 25,
  routeBId: 14,
  routeAName: "Ruta 25",
  routeBName: "Ruta 14",
  routeAStartIndex: 0,
  routeATransferIndex: 2,
  routeBTransferIndex: 0,
  routeBEndIndex: 2,
  segmentA: [
    [-102.08, 19.42],
    [-102.07, 19.42],
    [-102.06, 19.42],
  ],
  segmentB: [
    [-102.0595, 19.42],
    [-102.05, 19.42],
    [-102.04, 19.42],
  ],
  transferPoint: [-102.06, 19.42],
  walkMeters: 55,
  destination: [-102.04, 19.42],
};

describe("trip mode", () => {
  it("incluye la caminata final en el porcentaje sin llegar al 100% antes del destino", () => {
    const journey: DirectTripJourney = { ...direct, destination: [-102.06, 19.423] };
    let state = updateTripTrackingState(journey, [-102.07, 19.42], createTripTrackingState());
    const before = state.progress!.progressRatio;
    state = updateTripTrackingState(journey, [-102.06, 19.42], state);
    expect(state.progress?.phase).toBe("walking-destination");
    expect(state.progress!.progressRatio).toBeGreaterThan(before);
    expect(state.progress!.progressRatio).toBeLessThan(0.9);
    state = updateTripTrackingState(journey, [-102.06, 19.4215], state);
    expect(state.progress!.progressRatio).toBeLessThan(1);
  });

  it("conserva el primer tramo cuando las rutas se cruzan antes del transbordo", () => {
    const journey: TransferTripJourney = {
      ...transfer,
      segmentB: [[-102.0595, 19.42], [-102.07, 19.42], [-102.04, 19.44]],
      destination: [-102.04, 19.44],
    };
    expect(calculateTripProgress(journey, [-102.07, 19.42], "riding-first").phase).toBe("riding-first");
    expect(calculateTripProgress(journey, [-102.07, 19.42]).phase).toBe("riding-first");
  });

  it("no vuelve al primer camión después de recuperarse de un desvío en el segundo", () => {
    let state = createTripTrackingState(calculateTripProgress(transfer, [-102.05, 19.42], "riding-second"));
    for (let i = 0; i < 3; i += 1) state = updateTripTrackingState(transfer, [-102.05, 19.44], state);
    expect(state.progress?.phase).toBe("off-route");
    state = updateTripTrackingState(transfer, transfer.transferPoint, state);
    expect(state.progress?.phase).toBe("riding-second");
    expect(state.progress?.currentRouteName).toBe(transfer.routeBName);
  });

  it("sigue indicando caminar mientras aún se acerca al punto de subida del segundo camión", () => {
    const journey: TransferTripJourney = { ...transfer,
      segmentB: [[-102.055, 19.42], [-102.04, 19.42]], walkMeters: 525,
    };
    const walking = calculateTripProgress(journey, [-102.057, 19.42], "walking-transfer");
    expect(walking.phase).toBe("walking-transfer");
    expect(walking.distanceToMilestoneM).toBeGreaterThan(200);
  });

  it("mantiene la indicación de subida durante varias lecturas antes del primer camión", () => {
    let state = createTripTrackingState();
    for (let i = 0; i < 5; i += 1) state = updateTripTrackingState(transfer, [-102.08, 19.425], state);
    expect(state.progress?.phase).toBe("boarding");
  });

  it("mide el desvío respecto a la ruta y no respecto al origen", () => {
    const progress = calculateTripProgress(direct, [-102.065, 19.425], "riding-direct");
    expect(progress.phase).toBe("off-route");
    expect(progress.distanceToMilestoneM).toBeLessThan(600);
    expect(progress.remainingMinutes).toBeNull();
  });

  it("no indica bajar al pasar cerca de la bajada antes de completar la vuelta", () => {
    const journey: DirectTripJourney = { ...direct,
      segment: [[-102.0605, 19.42], [-102.08, 19.42], [-102.08, 19.44], [-102.06, 19.42]],
      destination: [-102.06, 19.423],
    };
    expect(calculateTripProgress(journey, journey.segment[0], "riding-direct").phase).toBe("riding-direct");
  });

  it("calcula el avance y el destino de una ruta directa", () => {
    const progress = calculateTripProgress(direct, [-102.07, 19.42]);

    expect(progress.phase).toBe("riding-direct");
    expect(progress.progressRatio).toBeGreaterThan(0.45);
    expect(progress.progressRatio).toBeLessThan(0.55);
    expect(progress.currentRouteName).toBe("Ruta 25");
  });

  it("continúa a pie después de bajar y llega al destino real", () => {
    const journey: DirectTripJourney = {
      ...direct,
      destination: [-102.06, 19.423],
      destinationStopLabel: "Centro",
    };

    const walking = calculateTripProgress(journey, [-102.06, 19.42], "riding-direct");
    expect(walking.phase).toBe("walking-destination");
    expect(walking.distanceToMilestoneM).toBeGreaterThan(300);
    expect(getTripMilestone(walking)).toBeNull();

    const arrived = calculateTripProgress(journey, journey.destination, walking.phase);
    expect(arrived.phase).toBe("arrived");
  });

  it("aplica el último tramo a pie después de un transbordo", () => {
    const journey: TransferTripJourney = {
      ...transfer,
      destination: [-102.04, 19.423],
    };

    const walking = calculateTripProgress(journey, [-102.04, 19.42], "riding-second");
    expect(walking.phase).toBe("walking-destination");
    expect(walking.remainingMinutes).toBeGreaterThan(0);
  });

  it("detecta cuando el usuario se aleja del recorrido directo", () => {
    const progress = calculateTripProgress(direct, [-102.07, 19.43], "riding-direct");

    expect(progress.phase).toBe("off-route");
  });

  it("ignora dos lecturas aisladas fuera del recorrido", () => {
    let tracking = updateTripTrackingState(
      direct,
      [-102.07, 19.42],
      createTripTrackingState(),
    );

    tracking = updateTripTrackingState(direct, [-102.07, 19.43], tracking);
    expect(tracking.progress?.phase).toBe("riding-direct");
    expect(tracking.offRouteReadings).toBe(1);

    tracking = updateTripTrackingState(direct, [-102.07, 19.43], tracking);
    expect(tracking.progress?.phase).toBe("riding-direct");
    expect(tracking.offRouteReadings).toBe(2);
  });

  it("confirma el desvío y conserva el avance al volver a la ruta", () => {
    let tracking = updateTripTrackingState(
      direct,
      [-102.07, 19.42],
      createTripTrackingState(),
    );
    const reachedRatio = tracking.progress?.progressRatio ?? 0;

    for (let reading = 0; reading < 3; reading += 1) {
      tracking = updateTripTrackingState(direct, [-102.07, 19.43], tracking);
    }

    expect(tracking.progress?.phase).toBe("off-route");
    expect(tracking.progress?.progressRatio).toBe(reachedRatio);

    tracking = updateTripTrackingState(direct, [-102.075, 19.42], tracking);
    expect(tracking.progress?.phase).toBe("riding-direct");
    expect(tracking.progress?.progressRatio).toBe(reachedRatio);
    expect(tracking.offRouteReadings).toBe(0);
  });

  it("confirma la llegada y evita que una deriva GPS la revierta", () => {
    let tracking = updateTripTrackingState(
      direct,
      [-102.07, 19.42],
      createTripTrackingState(),
    );

    tracking = updateTripTrackingState(direct, [-102.06, 19.42], tracking);
    expect(tracking.progress?.phase).toBe("riding-direct");
    expect(tracking.arrivalReadings).toBe(1);

    tracking = updateTripTrackingState(direct, [-102.07, 19.42], tracking);
    expect(tracking.arrivalReadings).toBe(0);

    tracking = updateTripTrackingState(direct, [-102.06, 19.42], tracking);
    tracking = updateTripTrackingState(direct, [-102.06, 19.42], tracking);
    expect(tracking.progress?.phase).toBe("arrived");
    expect(tracking.progress?.progressRatio).toBe(1);

    tracking = updateTripTrackingState(direct, [-102.07, 19.43], tracking);
    expect(tracking.progress?.phase).toBe("arrived");
  });

  it("avanza en orden por los tramos de un transbordo", () => {
    const first = calculateTripProgress(transfer, [-102.07, 19.42]);
    const walking = calculateTripProgress(transfer, [-102.06, 19.42], first.phase);
    const second = calculateTripProgress(transfer, [-102.05, 19.42], walking.phase);

    expect(first.phase).toBe("riding-first");
    expect(walking.phase).toBe("walking-transfer");
    expect(walking.nextRouteName).toBe("Ruta 14");
    expect(second.phase).toBe("riding-second");
    expect(second.progressRatio).toBeGreaterThan(walking.progressRatio);
  });

  it("detecta y recupera un desvío durante el transbordo a pie", () => {
    let tracking = updateTripTrackingState(
      transfer,
      [-102.07, 19.42],
      createTripTrackingState(),
    );
    tracking = updateTripTrackingState(transfer, transfer.transferPoint, tracking);
    expect(tracking.progress?.phase).toBe("walking-transfer");

    for (let reading = 0; reading < 2; reading += 1) {
      tracking = updateTripTrackingState(transfer, [-102.06, 19.43], tracking);
    }
    expect(tracking.progress?.phase).toBe("walking-transfer");

    tracking = updateTripTrackingState(transfer, [-102.06, 19.43], tracking);
    expect(tracking.progress?.phase).toBe("off-route");
    expect(tracking.progress?.nextRouteName).toBe("Ruta 14");

    tracking = updateTripTrackingState(transfer, transfer.transferPoint, tracking);
    expect(tracking.progress?.phase).toBe("walking-transfer");
    expect(tracking.offRouteReadings).toBe(0);
  });

  it("no salta el transbordo cuando la segunda ruta vuelve a pasar cerca", () => {
    const crossingTransfer: TransferTripJourney = {
      ...transfer,
      segmentB: [
        [-102.0615, 19.421],
        [-102.0607, 19.4205],
        [-102.06, 19.42],
        [-102.05, 19.42],
      ],
    };

    const progress = calculateTripProgress(
      crossingTransfer,
      crossingTransfer.transferPoint,
      "riding-first",
    );

    expect(progress.phase).toBe("walking-transfer");
    expect(progress.nextRouteName).toBe("Ruta 14");
  });

  it("marca llegada y genera una clave estable para la sesión", () => {
    const progress = calculateTripProgress(transfer, [-102.04, 19.42], "riding-second");

    expect(progress.phase).toBe("arrived");
    expect(getTripMilestone(progress)).toBe("arrived");
    expect(getTripJourneyKey(direct)).toBe(
      "direct:25:-102.060000,19.420000",
    );
  });

  it("avisa al acercarse al transbordo y al destino", () => {
    const nearTransfer = calculateTripProgress(transfer, [-102.063, 19.42], "riding-first");
    const nearDestination = calculateTripProgress(direct, [-102.063, 19.42], "riding-direct");

    expect(getTripMilestone(nearTransfer)).toBe("transfer-near");
    expect(getTripMilestone(nearDestination)).toBe("destination-near");
  });
});
