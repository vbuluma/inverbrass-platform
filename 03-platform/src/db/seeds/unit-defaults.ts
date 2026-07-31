/**
 * Purpose:
 * Default unit category and unit templates for business bootstrap (IP-003).
 *
 * conversionFactor: multiplier to convert this unit into the category base unit.
 */

export type UnitDefaultCategory = {
  code: string;
  name: string;
  description: string;
  baseUnitCode: string;
  units: Array<{
    code: string;
    name: string;
    symbol: string;
    conversionFactor: string;
    decimalPrecision: number;
    isBaseUnit: boolean;
  }>;
};

export const defaultUnitCategories: UnitDefaultCategory[] = [
  {
    code: "QUANTITY",
    name: "Quantity",
    description: "Countable items and packaging units.",
    baseUnitCode: "PIECE",
    units: [
      { code: "PIECE", name: "Piece", symbol: "pc", conversionFactor: "1", decimalPrecision: 0, isBaseUnit: true },
      { code: "PACK", name: "Pack", symbol: "pk", conversionFactor: "1", decimalPrecision: 0, isBaseUnit: false },
      { code: "BOX", name: "Box", symbol: "box", conversionFactor: "1", decimalPrecision: 0, isBaseUnit: false },
      { code: "CARTON", name: "Carton", symbol: "ctn", conversionFactor: "24", decimalPrecision: 0, isBaseUnit: false },
    ],
  },
  {
    code: "WEIGHT",
    name: "Weight",
    description: "Mass and weight measurements.",
    baseUnitCode: "KILOGRAM",
    units: [
      { code: "GRAM", name: "Gram", symbol: "g", conversionFactor: "0.001", decimalPrecision: 3, isBaseUnit: false },
      { code: "KILOGRAM", name: "Kilogram", symbol: "kg", conversionFactor: "1", decimalPrecision: 3, isBaseUnit: true },
      { code: "TON", name: "Ton", symbol: "t", conversionFactor: "1000", decimalPrecision: 3, isBaseUnit: false },
    ],
  },
  {
    code: "VOLUME",
    name: "Volume",
    description: "Liquid and fluid volume.",
    baseUnitCode: "LITRE",
    units: [
      { code: "MILLILITRE", name: "Millilitre", symbol: "ml", conversionFactor: "0.001", decimalPrecision: 3, isBaseUnit: false },
      { code: "LITRE", name: "Litre", symbol: "L", conversionFactor: "1", decimalPrecision: 3, isBaseUnit: true },
    ],
  },
  {
    code: "LENGTH",
    name: "Length",
    description: "Distance and dimension.",
    baseUnitCode: "METRE",
    units: [
      { code: "METRE", name: "Metre", symbol: "m", conversionFactor: "1", decimalPrecision: 3, isBaseUnit: true },
      { code: "KILOMETRE", name: "Kilometre", symbol: "km", conversionFactor: "1000", decimalPrecision: 3, isBaseUnit: false },
    ],
  },
  {
    code: "AREA",
    name: "Area",
    description: "Surface and land area.",
    baseUnitCode: "SQUARE_METRE",
    units: [
      { code: "SQUARE_METRE", name: "Square Metre", symbol: "m²", conversionFactor: "1", decimalPrecision: 2, isBaseUnit: true },
      { code: "ACRE", name: "Acre", symbol: "ac", conversionFactor: "4046.8564224", decimalPrecision: 4, isBaseUnit: false },
      { code: "HECTARE", name: "Hectare", symbol: "ha", conversionFactor: "10000", decimalPrecision: 4, isBaseUnit: false },
    ],
  },
  {
    code: "TIME",
    name: "Time",
    description: "Duration and scheduling periods.",
    baseUnitCode: "HOUR",
    units: [
      { code: "MINUTE", name: "Minute", symbol: "min", conversionFactor: "0.0166666667", decimalPrecision: 2, isBaseUnit: false },
      { code: "HOUR", name: "Hour", symbol: "hr", conversionFactor: "1", decimalPrecision: 2, isBaseUnit: true },
      { code: "DAY", name: "Day", symbol: "day", conversionFactor: "24", decimalPrecision: 2, isBaseUnit: false },
      { code: "MONTH", name: "Month", symbol: "mo", conversionFactor: "720", decimalPrecision: 2, isBaseUnit: false },
    ],
  },
  {
    code: "CAPACITY",
    name: "Capacity",
    description: "Occupancy and resource capacity units.",
    baseUnitCode: "SEAT",
    units: [
      { code: "SEAT", name: "Seat", symbol: "seat", conversionFactor: "1", decimalPrecision: 0, isBaseUnit: true },
      { code: "ROOM", name: "Room", symbol: "room", conversionFactor: "1", decimalPrecision: 0, isBaseUnit: false },
      { code: "BED", name: "Bed", symbol: "bed", conversionFactor: "1", decimalPrecision: 0, isBaseUnit: false },
    ],
  },
];
