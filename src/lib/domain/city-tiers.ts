import type { CostLevel } from "./types";

export type CityTier = "metro" | "tier2" | "tier3" | "destination";

const METROS = new Set([
  "new delhi", "delhi", "mumbai", "bengaluru", "bangalore", "hyderabad",
  "chennai", "kolkata", "pune", "ahmedabad", "gurugram", "gurgaon",
  "noida", "ghaziabad", "faridabad", "chandigarh",
]);

const DESTINATIONS = new Set([
  "udaipur", "jaipur", "jodhpur", "jaisalmer", "goa", "panaji", "calangute",
  "munnar", "shimla", "manali", "rishikesh", "nainital", "lonavala",
  "mahabaleshwar", "puri", "hampi", "darjeeling", "srinagar", "leh",
]);

const TIER_TWO = new Set([
  "agra", "ajmer", "amritsar", "aurangabad", "bareilly", "bhopal", "bhubaneswar",
  "bilaspur", "coimbatore", "cuttack", "dehradun", "dhanbad", "durgapur",
  "guwahati", "gwalior", "hubballi", "indore", "jabalpur", "jalandhar",
  "jammu", "jamshedpur", "jhansi", "kanpur", "kochi", "kolhapur", "kozhikode",
  "lucknow", "ludhiana", "madurai", "mangaluru", "meerut", "mysuru", "nagpur",
  "nashik", "patna", "prayagraj", "puducherry", "raipur", "rajkot", "ranchi",
  "salem", "shillong", "siliguri", "surat", "thiruvananthapuram", "thrissur",
  "tiruchirappalli", "tirupati", "vadodara", "varanasi", "vijayawada",
  "visakhapatnam",
]);

function cityKey(location: string): string {
  return location.toLowerCase().split(",")[0]?.trim() ?? "";
}

export function cityTier(location: string): CityTier {
  const city = cityKey(location);
  if (DESTINATIONS.has(city)) return "destination";
  if (METROS.has(city)) return "metro";
  if (TIER_TWO.has(city)) return "tier2";
  return "tier3";
}

export function inferCostLevel(location: string): CostLevel {
  const tier = cityTier(location);
  if (tier === "metro" || tier === "destination") return "high";
  if (tier === "tier2") return "average";
  return "low";
}

export function cityTierLabel(location: string): string {
  const tier = cityTier(location);
  return tier === "destination" ? "Destination city"
    : tier === "metro" ? "Major metro"
    : tier === "tier2" ? "Tier-2 city"
    : "Tier-3 / smaller city";
}

export function isDestinationCity(location: string): boolean {
  return cityTier(location) === "destination";
}
