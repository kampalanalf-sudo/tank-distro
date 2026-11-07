import { describe, expect, it } from "vitest";
import {
  normalizeGatewayStatus,
  transactionMatches,
  equalSecret,
  verifyGatewaySignature,
} from "../supabase/functions/_shared/paymentCore";
import { createHmac } from "node:crypto";

describe("DGateway protocol safeguards", () => {
  it("only maps known terminal payment states", () => {
    for (const s of ["completed", "succeeded", "successful"])
      expect(normalizeGatewayStatus(s)).toBe("completed");
    for (const s of ["failed", "cancelled", "canceled", "expired", "rejected"])
      expect(normalizeGatewayStatus(s)).toBe("failed");
    for (const s of ["accepted", "processing", "queued", "anything", null])
      expect(normalizeGatewayStatus(s)).toBe("pending");
  });
  it("requires the reference, amount, UGX and collection direction to match", () => {
    const tx = {
      reference: "DG-123",
      amount: 49000,
      currency: "UGX",
      status: "completed",
      direction: "collect",
    };
    const expected = { reference: "DG-123", amount: 49000 };
    expect(transactionMatches(tx, expected)).toBe(true);
    expect(transactionMatches({ ...tx, amount: "49000" }, expected)).toBe(true);
    for (const overrides of [
      { reference: "other" },
      { amount: 49001 },
      { currency: "USD" },
      { direction: "payout" },
      { reference: "" },
    ])
      expect(transactionMatches({ ...tx, ...overrides }, expected)).toBe(false);
  });
  it("authenticates the bridge without treating missing secrets as equal", async () => {
    expect(await equalSecret("private-value", "private-value")).toBe(true);
    expect(await equalSecret("private-value", "wrong")).toBe(false);
    expect(await equalSecret(null, "")).toBe(false);
    expect(await equalSecret("", undefined)).toBe(false);
  });
  it("verifies HMAC over the exact raw body and rejects missing, forged and malformed signatures", async () => {
    const raw = JSON.stringify({ data: { reference: "DG-123" } }),
      key = "unit-test-not-a-live-key";
    const signature = createHmac("sha256", key).update(raw).digest("hex");
    expect(await verifyGatewaySignature(raw, signature, key)).toBe(true);
    expect(await verifyGatewaySignature(raw, `sha256=${signature}`, key)).toBe(
      true,
    );
    expect(await verifyGatewaySignature(`${raw} `, signature, key)).toBe(false);
    expect(await verifyGatewaySignature(raw, "f".repeat(64), key)).toBe(false);
    expect(await verifyGatewaySignature(raw, "zz", key)).toBe(false);
    expect(await verifyGatewaySignature(raw, null, key)).toBe(false);
    expect(await verifyGatewaySignature(raw, signature, undefined)).toBe(false);
  });
});
