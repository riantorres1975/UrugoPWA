import { timingSafeEqual } from "node:crypto";
import { hashSubmitter } from "@/lib/community-submission";

export function createReportReceipt(id: string) {
  const signature = hashSubmitter(`report-receipt:v1:${id}`);
  return signature ? `${id}.${signature}` : null;
}
export function verifyReportReceipt(value: unknown): string | null {
  if (typeof value !== "string" || !/^[a-f0-9-]{36}\.[a-f0-9]{32}$/.test(value)) return null;
  const id = value.split(".")[0];
  const expected = createReportReceipt(id);
  return expected && timingSafeEqual(Buffer.from(value), Buffer.from(expected)) ? id : null;
}
