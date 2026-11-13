"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Heart, Landmark, ShieldCheck, WalletCards } from "lucide-react";
import CopySupportValue from "@/components/CopySupportValue";
import { paypalAmountUrl } from "@/lib/support-contributions";
import type { getSupportOptions } from "@/lib/support";
import { SUPPORT_REMINDER_UNTIL } from "@/lib/support-reminder";

export default function SupportPaymentOptions({ options }: { options: ReturnType<typeof getSupportOptions> }) {
  const [amount, setAmount] = useState<number | null>(50);
  useEffect(() => {
    try { localStorage.setItem(SUPPORT_REMINDER_UNTIL, String(Date.now() + 90 * 86400_000)); } catch { /* Visiting support remains possible without storage. */ }
  }, []);
  const paypalOptions = <><div className="support-amounts" role="group" aria-label="Monto sugerido en pesos mexicanos para PayPal">
      {[25, 50, 100].map((value) => <button key={value} type="button" aria-pressed={amount === value} onClick={() => setAmount(value)}>${value}<small>MXN</small></button>)}
      <button type="button" aria-pressed={amount === null} onClick={() => setAmount(null)}>Otro<small>monto libre</small></button>
    </div>
    <a className={options.mercadoPagoUrl ? "support-pay-secondary" : "support-pay-primary"} href={paypalAmountUrl(options.paypalUrl, amount)} target="_blank" rel="noreferrer"><Heart aria-hidden="true" /> Apoyar con PayPal <ArrowUpRight aria-hidden="true" /></a>
    <p className="support-payment-note">Confirma el monto y el destinatario en PayPal antes de completar el pago.</p>
  </>;
  return <div className="support-payment-card">
    <p className="support-eyebrow">Un aporte, muchas llegadas</p><h2>Elige cómo quieres apoyar.</h2>
    <p>Cualquier monto ayuda. Es un aporte voluntario, sin suscripciones.</p>
    {options.mercadoPagoUrl ? <>
      <a href={options.mercadoPagoUrl} className="support-pay-primary support-mercadopago" target="_blank" rel="noreferrer"><WalletCards aria-hidden="true" /> Apoyar con Mercado Pago <ArrowUpRight aria-hidden="true" /></a>
      <p className="support-payment-note">Elige el monto en Mercado Pago y confirma el destinatario antes de completar el pago.</p>
      <details className="support-paypal-alternative"><summary>Prefiero usar PayPal</summary>{paypalOptions}</details>
    </> : paypalOptions}
    {options.spei && <details className="support-spei"><summary><Landmark className="h-4 w-4" aria-hidden="true" /> Transferencia SPEI</summary>
      <p>{options.spei.recipient}{options.spei.bank ? ` · ${options.spei.bank}` : ""}</p>
      <code>{options.spei.clabe}</code><CopySupportValue value={options.spei.clabe} />
    </details>}
    <div className="support-payment-safety"><ShieldCheck aria-hidden="true" /><p>El pago se completa fuera de UruGo. No guardamos tarjetas ni contraseñas bancarias.</p></div>
    <a href="#registrar-apoyo" className="support-already">Ya realicé un aporte →</a>
  </div>;
}
