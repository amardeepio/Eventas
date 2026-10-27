import { describe, expect, it } from "vitest";
import { buildPlan } from "../domain/engine/plan";
import { getSampleBrief } from "../domain/packs";
import { guestsFromCsv, parseCsv, serializeCsv } from "./csv";

const plan = buildPlan(getSampleBrief("wedding"));

describe("CSV helpers", () => {
  it("parses quoted cells, escaped quotes, and CRLF", () => {
    const rows = parseCsv('Name,Notes\r\nAsha,"Jain, no onion"\r\nRavi,"Said ""hello"""\r\n');
    expect(rows).toEqual([["Name", "Notes"], ["Asha", "Jain, no onion"], ["Ravi", 'Said "hello"']]);
    expect(serializeCsv(rows)).toContain('"Jain, no onion"');
  });

  it("imports guests, functions, RSVP statuses, and travel flags", () => {
    const csv = [
      "Name,Side,Relationship,Phone,City,Dietary,Functions,RSVP,Notes,Arriving,Departing,Airport pickup,Hotel needed,Room preference",
      `Asha,bride,Aunt,999,"New Delhi","Jain; Nut allergy","Mehndi; Sangeet","Mehndi: Attending (2); Sangeet: Not attending (0)","Loves photos",2027-10-01,2027-10-05,Yes,Yes,Twin`,
      ",groom,Uncle,888,Mumbai,,,,,,,,,",
    ].join("\n");
    const { guests, skipped } = guestsFromCsv(plan, csv);
    expect(guests).toHaveLength(1);
    expect(skipped).toBe(1);
    const guest = guests[0]!;
    expect(guest.name).toBe("Asha");
    expect(guest.side).toBe("bride");
    expect(guest.dietary).toEqual(["Jain", "Nut allergy"]);
    expect(guest.invites).toHaveLength(2);
    expect(guest.invites[0]?.status).toBe("yes");
    expect(guest.invites[0]?.seats).toBe(2);
    expect(guest.invites[1]?.status).toBe("no");
    expect(guest.travel).toMatchObject({ needsPickup: true, needsHotel: true, roomPreference: "Twin" });
  });

  it("imports everyone when the Functions column is blank and rejects a missing name column", () => {
    const { guests } = guestsFromCsv(plan, "Name\nAsha\n");
    expect(guests[0]?.invites).toHaveLength(plan.functions.length);
    expect(() => guestsFromCsv(plan, "Phone\n999\n")).toThrow("Name");
    expect(guestsFromCsv(plan, "")).toEqual({ guests: [], skipped: 0 });
  });
});
