// Pure helpers shared by server-only edge functions and unit tests.
export type GatewayStatus = "pending" | "completed" | "failed" | "unknown";
export type GatewayTransaction = {
  reference: string;
  amount: number | string;
  currency: string;
  status: string;
  direction?: string;
  verified?: boolean;
};
export function normalizeGatewayStatus(value: unknown): GatewayStatus {
  const status = String(value || "").toLowerCase();
  if (["completed", "succeeded", "successful"].includes(status))
    return "completed";
  if (
    ["failed", "cancelled", "canceled", "expired", "rejected"].includes(status)
  )
    return "failed";
  return "pending";
}
export function transactionMatches(
  tx: GatewayTransaction,
  expected: { reference?: string | null; amount: number },
) {
  return (
    typeof tx.reference === "string" &&
    tx.reference.length > 0 &&
    tx.reference.length <= 200 &&
    (!expected.reference || tx.reference === expected.reference) &&
    Number(tx.amount) === expected.amount &&
    tx.currency === "UGX" &&
    (!tx.direction || tx.direction === "collect")
  );
}
export async function equalSecret(a: string | null, b: string | undefined) {
  if (!a || !b) return false;
  const encoder = new TextEncoder();
  const [one, two] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const x = new Uint8Array(one),
    y = new Uint8Array(two);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
export async function verifyGatewaySignature(
  raw: string,
  signature: string | null,
  secret: string | undefined,
) {
  if (!secret || !signature) return false;
  const hex = signature.replace(/^sha256=/i, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hex)) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(raw)),
  );
  let diff = 0;
  for (let i = 0; i < signed.length; i++)
    diff |= signed[i] ^ parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return diff === 0;
}
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
