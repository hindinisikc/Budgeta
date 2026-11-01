import { formatMonthLabel, monthName, parseMonthId, type MonthId } from '../../../domain/dates';

/** Short axis labels ("Oct"; "Jan '27" when the year changes) and full titles for tooltips/tables. */
export function monthAxisLabels(months: MonthId[]): { labels: string[]; titles: string[] } {
  const labels = months.map((m, i) => {
    const { year, monthIndex } = parseMonthId(m);
    const short = monthName(monthIndex, true);
    const yearChanged = i > 0 && parseMonthId(months[i - 1]!).year !== year;
    return yearChanged || (i === 0 && monthIndex === 0) ? `${short} '${String(year).slice(2)}` : short;
  });
  return { labels, titles: months.map(formatMonthLabel) };
}
