const ghsNumber = new Intl.NumberFormat("en-GH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format an amount as Ghana Cedi, e.g. 279.37 -> "GH₵ 279.37". */
export function formatGhs(amount: number): string {
  return `GH₵ ${ghsNumber.format(amount)}`;
}
