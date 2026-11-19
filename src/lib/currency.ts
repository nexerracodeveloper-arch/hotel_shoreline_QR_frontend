/**
 * Formats numeric values into Indian Rupee (₹) currency string
 * e.g. 250 -> "₹250", 12500 -> "₹12,500"
 */
export function formatRupees(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return '₹0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
}
