export function formatRub(value) {
  if (!Number.isFinite(value)) return '—';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(Math.round(value));
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)} млрд ₽`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)} млн ₽`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)} тыс ₽`;
  return `${sign}${abs} ₽`;
}

export function formatRubExact(value) {
  if (!Number.isFinite(value)) return '—';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(Math.round(value));
  return `${sign}${abs.toLocaleString('ru-RU')} ₽`;
}

export function formatPct(value, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatInt(value) {
  if (!Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString('ru-RU');
}

// day = integer day offset from START_DATE
const START_DATE = new Date(Date.UTC(2026, 0, 1));

export function dayToDate(day) {
  const d = new Date(START_DATE);
  d.setUTCDate(d.getUTCDate() + day);
  return d;
}

const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export function formatDate(day) {
  const d = dayToDate(day);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = MONTHS_RU[d.getUTCMonth()];
  const yy = d.getUTCFullYear();
  return `${dd} ${mm} ${yy}`;
}

export function formatDateShort(day) {
  const d = dayToDate(day);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
}

export function dayOfMonth(day) {
  return dayToDate(day).getUTCDate();
}

export function isMonthBoundary(day) {
  if (day <= 0) return false;
  return dayOfMonth(day) === 1;
}

export function isYearBoundary(day) {
  if (day <= 0) return false;
  const d = dayToDate(day);
  return d.getUTCMonth() === 0 && d.getUTCDate() === 1;
}

export function monthKey(day) {
  const d = dayToDate(day);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
