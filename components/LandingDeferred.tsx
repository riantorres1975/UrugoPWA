"use client";

import dynamic from "next/dynamic";

export const LandingPersonalDay = dynamic(() => import("@/components/PersonalDay"), {
  ssr: false,
  loading: () => (
    <div id="tu-dia" className="daily daily-loading" aria-busy="true">
      <p className="micro label">Tu espacio personal</p>
      <h2 id="daily-title">Tu día</h2>
      <p>Accede a tus viajes y destinos guardados en este dispositivo.</p>
    </div>
  ),
});

export const LandingJourneyDemo = dynamic(() => import("@/components/LandingJourneyDemo"));
