import type { Guest, HostSide, Plan, RsvpStatus } from "../domain/types";
import { GUEST_CSV_HEADER, makeGuest } from "../domain/guests";

/** Small RFC 4180-compatible parser: quoted cells, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === ",") { row.push(cell); cell = ""; continue; }
    if (char === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    if (char === "\r") continue;
    cell += char;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((item) => item.some((value) => value.trim().length > 0));
}

export function serializeCsv(rows: (string | number)[][]): string {
  const cell = (value: string | number) => {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sideOf(value: string): HostSide {
  const text = value.trim().toLowerCase();
  if (text === "bride" || text === "groom") return text;
  return "both";
}

function statusOf(value: string): RsvpStatus {
  const text = value.trim().toLowerCase();
  if (/^(yes|y|attending|confirmed)/.test(text)) return "yes";
  if (/^(no|n|not attending|declined)/.test(text)) return "no";
  if (/^(maybe|possibly|tentative)/.test(text)) return "maybe";
  return "pending";
}

function boolOf(value: string): boolean {
  return /^(yes|y|true|1|needed|required)$/i.test(value.trim());
}

export function guestsFromCsv(plan: Plan, text: string): { guests: Guest[]; skipped: number } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { guests: [], skipped: 0 };
  const headers = (rows[0] ?? []).map(normalizeHeader);
  const indexOf = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const nameIndex = indexOf("name", "guest", "guest name");
  if (nameIndex === -1) throw new Error("The CSV needs a Name column.");

  const column = (...names: string[]) => indexOf(...names);
  const sideIndex = column("side");
  const relationshipIndex = column("relationship", "relation");
  const phoneIndex = column("phone", "mobile");
  const emailIndex = column("email");
  const cityIndex = column("city");
  const dietaryIndex = column("dietary", "dietary needs", "diet");
  const functionsIndex = column("functions", "function", "invited functions");
  const rsvpIndex = column("rsvp", "response");
  const notesIndex = column("notes");
  const arrivingIndex = column("arriving", "arrival date");
  const departingIndex = column("departing", "departure date");
  const pickupIndex = column("airport pickup", "pickup");
  const hotelIndex = column("hotel needed", "hotel");
  const roomIndex = column("room preference", "room");

  const guests: Guest[] = [];
  let skipped = 0;
  for (const row of rows.slice(1)) {
    const name = (row[nameIndex] ?? "").trim();
    if (name.length < 1) { skipped += 1; continue; }
    const guest = makeGuest(name.slice(0, 100), plan.functions.map((item) => item.id));
    const invitedNames = (row[functionsIndex] ?? "").split(/[;|]/).map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (invitedNames.length > 0) {
      guest.invites = guest.invites.filter((invite) => {
        const functionItem = plan.functions.find((item) => item.id === invite.functionId);
        return functionItem && invitedNames.some((namePart) => namePart === functionItem.name.toLowerCase() || namePart === functionItem.kind.toLowerCase());
      });
    }
    if (rsvpIndex >= 0) {
      for (const invite of guest.invites) {
        const functionItem = plan.functions.find((item) => item.id === invite.functionId);
        if (!functionItem) continue;
        const pattern = new RegExp(`${escapeRegExp(functionItem.name)}\\s*:\\s*([^;|]+)`, "i");
        const match = pattern.exec(row[rsvpIndex] ?? "");
        if (match?.[1]) {
          invite.status = statusOf(match[1]);
          const seats = /\((\d+)\)/.exec(match[1]);
          if (seats?.[1]) invite.seats = Math.max(0, Number(seats[1]));
        }
      }
    }
    guest.side = sideIndex >= 0 ? sideOf(row[sideIndex] ?? "") : "both";
    guest.relationship = (row[relationshipIndex] ?? "").slice(0, 80);
    guest.phone = (row[phoneIndex] ?? "").slice(0, 40);
    guest.email = (row[emailIndex] ?? "").slice(0, 160);
    guest.city = (row[cityIndex] ?? "").slice(0, 80);
    guest.dietary = (row[dietaryIndex] ?? "").split(/[;,]/).map((item) => item.trim()).filter(Boolean).slice(0, 10);
    guest.notes = (row[notesIndex] ?? "").slice(0, 1000);
    guest.travel = {
      arriving: (row[arrivingIndex] ?? "").slice(0, 10),
      departing: (row[departingIndex] ?? "").slice(0, 10),
      needsPickup: pickupIndex >= 0 && boolOf(row[pickupIndex] ?? ""),
      needsHotel: hotelIndex >= 0 && boolOf(row[hotelIndex] ?? ""),
      roomPreference: (row[roomIndex] ?? "").slice(0, 80),
    };
    guests.push(guest);
    if (guests.length >= 2000) break;
  }
  return { guests, skipped };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export { GUEST_CSV_HEADER };
