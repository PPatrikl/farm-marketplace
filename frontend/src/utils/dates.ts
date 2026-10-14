 //  utils/dates.ts
 
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// "20.6." style short date, or "15.7.2025" when withYear is true
export function formatShortDate(iso: string, withYear: boolean = false): string {
  const d = isoToDate(iso);
  const base = `${d.getDate()}.${d.getMonth() + 1}.`;
  return withYear ? `${base}${d.getFullYear()}` : base;
}

const MONTHS_FI = ["tammikuuta","helmikuuta","maaliskuuta","huhtikuuta","toukokuuta","kesäkuuta","heinäkuuta","elokuuta","syyskuuta","lokakuuta","marraskuuta","joulukuuta"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// "20. kesäkuuta 2025" / "June 20, 2025" — used in ListingDetail's booking summary
export function formatLongDate(d: Date, lang: string): string {
  return lang === "fi"
    ? `${d.getDate()}. ${MONTHS_FI[d.getMonth()]} ${d.getFullYear()}`
    : `${MONTHS_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// Date -> "YYYY-MM-DD", for sending to Supabase
export function formatIsoDate(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

const UNITS_FI: [number, string][] = [
  [60, "s sitten"],
  [3600, "min sitten"],
  [86400, "t sitten"],
  [604800, "pv sitten"],
];
const UNITS_EN: [number, string][] = [
  [60, "s ago"],
  [3600, "m ago"],
  [86400, "h ago"],
  [604800, "d ago"],
];

// "2t sitten" / "2h ago" for recent items, falls back to formatShortDate after a week
export function formatTimeAgo(iso: string, lang: string): string {
  const then = new Date(iso).getTime();
  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  const units = lang === "fi" ? UNITS_FI : UNITS_EN;

  if (diffSeconds < 60) {
    return lang === "fi" ? "juuri nyt" : "just now";
  }
  if (diffSeconds >= 604800) {
    return formatShortDate(iso.slice(0, 10));
  }

  // walk down: minutes, then hours, then days
  const divisors: [number, number][] = [
    [86400, 604800], // days
    [3600, 86400],   // hours
    [60, 3600],      // minutes
  ];
  for (const [unitSeconds, ceiling] of divisors) {
    if (diffSeconds >= unitSeconds && diffSeconds < ceiling) {
      const value = Math.floor(diffSeconds / unitSeconds);
      const suffix = units.find(([s]) => s === (unitSeconds === 86400 ? 86400 : unitSeconds === 3600 ? 3600 : 60))![1];
      return `${value}${suffix}`;
    }
  }
  const minutes = Math.max(1, Math.floor(diffSeconds / 60));
  return `${minutes}${units[1][1]}`;
}