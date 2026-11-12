"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

export default function AdminSubmitButton({ children, disabled, ...props }: ComponentProps<"button">) {
  const { pending, data } = useFormStatus();
  const submitting = pending && (!props.value || data?.get(props.name ?? "") === String(props.value));
  return <button {...props} type="submit" disabled={disabled || pending} aria-busy={submitting}>{submitting ? "Guardando…" : children}</button>;
}
