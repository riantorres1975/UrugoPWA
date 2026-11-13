"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Heart, LockKeyhole } from "lucide-react";
import { formatSupportAmount, type SupportVisibility } from "@/lib/support-contributions";
import { normalizeSupportCode, SUPPORT_CONTACT_URL, SUPPORT_SHARE_URL, supportReceiptLabel, type SupportReceipt } from "@/lib/support-management";
import { createSupportCardPng } from "@/lib/support-card-client";

export default function SupportManager() {
  const [codeInput, setCodeInput] = useState("");
  const [receipt, setReceipt] = useState<SupportReceipt | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [includeName, setIncludeName] = useState(false);
  const [card, setCard] = useState<{ name: string; blob: Blob } | null>(null);
  const code = useRef<string | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const incomingCode = useRef<string | null>(null);
  const privacyDirty = useRef(false);
  const cancelLookup = useCallback(() => { generation.current++; controller.current?.abort(); inFlight.current = false; }, []);
  const lookup = useCallback(async (value: string, silent = false) => {
    if (silent && (inFlight.current || privacyDirty.current)) return;
    const normalized = normalizeSupportCode(value);
    if (!normalized) { if (!silent) setError("Introduce el código completo que recibiste al enviar tu aviso."); return; }
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    const requestId = ++generation.current; inFlight.current = true;
    setBusy(true);
    if (!silent) { setError(""); setNotice(""); }
    const timer = setTimeout(() => abort.abort(), 10000);
    try {
      const response = await fetch("/api/support/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "status", code: normalized }), signal: abort.signal });
      const data = await response.json().catch(() => null);
      if (requestId !== generation.current) return;
      if (!response.ok || !data?.receipt) { if (!silent) { setError(data?.error || "No pudimos consultar el estado."); setReceipt(null); code.current = null; } return; }
      code.current = normalized; setReceipt(data.receipt); setCodeInput("");
    } catch { if (requestId === generation.current && !silent) setError("No pudimos conectar. Tu código sigue siendo válido; intenta de nuevo."); }
    finally { clearTimeout(timer); if (requestId === generation.current) { inFlight.current = false; setBusy(false); } }
  }, []);
  useEffect(() => {
    // Fragments never reach the server; remove the secret from the address bar immediately.
    const value = new URLSearchParams(window.location.hash.slice(1)).get("codigo");
    incomingCode.current ??= value;
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);
    if (incomingCode.current) void lookup(incomingCode.current);
    return cancelLookup;
  }, [lookup, cancelLookup]);
  const cardName = includeName && receipt?.visibility === "named" && receipt.publication_status === "approved" ? receipt.display_name ?? "" : "";
  const cardReady = !!card && card.name === cardName;
  useEffect(() => {
    if (receipt?.status !== "confirmed") return;
    let active = true;
    void createSupportCardPng(cardName).then((blob) => { if (active) setCard({ name: cardName, blob }); }).catch(() => { if (active) setShareMessage("No pudimos preparar la tarjeta en este navegador. Puedes compartir el enlace público."); });
    return () => { active = false; };
  }, [cardName, receipt?.status]);
  const awaitingReview = receipt?.status === "pending" || (receipt?.status === "confirmed" && receipt.publication_status === "pending");
  useEffect(() => {
    if (!awaitingReview) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible" && code.current) void lookup(code.current, true); }, 60000);
    return () => clearInterval(timer);
  }, [awaitingReview, lookup]);
  async function savePrivacy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (inFlight.current || !receipt || !code.current) return;
    const form = new FormData(event.currentTarget); inFlight.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/support/manage", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(10000), body: JSON.stringify({ action: "privacy", code: code.current, revision: receipt.revision,
        visibility: form.get("visibility"), name: form.get("name"), showAmount: form.get("showAmount") === "on" }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.receipt) { setError(data?.error || "No se pudo guardar. Actualiza el estado e intenta de nuevo."); return; }
      setReceipt(data.receipt); setIncludeName(false);
      privacyDirty.current = false;
      setNotice(data.receipt.status === "confirmed" && data.receipt.visibility === "named" && data.receipt.publication_status === "pending" ? "Guardado. El nuevo nombre se publicará cuando el equipo lo revise; por ahora el reconocimiento queda oculto." : "Privacidad actualizada. Los datos que ocultaste dejan de mostrarse públicamente.");
    } catch { setError("No pudimos guardar el cambio. Conserva tu código y vuelve a intentarlo."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function share() {
    const text = "Yo apoyo a UruGo para que más personas sigan llegando en Uruapan.";
    try {
      const file = cardReady ? new File([card!.blob], "yo-apoyo-a-urugo.png", { type: "image/png" }) : null;
      if (file && navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title: "Yo apoyo a UruGo", text: `${text} ${SUPPORT_SHARE_URL}`, files: [file] });
      else if (navigator.share) await navigator.share({ title: "Yo apoyo a UruGo", text, url: SUPPORT_SHARE_URL });
      else { await navigator.clipboard.writeText(`${text} ${SUPPORT_SHARE_URL}`); setShareMessage("Mensaje y enlace público copiados. No incluyen tu código ni el monto."); }
    } catch (reason) { if (!(reason instanceof Error && reason.name === "AbortError")) setShareMessage("No se pudo compartir. Puedes descargar la tarjeta."); }
  }
  function download() {
    if (!cardReady) return;
    const url = URL.createObjectURL(card!.blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "yo-apoyo-a-urugo.png"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="support-manager"><p className="support-eyebrow"><LockKeyhole aria-hidden="true" /> Solo para ti</p><h1 className="public-page-title">Tu apoyo,<br /><em>a tu manera.</em></h1>
    <p>Consulta la revisión de tu aporte y elige cómo quieres aparecer. El código es privado y no realiza ningún cobro.</p>
    {!receipt ? <form className="support-form" onSubmit={(event) => { event.preventDefault(); void lookup(codeInput); }}>
      <label>Código privado de tu aporte<input name="code" autoComplete="off" spellCheck={false} type="password" maxLength={60} required value={codeInput} onChange={(event) => setCodeInput(event.target.value)} placeholder="UG-…" /></label>
      <button className="support-pay-primary" disabled={busy}>{busy ? "Consultando…" : "Consultar estado"}</button>
      <p className="support-payment-note">Usa el código que recibiste al enviar tu aviso, no el identificador de Mercado Pago o PayPal. Si no tienes código, <a href={SUPPORT_CONTACT_URL}>contacta al equipo en privado</a>.</p>
    </form> : <>
      <section className="support-receipt" aria-label="Estado de tu aporte"><div className="support-receipt-heading"><CheckCircle2 aria-hidden="true" /><div><p className="support-eyebrow">{receipt.status === "confirmed" ? "Gracias por hacerlo posible" : "Tu aviso está registrado"}</p><h2>{supportReceiptLabel(receipt)}</h2></div></div>
        {receipt.status === "confirmed" ? <p>{receipt.visibility === "named" ? `Gracias, ${receipt.display_name}. ` : "Gracias por apoyar. "}Tu aporte ayuda a mantener UruGo disponible.</p> : <p>{receipt.status === "pending" ? "El equipo necesita comprobar el pago antes de publicar el agradecimiento. Puedes volver aquí para consultar el estado." : "El equipo no pudo confirmar este aviso. Puedes contactar al equipo si necesitas aclararlo."}</p>}
        <dl><div><dt>Monto registrado · solo para ti</dt><dd>{formatSupportAmount(receipt.amount_cents)} MXN</dd></div><div><dt>Tu reconocimiento</dt><dd>{receipt.visibility === "private" ? "No aparecer" : receipt.visibility === "anonymous" ? "Apoyo anónimo" : receipt.display_name}</dd></div></dl>
        <button className="support-inline-button" type="button" disabled={busy} onClick={() => { if (privacyDirty.current) setNotice("Guarda tus cambios de privacidad antes de actualizar el estado."); else if (code.current) void lookup(code.current); }}>Actualizar estado</button>
        <button className="support-inline-button" type="button" disabled={busy} onClick={() => { generation.current++; controller.current?.abort(); code.current = null; incomingCode.current = null; privacyDirty.current = false; setReceipt(null); setError(""); setNotice(""); }}>Cerrar consulta</button>
      </section>
      <SupportPrivacyForm key={receipt.revision} receipt={receipt} busy={busy} onSubmit={savePrivacy} onChange={() => { privacyDirty.current = true; }} />
      {receipt.status === "confirmed" && <section className="support-thanks-card" aria-labelledby="support-thanks-title"><Heart aria-hidden="true" /><p className="support-eyebrow">Un gesto que mueve a la comunidad</p><h2 id="support-thanks-title">Yo apoyo<br /><em>el camino de todos.</em></h2><p>Comparte una tarjeta para invitar a más personas. Nunca incluye el monto, el comprobante ni tu código privado.</p>
        {receipt.visibility === "named" && receipt.publication_status === "approved" && <label className="support-checkbox"><input type="checkbox" checked={includeName} onChange={(event) => setIncludeName(event.target.checked)} /> Mostrar mi nombre en la tarjeta descargada.</label>}
        <div className="support-ticket-actions"><button type="button" onClick={() => void share()}>Compartir mi apoyo</button><button type="button" onClick={download} disabled={!cardReady}>Descargar tarjeta</button></div>
        {shareMessage && <p role="status">{shareMessage}</p>}
      </section>}
    </>}
    {error && <p className="support-form-error" role="alert">{error}</p>}{notice && <p className="support-manager-notice" role="status">{notice}</p>}
    <Link href="/apoyar" className="support-link">← Volver a formas de apoyo</Link>
  </div>;
}

function SupportPrivacyForm({ receipt, busy, onSubmit, onChange }: { receipt: SupportReceipt; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onChange: () => void }) {
  const [visibility, setVisibility] = useState<SupportVisibility>(receipt.visibility);
  return <form className="support-form" onSubmit={onSubmit} onChange={onChange}><h2>Cómo quieres aparecer</h2>
    <fieldset><legend>Visibilidad de tu reconocimiento</legend><div className="support-visibility">{([['anonymous','Como anónimo'],['named','Con mi nombre'],['private','No aparecer']] as const).map(([value,label]) => <label key={value}><input type="radio" name="visibility" value={value} checked={visibility === value} onChange={() => setVisibility(value)} />{label}</label>)}</div></fieldset>
    {visibility === "named" && <label>Nombre o seudónimo público<input name="name" minLength={2} maxLength={60} required defaultValue={receipt.display_name ?? ""} /><small>Los nombres nuevos se revisan antes de volver a aparecer en público.</small></label>}
    {visibility !== "private" && <label className="support-checkbox"><input name="showAmount" type="checkbox" defaultChecked={receipt.show_amount} /> Autorizo mostrar el monto de mi aporte.</label>}
    <p className="support-payment-note">Cambiar a anónimo u ocultar el reconocimiento no necesita otra verificación del pago.</p>
    <button className="support-pay-primary" disabled={busy}>{busy ? "Guardando…" : "Guardar privacidad"}</button>
  </form>;
}
