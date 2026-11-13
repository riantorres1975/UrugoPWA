"use client";

import { useState } from "react";
import Link from "next/link";
import { supportPrivateHref } from "@/lib/support-management";

export default function SupportAccessTicket({ code }: { code: string }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(code); setMessage("Código copiado."); }
    catch { setMessage("Selecciona el código y cópialo para guardarlo."); }
  }
  return <div className="support-access-ticket"><strong>Guarda tu código privado</strong>
    <p>Permite consultar el estado y cambiar tu privacidad. No lo publiques ni lo compartas con otras personas.</p>
    <code>{code}</code><div className="support-ticket-actions"><button type="button" onClick={() => void copy()}>Copiar código</button>
      <Link prefetch={false} href={supportPrivateHref(code)}>Consultar mi aporte →</Link></div>
    {message && <small role="status">{message}</small>}
  </div>;
}
