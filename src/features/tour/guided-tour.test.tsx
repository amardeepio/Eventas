import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Check, Compass } from "lucide-react";
import { LanguageProvider } from "@/lib/i18n/language-provider";
import { interpolate } from "@/lib/i18n/text";
import { buildPlan } from "@/lib/domain/engine/plan";
import { getSampleBrief } from "@/lib/domain/packs";
import { TourShell, getCardPosition, type TourShellProps, type TourStep } from "./tour-shell";
import { createStudioSteps } from "./guided-tour";
import {
  clearTourProgress,
  getTourEvents,
  getTourProgress,
  hasSeenTour,
  isTourSnoozed,
  markTourSeen,
  resetTour,
  resetTourMemory,
  resetTours,
  setTourProgress,
  shouldAutoStartTour,
  snoozeTour,
  trackTourEvent,
} from "./tour-storage";

const t = (source: string, vars?: Record<string, string | number>) => interpolate(source, vars);

const steps: TourStep[] = [
  { id: "welcome", icon: Compass, eyebrow: "Welcome", title: "Welcome aboard", body: "A short walk through the studio." },
  { id: "one", icon: Check, eyebrow: "One", title: "First stop", body: "The first thing you should know." },
  { id: "two", icon: Check, eyebrow: "Two", title: "Second stop", body: "The second thing you should know." },
  { id: "finish", icon: Check, eyebrow: "All set", title: "All done", body: "You are ready to plan." },
];

function renderShell(props: Partial<TourShellProps> = {}) {
  const onClose = props.onClose ?? vi.fn();
  render(<LanguageProvider><TourShell steps={steps} onClose={onClose} {...props} /></LanguageProvider>);
  return { onClose, user: userEvent.setup() };
}

async function goToEnd(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /show me around/i }));
  for (let step = 0; step < 2; step += 1) await user.click(screen.getByRole("button", { name: /^next$/i }));
}

