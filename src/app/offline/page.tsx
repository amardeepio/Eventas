import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return <main id="main-content" className="grid min-h-dvh place-items-center bg-bone px-6 text-center">
    <div className="max-w-md">
      <Logo className="mx-auto mb-8" />
      <WifiOff className="mx-auto text-clay" size={34} aria-hidden="true" />
      <h1 className="mt-5 font-display text-4xl font-medium">Your plan is still here.</h1>
      <p className="mt-4 text-sm leading-7 text-muted">The page you asked for was not cached yet. Open a plan you have visited before, or reconnect and try again.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/plan" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white">Open my plan</Link><Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink">Home</Link></div>
      <p className="mt-6 text-[11px] leading-5 text-muted">Offline planning works once the studio has loaded on this device. Back up your plan regularly.</p>
    </div>
  </main>;
}
