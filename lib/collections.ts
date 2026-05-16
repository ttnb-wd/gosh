export const SCENT_COLLECTIONS = [
  "Fresh",
  "Woody",
  "Floral",
  "Oriental",
  "Citrus",
  "Aquatic",
  "Sweet",
  "Oud",
  "Musk",
  "Amber",
  "Spicy",
] as const;

export type ScentCollection = (typeof SCENT_COLLECTIONS)[number];

export const isScentCollection = (value: string | null | undefined): value is ScentCollection =>
  SCENT_COLLECTIONS.includes(value as ScentCollection);
