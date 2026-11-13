import type { Coordinates } from "@/lib/types";

export type VisitorPlace = {
  id: string; label: string; aliases: string[]; category: "Naturaleza" | "Cultura" | "Gastronomía";
  description: string; detail: string; center?: Coordinates;
  source: { label: string; href: string }; checkedAt: string;
};
const municipal = { label: "Turismo de Uruapan", href: "https://uruapan.gob.mx/turismo-cultural-y-natural/" };

// Descriptions checked against primary sources on 2026-11-13. No opening hours,
// entry fees, live events or access guarantees are inferred from these records.
// The first three new coordinates are the place pins linked by municipal tourism,
// not surveyed entrances. The market pin already exists in landmark-places.json.
export const VISITOR_PLACES: VisitorPlace[] = [
  {
    id: "parque-nacional", label: "Parque Nacional Barranca del Cupatitzio",
    aliases: ["parque nacional", "barranca del cupatitzio", "barranca del cupatizio"],
    category: "Naturaleza", description: "Senderos, vegetación y cascadas para conocer el entorno del río Cupatitzio.",
    detail: "Confirma la entrada, horario y tarifa vigentes antes de salir. El punto del mapa es una referencia del sitio.",
    center: [-102.0715251, 19.4241953], source: municipal, checkedAt: "2026-11-13",
  },
  {
    id: "huatapera", label: "Museo Indígena La Huatápera", aliases: ["huatapera", "la huatapera", "museo indigena"],
    category: "Cultura", description: "Un edificio histórico dedicado a las culturas indígenas y las tradiciones de Michoacán.",
    detail: "Plaza Morelos y Vasco de Quiroga, Centro. Confirma el acceso, las exposiciones y el horario con el recinto.",
    source: municipal, checkedAt: "2026-11-13",
  },
  {
    id: "fabrica-san-pedro", label: "Centro Cultural Fábrica de San Pedro", aliases: ["fabrica de san pedro", "fabrica san pedro", "centro cultural san pedro", "antigua fabrica"],
    category: "Cultura", description: "Arte contemporáneo, diseño y cultura alimentaria en una antigua fábrica textil.",
    detail: "Revisa su programación antes de visitar: las exposiciones y actividades pueden cambiar.",
    center: [-102.0680771, 19.4189717], source: { label: "Fábrica de San Pedro", href: "https://fabricadesanpedro.com/" }, checkedAt: "2026-11-13",
  },
  {
    id: "casa-angosta", label: "La Casa Más Angosta del Mundo", aliases: ["casa mas angosta", "casa angosta", "casa mas estrecha"],
    category: "Cultura", description: "Una curiosidad arquitectónica de Uruapan conocida por su fachada de apenas 1.40 metros de ancho.",
    detail: "Confirma si hay visitas al interior y sus condiciones de acceso; no se garantiza que esté abierta.",
    center: [-102.06593, 19.425588], source: municipal, checkedAt: "2026-11-13",
  },
  {
    id: "mercado-antojitos", label: "Mercado de Antojitos", aliases: ["mercado de antojitos", "mercado antojitos", "antojitos"],
    category: "Gastronomía", description: "Un mercado del Centro para conocer la cocina tradicional michoacana.",
    detail: "Los puestos tienen horarios y precios propios. Confírmalos directamente al visitar.",
    center: [-102.0618494, 19.4216059], source: { label: "Turismo gastronómico de Uruapan", href: "https://uruapan.gob.mx/turismo-gastronomico/" }, checkedAt: "2026-11-13",
  },
  {
    id: "la-camelina", label: "Parque Lineal La Camelina", aliases: ["la camelina", "la espumita"],
    category: "Naturaleza", description: "Andadores de piedra, vegetación y pequeñas cascadas para un paseo junto al río Cupatitzio.",
    detail: "También se conoce como La Espumita. Ubica y confirma el acceso en el mapa antes de planear el trayecto.",
    source: municipal, checkedAt: "2026-11-13",
  },
];
