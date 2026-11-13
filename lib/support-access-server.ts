import { createHash, randomBytes } from "node:crypto";
import { normalizeSupportCode } from "@/lib/support-management";

export function newSupportCode() { return `UG-${randomBytes(24).toString("hex")}`; }
export function hashSupportCode(value: string) {
  const code = normalizeSupportCode(value);
  if (!code) throw Error("Invalid support code");
  return createHash("sha256").update(code.toLowerCase()).digest("hex");
}
export function hashPaymentReference(value: string) {
  return createHash("sha256").update(value.toLowerCase().replace(/\s+/g, "")).digest("hex");
}
