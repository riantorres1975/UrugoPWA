import type { Metadata } from "next";
import "./planner.css";

export const metadata: Metadata = {
  title: {
    absolute: "Mapa de rutas de camiones y Teleférico en Uruapan"
  },
  description: "Mapa interactivo para consultar rutas de camiones, Teleférico y conexiones de transporte público en Uruapan.",
  alternates: {
    canonical: "https://www.urugo.app/mapa"
  },
  openGraph: {
    title: "Mapa de rutas de transporte público en Uruapan",
    description: "Consulta rutas urbanas, estaciones del Teleférico y transbordos en Uruapan.",
    url: "https://www.urugo.app/mapa"
  }
};

export default function MapaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
