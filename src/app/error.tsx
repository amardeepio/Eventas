"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  return <main id="main-content" className="grid min-h-screen place-items-center px-6 text-center">
    <div className="max-w-lg">
      <Logo className="mb-12" />
      <p className="text-[11px] font-bold tracking-[.18em] text-clay uppercase">A small detour</p>
      <h1 className="mt-4 font-display text-5xl font-medium tracking-[-.04em]">This page lost the run sheet.</h1>
      <p className="mt-5 leading-7 text-muted">Your saved plan is still on this device. Try again, or head back to the planning studio.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3"><Button onClick={reset}>Try again</Button><Button variant="secondary" onClick={() => router.push("/plan")}>Open my plan</Button></div>
    </div>
  </main>;
}
