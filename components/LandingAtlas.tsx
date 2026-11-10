"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, BusFront, CableCar } from "lucide-react";
import { FARES_2026, TELEFERICO_URUAPAN } from "@/lib/mobility-config";

export default function LandingAtlas() {
  const [mode, setMode] = useState<"bus" | "cable">("cable");
  const isBus = mode === "bus";
  const Icon = isBus ? BusFront : CableCar;
  const fare = isBus ? FARES_2026.urbanBus.price : FARES_2026.teleferico.price;
  const href = isBus ? "/mapa?r=Ruta%2011" : "/teleferico-uruapan-horario";

  return (
    <figure className="atlas" aria-label="Vista de la red de transporte de Uruapan">
      <Image
        src={isBus ? "/landing/red-uruapan.svg#camion" : "/landing/red-uruapan.svg"}
        alt=""
        width={700}
        height={565}
        unoptimized
        loading="eager"
        className="atlas-image"
      />
      <div className="atlas-top">
        <span className="micro atlas-label"><i aria-hidden="true" /> Esquema de la red</span>
        <div className="atlas-modes" role="group" aria-label="Transporte mostrado">
          <button type="button" aria-pressed={isBus} onClick={() => setMode("bus")}>Camión</button>
          <button type="button" aria-pressed={!isBus} onClick={() => setMode("cable")}>Teleférico</button>
        </div>
      </div>
      <figcaption className="atlas-footer">
        <div className="home-row">
          <span className="mode-icon"><Icon size={19} aria-hidden="true" /></span>
          <div aria-live="polite">
            <strong>{isBus ? "Ruta 11" : "Teleférico Uruapan"}</strong>
            <small>{isBus ? "Camión urbano" : `${TELEFERICO_URUAPAN.stations.length} estaciones`} · {fare.replace(/\.00$/, "")} MXN</small>
          </div>
        </div>
        <Link href={href} aria-label={isBus ? "Ver la Ruta 11 en el mapa" : "Ver información del Teleférico"}>
          <ArrowUpRight size={19} aria-hidden="true" />
        </Link>
      </figcaption>
    </figure>
  );
}
