/**
 * Spec A.4: All money is stored in integer paisa (PKR × 100).
 * Never use floats for money storage.
 */

export const formatPaisa = (paisa: number): string => {
  const rupees = Math.round(paisa) / 100;
  return `Rs ${rupees.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export const paisaToRupees = (paisa: number): number => {
  return Math.round(paisa) / 100;
};

export const rupeesToPaisa = (rupees: number): number => {
  return Math.round(rupees * 100);
};
