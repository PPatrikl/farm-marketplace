 //  utils/dates.ts
 
export function isoToDate(iso: string): Date {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(iso);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  return new Date(iso);
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// "20.6." style short date, or "15.7.2025" when withYear is true
export function formatShortDate(iso: string, withYear: boolean = false): string {
  if (!iso) return "";
  const d = isoToDate(iso);
  if (Number.isNaN(d.getTime())) return "";
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