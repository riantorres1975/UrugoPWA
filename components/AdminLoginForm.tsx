"use client";

import { ArrowRight, CheckCircle2, KeyRound, LoaderCircle } from "lucide-react";
import { useState } from "react";

type State = "idle" | "submitting" | "sent" | "error";

export default function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/admin/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "No pudimos enviar el enlace.");
      setState("sent");
      setMessage("Revisa tu correo. El enlace de acceso expira y solo funcionará para administradores autorizados.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "No pudimos enviar el enlace.");
    }
  }

  return (
    <form onSubmit={submit} className="admin-card p-5 sm:p-7">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--admin-tint)] text-[var(--brand-lime)]"><KeyRound className="h-5 w-5" aria-hidden="true" /></span>
      <h1 className="mt-4 text-3xl font-bold leading-tight text-[var(--brand-white)]">Acceso al panel</h1>
      <p className="mt-4 text-sm leading-6 text-[var(--admin-muted)]">Recibe un enlace seguro en el correo autorizado. No necesitas contraseña.</p>

      <label className="mt-8 block">
        <span className="text-xs font-black uppercase text-[var(--brand-lime)]">Correo administrativo</span>
        <input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu-correo@ejemplo.com" className="admin-field mt-2 w-full" />
      </label>

      <button type="submit" disabled={state === "submitting" || state === "sent"} className="admin-button admin-primary mt-4 inline-flex h-12 w-full items-center justify-center gap-2 px-5 text-sm font-bold">
        {state === "submitting" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : state === "sent" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        {state === "submitting" ? "Enviando" : state === "sent" ? "Enlace enviado" : "Recibir enlace"}
      </button>

      {message && <p className={`mt-4 border-l-2 px-3 text-xs leading-5 ${state === "error" ? "border-[#f4c84a] text-[#f4df98]" : "border-[#b8e840] text-[var(--admin-muted)]"}`} role="status">{message}</p>}
    </form>
  );
}
