/**
 * Spec A.6: Pakistan Standard Time = fixed UTC+5, no daylight saving.
 * Stored in database as UTC. Converted to PKT only for presentation.
 */

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

export const formatPktDate = (utcIsoString: string): string => {
  const d = new Date(new Date(utcIsoString).getTime() + PKT_OFFSET_MS);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getUTCDate();
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
};

export const formatPktTime = (utcIsoString: string): string => {
  const d = new Date(new Date(utcIsoString).getTime() + PKT_OFFSET_MS);
  let hours = d.getUTCHours();
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

export const formatPktDateTime = (utcIsoString: string): string => {
  return `${formatPktDate(utcIsoString)}, ${formatPktTime(utcIsoString)}`;
};

export const getNowPktString = (): string => {
  const d = new Date(Date.now() + PKT_OFFSET_MS);
  const year = d.getUTCFullYear();
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  const hours = d.getUTCHours().toString().padStart(2, '0');
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const pktToUtcIso = (pktDateTimeString: string): string => {
  const parts = pktDateTimeString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!parts) return new Date().toISOString();

  const [_, y, m, d, h, min] = parts.map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d, h - 5, min));
  return utcDate.toISOString();
};
