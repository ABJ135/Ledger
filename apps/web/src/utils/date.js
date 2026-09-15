/**
 * Timezone utilities for Pakistan Standard Time (fixed UTC+5, no DST).
 * Rule 4: All timestamps stored in UTC. Converted to PKT only at presentation layer.
 */
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000; // +05:00 in ms
/**
 * Converts a UTC ISO timestamp to a Date shifted to PKT local values.
 */
function toPktDate(utcIsoString) {
    const utcMs = new Date(utcIsoString).getTime();
    return new Date(utcMs + PKT_OFFSET_MS);
}
export function formatPktDate(utcIsoString) {
    if (!utcIsoString)
        return '';
    const date = toPktDate(utcIsoString);
    return new Intl.DateTimeFormat('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(date);
}
export function formatPktDateTime(utcIsoString) {
    if (!utcIsoString)
        return '';
    const date = toPktDate(utcIsoString);
    return new Intl.DateTimeFormat('en-PK', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
    }).format(date);
}
export function formatPktTime(utcIsoString) {
    if (!utcIsoString)
        return '';
    const date = toPktDate(utcIsoString);
    return new Intl.DateTimeFormat('en-PK', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
    }).format(date);
}
/**
 * Generates formatted "YYYY-MM-DDTHH:mm" for datetime-local inputs representing current PKT time.
 */
export function getPktNowForInput() {
    const now = new Date();
    const pktMs = now.getTime() + PKT_OFFSET_MS;
    const pkt = new Date(pktMs);
    const pad = (n) => n.toString().padStart(2, '0');
    const year = pkt.getUTCFullYear();
    const month = pad(pkt.getUTCMonth() + 1);
    const day = pad(pkt.getUTCDate());
    const hours = pad(pkt.getUTCHours());
    const minutes = pad(pkt.getUTCMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
/**
 * Converts a datetime-local input string ("YYYY-MM-DDTHH:mm") chosen in PKT to a UTC ISO string.
 */
export function pktInputToUtcIso(pktDatetimeLocal) {
    const [datePart, timePart] = pktDatetimeLocal.split('T');
    if (!datePart || !timePart)
        return new Date().toISOString();
    // PKT is fixed UTC+5:00
    const pktIsoWithOffset = `${datePart}T${timePart}:00+05:00`;
    return new Date(pktIsoWithOffset).toISOString();
}
