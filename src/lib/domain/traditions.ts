import type { FunctionKind, Tradition, TraditionProfile } from "./types";

/**
 * Content, not code: each tradition changes the ceremonies, vocabulary, food
 * defaults, and family notes without forking the planning engine.
 *
 * These are planning defaults, not religious rulings. The UI always labels them
 * as "typical" and asks families to confirm details with their own officiant.
 */
export const TRADITION_PROFILES: Record<Tradition, TraditionProfile> = {
  "north-hindu": {
    id: "north-hindu",
    label: "North Indian Hindu",
    shortLabel: "North Hindu",
    description: "Haldi, mehndi, sangeet, baraat, pheras, vidaai, and a reception.",
    ceremonyLabel: "Wedding ceremony",
    ritualLead: "Pandit",
    functions: ["mehndi", "sangeet", "ceremony", "reception"],
    foodDefaults: ["Vegetarian", "Jain on request", "No beef"],
    notes: [
      "Confirm gotra, kuldevi, and regional rituals with the family pandit.",
      "Baraat usually arrives before the ceremony; allow 30–60 minutes.",
    ],
  },
  "punjabi-sikh": {
    id: "punjabi-sikh",
    label: "Punjabi / Sikh",
    shortLabel: "Punjabi / Sikh",
    description: "Anand Karaj at the gurdwara, langar, sangeet, and a separate reception.",
    ceremonyLabel: "Anand Karaj",
    ritualLead: "Granthi / gurdwara team",
    functions: ["mehndi", "sangeet", "ceremony", "reception"],
    foodDefaults: ["Langar", "Vegetarian", "No alcohol at the gurdwara"],
    notes: [
      "Anand Karaj is held at a gurdwara; confirm head-covering, shoe, and photography rules.",
      "The reception is usually a separate evening event, not at the gurdwara.",
    ],
  },
  gujarati: {
    id: "gujarati",
    label: "Gujarati",
    shortLabel: "Gujarati",
    description: "Mameru, garba or sangeet, hasta milap, mangal pheras, and a reception.",
    ceremonyLabel: "Wedding ceremony",
    ritualLead: "Pandit",
    functions: ["mehndi", "sangeet", "ceremony", "reception"],
    foodDefaults: ["Vegetarian", "Jain on request", "No onion/garlic on request"],
    notes: [
      "Mameru and the garba may need their own slots and guest lists.",
      "Confirm whether the family expects a separate engagement or roka.",
    ],
  },
  rajasthani: {
    id: "rajasthani",
    label: "Rajasthani / Marwari",
    shortLabel: "Rajasthani",
    description: "Thapa, bhaat, pithi, mehndi, sangeet, pheras, and a reception.",
    ceremonyLabel: "Wedding ceremony",
    ritualLead: "Pandit",
    functions: ["mehndi", "sangeet", "ceremony", "reception"],
    foodDefaults: ["Vegetarian", "Jain on request", "No beef"],
    notes: [
      "Thapa, bhaat, and pithi dastoor are family-led; assign an owner for each.",
      "Destination venues in Rajasthan need a stronger travel and hotel plan.",
    ],
  },
  "south-indian": {
    id: "south-indian",
    label: "South Indian",
    shortLabel: "South Indian",
    description: "A fixed morning muhurtham, traditional music, and a reception.",
    ceremonyLabel: "Muhurtham",
    ritualLead: "Priest",
    functions: ["mehndi", "ceremony", "reception"],
    foodDefaults: ["Vegetarian", "Filter coffee", "No beef"],
    notes: [
      "The muhurtham is usually a fixed morning window; build the day around it.",
      "Nadaswaram, traditional music, and a simple ceremony are common.",
    ],
  },
  bengali: {
    id: "bengali",
    label: "Bengali",
    shortLabel: "Bengali",
    description: "Shubho drishti, mala badal, saat paak, sindoor daan, and a reception.",
    ceremonyLabel: "Wedding ceremony",
    ritualLead: "Priest",
    functions: ["mehndi", "sangeet", "ceremony", "reception"],
    foodDefaults: ["Fish", "Vegetarian options", "Mishti"],
    notes: [
      "Shubho drishti and saat paak are family-led; confirm who carries the bride.",
      "The white-and-red palette is traditional; confirm the family's preference.",
    ],
  },
  marathi: {
    id: "marathi",
    label: "Marathi",
    shortLabel: "Marathi",
    description: "Haldi, sakhar puda, antarpat, laxmi pujan, and a reception.",
    ceremonyLabel: "Wedding ceremony",
    ritualLead: "Priest",
    functions: ["haldi", "mehndi", "ceremony", "reception"],
    foodDefaults: ["Vegetarian", "Non-veg on request"],
    notes: [
      "Sakhar puda and antarpat may need their own slots.",
      "Confirm the family's expectations for haldi and mehndi separately.",
    ],
  },
  muslim: {
    id: "muslim",
    label: "Muslim",
    shortLabel: "Muslim",
    description: "Mehndi or dholki, nikah, and a walima reception.",
    ceremonyLabel: "Nikah",
    ritualLead: "Imam / Qazi",
    functions: ["mehndi", "ceremony", "reception"],
    foodDefaults: ["Halal", "No alcohol", "No pork"],
    notes: [
      "Nikah and walima may be on separate days; confirm mehr and nikahnama details.",
      "Confirm halal catering and a no-alcohol policy with the venue in writing.",
    ],
  },
  christian: {
    id: "christian",
    label: "Christian",
    shortLabel: "Christian",
    description: "Church ceremony, readings, and a reception.",
    ceremonyLabel: "Wedding ceremony",
    ritualLead: "Priest / Pastor",
    functions: ["ceremony", "reception"],
    foodDefaults: ["Vegetarian options", "No beef on request"],
    notes: [
      "Confirm church requirements, readings, and pre-marriage counselling.",
      "Check whether the church allows outside photographers or decor.",
    ],
  },
  interfaith: {
    id: "interfaith",
    label: "Interfaith / fusion",
    shortLabel: "Interfaith",
    description: "Two traditions, two officiants, and an unhurried sequence.",
    ceremonyLabel: "Wedding ceremony",
    ritualLead: "Officiant(s)",
    functions: ["mehndi", "ceremony", "reception"],
    foodDefaults: ["Vegetarian options", "No beef on request"],
    notes: [
      "Agree both families' must-have rituals before booking anything.",
      "Give each tradition its own unhurried slot instead of compressing both.",
    ],
  },
  other: {
    id: "other",
    label: "Other / custom",
    shortLabel: "Other",
    description: "A custom ceremony shaped by your family and officiant.",
    ceremonyLabel: "Wedding ceremony",
    ritualLead: "Officiant",
    functions: ["ceremony", "reception"],
    foodDefaults: ["Vegetarian options"],
    notes: ["Confirm the ceremony structure with your officiant and both families."],
  },
  none: {
    id: "none",
    label: "Not specified",
    shortLabel: "Not specified",
    description: "A single main event.",
    ceremonyLabel: "Main event",
    ritualLead: "Host",
    functions: ["custom"],
    foodDefaults: [],
    notes: [],
  },
};

export const TRADITION_OPTIONS = (Object.keys(TRADITION_PROFILES) as Tradition[])
  .filter((id) => id !== "none")
  .map((id) => TRADITION_PROFILES[id]);

export function getTradition(id: Tradition | undefined): TraditionProfile {
  return TRADITION_PROFILES[id ?? "none"];
}

export function traditionFunctionKinds(id: Tradition): FunctionKind[] {
  return getTradition(id).functions;
}
