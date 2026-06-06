export interface HouseCategories {
  virtuseElias: string;
  evn: string;
  vodovod: string;
  internetTv: string;
  a1: string;
}

export interface House {
  id: string;
  label: string;
  sheetTab: string;
  storageKey: string;
  categories: HouseCategories;
  hasA1: boolean;
}

export const HOUSES: House[] = [
  {
    id: 'vlae',
    label: 'Сметки Влае',
    sheetTab: 'Сметки Влае',
    storageKey: 'smetki-vlae-bills',
    categories: { virtuseElias: 'Виртус Елиас', evn: 'ЕВН', vodovod: 'Водовод', internetTv: 'Интернет и ТВ', a1: 'А1' },
    hasA1: false,
  },
  {
    id: 'resen',
    label: 'Сметки Ресен',
    sheetTab: 'Сметки Ресен',
    storageKey: 'smetki-resen-bills',
    categories: { virtuseElias: 'ЈКП - Пролетер', evn: 'ЕВН', vodovod: 'Водовод', internetTv: 'Интернет и ТВ', a1: 'А1' },
    hasA1: true,
  },
];

export function getHouse(id: string): House {
  return HOUSES.find((h) => h.id === id) ?? HOUSES[0];
}
