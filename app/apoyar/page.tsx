import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BusFront,
  CircleDollarSign,
  Cloud,
  Code2,
  Heart,
  Landmark,
  MapPinned,
  MessageSquareWarning,
  ShieldCheck,
  WalletCards,
  Wrench,
} from "lucide-react";
import CopySupportValue from "@/components/CopySupportValue";
import ForceDark from "@/components/ForceDark";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { PROJECT } from "@/lib/project";
import { SITE_URL } from "@/lib/site-url";
import { getSupportOptions } from "@/lib/support";

export const metadata: Metadata = {
  title: "Apoyar UruGo",
  description:
    "Apoya el mantenimiento del mapa independiente de rutas de Uruapan y conoce en qué se utilizan las aportaciones.",
  alternates: { canonical: `${SITE_URL}/apoyar` },
  openGraph: {
    title: "Apoyar UruGo",
    description: "Ayuda a mantener gratuito el mapa independiente de transporte público de Uruapan.",
    url: `${SITE_URL}/apoyar`,
    siteName: "UruGo",
    type: "website",
  },
};

const uses = [
  {
    icon: Cloud,
    number: "01",
    title: "Mantenerlo disponible",
    description: "Dominio, servicios y herramientas necesarias para que el mapa siga funcionando.",
  },
  {
    icon: MapPinned,
    number: "02",
    title: "Revisar los datos",
    description: "Recorridos, horarios y referencias que necesitan comprobación antes de publicarse.",
  },
  {
    icon: Wrench,
    number: "03",
    title: "Mejorar la aplicación",
    description: "Correcciones, accesibilidad y nuevas funciones útiles para moverse por Uruapan.",
  },
] as const;

