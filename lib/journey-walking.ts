import type { Coordinates } from "@/lib/types";

export type WalkingLeg = {
  from: Coordinates;
  to: Coordinates;
  coordinates: Coordinates[];
  distanceM: number;
  minutes: number;
  status: "street" | "approximate" | "unreachable";
};

export type JourneyWalking = {
  origin: WalkingLeg;
  destination: WalkingLeg;
  transfer?: WalkingLeg;
};

export function walkingLegs(walking: JourneyWalking): WalkingLeg[] {
  return [walking.origin, ...(walking.transfer ? [walking.transfer] : []), walking.destination];
}

export function hasStreetWalking(walking?: JourneyWalking) {
  return !!walking && walkingLegs(walking).every((leg) => leg.status === "street");
}
