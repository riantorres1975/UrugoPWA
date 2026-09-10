# UruGo

<p align="right">
  <a href="./README.md">Versión en español</a>
</p>

UruGo is a web application for exploring public transport in Uruapan, Michoacán. It brings together local bus routes, the Uruapan cable car, approximate schedules, and a tool for finding travel options between an origin and a destination.

[Open UruGo](https://www.urugo.app) · [View the map](https://www.urugo.app/mapa)

## Preview

<p align="center">
  <img src="./public/readme/inicio-wide.webp" alt="UruGo home page with destination search and map preview" width="920">
</p>

<p align="center"><sub>Search for a destination, compare alternatives, and open the journey directly on the map.</sub></p>

<table>
  <tr>
    <th>Interactive map</th>
    <th>Route selector</th>
    <th>Journey result</th>
  </tr>
  <tr>
    <td align="center"><img src="./public/readme/mapa-narrow.webp" alt="UruGo mobile map" width="260"></td>
    <td align="center"><img src="./public/readme/rutas-narrow.webp" alt="UruGo mobile route selector" width="260"></td>
    <td align="center"><img src="./public/readme/resultado.webp" alt="Journey search result in UruGo" width="260"></td>
  </tr>
  <tr>
    <th>Trip mode: bus</th>
    <th>Trip mode: cable car</th>
    <th>Final walk</th>
  </tr>
  <tr>
    <td align="center"><img src="./public/readme/modo-viaje.webp" alt="Mobile bus trip tracking in UruGo" width="260"></td>
    <td align="center"><img src="./public/readme/modo-viaje-teleferico.webp" alt="Mobile cable car trip tracking in UruGo" width="260"></td>
    <td align="center"><img src="./public/readme/modo-viaje-caminando.webp" alt="Mobile tracking during the final walk" width="260"></td>
  </tr>
</table>

<table>
  <tr>
    <th>Schedules</th>
    <th>User guide</th>
  </tr>
  <tr>
    <td align="center"><img src="./public/readme/horarios.webp" alt="Uruapan route schedules" width="260"></td>
    <td align="center"><img src="./public/readme/guia-narrow.webp" alt="UruGo mobile feature guide" width="260"></td>
  </tr>
</table>

## Main features

- Interactive map with 40 urban bus routes and the Uruapan cable car.
- Search by route number, destination, neighborhood, and known landmarks.
- Local route matching without an external directions API.
- Direct-route and one-transfer suggestions.
- Comparison by walking distance, estimated duration, and fare.
- Schedules, frequency, and service status for each route.
- Favorite routes, saved places, and recent trips stored on the device.
- Shareable links that preserve the route, direction, origin, and destination.
- PWA installation and a basic offline view for selected routes.
- Optional transport assistant grounded in the data available in this repository.
- Account-free community reports with a map tool for drawing corrected route paths.
- Most-viewed routes ranked from aggregated anonymous activity without storing location or identity.

Device location is only accepted as an automatic origin when it is within Uruapan's service area. Users opening the app from another city must choose an origin manually inside Uruapan; an existing destination is kept.

## Reporting an incorrect route

The report form does not require an account. Choose **Pasa por otras calles**, select the route, and open the map to mark the correct streets in order. Add a short reference and send the proposal; it remains private until an administrator reviews it.

<p align="center">
  <img src="./public/readme/reportar-ruta.gif" alt="Animated example showing how to report and draw a route correction in UruGo" width="640">
</p>

<p align="center"><sub>The blue line is the published route and the yellow line is the proposed correction.</sub></p>

## How route matching works

Route paths are stored as GPS polylines in `data/rutas_produccion_final.json`. For each request, the matching engine:

1. Finds the points on each path closest to the origin and destination.
2. Rejects routes that are too far away or travel in the wrong direction.
3. Ranks valid options by walking distance and useful route length.
4. Looks for a reasonable one-transfer combination when no direct route is available.

Matching runs in the browser using project data. Mapbox draws the map and supports place search, but it does not decide which bus route to take.

## Technology

| Technology | Purpose |
| --- | --- |
| Next.js 16 and React 19 | Application, public pages, and internal endpoints |
| TypeScript | Shared types and route-matching logic |
| Tailwind CSS | Styling and responsive layout |
| Mapbox GL JS | Vector map, layers, and markers |
| Vitest | Geometry, schedule, search, and storage tests |
| Service Worker | PWA installation and caching |
| Vercel Analytics | Usage and performance metrics |
| Supabase | Community reports, administrative authentication, and route history |
| Resend and Vercel Cron | Daily moderation digest when pending items exist |

## Local setup

### Requirements

- Node.js 20.9 or newer.
- pnpm 11.
- A Mapbox account and public token.
- A DeepSeek API key only when the optional assistant is needed.

### Installation

```bash
git clone https://github.com/riantorres1975/UrugoPWA.git
cd UrugoPWA
pnpm install
```

The project pins pnpm 11.19.0 and records exact versions in `pnpm-lock.yaml`. Installation rejects versions published within the previous 24 hours and only runs explicitly approved dependency scripts.

Copy `.env.example` to `.env.local` and provide at least the Mapbox token:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_public_token
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Start the development server:

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Yes | Public token for maps and place search |
| `NEXT_PUBLIC_SITE_URL` | No | Base URL used in metadata and shared links |
| `DEEPSEEK_API_KEY` | No | Enables the transport assistant |
| `UPSTASH_REDIS_REST_URL` | No | Shared storage for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis access token |
| `DEBUG_ROUTE_SAVE_ENABLED` | No | Enables route-editor persistence in development |
| `DEBUG_ROUTE_SAVE_TOKEN` | No | Protects the route-editor endpoint when enabled |

Restrict the public Mapbox token by domain in the Mapbox dashboard. Private keys must not use the `NEXT_PUBLIC_` prefix or be committed to the repository.

## Commands

```bash
pnpm dev               # local development server
pnpm build             # production build
pnpm start             # serve the production build
pnpm lint              # ESLint checks
pnpm test              # Vitest suite
pnpm guide:screenshots # refresh application screenshots
pnpm readme:assets     # refresh screenshots and the README report demo
```

## Project layout

```text
app/                  Next.js pages, layouts, and endpoints
components/           map, search, panels, and reusable controls
data/                  GPS paths and supporting transport data
hooks/                 favorites and route sharing
lib/                   geometry, schedules, search, and route matching
public/                manifest, Service Worker, icons, and public assets
tests/                 automated tests
```

Important modules:

- `app/mapa/page.tsx`: coordinates origin, destination, and result state.
- `components/Map.tsx`: manages Mapbox, layers, markers, and camera framing.
- `lib/routeMatcher.ts`: validates and ranks direct routes.
- `lib/transfers.ts`: finds one-transfer combinations.
- `lib/geo.ts`: distance helpers and service-area validation.
- `lib/schedules.ts`: schedule data and estimated service state.

## Data and corrections

The main route source is `data/rutas_produccion_final.json`. A visual editor is available for correcting path segments during development. Its persistence endpoint is disabled by default and should not be exposed publicly without authentication.

Incorrect routes, schedules, or locations can be reported through [`/reportar-error`](https://www.urugo.app/reportar-error).

## Scope and limitations

- UruGo is an independent project and is not operated by the Uruapan city government or transport operators.
- Bus schedules are approximate and may change with traffic, demand, or operating decisions.
- Not every stop is formally marked or mapped.
- Mapbox base maps require a network connection, although some route data may remain cached.
- Route suggestions are guidance and should be checked against actual service conditions.

## Quality checks

Run the following before submitting changes:

```bash
pnpm lint
pnpm test
pnpm build
```

GitHub Actions runs the same checks for repository changes.
