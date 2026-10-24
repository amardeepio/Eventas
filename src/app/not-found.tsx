import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return <main id="main-content" className="grid min-h-screen place-items-center px-6 text-center">
    <div className="max-w-lg">
      <Logo className="mb-12" />
      <p className="font-display text-7xl text-clay/40">404</p>
      <h1 className="mt-4 font-display text-5xl font-medium tracking-[-.04em]">Nothing planned here.</h1>
      <p className="mt-5 leading-7 text-muted">This page doesn’t exist. Your event plan is safe and waiting in the planning studio.</p>
      <Link href="/" className="mt-8 inline-flex min-h-13 items-center rounded-full bg-ink px-7 text-sm font-semibold text-white">Back home</Link>
    </div>
  </main>;
}
