import type { Brief, FunctionKind, Plan, Tradition, Vendor } from "../domain/types";
import { createDefaultAi } from "../domain/engine/plan";
import { auditPlan } from "../domain/engine/audit";
import { getBudgetTotals } from "../domain/engine/budget";
import { getTradition } from "../domain/traditions";
import { defaultFunctionDrafts, functionKindLabel, functionKindMeta } from "../domain/functions";
import { findMuhuratSuggestion, formatMuhuratTime, muhuratInMonth, traditionUsesMuhurat } from "../domain/muhurat";
import { INDIAN_CITIES } from "../domain/indian-cities";
import { inferCostLevel } from "../domain/city-tiers";
import { addDays, formatDate, formatMoney, parseISODate, toISODate } from "@/lib/utils/format";

export function demoPlanEnrichment(plan: Plan) {
  const ai = createDefaultAi(plan.brief, new Date(), plan.functions);
  return {
    headline: ai.headline,
    insights: ai.insights,
    ideas: plan.ideas.map(({ kind, title, description, cost, tags }) => ({ kind, title, description, cost, tags })),
  };
}

/** Contextual offline responses keep the complete product usable without a key. */
export function demoAssistantReply(plan: Plan, question: string): string {
  const lower = question.toLowerCase();
  const totals = getBudgetTotals(plan.budget);
  const sorted = [...plan.budget].sort((a, b) => b.planned - a.planned);
  const next = plan.timeline.filter((task) => task.status !== "done").slice(0, 3);
  const audit = auditPlan(plan);
  const tradition = getTradition(plan.brief.tradition);

  if (lower.includes("forget") || lower.includes("missing") || lower.includes("gap") || lower.includes("overlook")) {
    const items = [...audit.gaps.map((item) => `- **${item.title}** — ${item.detail}`), ...audit.warnings.map((item) => `- **${item.title}** — ${item.detail}`)];
    return items.length
      ? `Here is what I would check next:\n\n${items.slice(0, 6).join("\n")}\n\nThese are planning prompts, not rules. Confirm muhurat with your pandit and legal or permit details with the right authority.`
      : "Your plan covers the major wedding pillars: budget, functions, vendors, and registration. Keep the contingency protected and reconfirm vendor balances in the final week.";
  }

  if (lower.includes("run sheet") || lower.includes("day-of") || lower.includes("schedule")) {
    if (plan.functions.length === 0) return "Add your functions first, then I can build a run sheet with muhurat, baraat, and vendor arrival times.";
    const lines = plan.functions
      .slice()
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
      .map((item) => `- **${formatDate(item.date)} · ${item.startTime || "time TBC"}** — ${item.name} at ${item.venue || plan.brief.location}, ${item.guestCount} guests`);
    return `Here is a first-pass run sheet:\n\n${lines.join("\n")}\n\nAdd vendor arrival windows, family roles, and a 30-minute buffer around the muhurat. The printable run sheet is the next thing I would build.`;
  }

  if (lower.includes("muhurat") || lower.includes("auspicious") || lower.includes("shubh")) {
    if (plan.muhurat) {
      return `Your saved muhurat is **${formatDate(plan.muhurat.date)}**, ${formatMuhuratTime(plan.muhurat)} (${plan.muhurat.label}).\n\nThis is a planning note, not a religious ruling. Confirm the window with your family pandit before you pay venue or vendor deposits.`;
    }
    if (!traditionUsesMuhurat(plan.brief.tradition)) {
      return `A ${tradition.label} wedding does not use a muhurat by default. Confirm the ceremony date and time with your ${tradition.ritualLead.toLowerCase()}. If your family is adding one, you can enter it in the Functions view.`;
    }
    return "You have not saved a muhurat yet. Get 3–4 dates from your pandit, check venue availability for each, and only then pay a deposit. I can store one window in the plan, but I will never invent an auspicious date.";
  }

  if (lower.includes("tradition") || lower.includes("ritual") || lower.includes("culture")) {
    return `Your plan is set to **${tradition.label}**. Typical functions are ${tradition.functions.join(", ")}, led by the ${tradition.ritualLead.toLowerCase()}.\n\n${tradition.notes.map((note) => `- ${note}`).join("\n")}\n\nThese are defaults, not requirements. Confirm the actual sequence with both families.`;
  }

  if (lower.includes("budget") || lower.includes("spend") || lower.includes("save") || lower.includes("cost")) {
    return `Your plan allocates **${formatMoney(totals.planned)}** of the **${formatMoney(plan.brief.budget)}** budget. The three largest categories are ${sorted.slice(0, 3).map((item) => `${item.name} (${formatMoney(item.planned)})`).join(", ")}.\n\nI would protect your stated priorities first, then review decor, gifts, and upgrades. Use **Rebalance with AI** on the Budget view for a specific before-and-after proposal—you stay in control of applying it. Remember that venue and catering quotes may exclude GST and staff.`;
  }
  if (lower.includes("vendor") || lower.includes("book") || lower.includes("contract")) {
    const open = plan.vendors.filter((vendor) => vendor.status !== "booked");
    return `You have **${open.length} vendor categories still open**. Start with ${open.slice(0, 3).map((vendor) => vendor.category).join(", ") || "your remaining categories"}.\n\nFor each one, get the full fee, GST, cancellation terms, setup requirements, and backup plan in writing. The **Vendors** view includes category-specific Indian wedding questions and red flags to bring to the call.`;
  }
  if (lower.includes("idea") || lower.includes("theme") || lower.includes("personal")) {
    const ideas = plan.ideas.slice(0, 3);
    return `Given your **${plan.brief.vibe}** direction, I would start with:\n\n${ideas.map((idea) => `- **${idea.title}** — ${idea.description}`).join("\n")}\n\nSave the ones that feel right in the Ideas view; the assistant will use them as context.`;
  }
  return `Here are the next three moves I would focus on:\n\n${next.map((task, index) => `${index + 1}. **${task.title}** — ${task.description}`).join("\n")}\n\nYour budget currently has **${formatMoney(totals.remaining)} unspent** against planned amounts. I can also help with budget trade-offs, vendor questions, muhurat, or what you might be forgetting.`;
}

