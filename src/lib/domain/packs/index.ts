import { birthdayPack } from "./birthday";
import { communityPack } from "./community";
import { weddingPack } from "./wedding";
import type { Brief, DomainPack, EventType } from "../types";
import { defaultFunctionDrafts } from "../functions";

export const packs: Record<EventType, DomainPack> = {
  wedding: weddingPack,
  birthday: birthdayPack,
  community: communityPack,
};

export const packList = [weddingPack, birthdayPack, communityPack];

export function getPack(eventType: EventType): DomainPack {
  return packs[eventType];
}

export function getSampleBrief(eventType: EventType, now = new Date()): Brief {
  const { weeksFromNow, functionKinds, ...sample } = getPack(eventType).sample;
  const date = toISODate(addDays(now, weeksFromNow * 7));
  const base: Brief = { ...sample, date, functions: [] };
  const defaults = defaultFunctionDrafts(base);
  const functions = functionKinds?.length
    ? defaults.filter((item) => functionKinds.includes(item.kind))
    : defaults;
  return { ...base, functions: functions.length ? functions : defaults };
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
