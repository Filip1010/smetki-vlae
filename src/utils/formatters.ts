export const MACEDONIAN_MONTHS = [
  'Јануари', 'Февруари', 'Март', 'Април', 'Мај', 'Јуни',
  'Јули', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември',
];

export const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatMKD = (amount: number): string =>
  `${amount.toLocaleString('mk-MK')} ден.`;

export const monthLabel = (month: number, year: number, lang: 'mk' | 'en' = 'mk'): string => {
  const months = lang === 'mk' ? MACEDONIAN_MONTHS : ENGLISH_MONTHS;
  return `${months[month - 1]} ${year}`;
};

export const monthShort = (month: number, year: number): string =>
  `${SHORT_MONTHS[month - 1]} '${String(year).slice(2)}`;

export const availableYears = (bills: { year: number }[]): number[] =>
  [...new Set(bills.map((b) => b.year))].sort((a, b) => a - b);
