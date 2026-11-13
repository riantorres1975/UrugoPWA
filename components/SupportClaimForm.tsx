"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Heart, LockKeyhole } from "lucide-react";
import { SUPPORT_METHODS, type SupportMethod, type SupportVisibility } from "@/lib/support-contributions";
import { createSupportCode, normalizeSupportCode, SUPPORT_CONTACT_URL } from "@/lib/support-management";
import SupportAccessTicket from "@/components/SupportAccessTicket";

export default function SupportClaimForm({ methods }: { methods: SupportMethod[] }) {
  const [visibility, setVisibility] = useState<SupportVisibility>("anonymous");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const submissionCode = useRef<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget); setBusy(true); setError("");
    try {
      submissionCode.current ??= createSupportCode();
      const response = await fetch("/api/support/contributions", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(12000),
        body: JSON.stringify({ method: form.get("method"), amount: form.get("amount"), reference: form.get("reference"), visibility,
          name: form.get("displayName"), showAmount: form.get("showAmount") === "on", paid: form.get("paid") === "on", website: form.get("website"), accessCode: submissionCode.current }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) { setError(typeof body?.error === "string" ? body.error : "No se pudo guardar tu aviso. Inténtalo más tarde."); return; }
      setDone(true);
      setAccessCode(normalizeSupportCode(body?.accessCode));
      try { localStorage.setItem("urugo-support-reminder-until-v1", String(Date.now() + 90 * 86400_000)); } catch { /* The form works without browser storage. */ }
    } catch { setError("No pudimos conectar para guardar el aviso. Conserva tu comprobante e inténtalo de nuevo."); }
    finally { setBusy(false); }
  }
  return <section id="registrar-apoyo" className="support-claim" aria-labelledby="support-claim-title">
    <div><p className="support-eyebrow"><Heart aria-hidden="true" /> Después de apoyar</p><h2 id="support-claim-title">¿Quieres aparecer en la comunidad?</h2>
      <p>Primero completa el pago con el medio que elegiste. Después, avísanos aquí. Publicaremos el reconocimiento cuando el equipo confirme que el aporte se recibió.</p>
      <p className="support-private-note"><LockKeyhole aria-hidden="true" /> El identificador del pago es privado y se utiliza para verificar el aporte.</p></div>
    {done ? <div className="support-claim-success"><div role="status"><CheckCircle2 aria-hidden="true" /><h3>Gracias por avisarnos.</h3><p>Tu aviso quedó pendiente de verificación. Este formulario no realiza ningún cargo ni confirma el pago automáticamente.</p></div>
      {accessCode ? <SupportAccessTicket code={accessCode} /> : <p>Si ya enviaste este comprobante, consulta el estado con el código original. Para recuperar el acceso, <a href={SUPPORT_CONTACT_URL}>contacta al equipo en privado</a>.</p>}</div>
      : <form onSubmit={submit} className="support-form">
        <div className="support-form-grid"><label>Medio de apoyo<select name="method" required>{methods.map((method) => <option key={method} value={method}>{SUPPORT_METHODS[method]}</option>)}</select></label>
          <label>Monto enviado en MXN<input name="amount" inputMode="decimal" type="text" pattern="[0-9]+([.,][0-9]{1,2})?" placeholder="Ej. 50.00" required maxLength={9} /></label></div>
        <label>ID de transacción o clave de rastreo<input name="reference" required minLength={6} maxLength={120} autoComplete="off" /><small>Se encuentra en tu comprobante. No escribas números de tarjeta o cuenta.</small></label>
        <fieldset><legend>¿Cómo quieres aparecer?</legend><div className="support-visibility">
          {([['anonymous','Como anónimo'],['named','Con mi nombre'],['private','No aparecer']] as const).map(([value, label]) => <label key={value}><input type="radio" name="visibility" value={value} checked={visibility === value} onChange={() => setVisibility(value)} />{label}</label>)}
        </div></fieldset>
        {visibility === "named" && <label>Nombre para mostrar<input name="displayName" required minLength={2} maxLength={60} placeholder="Tu nombre o seudónimo" /><small>Este nombre será público si el aporte se verifica.</small></label>}
        {visibility !== "private" && <label className="support-checkbox"><input type="checkbox" name="showAmount" /> También quiero mostrar el monto de mi aporte.</label>}
        <label className="support-checkbox"><input type="checkbox" name="paid" required /> Confirmo que ya realicé el aporte. Entiendo que este aviso no procesa pagos.</label>
        <label className="sr-only" aria-hidden="true">Sitio web<input name="website" tabIndex={-1} autoComplete="off" /></label>
        {error && <p className="support-form-error" role="alert">{error}</p>}
        <button type="submit" className="support-pay-primary" disabled={busy}>{busy ? "Enviando aviso…" : "Enviar para verificación"}</button>
        <p className="support-payment-note">Al enviar guardamos los datos de este aviso. Consulta el <a href="/privacidad">aviso de privacidad</a>.</p>
      </form>}
  </section>;
}
