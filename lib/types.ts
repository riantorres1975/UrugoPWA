export type Coordinates = [number, number];

export type RouteDirection = "ida" | "vuelta";

export type ProductionRouteLandmark = {
  name: string;
  point: Coordinates;
};

/** Shape of each entry in data/rutas_produccion_final.json */
export type ProductionRoute = {
  id: number;
  name: string;
  original_name: string;
  color: string;
  corridor_width_m: number;
  verified: boolean;
  last_verified_at?: string | null;
  path: Coordinates[];
  landmarks: ProductionRouteLandmark[];
};

export type RouteData = {
  id: number;
  nombre: string;
  color: string;
  coordenadas: Coordinates[];
};


export type ResolvedRouteData = RouteData & {
  ruta: string;
  direccion: RouteDirection;
  tieneIda: boolean;
  tieneVuelta: boolean;
};
