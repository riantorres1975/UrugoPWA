"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type Props = {
  value: string;
};

export default function CopySupportValue({ value }: Props) {
  const [copied, setCopied] = useState(false);

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copyValue}
      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-[var(--public-border)] px-4 text-sm font-bold text-[var(--public-ink)] transition hover:border-[#b8e840]/60 hover:bg-white/[0.04]"
      aria-label="Copiar CLABE"
    >
      {copied ? <Check className="h-4 w-4 text-[var(--public-accent)]" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {copied ? "Copiada" : "Copiar"}
      <span className="sr-only" aria-live="polite">{copied ? "CLABE copiada" : ""}</span>
    </button>
  );
}