export default function SupportPage() {
  const support = getSupportOptions();
  const hasLocalPaymentMethod = Boolean(support.mercadoPagoUrl || support.spei);

  return (
    <main className="public-page min-h-dvh bg-[#0c110a] text-[var(--public-ink)]" data-theme="dark">
      <ForceDark />
      <PublicHeader />

      <section className="overflow-hidden border-b border-[var(--public-border)] px-5 pb-16 pt-28 sm:px-8 lg:pb-20 lg:pt-36">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--public-accent)]">
              <Heart className="h-4 w-4" aria-hidden="true" />
              Apoyo voluntario
            </div>
            <h1 className="mt-5 max-w-4xl public-page-title">
              Ayuda a que UruGo siga siendo <span className="text-[var(--public-accent)]">gratuito.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--public-secondary)] sm:text-lg">
              El mapa no cobra suscripción ni muestra anuncios. Cada aporte ayuda a sostener sus servicios y a dedicar más tiempo a corregir las rutas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#formas-de-apoyar"
                className="inline-flex min-h-12 items-center gap-2 rounded-md bg-[#b8e840] px-5 text-sm font-bold text-[#0c110a] transition hover:bg-[#c8f25b]"
              >
                Ver formas de apoyo
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link
                href="/acerca-de"
                className="inline-flex min-h-12 items-center gap-2 rounded-md border border-[var(--public-border)] px-5 text-sm font-bold transition hover:border-[#b8e840]/50 hover:bg-white/[0.04]"
              >
                Cómo se hace UruGo
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="border-y border-[var(--public-border)] py-6 lg:border-y-0 lg:border-l lg:py-1 lg:pl-10">
            <p className="text-[11px] font-bold uppercase text-[var(--public-muted)]">Un aporte recorre tres paradas</p>
            <ol className="mt-6 space-y-0">
              {[
                ["Mantener", "Servicios activos"],
                ["Comprobar", "Datos más claros"],
                ["Publicar", "Mejoras para todos"],
              ].map(([title, detail], index) => (
                <li key={title} className="relative grid grid-cols-[30px_1fr] gap-4 pb-6 last:pb-0">
                  {index < 2 ? <span className="absolute left-[7px] top-4 h-full w-px bg-[var(--public-border)]" aria-hidden="true" /> : null}
                  <span className={`relative z-10 mt-1 h-[15px] w-[15px] rounded-full border-4 border-[#0c110a] ${index === 2 ? "bg-[#b8e840]" : "bg-[#6aab48]"}`} aria-hidden="true" />
                  <span>
                    <span className="block font-sans text-sm font-bold text-[var(--public-ink)]">{title}</span>
                    <span className="mt-1 block text-xs text-[var(--public-muted)]">{detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="formas-de-apoyar" className="scroll-mt-24 border-b border-[var(--public-border)] bg-[var(--public-surface)] px-5 py-16 sm:px-8 lg:py-20" aria-labelledby="formas-title">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-20">
          <div>
            <p className="text-[11px] font-bold uppercase text-[var(--public-accent)]">Formas de apoyo</p>
            <h2 id="formas-title" className="mt-3 public-section-title">
              {hasLocalPaymentMethod ? "Elige la que ya utilizas." : "Apoya desde PayPal."}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--public-secondary)]">
              Tú decides el monto. La operación se completa en el proveedor elegido o en tu aplicación bancaria.
            </p>
          </div>

          <div className="border-t border-[var(--public-border)]">
            {support.mercadoPagoUrl ? (
              <div className="grid gap-5 border-b border-[var(--public-border)] py-7 sm:grid-cols-[48px_1fr_auto] sm:items-center">
                <span className="grid h-12 w-12 place-items-center rounded-md bg-[#58d2e3] text-[#0c110a]">
                  <WalletCards className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-sans text-lg font-bold">Mercado Pago</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--public-secondary)]">Tarjeta, saldo, SPEI u OXXO según las opciones disponibles al pagar.</p>
                </div>
                <a
                  href={support.mercadoPagoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#b8e840] px-5 text-sm font-bold text-[#0c110a] transition hover:bg-[#c8f25b]"
                >
                  Abrir Mercado Pago
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            ) : null}

            {support.spei ? (
              <div className="grid gap-5 border-b border-[var(--public-border)] py-7 sm:grid-cols-[48px_1fr]">
                <span className="grid h-12 w-12 place-items-center rounded-md bg-[#f2cf55] text-[#0c110a]">
                  <Landmark className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-sans text-lg font-bold">Transferencia SPEI</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--public-secondary)]">
                    A nombre de <span className="font-semibold text-[var(--public-ink)]">{support.spei.recipient}</span>
                    {support.spei.bank ? ` · ${support.spei.bank}` : ""}
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <code className="min-w-0 flex-1 break-all rounded-md border border-[var(--public-border)] bg-[#0c110a] px-4 py-3 font-mono text-sm text-[var(--public-ink)]">
                      {support.spei.clabe}
                    </code>
                    <CopySupportValue value={support.spei.clabe} />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[var(--public-muted)]">Verifica el nombre del destinatario en tu banco antes de confirmar.</p>
                </div>
              </div>
            ) : null}

            <div className="grid gap-5 border-b border-[var(--public-border)] py-7 sm:grid-cols-[48px_1fr_auto] sm:items-center">
              <span className="grid h-12 w-12 place-items-center rounded-md bg-[#6aab48] text-[#0c110a]">
                <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-sans text-lg font-bold">PayPal</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--public-secondary)]">La opción internacional que ya estaba disponible en UruGo.</p>
              </div>
              <a
                href={support.paypalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--public-border)] px-5 text-sm font-bold transition hover:border-[#b8e840]/60 hover:bg-white/[0.04]"
              >
                Abrir PayPal
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="flex gap-3 pt-5 text-xs leading-6 text-[var(--public-muted)]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--public-accent)]" aria-hidden="true" />
              <p>UruGo no solicita ni almacena datos de tarjetas o cuentas bancarias. Revisa siempre el destinatario antes de autorizar un pago.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-20" aria-labelledby="uso-title">
        <div className="mx-auto max-w-[1240px]">
          <div className="grid gap-6 border-b border-[var(--public-border)] pb-7 md:grid-cols-[1fr_430px] md:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase text-[var(--public-muted)]">Transparencia</p>
              <h2 id="uso-title" className="mt-3 public-section-title">En qué puede usarse tu apoyo.</h2>
            </div>
            <p className="text-sm leading-7 text-[var(--public-secondary)]">No hay recompensas ni contenido bloqueado. El mapa conserva las mismas funciones para todas las personas.</p>
          </div>

          <ol className="grid border-b border-[var(--public-border)] md:grid-cols-3">
            {uses.map((item, index) => {
              const Icon = item.icon;
              return (
                <li key={item.number} className={`py-8 md:px-8 ${index < 2 ? "border-b border-[var(--public-border)] md:border-b-0 md:border-r" : ""} ${index === 0 ? "md:pl-0" : ""} ${index === 2 ? "md:pr-0" : ""}`}>
                  <div className="flex items-center justify-between gap-5">
                    <Icon className="h-6 w-6 text-[var(--public-accent)]" strokeWidth={1.7} aria-hidden="true" />
                    <span className="font-sans text-3xl font-bold text-[var(--public-muted)]">{item.number}</span>
                  </div>
                  <h3 className="mt-8 font-sans text-xl font-bold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--public-secondary)]">{item.description}</p>
                </li>
              );
            })}
          </ol>

          <p className="mt-5 text-xs leading-6 text-[var(--public-muted)]">
            Los aportes son voluntarios, no representan una compra y no son deducibles de impuestos.
          </p>
        </div>
      </section>

      <section className="border-y border-[var(--public-border)] bg-[#090d08] px-5 py-14 sm:px-8" aria-labelledby="otras-formas-title">
        <div className="mx-auto grid max-w-[1240px] gap-10 md:grid-cols-[1fr_1.2fr] md:items-center">
          <div>
            <BusFront className="h-8 w-8 text-[var(--public-accent)]" strokeWidth={1.6} aria-hidden="true" />
            <h2 id="otras-formas-title" className="mt-5 public-section-title">También puedes apoyar sin dinero.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/reportar-error" className="group border-l border-[var(--public-border)] py-2 pl-5 transition hover:border-[#b8e840]">
              <MessageSquareWarning className="h-5 w-5 text-[var(--public-accent)]" aria-hidden="true" />
              <span className="mt-4 block font-sans text-lg font-bold">Reporta un cambio</span>
              <span className="mt-2 block text-sm leading-6 text-[var(--public-secondary)]">Una corrección concreta mejora el viaje de otras personas.</span>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--public-accent)]">Ir al formulario <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span>
            </Link>
            <a href={PROJECT.repositoryUrl} target="_blank" rel="noreferrer" className="group border-l border-[var(--public-border)] py-2 pl-5 transition hover:border-[#b8e840]">
              <Code2 className="h-5 w-5 text-[#58d2e3]" aria-hidden="true" />
              <span className="mt-4 block font-sans text-lg font-bold">Revisa el proyecto</span>
              <span className="mt-2 block text-sm leading-6 text-[var(--public-secondary)]">El código y la organización de los datos son públicos.</span>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--public-accent)]">Ver repositorio <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></span>
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
