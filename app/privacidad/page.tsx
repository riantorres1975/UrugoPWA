import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import ForceDark from "@/components/ForceDark";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { APP_BRAND } from "@/lib/mobility-config";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: "Aviso de privacidad de UruGo sobre uso de ubicación, datos locales y soporte PWA.",
  alternates: {
    canonical: "https://www.urugo.app/privacidad"
  },
  openGraph: {
    title: "Privacidad | UruGo",
    description: "Cómo UruGo usa la ubicación, el almacenamiento local, la analítica y el asistente de rutas.",
    url: "https://www.urugo.app/privacidad",
    type: "website"
  }
};

const SECTIONS = [
  {
    title: "Uso de ubicación",
    body: `Si autorizas la ubicación, el navegador la usa para encontrar rutas cercanas. ${APP_BRAND.name} no la guarda en una base de datos. Al usar el asistente, la posición se redondea y se procesa temporalmente en el servidor para identificar rutas cercanas; las coordenadas exactas no se envían al proveedor de inteligencia artificial.`
  },
  {
    title: "Datos offline",
    body: "La app puede guardar archivos, datos de rutas, favoritos y viajes recientes en el navegador para mejorar la velocidad y permitir uso parcial sin conexión. Puedes borrar estos datos desde la configuración de tu navegador."
  },
  {
    title: "Reportes comunitarios",
    body: "Si envías una corrección, UruGo guarda el tipo de reporte, la ruta o lugar indicado, tu descripción, el contacto que decidas proporcionar y, si dibujas un recorrido, sus coordenadas aproximadas. Esa propuesta permanece privada durante la revisión. La dirección IP no se conserva: se transforma en una huella no reversible para limitar abuso. Las confirmaciones y reportes resueltos se eliminan después de 180 días; los que sigan abiertos, después de 365 días. La bitácora privada de decisiones se conserva hasta 365 días. Ningún aporte modifica el mapa automáticamente."
  },
  {
    title: "Servicios de terceros",
    body: "Mapbox muestra el mapa y resuelve búsquedas de lugares. Vercel Analytics y Speed Insights recopilan métricas técnicas agregadas. Las mediciones de rendimiento del cálculo solo incluyen rangos de tiempo, motor y tipo de resultado; no contienen coordenadas, nombres de lugares ni el recorrido elegido. UruGo también elimina de la URL los parámetros sensibles. DeepSeek procesa los mensajes que envías voluntariamente al asistente junto con contexto de rutas cercanas. Los errores inesperados generan una huella técnica anónima para detectar fallos repetidos; no se envían el mensaje del error, la traza, las búsquedas ni la ubicación."
  },
  {
    title: "Información referencial",
    body: "Las rutas, tarifas y horarios se muestran como guía para usuarios. Pueden existir cambios operativos que todavía no estén reflejados en la app."
  }
] as const;

export default function PrivacyPage() {
  return (
    <main style={{ background: "#0c110a", color: "#e8f2d8", minHeight: "100dvh" }}>
      <ForceDark />
      <PublicHeader />
      <div className="greca-bg greca-bg-animated px-5 pt-28 pb-8 sm:px-8 lg:px-10">
      <div className="relative z-10 mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Privacidad"
          kicker="Sin trucos, sin letra chica"
          title={
            <>
              Aviso de <span className="italic" style={{ color: "#b8e840" }}>privacidad</span>.
            </>
          }
          intro={`${APP_BRAND.name} es una PWA de consulta de rutas para Uruapan. No requiere cuenta ni crea perfiles de usuario. Este aviso explica qué datos se procesan al usar funciones opcionales.`}
        />

        <div className="mt-10">
          <NotGovernmentNotice variant="full" />
        </div>

        <section className="mt-10 space-y-6">
          {SECTIONS.map((s, i) => (
            <article
              key={s.title}
              className="rounded-2xl border p-6 backdrop-blur"
              style={{ borderColor: "rgba(140,200,80,0.1)", background: "rgba(20,28,16,0.6)" }}
            >
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-xl font-black" style={{ color: "#b8e840" }}>
                  0{i + 1}
                </span>
                <h2 className="font-serif text-xl font-black" style={{ color: "#e8f2d8" }}>
                  {s.title}
                </h2>
              </div>
              <p className="mt-3 text-sm leading-7" style={{ color: "rgba(232,242,216,0.65)" }}>{s.body}</p>
            </article>
          ))}
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/mapa"
            className="cta-shine inline-flex h-11 items-center rounded-full px-5 text-sm font-black transition hover:opacity-90"
            style={{ background: "#6aab48", color: "#e8f2d8" }}
          >
            Volver al mapa →
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full border px-5 text-sm font-bold transition"
            style={{ borderColor: "rgba(140,200,80,0.15)", background: "rgba(106,171,72,0.06)", color: "#e8f2d8" }}
          >
            Inicio
          </Link>
        </div>
      </div>
      </div>
      <PublicFooter />
    </main>
  );
}
