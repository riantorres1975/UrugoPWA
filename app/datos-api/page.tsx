import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Braces,
  Database,
  ExternalLink,
  FileJson2,
  GitPullRequest,
  KeyRound,
  Route,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import ForceDark from "@/components/ForceDark";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { SITE_CONTENT_LAST_UPDATED_ISO } from "@/lib/mobility-config";
import { PROJECT } from "@/lib/project";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Datos y API de rutas",
  description: "Consulta la API pública de recorridos de UruGo y conoce cómo se revisan las correcciones comunitarias antes de publicarse.",
  alternates: { canonical: `${SITE_URL}/datos-api` },
  openGraph: {
    title: "Datos y API de UruGo",
    description: "Recorridos de transporte de Uruapan en JSON, con versiones, caché y revisión comunitaria.",
    url: `${SITE_URL}/datos-api`,
    siteName: "UruGo",
    type: "website",
  },
};

const endpoint = `${SITE_URL}/api/v1/routes`;
const submissionEndpoint = `${SITE_URL}/api/v1/community/reports`;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebAPI",
  name: "API de rutas UruGo",
  url: endpoint,
  documentation: `${SITE_URL}/datos-api`,
  provider: { "@id": `${SITE_URL}/#organization` },
  dateModified: SITE_CONTENT_LAST_UPDATED_ISO,
  areaServed: { "@type": "City", name: "Uruapan" },
};

const responseExample = `{
  "meta": {
    "version": "supabase-…-81",
    "source": "supabase",
    "count": 81
  },
  "routes": [
    {
      "id": 1,
      "name": "Ruta 1 - San José",
      "original_name": "Ruta 1 - San José (Ida)",
      "color": "#…",
      "path": [[-102.0, 19.4]],
      "landmarks": []
    }
  ]
}`;

const submissionExample = `curl -X POST ${submissionEndpoint} \\
  -H "Authorization: Bearer urugo_sk_TU_CLAVE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "reportType": "route_inactive",
    "routeKey": "ruta-14-llanitos",
    "routeName": "Ruta 14",
    "place": "Llanitos",
    "description": "Vecinos indican que esta ruta ya no circula.",
    "evidenceUrl": "https://ejemplo.com/evidencia"
  }'`;