const TRADITION_KEYWORDS: Array<[RegExp, Tradition]> = [
  [/anand karaj|gurdwara|punjabi|sikh|langar/i, "punjabi-sikh"],
  [/south indian|tamil|telugu|kannada|malayali|muhurtham|nadaswaram/i, "south-indian"],
  [/bengali|shubho drishti|saat paak|kolkata/i, "bengali"],
  [/gujarati|garba|mameru/i, "gujarati"],
  [/rajasthani|marwari|thapa|bhaat/i, "rajasthani"],
  [/marathi|sakhar puda|antarpat/i, "marathi"],
  [/muslim|nikah|walima|halal/i, "muslim"],
  [/christian|church|pastor/i, "christian"],
  [/interfaith|fusion|two traditions/i, "interfaith"],
];

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9,
  sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

function parseBudget(text: string): number | null {
  const withUnit = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac|l)\b/i);
  if (withUnit) {
    const value = Number(withUnit[1]);
    const unit = (withUnit[2] ?? "").toLowerCase();
    if (!Number.isFinite(value)) return null;
    if (unit.startsWith("c")) return Math.round(value * 10_000_000);
    return Math.round(value * 100_000);
  }
  const contextual = text.match(/(?:budget|spend|cost|around|about)\D{0,12}(?:₹|rs\.?|inr)?\s*([\d,]{4,})/i);
  if (contextual) {
    const value = Number(contextual[1]?.replaceAll(",", ""));
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

function parseGuests(text: string): number | null {
  const after = text.match(/(\d{2,5})\s*(?:guests|people|attendees|log)\b/i);
  if (after) return Number(after[1]);
  const before = text.match(/(?:guests|people|attendees)\D{0,8}(\d{2,5})/i);
  return before ? Number(before[1]) : null;
}

function parseDate(text: string, now: Date): string {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const monthYear = text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(20\d{2})\b/i);
  if (monthYear) {
    const month = MONTHS[monthYear[1]?.toLowerCase() ?? ""] ?? 11;
    const year = Number(monthYear[2]);
    const suggested = muhuratInMonth(year, month)[0];
    return suggested?.date ?? `${year}-${String(month).padStart(2, "0")}-15`;
  }
  return toISODate(addDays(now, 180));
}

function parseLocation(text: string): string {
  const lower = text.toLowerCase();
  const matches = INDIAN_CITIES.filter((item) => lower.includes(item.city.toLowerCase()));
  const best = matches.sort((a, b) => b.city.length - a.city.length)[0];
  return best ? `${best.city}, ${best.state}` : "New Delhi, Delhi";
}

function parseTradition(text: string): Tradition {
  for (const [pattern, tradition] of TRADITION_KEYWORDS) if (pattern.test(text)) return tradition;
  return "north-hindu";
}

