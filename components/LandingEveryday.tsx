"use client";

import { type ReactNode, useState } from "react";
import { LandingPersonalDay } from "@/components/LandingDeferred";

export default function LandingEveryday({ children }: { children: ReactNode }) {
  const [personalized, setPersonalized] = useState(false);
  const destinations = <div key="destinations">{children}</div>;
  const personalDay = <LandingPersonalDay key="personal" onPersonalizedChange={setPersonalized} />;
  return (
    <div className="wrap section everyday" data-personalized={personalized}>
      {personalized ? [personalDay, destinations] : [destinations, personalDay]}
    </div>
  );
}
