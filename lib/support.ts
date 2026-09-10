import { PROJECT } from "@/lib/project";

type SupportEnvironment = Readonly<Record<string, string | undefined>>;

function getHttpsUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

function getLabel(value: string | undefined) {
  const normalized = value?.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  return normalized ? normalized.slice(0, 100) : null;
}

function getClabe(value: string | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length === 18 ? digits : null;
}

export function getSupportOptions(env: SupportEnvironment = process.env) {
  const speiClabe = getClabe(env.SUPPORT_SPEI_CLABE);
  const speiRecipient = getLabel(env.SUPPORT_SPEI_RECIPIENT);

  return {
    mercadoPagoUrl: getHttpsUrl(env.SUPPORT_MERCADOPAGO_URL),
    paypalUrl: getHttpsUrl(env.SUPPORT_PAYPAL_URL) ?? PROJECT.donationUrl,
    spei:
      speiClabe && speiRecipient
        ? {
            clabe: speiClabe,
            recipient: speiRecipient,
            bank: getLabel(env.SUPPORT_SPEI_BANK),
          }
        : null,
  } as const;
}
