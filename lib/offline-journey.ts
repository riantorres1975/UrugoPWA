import type { TripJourney } from "@/lib/trip-mode";
import type { Coordinates, ProductionRouteLandmark } from "@/lib/types";
import { getJourneyFareSummary } from "@/lib/journey-guidance";
import { getSchedule } from "@/lib/schedules";

function escape(value: string) { return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!); }
function pointLabel(point: Coordinates, landmarks: ProductionRouteLandmark[] = []) {
  const nearest = landmarks.map((l) => ({ name: l.name, distance: Math.hypot((l.point[0] - point[0]) * 105000, (l.point[1] - point[1]) * 111000) })).sort((a,b) => a.distance - b.distance)[0];
  return `${nearest && nearest.distance < 200 ? `Referencia cercana: ${nearest.name}. ` : ""}Coordenadas: ${point[1].toFixed(5)}, ${point[0].toFixed(5)}`;
}
export function offlineJourneyHtml(journey: TripJourney, now = new Date()) {
  const segments = journey.kind === "direct" ? [journey.segment] : [journey.segmentA, journey.segmentB];
  const names = journey.kind === "direct" ? [journey.routeName] : [journey.routeAName, journey.routeBName];
  const landmarks = journey.kind === "direct" ? [journey.landmarks] : [journey.routeALandmarks, journey.routeBLandmarks];
  const boarding = journey.kind === "direct" ? [journey.boardingStopLabel] : [journey.boardingStopLabel, journey.transferBoardingStopLabel];
  const alighting = journey.kind === "direct" ? [journey.destinationStopLabel] : [journey.transferArrivalStopLabel, journey.destinationStopLabel];
  const steps = segments.flatMap((segment, i) => [
    `Sube a ${names[i]}${boarding[i] ? ` en ${boarding[i]}` : ""}. ${pointLabel(segment[0], landmarks[i])}`,
    `Baja de ${names[i]}${alighting[i] ? ` en ${alighting[i]}` : ""}. ${pointLabel(segment[segment.length - 1], landmarks[i])}`,
    ...(i === 0 && journey.kind === "transfer" ? [`Cambia a ${names[1]}; caminata estimada de ${Math.round(journey.walkMeters)} m. El punto de subida de la segunda ruta está marcado con S2.`] : []),
  ]);
  steps.push(`Camina hasta tu destino. ${pointLabel(journey.destination)}`);
  const all = [...segments.flat(), journey.destination, ...(journey.origin ? [journey.origin] : [])];
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const minX = Math.min(...xs), maxY = Math.max(...ys);
  const scale = Math.min(520 / Math.max(.00001, Math.max(...xs) - minX), 330 / Math.max(.00001, maxY - Math.min(...ys)));
  const xy = (p: Coordinates) => [40 + (p[0] - minX) * scale, 40 + (maxY - p[1]) * scale];
  const marker = (p: Coordinates, label: string) => { const [x,y] = xy(p); return `<circle cx="${x}" cy="${y}" r="7" fill="#fff" stroke="#14200c" stroke-width="2"/><text x="${x + 10}" y="${y - 10}" font-size="14" font-weight="700">${label}</text>`; };
  const svg = `<svg viewBox="0 0 600 410" role="img" aria-label="Esquema del viaje: S indica subida, B bajada, D destino">${segments.map((segment,i) => `<polyline points="${segment.map((p) => xy(p).join(",")).join(" ")}" fill="none" stroke="${i ? "#167744" : "#225bc0"}" stroke-width="4" stroke-linejoin="round"/>${marker(segment[0], `S${i+1}`)}${marker(segment[segment.length-1], `B${i+1}`)}`).join("")}${marker(journey.destination, "D")}</svg>`;
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Mi viaje · UruGo</title><style>body{font-family:system-ui,sans-serif;background:#f4f7ee;color:#14200c;max-width:720px;margin:auto;padding:24px;line-height:1.6}h1{line-height:1.2}svg{background:white;border-radius:12px;width:100%}li{padding:8px 0}small{display:block}footer{border-top:1px solid #809070;margin-top:24px;padding-top:16px}</style><h1>Tu viaje con UruGo</h1><p>${names.map(escape).join(" → ")}</p><p>${escape(getJourneyFareSummary(names).detail)}</p><small>Guardado el ${escape(now.toLocaleString("es-MX", { timeZone: "America/Mexico_City" }))} · Hora de Uruapan</small>${svg}<p>Esquema orientativo, sin mapa de calles. S: subida · B: bajada · D: destino.</p><ol>${steps.map((step) => `<li>${escape(step)}</li>`).join("")}</ol><h2>Horarios de referencia</h2>${names.map((name) => { const s = getSchedule(name); return `<p>${escape(name)}: ${s ? `${escape(s.first)}–${escape(s.last)}` : "Horario no disponible"}</p>`; }).join("")}<footer>Esta ficha funciona sin internet. No contiene GPS, navegación peatonal ni avisos actualizados. Los horarios y caminatas son aproximados; confirma el destino con el conductor. Para planear el regreso, vuelve a UruGo y calcula un nuevo viaje.</footer></html>`;
}
