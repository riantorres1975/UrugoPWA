import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ForceDark from "@/components/ForceDark";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { FARES_2026 } from "@/lib/mobility-config";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Guía para usar UruGo",
  description:
    "Aprende a buscar rutas, marcar origen y destino, usar el modo viaje, consultar horarios y moverte en camión o Teleférico con UruGo.",
  alternates: { canonical: `${SITE_URL}/guia` },
  openGraph: {
    title: "Guía para usar UruGo",
    description: "Todas las funciones de UruGo explicadas paso a paso y con capturas reales.",
    url: `${SITE_URL}/guia`,
    type: "article",
  },
};

const QUICK_STEPS = [
  {
    number: "01",
    title: "Define tu origen",
    body: "Permite la ubicación o busca una colonia, calle o lugar. También puedes marcar el punto directamente en el mapa.",
    color: "#b8e840",
  },
  {
    number: "02",
    title: "Marca tu destino",
    body: "Escribe un lugar conocido o toca el mapa. UruGo solo calcula viajes dentro del área de Uruapan.",
    color: "#51c8e8",
  },
  {
    number: "03",
    title: "Compara las opciones",
    body: "Revisa tiempo, caminata, costo, alternativas y, cuando sea necesario, opciones con transbordo.",
    color: "#ff8a65",
  },
  {
    number: "04",
    title: "Inicia el viaje",
    body: "Activa el seguimiento para recibir referencias, aviso de bajada y orientación durante un transbordo.",
    color: "#a78bfa",
  },
] as const;

const TOOL_FEATURES = [
  {
    title: "Rutas cerca de mí",
    body: "Usa el botón de ubicación para detectar qué recorridos pasan cerca. La ubicación no se guarda en una base de datos propia.",
    icon: "location",
  },
  {
    title: "Favoritos",
    body: "Toca la estrella junto a una ruta para dejarla al principio del selector. Se guarda únicamente en tu navegador.",
    icon: "star",
  },
  {
    title: "Viajes recientes",
    body: "UruGo conserva hasta tres viajes recientes en el dispositivo para repetirlos sin escribir todo otra vez.",
    icon: "history",
  },
  {
    title: "Compartir viaje",
    body: "El botón de compartir crea un enlace con origen, destino y ruta para enviarlo a otra persona.",
    icon: "share",
  },
  {
    title: "Asistente de rutas",
    body: "Abre el botón de conversación para preguntar por rutas, lugares, tarifas u horarios en lenguaje cotidiano.",
    icon: "chat",
  },
  {
    title: "Instalar la app",
    body: "Desde el aviso de instalación o el menú del navegador puedes agregar UruGo a la pantalla de inicio, sin tienda ni cuenta.",
    icon: "download",
  },
  {
    title: "Uso sin conexión",
    body: "La aplicación y los datos guardados siguen disponibles parcialmente. El mapa base puede necesitar internet para cargar zonas nuevas.",
    icon: "offline",
  },
  {
    title: "Reportar un error",
    body: "Envía la ruta, referencia y corrección esperada. Desde el selector, UruGo completa parte del contexto automáticamente.",
    icon: "alert",
  },
] as const;

const FAQS = [
  {
    question: "¿Necesito crear una cuenta?",
    answer: "No. UruGo funciona sin registro. Favoritos y viajes recientes se guardan localmente en tu navegador.",
  },
  {
    question: "¿Qué ocurre si estoy fuera de Uruapan?",
    answer:
      "La app no calcula el viaje desde una ubicación lejana. Debes buscar o marcar manualmente un origen dentro de Uruapan.",
  },
  {
    question: "¿Las referencias son paradas oficiales?",
    answer:
      "No necesariamente. Sirven para orientarte sobre lugares visibles por donde pasa la ruta. En camión puedes pedir la parada en el recorrido; en el Teleférico solo se sube y baja en estaciones.",
  },
  {
    question: "¿Los horarios y tiempos son exactos?",
    answer:
      "Son aproximados. El tráfico, la frecuencia y cambios de operación pueden modificar el tiempo real del viaje.",
  },
] as const;

