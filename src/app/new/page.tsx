import { Suspense } from "react";
import type { Metadata } from "next";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

export const metadata: Metadata = { title: "Create your event plan" };

export default function NewPlanPage() {
  return <Suspense fallback={<main id="main-content" className="grid min-h-dvh place-items-center font-display text-3xl">Preparing your brief…</main>}><OnboardingWizard /></Suspense>;
}
