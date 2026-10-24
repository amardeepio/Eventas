import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { PlanProvider } from "@/lib/storage/plan-store";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Eventas — Your AI event planning studio", template: "%s · Eventas" },
  description: "Turn a 60-second brief into a smart budget, timeline, vendor checklist, and personalized ideas for weddings, birthdays, and community events.",
  applicationName: "Eventas",
  keywords: ["event planning", "AI wedding planner", "birthday planner", "community events"],
  openGraph: {
    title: "Eventas — Make room for the moment",
    description: "A smart budget, realistic timeline, vendor checklist, and personalized ideas from one thoughtful brief.",
    type: "website",
    siteName: "Eventas",
  },
  twitter: { card: "summary_large_image", title: "Eventas — Make room for the moment", description: "AI-powered event planning with logic behind the numbers." },
};

export const viewport: Viewport = { themeColor: "#f7f4ee", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${fraunces.variable}`}>
    <body>
      <a href="#main-content" className="fixed top-3 left-3 z-[100] -translate-y-20 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition focus:translate-y-0">Skip to content</a>
      <PlanProvider>{children}</PlanProvider>
    </body>
  </html>;
}
