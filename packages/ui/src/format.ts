/*
 * Single source of truth for money formatting, shared by the storefront and
 * the admin app so a price never renders differently in the two places.
 */
const CURRENCY_LOCALE = "pt-BR";
const CURRENCY_CODE = "BRL";

const currencyFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: "currency",
  currency: CURRENCY_CODE,
});

export function formatPrice(amount: number): string {
  return currencyFormatter.format(amount);
}
