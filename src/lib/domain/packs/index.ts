import { birthdayPack } from "./birthday";
import { communityPack } from "./community";
import { weddingPack } from "./wedding";
import type { DomainPack, EventType } from "../types";

export const packs: Record<EventType, DomainPack> = {
  wedding: weddingPack,
  birthday: birthdayPack,
  community: communityPack,
};

export const packList = [weddingPack, birthdayPack, communityPack];

export function getPack(eventType: EventType): DomainPack {
  return packs[eventType];
}

export function getSampleBrief(eventType: EventType, now = new Date()) {
  const { weeksFromNow, ...sample } = getPack(eventType).sample;
  return { ...sample, date: toISODate(addDays(now, weeksFromNow * 7)) };
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
