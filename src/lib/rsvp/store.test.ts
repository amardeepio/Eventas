import { beforeEach, describe, expect, it, vi } from "vitest";

const documents = new Map<string, Record<string, unknown>>();

class MockDoc {
  constructor(readonly path: string) {}
  get id() { return this.path.split("/").pop() ?? ""; }
  get ref() { return this; }
  data() { return structuredClone(documents.get(this.path) ?? {}); }
  async get() {
    const data = documents.get(this.path);
    return { exists: Boolean(data), id: this.id, data: () => data ? structuredClone(data) : undefined };
  }
  async set(data: Record<string, unknown>, options?: { merge?: boolean }) {
    const previous = options?.merge ? documents.get(this.path) ?? {} : {};
    documents.set(this.path, { ...previous, ...structuredClone(data) });
  }
  async delete() { documents.delete(this.path); }
  collection(name: string) { return new MockCollection(`${this.path}/${name}`); }
}

class MockCollection {
  constructor(readonly path: string) {}
  doc(id: string) { return new MockDoc(`${this.path}/${id}`); }
  async get() {
    const prefix = `${this.path}/`;
    const docs = [...documents.keys()]
      .filter((key) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"))
      .map((key) => new MockDoc(key));
    return { docs };
  }
}

class MockBatch {
  private operations: Array<() => void> = [];
  set(ref: MockDoc, data: Record<string, unknown>, options?: { merge?: boolean }) {
    this.operations.push(() => { documents.set(ref.path, options?.merge ? { ...(documents.get(ref.path) ?? {}), ...data } : data); });
  }
  delete(ref: MockDoc) { this.operations.push(() => { documents.delete(ref.path); }); }
  async commit() { for (const operation of this.operations) operation(); }
}

vi.mock("@google-cloud/firestore", () => ({
  Firestore: class {
    collection(name: string) { return new MockCollection(name); }
    batch() { return new MockBatch(); }
  },
}));

import { deriveHostKey } from "./token";
import { getSharedGuest, isRsvpConfigured, listResponses, makeGuestLinks, publishSharedPlan, revokeSharedPlan, RsvpHttpError, submitSharedRsvp } from "./store";

const functions = [{ id: "ceremony-1", name: "Ceremony", date: "2027-11-02", startTime: "08:00", endTime: "13:00", venue: "Jaipur" }];
const guests = [{ id: "guest-1", name: "Asha", functionIds: ["ceremony-1"] }];

function input(planId = `plan-${Math.random().toString(36).slice(2, 12)}`) {
  return { planId, title: "Maya & Dev", hostName: "Maya", eventDate: "2027-11-02", functions, guests, expiresAt: "2099-12-31" };
}

describe("RSVP Firestore store", () => {
  beforeEach(() => {
    process.env.RSVP_SIGNING_SECRET = "a-very-long-test-secret-value-123";
    process.env.GOOGLE_CLOUD_PROJECT = "eventas-test";
  });

  it("reports configuration and publishes, reads, replies, lists, links, and revokes", async () => {
    expect(isRsvpConfigured()).toBe(true);
    const data = input();
    const published = await publishSharedPlan(data);
    expect(published.hostKey).toBe(deriveHostKey(data.planId));

    const view = await getSharedGuest(data.planId, "guest-1");
    expect(view?.plan.title).toBe("Maya & Dev");
    expect(view?.guest.name).toBe("Asha");
    expect(view?.response).toBeNull();

    await submitSharedRsvp(data.planId, "guest-1", { invites: [{ functionId: "ceremony-1", status: "yes", seats: 2 }], dietary: ["Jain"], notes: "See you" });
    const answered = await getSharedGuest(data.planId, "guest-1");
    expect(answered?.response).toMatchObject({ dietary: ["Jain"], notes: "See you" });

    const responses = await listResponses(data.planId, published.hostKey);
    expect(responses).toHaveLength(1);
    expect(responses[0]?.guestName).toBe("Asha");

    const links = await makeGuestLinks(data.planId, published.hostKey, "https://eventas.test/");
    expect(links[0]?.url).toContain("https://eventas.test/rsvp/");
    expect(links[0]?.name).toBe("Asha");

    await revokeSharedPlan(data.planId, published.hostKey);
    expect(await getSharedGuest(data.planId, "guest-1")).toBeNull();
  });

  it("chunks large guest lists past the Firestore batch limit", async () => {
    const data = input();
    const many = Array.from({ length: 900 }, (_, index) => ({ id: `guest-${index}`, name: `Guest ${index}`, functionIds: ["ceremony-1"] }));
    const { hostKey } = await publishSharedPlan({ ...data, guests: many });
    const links = await makeGuestLinks(data.planId, hostKey, "https://eventas.test");
    expect(links).toHaveLength(900);
  });

  it("protects updates and rejects bad host keys, expiry, and invalid guests", async () => {
    const data = input();
    const { hostKey } = await publishSharedPlan(data);
    await expect(publishSharedPlan({ ...data, title: "Updated" })).rejects.toMatchObject({ status: 403 });
    await expect(publishSharedPlan({ ...data, title: "Updated", hostKey })).resolves.toBeTruthy();
    await expect(publishSharedPlan({ ...input(), expiresAt: "2000-01-01" })).rejects.toBeInstanceOf(RsvpHttpError);
    await expect(listResponses(data.planId, "wrong-key")).rejects.toMatchObject({ status: 403 });
    await expect(submitSharedRsvp(data.planId, "missing", { invites: [], dietary: [], notes: "" })).rejects.toMatchObject({ status: 410 });
    await expect(submitSharedRsvp(data.planId, "guest-1", { invites: [{ functionId: "other", status: "yes", seats: 1 }], dietary: [], notes: "" })).rejects.toMatchObject({ status: 400 });
    await expect(makeGuestLinks(data.planId, "wrong-key", "https://eventas.test")).rejects.toMatchObject({ status: 403 });
  });

  it("returns a configuration error when credentials are missing", async () => {
    delete process.env.GOOGLE_CLOUD_PROJECT;
    expect(isRsvpConfigured()).toBe(false);
    await expect(publishSharedPlan(input())).rejects.toMatchObject({ status: 503 });
  });
});
