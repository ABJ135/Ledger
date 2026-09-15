/**
 * Currency utilities for paisa (PKR x 100) integer conversion and display.
 * Rule 3: All money is stored as an integer in paisa. Never float/double.
 */
export function formatPaisa(paisa, showSign = false) {
    const rupees = paisa / 100;
    const isNegative = rupees < 0;
    const absRupees = Math.abs(rupees);
    const formatted = new Intl.NumberFormat('en-PK', {
        maximumFractionDigits: 0,
    }).format(absRupees);
    if (isNegative) {
        return `-Rs ${formatted}`;
    }
    if (showSign && rupees > 0) {
        return `+Rs ${formatted}`;
    }
    return `Rs ${formatted}`;
}
export function paisaToRupees(paisa) {
    return paisa / 100;
}
export function rupeesToPaisa(rupees) {
    return Math.round(Number(rupees) * 100);
}
