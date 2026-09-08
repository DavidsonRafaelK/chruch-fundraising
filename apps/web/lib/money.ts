/**
 * Display formatting only, and deliberately free of any server import: this
 * runs inside client components too, and pulling in @repo/database here would
 * drag `server-only` into the browser bundle.
 *
 * Arithmetic stays on the server with Prisma.Decimal - see
 * app/actions/checkout.ts. Values arriving here are already final.
 */
export const formatIDR = (value: string | number): string => {
  const amount = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(amount)) {
    return "-";
  }

  return `Rp${amount.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
};
