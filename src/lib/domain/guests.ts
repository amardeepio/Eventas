import type { Guest, Plan, RsvpStatus } from "./types";

export const DIETARY_OPTIONS = ["Vegetarian", "Jain", "Vegan", "Halal", "No beef", "No pork", "Gluten-free", "Nut allergy", "Dairy-free"] as const;

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  pending: "Awaiting reply",
  yes: "Attending",
  no: "Not attending",
  maybe: "Maybe",
};

export function makeGuest(name: string, functionIds: string[]): Guest {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `guest-${Date.now()}`,
    name: name.trim(),
    side: "both",
    relationship: "",
    phone: "",
    email: "",
    city: "",
    dietary: [],
    notes: "",
    invites: functionIds.map((functionId) => ({ functionId, status: "pending", seats: 1 })),
    travel: { arriving: "", departing: "", needsPickup: false, needsHotel: false, roomPreference: "" },
  };
}

export function guestDisplaySeats(guest: Guest): number {
  const confirmed = guest.invites.filter((invite) => invite.status === "yes");
  if (confirmed.length > 0) return confirmed.reduce((sum, invite) => sum + Math.max(0, invite.seats), 0);
  return 0;
}

export function guestInviteStatus(guest: Guest, functionId: string): RsvpStatus {
  return guest.invites.find((invite) => invite.functionId === functionId)?.status ?? "pending";
}

export function guestFunctionSeats(guest: Guest, functionId: string): number {
  const invite = guest.invites.find((item) => item.functionId === functionId);
  return invite?.status === "yes" ? Math.max(0, invite.seats) : 0;
}

export function getGuestSummary(plan: Plan) {
  const counts: Record<RsvpStatus, number> = { pending: 0, yes: 0, no: 0, maybe: 0 };
  for (const guest of plan.guests) {
    const statuses = guest.invites.map((invite) => invite.status);
    if (statuses.includes("yes")) counts.yes += 1;
    else if (statuses.includes("maybe")) counts.maybe += 1;
    else if (statuses.length > 0 && statuses.every((status) => status === "no")) counts.no += 1;
    else counts.pending += 1;
  }
  const confirmedSeats = plan.guests.reduce((sum, guest) => sum + guestDisplaySeats(guest), 0);
  const dietary = plan.guests.flatMap((guest) => guest.dietary).reduce<Record<string, number>>((map, item) => {
    map[item] = (map[item] ?? 0) + 1;
    return map;
  }, {});
  return { total: plan.guests.length, ...counts, confirmedSeats, dietary };
}

export function getFunctionGuestSummary(plan: Plan, functionId: string) {
  const invited = plan.guests.filter((guest) => guest.invites.some((invite) => invite.functionId === functionId));
  const attending = invited.filter((guest) => guestInviteStatus(guest, functionId) === "yes");
  const pending = invited.filter((guest) => guestInviteStatus(guest, functionId) === "pending");
  return {
    invited: invited.length,
    attending: attending.length,
    pending: pending.length,
    seats: invited.reduce((sum, guest) => sum + guestFunctionSeats(guest, functionId), 0),
  };
}

export function guestToCsvRow(plan: Plan, guest: Guest): (string | number)[] {
  const functionNames = guest.invites.map((invite) => plan.functions.find((item) => item.id === invite.functionId)?.name ?? invite.functionId).join("; ");
  const statuses = guest.invites.map((invite) => `${plan.functions.find((item) => item.id === invite.functionId)?.name ?? invite.functionId}: ${RSVP_LABELS[invite.status]} (${invite.seats})`).join("; ");
  return [
    guest.name, guest.side, guest.relationship, guest.phone, guest.email, guest.city,
    guest.dietary.join("; "), functionNames, statuses, guest.notes,
    guest.travel.arriving, guest.travel.departing,
    guest.travel.needsPickup ? "Yes" : "No", guest.travel.needsHotel ? "Yes" : "No", guest.travel.roomPreference,
  ];
}

export const GUEST_CSV_HEADER = [
  "Name", "Side", "Relationship", "Phone", "Email", "City", "Dietary",
  "Functions", "RSVP", "Notes", "Arriving", "Departing", "Airport pickup", "Hotel needed", "Room preference",
];
