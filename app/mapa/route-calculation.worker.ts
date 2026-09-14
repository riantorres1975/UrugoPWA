import {
  calculateRouteOptions,
  prepareRouteCalculations,
  type RouteCalculationWorkerRequest,
  type RouteCalculationWorkerResponse,
} from "@/lib/route-calculation";
import type { PolylineRoute } from "@/lib/routeMatcher";

type WorkerScope = {
  onmessage: ((event: MessageEvent<RouteCalculationWorkerRequest>) => void) | null;
  postMessage(message: RouteCalculationWorkerResponse): void;
};

const workerScope = self as unknown as WorkerScope;
let routes: PolylineRoute[] = [];

workerScope.onmessage = (event) => {
  const message = event.data;

  if (message.type === "initialize") {
    routes = message.routes;
    prepareRouteCalculations(routes);
    return;
  }

  try {
    workerScope.postMessage({
      type: "result",
      requestId: message.requestId,
      key: message.key,
      result: calculateRouteOptions(routes, message.origin, message.destination, message.preference),
    });
  } catch {
    workerScope.postMessage({
      type: "error",
      requestId: message.requestId,
      key: message.key,
    });
  }
};

export {};
