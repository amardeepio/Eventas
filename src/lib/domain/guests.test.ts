import { describe, expect, it } from "vitest";
import { buildPlan } from "./engine/plan";
import { getSampleBrief } from "./packs";
import { DIETARY_OPTIONS, getFunctionGuestSummary, getGuestSummary, guestDisplaySeats, guestFunctionSeats, guestInviteStatus, guestToCsvRow, makeGuest, RSVP_LABELS } from "./guests";

const plan = buildPlan(getSampleBrief("wedding"));

describe("guest helpers", () => {
  it("creates a pending invite for every function", () => {
    const guest = makeGuest("  Asha Rao ", plan.functions.map((item) => item.id));
    expect(guest.name).toBe("Asha Rao");
    expect(guest.invites).toHaveLength(plan.functions.length);
    expect(guest.invites.every((invite) => invite.status === "pending")).toBe(true);
    expect(guestDisplaySeats(guest)).toBe(0);
    expect(guestInviteStatus(guest, plan.functions[0]!.id)).toBe("pending");
    expect(guestFunctionSeats(guest, plan.functions[0]!.id)).toBe(0);
  });

  it("summarises RSVPs, seats, and dietary needs", () => {
    const attending = makeGuest("Asha", plan.functions.map((item) => item.id));
    attending.invites = attending.invites.map((invite, index) => index === 0 ? { ...invite, status: "yes", seats: 3 } : invite);
    attending.dietary = ["Jain", "Nut allergy"];
    const declined = makeGuest("Ravi", plan.functions.map((item) => item.id));
    declined.invites = declined.invites.map((invite) => ({ ...invite, status: "no" }));
    const maybe = makeGuest("Meera", plan.functions.map((item) => item.id));
    maybe.invites = maybe.invites.map((invite) => ({ ...invite, status: "maybe" }));
    const pending = makeGuest("Karan", plan.functions.map((item) => item.id));
    const customPlan = { ...plan, guests: [attending, declined, maybe, pending] };
    const summary = getGuestSummary(customPlan);
    expect(summary).toMatchObject({ total: 4, yes: 1, no: 1, maybe: 1, pending: 1, confirmedSeats: 3 });
    expect(summary.dietary).toEqual({ Jain: 1, "Nut allergy": 1 });
    expect(guestDisplaySeats(attending)).toBe(3);
    expect(guestFunctionSeats(attending, plan.functions[0]!.id)).toBe(3);
    expect(guestInviteStatus(attending, plan.functions[0]!.id)).toBe("yes");
    expect(RSVP_LABELS.yes).toBe("Attending");
    expect(DIETARY_OPTIONS).toContain("Jain");
  });

  it("summarises a single function and builds CSV cells", () => {
    const guest = makeGuest("Asha", plan.functions.map((item) => item.id));
    guest.invites[0] = { ...guest.invites[0]!, status: "yes", seats: 2 };
    guest.dietary = ["Jain"];
    guest.travel = { ...guest.travel, needsHotel: true, roomPreference: "Twin" };
    const customPlan = { ...plan, guests: [guest] };
    const summary = getFunctionGuestSummary(customPlan, plan.functions[0]!.id);
    expect(summary).toMatchObject({ invited: 1, attending: 1, pending: 0, seats: 2 });
    const row = guestToCsvRow(customPlan, guest);
    expect(row[0]).toBe("Asha");
    expect(row).toContain("Jain");
    expect(row).toContain("Yes");
    expect(row).toContain("Twin");
  });
});
