export const DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE = {
  PRIMARY: ["U9A", "U10A", "U11A", "U12A", "U13A"],
  SECONDARY: ["U14A", "U15A", "U16A", "U19A", "U19B"],
  COMBINED: ["U9A", "U10A", "U11A", "U12A", "U13A", "U14A", "U15A", "U16A", "U19A", "U19B"],
} as const;

export type SchoolTypeForDefaults = keyof typeof DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE;

export const ALL_DEFAULT_TEAM_CODES = [
  "U9A",
  "U10A",
  "U11A",
  "U12A",
  "U13A",
  "U14A",
  "U15A",
  "U16A",
  "U19A",
  "U19B",
] as const;
