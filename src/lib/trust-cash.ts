/** Owner trust / custodial cash rollforward (demo compute from statements). */

export type TrustCashPosition = {
  beginning: number;
  collected: number;
  paidForOwner: number;
  managementFee: number;
  reserve: number;
  dueToOwner: number;
  /** collections − expenses − fee (statement-style remittance before reserve) */
  remittanceBeforeReserve: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  statementNumber?: string | null;
};

/** Demo operating reserve: 10% of period remittance before reserve, floored at $0. */
export function demoOperatingReserve(remittanceBeforeReserve: number) {
  const base = Math.max(0, remittanceBeforeReserve);
  return Math.round(base * 0.1 * 100) / 100;
}

export function computeTrustCashPosition(input: {
  beginning?: number;
  collections: number;
  ownerExpenses: number;
  managementFee: number;
  reserve?: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  statementNumber?: string | null;
}): TrustCashPosition {
  const beginning = Number(input.beginning) || 0;
  const collected = Number(input.collections) || 0;
  const paidForOwner = Number(input.ownerExpenses) || 0;
  const managementFee = Number(input.managementFee) || 0;
  const remittanceBeforeReserve =
    beginning + collected - paidForOwner - managementFee;
  const reserve =
    input.reserve != null
      ? Math.max(0, Number(input.reserve) || 0)
      : demoOperatingReserve(remittanceBeforeReserve);
  const dueToOwner = remittanceBeforeReserve - reserve;

  return {
    beginning,
    collected,
    paidForOwner,
    managementFee,
    reserve,
    dueToOwner,
    remittanceBeforeReserve,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    statementNumber: input.statementNumber,
  };
}