describe("tour shell", () => {
  it("opens with a welcome step and walks through every stop", async () => {
    const { onClose, user } = renderShell();
    expect(screen.getByRole("dialog", { name: /welcome aboard/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show me around/i }));
    expect(screen.getByRole("dialog", { name: /first stop/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByRole("dialog", { name: /second stop/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^back$/i }));
    expect(screen.getByRole("dialog", { name: /first stop/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByRole("dialog", { name: /all done/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start planning/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("resumes from a stored step", () => {
    renderShell({ initialStepId: "two" });
    expect(screen.getByRole("dialog", { name: /second stop/i })).toBeInTheDocument();
  });

  it("can be skipped, dismissed for good, or dismissed with the keyboard", async () => {
    const first = renderShell({ onDismiss: vi.fn() });
    await first.user.click(screen.getByRole("button", { name: /skip tour/i }));
    expect(first.onClose).toHaveBeenCalledTimes(1);
    cleanup();

    const dismiss = vi.fn();
    const second = renderShell({ onDismiss: dismiss });
    await second.user.click(screen.getByRole("button", { name: /don’t show again/i }));
    expect(dismiss).toHaveBeenCalledTimes(1);
    cleanup();

    const third = renderShell();
    await third.user.keyboard("{Escape}");
    expect(third.onClose).toHaveBeenCalledTimes(1);
  });

  it("runs a hands-on action and shows the confirmation", async () => {
    const actionStep: TourStep = {
      id: "welcome", icon: Compass, eyebrow: "Welcome", title: "Welcome aboard", body: "A short walk.", action: { label: "Do the thing" },
    };
    const onAction = vi.fn(() => "The thing is done.");
    render(<LanguageProvider><TourShell steps={[actionStep, steps[1], steps[3]]} onClose={vi.fn()} onAction={onAction} /></LanguageProvider>);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /do the thing/i }));
    expect(onAction).toHaveBeenCalledWith("welcome");
    expect(screen.getByRole("status")).toHaveTextContent("The thing is done.");
  });

  it("offers a secondary action and a replay on the final step", async () => {
    const onClose = vi.fn();
    const onFinishAction = vi.fn();
    render(<LanguageProvider><TourShell steps={steps} onClose={onClose} finishSummary={["First next step", "Second next step"]} finishAction={{ label: "Ask a question", onRun: onFinishAction }} /></LanguageProvider>);
    const user = userEvent.setup();

    await goToEnd(user);
    expect(screen.getByText("First next step")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /ask a question/i }));
    expect(onFinishAction).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /replay tour/i }));
    expect(screen.getByRole("dialog", { name: /welcome aboard/i })).toBeInTheDocument();
  });

  it("reports progress once per step", async () => {
    const onProgress = vi.fn();
    const { user } = renderShell({ onProgress });
    expect(onProgress).toHaveBeenCalledWith("welcome");
    await user.click(screen.getByRole("button", { name: /show me around/i }));
    expect(onProgress).toHaveBeenLastCalledWith("one");
  });
});

describe("card placement", () => {
  it("centres a card with no target and places it beside a left-hand target", () => {
    const centered = getCardPosition(null, 260, 1024, 768, false);
    expect(centered.placement).toBe("center");
    expect(centered.style.width).toBe(384);

    const beside = getCardPosition({ top: 100, left: 300, width: 200, height: 80 }, 260, 1440, 900, false);
    expect(beside.placement).toBe("right");
    expect(Number(beside.style.left)).toBeGreaterThan(500);
  });

  it("places the card above or left when space is tight", () => {
    const left = getCardPosition({ top: 10, left: 1200, width: 100, height: 600 }, 260, 1440, 900, false);
    expect(left.placement).toBe("left");

    const above = getCardPosition({ top: 500, left: 400, width: 600, height: 350 }, 260, 1200, 900, false);
    expect(above.placement).toBe("above");
  });

  it("docks as a bottom sheet on phones and flips up for bottom-fixed targets", () => {
    const bottom = getCardPosition({ top: 200, left: 20, width: 200, height: 100 }, 300, 390, 844, true);
    expect(bottom.placement).toBe("bottom");
    expect(bottom.style.bottom).toContain("safe-area-inset-bottom");

    const top = getCardPosition({ top: 760, left: 20, width: 100, height: 50 }, 300, 390, 844, true);
    expect(top.placement).toBe("top");
    expect(top.style.top).toContain("safe-area-inset-top");
  });
});

describe("studio steps", () => {
  it("adds the functions stop and counts the wedding views", () => {
    const plan = buildPlan(getSampleBrief("wedding", new Date("2026-10-24")));
    const studioSteps = createStudioSteps(plan, t);
    const navigation = studioSteps.find((step) => step.id === "navigation");
    expect(studioSteps.map((step) => step.id)).toContain("functions");
    expect(navigation?.title).toBe("6 calm views");
    expect(navigation?.body).toContain("Functions");
    expect(studioSteps.at(-1)?.id).toBe("finish");
    expect(studioSteps.at(-1)?.view).toBe("overview");
  });

  it("changes vendor and timeline guidance with the event type", () => {
    const wedding = createStudioSteps(buildPlan(getSampleBrief("wedding", new Date("2026-10-24"))), t);
    expect(wedding.find((step) => step.id === "vendors")?.body).toContain("pandit");
    expect(wedding.find((step) => step.id === "timeline")?.body).toContain("Mehndi");

    const birthday = createStudioSteps(buildPlan(getSampleBrief("birthday", new Date("2026-10-24"))), t);
    expect(birthday.find((step) => step.id === "vendors")?.body).toContain("baker");
    expect(birthday.find((step) => step.id === "timeline")?.body).toContain("three-month");

    const community = createStudioSteps(buildPlan(getSampleBrief("community", new Date("2026-10-24"))), t);
    expect(community.find((step) => step.id === "vendors")?.body).toContain("permits");
    expect(community.find((step) => step.id === "timeline")?.body).toContain("six-month");
  });

  it("leaves the functions stop out for birthdays and community events", () => {
    const birthday = createStudioSteps(buildPlan(getSampleBrief("birthday", new Date("2026-10-24"))), t);
    const navigation = birthday.find((step) => step.id === "navigation");
    expect(birthday.map((step) => step.id)).not.toContain("functions");
    expect(navigation?.title).toBe("5 calm views");
    expect(navigation?.body).not.toContain("Functions");

    const community = createStudioSteps(buildPlan(getSampleBrief("community", new Date("2026-10-24"))), t);
    expect(community.map((step) => step.id)).not.toContain("functions");
  });
});

describe("tour storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetTourMemory();
  });

  it("remembers a permanent finish and can reset both tours", () => {
    expect(hasSeenTour("studio")).toBe(false);
    markTourSeen("studio");
    expect(hasSeenTour("studio")).toBe(true);
    expect(shouldAutoStartTour("studio")).toBe(false);

    resetTours();
    expect(hasSeenTour("studio")).toBe(false);
    expect(hasSeenTour("landing")).toBe(false);
  });

  it("separates a session skip from a permanent dismissal", () => {
    snoozeTour("landing");
    expect(isTourSnoozed("landing")).toBe(true);
    expect(shouldAutoStartTour("landing")).toBe(false);
    expect(hasSeenTour("landing")).toBe(false);

    resetTour("landing");
    expect(shouldAutoStartTour("landing")).toBe(true);
  });

  it("stores and clears mid-tour progress", () => {
    expect(getTourProgress("studio")).toBeNull();
    setTourProgress("studio", "budget");
    expect(getTourProgress("studio")).toBe("budget");
    clearTourProgress("studio");
    expect(getTourProgress("studio")).toBeNull();
  });

  it("records a capped local event trail", () => {
    trackTourEvent("studio", "start");
    trackTourEvent("studio", "step", "brief");
    const events = getTourEvents();
    expect(events.at(-2)?.action).toBe("start");
    expect(events.at(-1)).toMatchObject({ action: "step", stepId: "brief" });
  });

  it("re-offers the tour when its version changes", () => {
    window.localStorage.setItem("eventas.tour.seen.v1", "1");
    expect(hasSeenTour("studio")).toBe(false);
    markTourSeen("studio");
    expect(hasSeenTour("studio")).toBe(true);
  });

  it("keeps working when storage is blocked", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(hasSeenTour("studio")).toBe(false);
    markTourSeen("studio");
    expect(hasSeenTour("studio")).toBe(true);
    getItem.mockRestore();
  });
});
