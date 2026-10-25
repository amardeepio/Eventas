/**
 * Guest-need constraints shared by onboarding and AI draft normalization.
 * Keeping this list in one place stops the model from writing budget or
 * location facts into the "guest needs" field.
 */
export const CONSTRAINT_OPTIONS = [
  "Vegetarian-only",
  "Jain / satvik menu",
  "Halal",
  "No alcohol",
  "No beef",
  "Gluten-free options",
  "Step-free access",
  "Elder-friendly seating",
  "Multilingual signage",
  "Quiet sensory space",
  "Child-friendly",
  "Outdoor / weather plan",
  "International guests",
];

const DIETARY = /veg|jain|satvik|halal|beef|pork|alcohol|allerg|gluten|dairy|nut/i;
const GUEST_NEEDS = /access|step-free|wheelchair|elder|child|quiet|sensory|language|multilingual|international|weather|outdoor|rain/i;

export function normalizeConstraints(values: string[]): string[] {
  const allowed = new Map(CONSTRAINT_OPTIONS.map((item) => [item.toLowerCase(), item]));
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const exact = allowed.get(trimmed.toLowerCase());
    if (exact) {
      result.push(exact);
      continue;
    }
    if (DIETARY.test(trimmed) || GUEST_NEEDS.test(trimmed)) {
      result.push(trimmed.slice(0, 100));
    }
  }
  return [...new Set(result)].slice(0, 8);
}
