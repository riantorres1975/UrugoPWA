import rutasProduccion from "@/data/rutas_produccion_final.json";

type RawRoute = {
  name: string;
  color: string;
  path: number[][];
};

export function buildRouteStaticMapUrl(
  routeName: string,
  color: string,
  width = 800,
  height = 220,
  options: { padding?: number } = {}
): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const routes = (rutasProduccion as unknown as RawRoute[]).filter(
    (r) => r.name === routeName
  );
  if (routes.length === 0) return null;

  const features = routes.map((r, i) => ({
    type: "Feature",
    geometry: { type: "LineString", coordinates: r.path },
    properties: {
      stroke: color,
      "stroke-width": 4,
      "stroke-opacity": i === 0 ? 1 : 0.55,
    },
  }));

  const geojson = JSON.stringify({ type: "FeatureCollection", features });
  const encoded = encodeURIComponent(geojson);

  // padding: top,right,bottom,left in px (extra horizontal to avoid clipping)
  const padding = options.padding ?? "50,70,50,70";
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/geojson(${encoded})/auto/${width}x${height}@2x?access_token=${token}&padding=${padding}`;
}
