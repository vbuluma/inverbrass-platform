/**
 * Purpose:
 * Preferred language options for Individual Party registration.
 *
 * Design rationale:
 * Language schema exists platform-wide; IP-001 ships a small seed set so
 * Preferred Language selectors have deterministic reference data.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

export const languages = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    displayOrder: 1,
    isActive: true,
  },
  {
    code: "sw",
    name: "Swahili",
    nativeName: "Kiswahili",
    displayOrder: 2,
    isActive: true,
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    displayOrder: 3,
    isActive: true,
  },
] as const;