export default function DataApiPage() {
  return (
    <main className="public-page min-h-dvh bg-[#0c110a] text-[var(--public-ink)]" data-theme="dark">
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublicHeader />

      <article>
        <header className="border-b border-[var(--public-border)] px-5 pb-16 pt-28 sm:px-8 lg:py-16 lg:pt-32">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
              <div>
                <p className="text-[11px] font-bold uppercase text-[#57d6e8]">Consulta pública · Escritura moderada</p>
                <h1 className="mt-5 max-w-4xl public-page-title">
                  Datos y API <span className="text-[var(--public-accent)]">de UruGo.</span>
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--public-secondary)] sm:text-lg">
                  Los recorridos que alimentan el mapa se pueden consultar en JSON. Las propuestas de cambio pasan por revisión humana antes de llegar a esta respuesta.
                </p>
                <a
                  href="/api/v1/openapi"
                  download="urugo-openapi.json"
                  className="mt-7 inline-flex min-h-11 items-center gap-2 border border-[#57d6e8]/40 px-4 text-sm font-bold text-[var(--public-ink)] transition hover:border-[#57d6e8] hover:text-white"
                >
                  <FileJson2 className="h-4 w-4 text-[#57d6e8]" aria-hidden="true" />
                  Descargar OpenAPI
                </a>
              </div>

              <dl className="grid grid-cols-3 border-y border-[var(--public-border)] py-5 lg:grid-cols-1 lg:gap-4 lg:border-y-0 lg:border-l lg:py-0 lg:pl-8">
                <div><dt className="text-[10px] font-bold uppercase text-[var(--public-muted)]">Versión</dt><dd className="mt-1 font-sans text-xl font-bold">v1</dd></div>
                <div><dt className="text-[10px] font-bold uppercase text-[var(--public-muted)]">Formato</dt><dd className="mt-1 font-sans text-xl font-bold">JSON</dd></div>
                <div><dt className="text-[10px] font-bold uppercase text-[var(--public-muted)]">Lectura</dt><dd className="mt-1 font-sans text-xl font-bold">Pública</dd></div>
              </dl>
            </div>
          </div>
        </header>

        <section className="px-5 py-16 sm:px-8 lg:py-16" aria-labelledby="endpoint-title">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)]">
              <div>
                <Database className="h-8 w-8 text-[#57d6e8]" strokeWidth={1.6} aria-hidden="true" />
                <h2 id="endpoint-title" className="mt-5 public-section-title">Un punto de entrada.</h2>
                <p className="mt-4 text-sm leading-7 text-[var(--public-secondary)]">Devuelve únicamente recorridos activos y publicados. Si la base remota falla, UruGo conserva un respaldo estático.</p>
              </div>

              <div className="min-w-0 border-y border-[var(--public-border)]">
                <div className="flex flex-col gap-3 border-b border-[var(--public-border)] py-5 sm:flex-row sm:items-center">
                  <span className="w-fit bg-[#b8e840] px-2 py-1 text-[11px] font-bold text-[#0c110a]">GET</span>
                  <code className="min-w-0 break-all text-sm text-[var(--public-ink)]">{endpoint}</code>
                  <a href={endpoint} target="_blank" rel="noreferrer" aria-label="Abrir respuesta de la API" title="Abrir respuesta" className="grid h-9 w-9 shrink-0 place-items-center border border-[var(--public-border)] text-[var(--public-secondary)] transition hover:border-[#57d6e8]/60 hover:text-[var(--public-ink)] sm:ml-auto">
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
                <pre className="overflow-x-auto py-6 text-xs leading-6 text-[#9fc083]"><code>{`curl -H "Accept: application/json" \\\n+  ${endpoint}`}</code></pre>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--public-border)] bg-[var(--public-surface)] px-5 py-16 sm:px-8 lg:py-16" aria-labelledby="write-api-title">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid gap-12 lg:grid-cols-[300px_minmax(0,1fr)]">
              <div>
                <KeyRound className="h-8 w-8 text-[#f4c84a]" strokeWidth={1.6} aria-hidden="true" />
                <p className="mt-6 text-[11px] font-bold uppercase text-[#f4c84a]">Acceso por invitación</p>
                <h2 id="write-api-title" className="mt-3 public-section-title">Aportes desde otros proyectos.</h2>
                <p className="mt-4 text-sm leading-7 text-[var(--public-secondary)]">
                  Organizaciones y herramientas locales pueden solicitar una clave para enviar correcciones. Cada clave tiene cuota propia, puede revocarse y nunca permite editar una ruta publicada.
                </p>
              </div>

              <div className="min-w-0">
                <div className="flex flex-col gap-3 border-y border-[var(--public-border)] py-5 sm:flex-row sm:items-center">
                  <span className="w-fit bg-[#f4c84a] px-2 py-1 text-[11px] font-bold text-[#0c110a]">POST</span>
                  <code className="min-w-0 break-all text-sm text-[var(--public-ink)]">{submissionEndpoint}</code>
                  <span className="text-xs font-bold text-[var(--public-muted)] sm:ml-auto">Servidor a servidor</span>
                </div>
                <pre className="max-h-[440px] overflow-auto border-b border-[var(--public-border)] py-6 text-[11px] leading-6 text-[#9fc083]"><code>{submissionExample}</code></pre>

                <ol className="grid border-b border-[var(--public-border)] sm:grid-cols-3">
                  <li className="py-5 sm:border-r sm:border-[var(--public-border)] sm:pr-5"><span className="font-sans text-2xl font-bold text-[var(--public-accent)]">01</span><p className="mt-2 text-sm font-bold">Recibir</p><p className="mt-2 text-xs leading-5 text-[var(--public-muted)]">La propuesta entra como pendiente.</p></li>
                  <li className="border-t border-[var(--public-border)] py-5 sm:border-r sm:border-t-0 sm:border-[var(--public-border)] sm:px-5"><span className="font-sans text-2xl font-bold text-[var(--public-accent)]">02</span><p className="mt-2 text-sm font-bold">Comprobar</p><p className="mt-2 text-xs leading-5 text-[var(--public-muted)]">El equipo revisa fuente y recorrido.</p></li>
                  <li className="border-t border-[var(--public-border)] py-5 sm:border-t-0 sm:pl-5"><span className="font-sans text-2xl font-bold text-[var(--public-accent)]">03</span><p className="mt-2 text-sm font-bold">Publicar</p><p className="mt-2 text-xs leading-5 text-[var(--public-muted)]">Una acción separada crea la versión.</p></li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 lg:py-16" aria-labelledby="contract-title">
          <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
            <div>
              <p className="text-[11px] font-bold uppercase text-[var(--public-muted)]">Contrato de respuesta</p>
              <h2 id="contract-title" className="mt-3 public-section-title">Lo necesario para dibujar una ruta.</h2>
              <div className="mt-8 divide-y divide-[var(--public-border)] border-y border-[var(--public-border)]">
                <div className="grid gap-3 py-5 sm:grid-cols-[160px_1fr]"><p className="text-sm font-bold">Identidad</p><p className="text-sm leading-6 text-[var(--public-secondary)]"><code>id</code>, nombre público y nombre de dirección.</p></div>
                <div className="grid gap-3 py-5 sm:grid-cols-[160px_1fr]"><p className="text-sm font-bold">Geometría</p><p className="text-sm leading-6 text-[var(--public-secondary)]">Coordenadas <code>[longitud, latitud]</code>, ancho de corredor y color.</p></div>
                <div className="grid gap-3 py-5 sm:grid-cols-[160px_1fr]"><p className="text-sm font-bold">Referencias</p><p className="text-sm leading-6 text-[var(--public-secondary)]">Lugares revisados que ayudan a reconocer el recorrido.</p></div>
              </div>
            </div>

            <div className="min-w-0 border border-[var(--public-border)] bg-[#090d08]">
              <div className="flex items-center gap-2 border-b border-[var(--public-border)] px-5 py-4 text-xs font-bold text-[var(--public-secondary)]"><Braces className="h-4 w-4 text-[#57d6e8]" /> Respuesta abreviada</div>
              <pre className="max-h-[440px] overflow-auto p-5 text-[11px] leading-6 text-[#9fc083]"><code>{responseExample}</code></pre>
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--public-border)] bg-[var(--public-surface)] px-5 py-16 sm:px-8 lg:py-16" aria-labelledby="rules-title">
          <div className="mx-auto max-w-[1240px]">
            <h2 id="rules-title" className="max-w-3xl public-section-title">Reglas pequeñas, datos más confiables.</h2>
            <div className="mt-10 grid border-y border-[var(--public-border)] md:grid-cols-3">
              <div className="border-b border-[var(--public-border)] py-7 md:border-b-0 md:border-r md:pr-8"><TimerReset className="h-6 w-6 text-[var(--public-accent)]" /><h3 className="mt-6 font-sans text-2xl font-bold">Caché consciente</h3><p className="mt-3 text-sm leading-7 text-[var(--public-secondary)]">La respuesta puede almacenarse una hora y publica <code>ETag</code> para evitar descargas repetidas.</p></div>
              <div className="border-b border-[var(--public-border)] py-7 md:border-b-0 md:border-r md:px-8"><Route className="h-6 w-6 text-[#57d6e8]" /><h3 className="mt-6 font-sans text-2xl font-bold">Lectura desde otras apps</h3><p className="mt-3 text-sm leading-7 text-[var(--public-secondary)]">El endpoint admite CORS para solicitudes <code>GET</code>. No expone contactos, reportes ni identificadores comunitarios.</p></div>
              <div className="py-7 md:pl-8"><ShieldCheck className="h-6 w-6 text-[#f4c84a]" /><h3 className="mt-6 font-sans text-2xl font-bold">Escritura controlada</h3><p className="mt-3 text-sm leading-7 text-[var(--public-secondary)]">Las integraciones autorizadas sólo crean propuestas pendientes. Cada corrección se modera y publica como una versión nueva.</p></div>
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--public-border)] px-5 py-16 sm:px-8 lg:py-20">
          <div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div>
              <GitPullRequest className="h-7 w-7 text-[var(--public-accent)]" strokeWidth={1.6} aria-hidden="true" />
              <h2 className="mt-5 public-section-title">¿El dato ya cambió?</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--public-secondary)]">Envía la ruta, una referencia y, cuando sea posible, evidencia o un trazo aproximado. Dos aportes independientes ayudan a confirmar actividad; un administrador decide qué se publica.</p>
              <Link href="/reportar-error" className="mt-7 inline-flex min-h-12 items-center gap-2 bg-[#6aab48] px-5 text-sm font-bold text-[#0c110a] transition hover:bg-[#7cbd59]">Proponer una corrección <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="border-l border-[var(--public-border)] pl-6 text-sm leading-7 text-[var(--public-muted)] sm:pl-8">
              <p className="font-bold text-[var(--public-ink)]">Reutilización</p>
              <p className="mt-3">La consulta es pública, pero el conjunto completo todavía no tiene una licencia general de redistribución. Algunas referencias derivan de OpenStreetMap y conservan su atribución ODbL.</p>
              <Link href={PROJECT.repositoryUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 font-bold text-[var(--public-accent)]">Revisar código y fuentes <ExternalLink className="h-3.5 w-3.5" /></Link>
            </div>
          </div>
        </section>
      </article>

      <PublicFooter />
    </main>
  );
}
