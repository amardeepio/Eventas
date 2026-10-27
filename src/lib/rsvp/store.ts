import "server-only";
import { Firestore } from "@google-cloud/firestore";
import type { DocumentReference } from "@google-cloud/firestore";
import { deriveHostKey, signRsvpToken, verifyHostKey } from "./token";

export class RsvpHttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export interface SharedFunction {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
}

export interface SharedGuest {
  id: string;
  name: string;
  functionIds: string[];
}

export interface SharedResponse {
  guestId: string;
  guestName: string;
  invites: Array<{ functionId: string; status: string; seats: number }>;
  dietary: string[];
  notes: string;
  updatedAt: string;
}

export interface PublishInput {
  planId: string;
  title: string;
  hostName: string;
  eventDate: string;
  functions: SharedFunction[];
  guests: SharedGuest[];
  expiresAt: string;
  hostKey?: string;
}

let client: Firestore | null = null;

function projectId(): string {
  return process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID ?? "";
}

export function isRsvpConfigured(): boolean {
  return Boolean(projectId() && (process.env.RSVP_SIGNING_SECRET?.length ?? 0) >= 24);
}

function db(): Firestore {
  if (!isRsvpConfigured()) throw new RsvpHttpError("RSVP hosting is not configured on this deployment.", 503);
  if (!client) {
    client = new Firestore({
      projectId: projectId(),
      databaseId: process.env.FIRESTORE_DATABASE_ID || undefined,
      ignoreUndefined: true,
    });
  }
  return client;
}

function planRef(planId: string) {
  return db().collection("sharedPlans").doc(planId);
}

function cleanPlanId(planId: string): string {
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(planId)) throw new RsvpHttpError("Invalid plan id.", 400);
  return planId;
}

function expired(value: unknown): boolean {
  return typeof value !== "string" || new Date(`${value}T23:59:59Z`).getTime() < Date.now();
}

export async function publishSharedPlan(input: PublishInput): Promise<{ hostKey: string; expiresAt: string }> {
  const planId = cleanPlanId(input.planId);
  const ref = planRef(planId);
  const existing = await ref.get();
  if (existing.exists) {
    if (!input.hostKey || !verifyHostKey(planId, input.hostKey)) throw new RsvpHttpError("This host key does not match the published plan.", 403);
  }
  if (expired(input.expiresAt)) throw new RsvpHttpError("Choose an expiry date in the future.", 400);

  const hostKey = deriveHostKey(planId);
  await ref.set({
    title: input.title,
    hostName: input.hostName,
    eventDate: input.eventDate,
    functions: input.functions,
    guestCount: input.guests.length,
    expiresAt: input.expiresAt,
    revoked: false,
    updatedAt: new Date().toISOString(),
  });

  const guests = ref.collection("guests");
  const current = await guests.get();
  const wanted = new Set(input.guests.map((guest) => guest.id));
  type Operation = { type: "delete"; ref: DocumentReference } | { type: "set"; ref: DocumentReference; data: Record<string, unknown> };
  const operations: Operation[] = [];
  for (const doc of current.docs) if (!wanted.has(doc.id)) operations.push({ type: "delete", ref: doc.ref });
  for (const guest of input.guests) {
    operations.push({ type: "set", ref: guests.doc(guest.id), data: { name: guest.name, functionIds: guest.functionIds } });
  }
  // Firestore caps a batch at 500 writes. Larger guest lists are committed in
  // chunks; the plan document itself is already written and safe to retry.
  for (let index = 0; index < operations.length; index += 400) {
    const batch = db().batch();
    for (const operation of operations.slice(index, index + 400)) {
      if (operation.type === "delete") batch.delete(operation.ref);
      else batch.set(operation.ref, operation.data);
    }
    await batch.commit();
  }
  return { hostKey, expiresAt: input.expiresAt };
}

export async function getSharedGuest(planId: string, guestId: string) {
  const ref = planRef(cleanPlanId(planId));
  const plan = await ref.get();
  if (!plan.exists) return null;
  const data = plan.data() ?? {};
  if (data.revoked === true || expired(data.expiresAt)) return null;
  const guest = await ref.collection("guests").doc(guestId).get();
  if (!guest.exists) return null;
  const response = await ref.collection("responses").doc(guestId).get();
  return {
    plan: {
      title: String(data.title ?? ""),
      eventDate: String(data.eventDate ?? ""),
      hostName: String(data.hostName ?? ""),
      functions: Array.isArray(data.functions) ? data.functions as SharedFunction[] : [],
      expiresAt: String(data.expiresAt ?? ""),
    },
    guest: { id: guest.id, ...(guest.data() as Omit<SharedGuest, "id">) },
    response: response.exists ? (response.data() as SharedResponse) : null,
  };
}

export async function submitSharedRsvp(planId: string, guestId: string, input: {
  invites: Array<{ functionId: string; status: string; seats: number }>;
  dietary: string[];
  notes: string;
}) {
  const guestView = await getSharedGuest(planId, guestId);
  if (!guestView) throw new RsvpHttpError("This RSVP link has expired or is no longer active.", 410);
  const allowed = new Set(guestView.guest.functionIds ?? []);
  if (input.invites.some((invite) => !allowed.has(invite.functionId))) throw new RsvpHttpError("That function is not on this invitation.", 400);
  await planRef(cleanPlanId(planId)).collection("responses").doc(guestId).set({
    guestId,
    guestName: guestView.guest.name,
    invites: input.invites,
    dietary: input.dietary,
    notes: input.notes,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function listResponses(planId: string, hostKey: string): Promise<SharedResponse[]> {
  if (!verifyHostKey(planId, hostKey)) throw new RsvpHttpError("That host key is not valid.", 403);
  const snapshot = await planRef(cleanPlanId(planId)).collection("responses").get();
  return snapshot.docs
    .map((doc) => doc.data() as SharedResponse)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function makeGuestLinks(planId: string, hostKey: string, baseUrl: string) {
  if (!verifyHostKey(planId, hostKey)) throw new RsvpHttpError("That host key is not valid.", 403);
  const ref = planRef(cleanPlanId(planId));
  const plan = await ref.get();
  if (!plan.exists) throw new RsvpHttpError("Publish the plan before creating links.", 404);
  const data = plan.data() ?? {};
  if (data.revoked === true || expired(data.expiresAt)) throw new RsvpHttpError("This RSVP page has expired.", 410);
  const guests = await ref.collection("guests").get();
  const expiresAt = new Date(`${String(data.expiresAt)}T23:59:59Z`).getTime();
  return guests.docs.map((doc) => {
    const guest = doc.data() as Omit<SharedGuest, "id">;
    const token = signRsvpToken({ planId, guestId: doc.id, expiresAt });
    return { guestId: doc.id, name: guest.name, url: `${baseUrl.replace(/\/$/, "")}/rsvp/${token}` };
  });
}

export async function revokeSharedPlan(planId: string, hostKey: string): Promise<void> {
  if (!verifyHostKey(planId, hostKey)) throw new RsvpHttpError("That host key is not valid.", 403);
  await planRef(cleanPlanId(planId)).set({ revoked: true, revokedAt: new Date().toISOString() }, { merge: true });
}