function requestedFunctions(text: string): FunctionKind[] {
  const lower = text.toLowerCase();
  const found: FunctionKind[] = [];
  if (/haldi|pithi/.test(lower)) found.push("haldi");
  if (/mehndi|mehendi/.test(lower)) found.push("mehndi");
  if (/sangeet|garba|dholki/.test(lower)) found.push("sangeet");
  if (/baraat|ghodi/.test(lower)) found.push("baraat");
  if (/reception|walima/.test(lower)) found.push("reception");
  if (/vidaai|vidai/.test(lower)) found.push("vidaai");
  if (/griha|pag phera/.test(lower)) found.push("griha-pravesh");
  return found;
}

export function demoWeddingDraft(message: string, now = new Date()) {
  const tradition = parseTradition(message);
  const date = parseDate(message, now);
  const location = parseLocation(message);
  const guests = parseGuests(message) ?? 300;
  const budget = parseBudget(message) ?? 4_000_000;
  const costLevel = inferCostLevel(location);
  const muhurat = traditionUsesMuhurat(tradition) ? findMuhuratSuggestion(date) : null;

  const brief: Brief = {
    eventType: "wedding",
    title: "Our wedding",
    hostNames: "The couple",
    date,
    guests,
    budget,
    location,
    costLevel,
    priorities: ["catering", "photo", "decor"],
    vibe: costLevel === "high" ? "royal" : "traditional",
    notes: message.slice(0, 1200),
    constraints: ["Vegetarian options", "Step-free access"],
    tradition,
    functions: [],
  };

  const defaults = defaultFunctionDrafts(brief);
  const requested = requestedFunctions(message);
  const extraFunctions = requested
    .filter((kind) => !defaults.some((item) => item.kind === kind))
    .map((kind) => {
      const meta = functionKindMeta(kind);
      return {
        kind,
        name: functionKindLabel(kind),
        date: toISODate(addDays(parseISODate(date), meta.dayOffset)),
        startTime: meta.start,
        endTime: meta.end,
        venue: location,
        guestCount: Math.max(1, Math.round(guests * meta.guestShare)),
        dressCode: meta.dress,
        hostSide: "both" as const,
      };
    });
  brief.functions = [...defaults, ...extraFunctions].slice(0, 8);
  brief.muhurat = muhurat ?? undefined;

  const assumptions = [
    `We assumed ${guests} guests and a working budget of ${formatMoney(budget)}.`,
    `We planned ${brief.functions.length} function${brief.functions.length > 1 ? "s" : ""}: ${brief.functions.map((item) => item.name).join(", ")}.`,
    `We used ${location} as the planning city and a ${costLevel} cost level.`,
    muhurat
      ? `We suggested ${formatDate(muhurat.date)} from the curated muhurat table; confirm the timing with your pandit.`
      : "No muhurat date was selected; confirm the date and window with your pandit before booking.",
  ];
  const questions: string[] = [];
  if (!parseGuests(message)) questions.push("How many guests are you expecting, and is that the same for every function?");
  if (!parseBudget(message)) questions.push("What is the total budget, and who is contributing?");
  if (!parseLocationMatch(message)) questions.push("Which city or venue are you planning around?");
  if (!requested.length) questions.push("Which functions are must-haves beyond the ceremony and reception?");

  return {
    brief,
    muhurat,
    assumptions,
    questions: questions.slice(0, 3),
  };
}

function parseLocationMatch(text: string): boolean {
  const lower = text.toLowerCase();
  return INDIAN_CITIES.some((item) => lower.includes(item.city.toLowerCase()));
}

export function demoDraftMessage(plan: Plan, vendor: Vendor, intent?: string): string {
  const couple = plan.brief.hostNames || "the couple";
  const functions = plan.functions.length
    ? plan.functions.map((item) => `${item.name} on ${formatDate(item.date)}`).join(", ")
    : `the wedding on ${formatDate(plan.brief.date)}`;
  const questions = vendor.questions.slice(0, 4).map((question) => `- ${question}`).join("\n");
  const negotiation = intent && /discount|negotiat|budget|compare/i.test(intent)
    ? "\nWe are speaking with a small number of vendors and would appreciate your best all-inclusive quote."
    : "";
  return `Hello ${vendor.category} team,\n\nWe are ${couple}, planning our wedding in ${plan.brief.location}. Our functions are ${functions}, with around ${plan.brief.guests} guests.\n\nCould you please share availability and a written quote? We would also like to understand:\n${questions}\n\nPlease include GST, service charge, staffing, setup, and cancellation terms in the quote.${negotiation}\n\nThank you,\n${couple}`;
}

export function demoDraftMessageBody(plan: Plan, vendor: Vendor, intent?: string): { body: string } {
  return { body: demoDraftMessage(plan, vendor, intent) };
}