function GuideIcon({ name }: { name: string }) {
  const common = "h-5 w-5";
  if (name === "star") {
    return <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  }
  if (name === "history") {
    return <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (name === "share") {
    return <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true"><path d="m8.5 13.5 7-4M8.5 10.5l7 4M8 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm14-5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  }
  if (name === "chat") {
    return <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true"><path d="M4 5h16v12H9l-5 4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  }
  if (name === "download") {
    return <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v3h14v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (name === "offline") {
    return <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true"><path d="M4 8.5A12 12 0 0 1 18.8 7M7 12a7.5 7.5 0 0 1 7.7-1.2M10.2 15.3a3 3 0 0 1 3.3-.2M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  }
  if (name === "alert") {
    return <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true"><path d="M12 3 2.8 20h18.4L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 9v5m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  }
  return <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden="true"><path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" /></svg>;
}

function PhoneScreenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mx-auto w-full max-w-[330px] overflow-hidden rounded-lg border border-[var(--public-border)] bg-black shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
      <Image src={src} alt={alt} width={780} height={1688} sizes="(max-width: 768px) 84vw, 330px" className="h-auto w-full" />
    </div>
  );
}

export default function GuidePage() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Cómo planear un viaje con UruGo",
    description: "Guía para encontrar una ruta de transporte público en Uruapan.",
    totalTime: "PT1M",
    step: QUICK_STEPS.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.body,
      url: `${SITE_URL}/guia#inicio-rapido`,
    })),
  };

  return (
    <main className="public-page min-h-dvh bg-[#0c110a] text-[var(--public-ink)]" data-theme="dark">
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />

      <PublicHeader active="guia" />

      <header className="relative flex min-h-[480px] items-end overflow-hidden border-b border-[var(--public-border)] pt-[72px] md:min-h-[560px]">
        <Image
          src="/screenshots/mapa-wide.png"
          alt="Mapa de UruGo mostrando las rutas de transporte de Uruapan"
          fill
          preload
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,#0c110a_0%,rgba(12,17,10,0.78)_36%,rgba(12,17,10,0.12)_78%)]" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8 md:pb-20">
          <p className="mb-4 text-sm font-bold uppercase text-[var(--public-accent)]">Guía completa de UruGo</p>
          <h1 className="max-w-4xl public-page-title">
            Muévete con la app,<br />sin adivinar.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--public-ink)] md:text-lg md:leading-8">
            Aprende a buscar un destino, comparar rutas, hacer transbordos y seguir tu viaje. Las pantallas de esta guía son capturas reales de UruGo.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#inicio-rapido" className="inline-flex h-12 items-center rounded-md bg-[#b8e840] px-6 text-sm font-bold text-[#0c110a] transition hover:bg-white">
              Empezar la guía
            </a>
            <Link href="/mapa?cerca=1" className="inline-flex h-12 items-center rounded-md border border-white/25 bg-black/30 px-6 text-sm font-bold text-white backdrop-blur transition hover:border-white/50">
              Ver rutas cercanas
            </Link>
          </div>
        </div>
      </header>

      <nav
        aria-label="Secciones de la guía"
        className="sticky top-[72px] z-40 touch-pan-x overflow-x-auto overscroll-x-contain border-b border-[var(--public-border)] bg-[#0c110a]/95 backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto flex min-w-max max-w-6xl gap-1 px-4 py-2 sm:px-8">
          {[
            ["#inicio-rapido", "Inicio rápido"],
            ["#planear", "Planear"],
            ["#rutas", "Explorar rutas"],
            ["#modo-viaje", "Modo viaje"],
            ["#consultar", "Horarios"],
            ["#herramientas", "Más funciones"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-md px-3 py-2 text-xs font-bold text-[var(--public-secondary)] transition hover:bg-white/5 hover:text-white">
              {label}
            </a>
          ))}
        </div>
      </nav>

      <section id="inicio-rapido" className="scroll-mt-36 border-b border-[var(--public-border)] px-5 py-16 sm:px-8 md:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase text-[var(--public-muted)]">Lo esencial</p>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className="max-w-2xl public-section-title">Planea tu viaje en cuatro pasos.</h2>
            <p className="max-w-md text-sm leading-7 text-[var(--public-secondary)]">No necesitas instalar nada ni crear una cuenta. El mapa funciona desde el navegador del teléfono o la computadora.</p>
          </div>
          <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_STEPS.map((step) => (
              <li key={step.number} className="min-h-[230px] rounded-lg border border-[var(--public-border)] bg-[var(--public-surface)] p-5">
                <span className="font-sans text-3xl font-bold" style={{ color: step.color }}>{step.number}</span>
                <h3 className="mt-8 text-lg font-bold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--public-secondary)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="planear" className="scroll-mt-36 border-b border-[var(--public-border)] bg-[var(--public-surface)] px-5 py-16 sm:px-8 md:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="text-sm font-bold uppercase text-[#ff8a65]">Planear un viaje</p>
            <h2 className="mt-2 public-section-title">Origen, destino y una ruta que sí te sirve.</h2>
            <div className="mt-8 space-y-7">
              <div><h3 className="text-lg font-bold">1. Elige el origen</h3><p className="mt-2 text-sm leading-7 text-[var(--public-secondary)]">Usa tu GPS, busca un lugar o toca el mapa. Si estás fuera de Uruapan, la app te pedirá marcar un origen dentro de la ciudad.</p></div>
              <div><h3 className="text-lg font-bold">2. Busca el destino</h3><p className="mt-2 text-sm leading-7 text-[var(--public-secondary)]">Puedes escribir una colonia, hospital, escuela, plaza o punto de referencia. Si no aparece, márcalo directamente en el mapa.</p></div>
              <div><h3 className="text-lg font-bold">3. Revisa el resultado</h3><p className="mt-2 text-sm leading-7 text-[var(--public-secondary)]">La tarjeta muestra ruta recomendada, tiempo aproximado, caminata, tarifa y alternativas. Toca otra alternativa para comparar su recorrido.</p></div>
              <div><h3 className="text-lg font-bold">Cuando necesitas transbordo</h3><p className="mt-2 text-sm leading-7 text-[var(--public-secondary)]">UruGo propone combinaciones de dos rutas, indica cuánto caminar entre ellas y usa referencias cercanas para ubicar el cambio.</p></div>
            </div>
            <Link href="/mapa" className="mt-8 inline-flex h-11 items-center rounded-md bg-[#ff8a65] px-5 text-sm font-bold text-[#0c110a] transition hover:bg-white">Planear un viaje</Link>
          </div>
          <PhoneScreenshot src="/guide/resultado.png" alt="Resultado de una ruta recomendada con tiempo, tarifa, alternativas e indicaciones" />
        </div>
      </section>

      <section id="rutas" className="scroll-mt-36 border-b border-[var(--public-border)] px-5 py-16 sm:px-8 md:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[360px_minmax(0,1fr)]">
          <PhoneScreenshot src="/screenshots/rutas-narrow.png" alt="Selector de rutas de UruGo con búsqueda, favoritos y acceso al Teleférico" />
          <div>
            <p className="text-sm font-bold uppercase text-[#51c8e8]">Explorar rutas</p>
            <h2 className="mt-2 public-section-title">Encuentra una ruta por número, colonia o referencia.</h2>
            <ul className="mt-8 space-y-5 text-sm leading-7 text-[var(--public-secondary)]">
              <li><strong className="text-white">Botón Rutas:</strong> abre el directorio de los 40 recorridos urbanos y el acceso al Teleférico.</li>
              <li><strong className="text-white">Buscador:</strong> acepta nombres de ruta, destinos y lugares cercanos al recorrido, como “Tec Uruapan”.</li>
              <li><strong className="text-white">Estrella:</strong> guarda una ruta como favorita para encontrarla primero.</li>
              <li><strong className="text-white">Ida y vuelta:</strong> al seleccionar una ruta puedes cambiar el sentido y ver sus indicaciones sobre el trazo.</li>
              <li><strong className="text-white">Botón del ojo:</strong> alterna entre líneas tenues y rutas destacadas para leer mejor el mapa completo.</li>
              <li><strong className="text-white">Teleférico:</strong> abre su línea, estaciones, horario, costo y guía especial.</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/rutas" className="inline-flex h-11 items-center rounded-md bg-[#51c8e8] px-5 text-sm font-bold text-[#0c110a] transition hover:bg-white">Directorio de rutas</Link>
              <Link href="/mapa?r=Ruta%2027" className="inline-flex h-11 items-center rounded-md border border-[var(--public-border)] px-5 text-sm font-bold text-white transition hover:border-white/40">Ver una ruta</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="modo-viaje" className="scroll-mt-36 border-b border-[var(--public-border)] bg-[var(--public-surface)] px-5 py-16 sm:px-8 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-4xl">
            <p className="text-sm font-bold uppercase text-[#a78bfa]">Modo viaje</p>
            <h2 className="mt-2 public-section-title">Acompañamiento desde que subes hasta que bajas.</h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--public-secondary)]">Después de elegir una opción, toca <strong className="text-white">Iniciar viaje</strong>. La app sigue tu avance con el GPS sin obligarte a mantener el mapa centrado.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                ["Marcador del viaje", "Cambia entre caminar, camión y cabina del Teleférico, y avanza suavemente sobre el recorrido."],
                ["Referencia próxima", "Muestra un lugar reconocible y su distancia aproximada."],
                ["Aviso de bajada", "Te prepara cuando te acercas al destino o al transbordo."],
                ["Cambio de ruta", "Distingue el primer tramo, la caminata y la segunda ruta."],
                ["Fuera del recorrido", "Te avisa después de varias lecturas alejadas, evitando falsas alarmas por el GPS."],
              ].map(([title, body]) => (
                <div key={title} className="rounded-lg border border-[var(--public-border)] bg-[#0c110a] p-4">
                  <h3 className="font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--public-secondary)]">{body}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 border-l-2 border-[#a78bfa] pl-4 text-sm leading-7 text-[var(--public-ink)]">Las referencias ayudan a orientarte, pero no son paradas oficiales. En el Teleférico, el cálculo de abordaje y bajada siempre usa estaciones.</p>
          </div>
          <div
            role="region"
            aria-label="Ejemplos del modo viaje"
            tabIndex={0}
            className="-mx-5 mt-12 overflow-x-auto px-5 pb-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8e840] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0"
          >
            <div className="flex w-max snap-x snap-mandatory gap-5 lg:grid lg:w-full lg:grid-cols-3">
              {[
                ["En camión", "/guide/modo-viaje.png", "Modo viaje de UruGo mostrando el camión animado sobre una ruta urbana"],
                ["En Teleférico", "/guide/modo-viaje-teleferico.png", "Modo viaje de UruGo mostrando la cabina animada sobre el recorrido del Teleférico"],
                ["Último tramo a pie", "/guide/modo-viaje-caminando.png", "Modo viaje de UruGo mostrando el marcador peatonal durante la caminata al destino"],
              ].map(([label, src, alt]) => (
                <figure key={label} className="w-[78vw] max-w-[310px] shrink-0 snap-center lg:w-auto lg:max-w-none">
                  <PhoneScreenshot src={src} alt={alt} />
                  <figcaption className="mt-3 text-center text-xs font-bold uppercase text-[var(--public-ink)]">{label}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="consultar" className="scroll-mt-36 border-b border-[var(--public-border)] px-5 py-16 sm:px-8 md:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[360px_minmax(0,1fr)]">
          <PhoneScreenshot src="/guide/horarios.png" alt="Página de horarios de camiones y Teleférico en Uruapan" />
          <div>
            <p className="text-sm font-bold uppercase text-[var(--public-accent)]">Consultar antes de salir</p>
            <h2 className="mt-2 public-section-title">Horarios, tarifas y lugares en páginas fáciles de compartir.</h2>
            <div className="mt-8 space-y-6 text-sm leading-7 text-[var(--public-secondary)]">
              <p><strong className="text-white">Horarios:</strong> consulta primer y último camión, además del rango aproximado de frecuencia.</p>
              <p><strong className="text-white">Tarifas:</strong> el camión urbano cuesta {FARES_2026.urbanBus.price} por abordaje y normalmente se paga en efectivo. El Teleférico cuesta {FARES_2026.teleferico.price} y requiere tarjeta de movilidad.</p>
              <p><strong className="text-white">Cómo llegar:</strong> las guías de hospitales, escuelas, mercados y otros lugares muestran qué rutas pasan cerca y cuánto caminar.</p>
              <p><strong className="text-white">Página de cada ruta:</strong> reúne destino, horario, referencias e indicaciones para abrirla directamente en el mapa.</p>
              <p><strong className="text-white">Guía del Teleférico:</strong> explica estaciones, horario, pago y conexiones con camiones urbanos.</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/horarios" className="inline-flex h-11 items-center rounded-md bg-[#b8e840] px-5 text-sm font-bold text-[#0c110a] transition hover:bg-white">Ver horarios</Link>
              <Link href="/como-llegar" className="inline-flex h-11 items-center rounded-md border border-[var(--public-border)] px-5 text-sm font-bold text-white transition hover:border-white/40">Guías de lugares</Link>
              <Link href="/teleferico-uruapan-horario" className="inline-flex h-11 items-center rounded-md border border-[var(--public-border)] px-5 text-sm font-bold text-white transition hover:border-white/40">Teleférico</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="herramientas" className="scroll-mt-36 border-b border-[var(--public-border)] bg-[var(--public-surface)] px-5 py-16 sm:px-8 md:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase text-[var(--public-muted)]">Más funciones</p>
          <h2 className="mt-2 max-w-3xl public-section-title">Pequeñas herramientas que ahorran tiempo.</h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-[var(--public-border)] bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {TOOL_FEATURES.map((feature) => (
              <article key={feature.title} className="min-h-[220px] bg-[#0c110a] p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#6aab48]/15 text-[var(--public-accent)]"><GuideIcon name={feature.icon} /></span>
                <h3 className="mt-7 text-lg font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--public-secondary)]">{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--public-border)] px-5 py-16 sm:px-8 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase text-[#ff8a65]">Antes de viajar</p>
            <h2 className="mt-2 public-section-title">Cómo leer el mapa.</h2>
            <dl className="mt-8 divide-y divide-[var(--public-border)] border-y border-[var(--public-border)]">
              {[
                ["A verde", "Origen del viaje."],
                ["B rojo", "Destino marcado."],
                ["Línea de color", "Trazo de una ruta de camión o del Teleférico."],
                ["Flechas", "Sentido en el que debes recorrer la ruta."],
                ["Punto intermedio", "Lugar donde debes cambiar de ruta."],
                ["Línea punteada", "Tramo que debes caminar."],
              ].map(([term, definition]) => (
                <div key={term} className="grid grid-cols-[120px_1fr] gap-4 py-4 text-sm sm:grid-cols-[160px_1fr]">
                  <dt className="font-bold text-white">{term}</dt>
                  <dd className="leading-6 text-[var(--public-secondary)]">{definition}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <p className="text-sm font-bold uppercase text-[#51c8e8]">Preguntas frecuentes</p>
            <h2 className="mt-2 public-section-title">Lo que conviene saber.</h2>
            <div className="mt-8 divide-y divide-[var(--public-border)] border-y border-[var(--public-border)]">
              {FAQS.map((faq) => (
                <details key={faq.question} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-white">
                    {faq.question}
                    <span className="text-xl text-[var(--public-accent)] transition group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="max-w-xl pt-3 text-sm leading-7 text-[var(--public-secondary)]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 md:py-16">
        <div className="mx-auto max-w-6xl">
          <NotGovernmentNotice variant="full" />
          <div className="mt-10 flex flex-col items-start justify-between gap-6 border-t border-[var(--public-border)] pt-8 md:flex-row md:items-center">
            <div>
              <h2 className="public-section-title">Ya conoces UruGo.</h2>
              <p className="mt-2 text-sm text-[var(--public-secondary)]">Marca a dónde vas y deja que el mapa haga las cuentas.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/mapa" className="inline-flex h-12 items-center rounded-md bg-[#6aab48] px-6 text-sm font-bold text-[#0c110a] transition hover:bg-[#b8e840]">Abrir el mapa</Link>
              <Link href="/reportar-error?from=guia" className="inline-flex h-12 items-center rounded-md border border-[var(--public-border)] px-6 text-sm font-bold text-white transition hover:border-white/40">Reportar un error</Link>
            </div>
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
