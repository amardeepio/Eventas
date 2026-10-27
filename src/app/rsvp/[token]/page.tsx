import type { Metadata } from "next";
import { RsvpForm } from "./rsvp-form";

export const metadata: Metadata = {
  title: "Your RSVP",
  robots: { index: false, follow: false },
};

export default async function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <RsvpForm token={token} />;
}
