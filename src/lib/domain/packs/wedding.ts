import type { DomainPack } from "../types";

export const weddingPack: DomainPack = {
  id: "wedding",
  label: "Wedding",
  shortLabel: "Wedding",
  eyebrow: "For the two of you",
  description: "A thoughtful plan for the ceremony, the celebration, and everything between.",
  terminology: { eventDay: "wedding day", host: "Couple", guest: "guest" },
  defaultGuests: 120,
  defaultBudget: 2500000,
  horizonMonths: 12,
  budget: [
    { id: "venue", label: "Venue & rentals", weight: 24, floor: 8, color: "#a5533d", perGuest: true, description: "Ceremony and reception space, tables, chairs, and basic rentals." },
    { id: "catering", label: "Food & drinks", weight: 25, floor: 12, color: "#c77b57", perGuest: true, description: "Per-guest catering, service, cake-cutting, and beverages." },
    { id: "photo", label: "Photo & film", weight: 10, floor: 3, color: "#5d7161", description: "Photography, videography, albums, and usage rights." },
    { id: "attire", label: "Attire & beauty", weight: 7, floor: 2, color: "#84957f", description: "Outfits, alterations, hair, makeup, and accessories." },
    { id: "decor", label: "Decor & florals", weight: 9, floor: 2, color: "#b49358", description: "Flowers, lighting, signage, and ceremony styling." },
    { id: "music", label: "Music", weight: 6, floor: 1, color: "#d2b878", description: "Ceremony musicians, DJ or band, and sound equipment." },
    { id: "stationery", label: "Stationery", weight: 2, floor: 0, color: "#9b7c8d", perGuest: true, description: "Invitations, postage, menus, and place cards." },
    { id: "cake", label: "Cake & desserts", weight: 2, floor: 0, color: "#c28c9c", perGuest: true, description: "Wedding cake, dessert table, and delivery." },
    { id: "transport", label: "Transport", weight: 2, floor: 0, color: "#728b9b", perGuest: true, description: "Wedding-party and guest transportation." },
    { id: "rings", label: "Rings", weight: 4, floor: 0, color: "#8b7355", description: "Wedding bands, resizing, and insurance." },
    { id: "ceremony", label: "Officiant & legal", weight: 1, floor: 0, color: "#807a70", description: "Officiant, license, and ceremony fees." },
    { id: "favors", label: "Favors & gifts", weight: 2, floor: 0, color: "#b59d91", perGuest: true, description: "Guest favors and wedding-party thank-you gifts." },
    { id: "contingency", label: "Contingency", weight: 6, floor: 5, color: "#ded7cd", description: "Protected buffer for gratuities, weather, and surprises." },
  ],
  priorities: [
    { id: "venue", label: "A beautiful venue" }, { id: "catering", label: "Unforgettable food" },
    { id: "photo", label: "Photography" }, { id: "decor", label: "Decor & flowers" },
    { id: "music", label: "A packed dance floor" }, { id: "attire", label: "Attire & styling" },
  ],
  vibes: [
    { id: "modern", label: "Modern editorial", description: "Clean lines, sculptural florals, quiet luxury." },
    { id: "garden", label: "Garden romance", description: "Soft palettes, candlelight, and an outdoor feeling." },
    { id: "traditional", label: "Cultural & traditional", description: "Heritage rituals, family moments, joyful color." },
    { id: "celebration", label: "Big celebration", description: "High energy, late night, music at the center." },
  ],
  timeline: [
    { name: "Foundation", weeksBefore: 52, tasks: [
      { title: "Agree on the non-negotiables", description: "Align on budget, guest count, atmosphere, and the three things that matter most.", priority: "high" },
      { title: "Draft the guest list", description: "Create A and B lists and collect addresses in one place.", priority: "high" },
    ] },
    { name: "Book the anchors", weeksBefore: 40, tasks: [
      { title: "Tour and book the venue", description: "Confirm capacity, curfew, accessibility, rain plan, and what rentals are included.", priority: "high" },
      { title: "Book photographer and caterer", description: "Review full galleries and sample menus before signing.", priority: "high" },
    ] },
    { name: "Build the team", weeksBefore: 28, tasks: [
      { title: "Book music, florist, and officiant", description: "Share the run of show and confirm setup, power, and breakdown requirements." },
      { title: "Choose attire and schedule fittings", description: "Allow time for ordering and at least two alterations." },
    ] },
    { name: "Invite & design", weeksBefore: 20, tasks: [
      { title: "Send invitations", description: "Include RSVP date, meal choices, transport, and accessibility requests.", priority: "high" },
      { title: "Finalize the design plan", description: "Lock linen, floral, lighting, signage, and floor-plan choices." },
    ] },
    { name: "Taste & refine", weeksBefore: 12, tasks: [
      { title: "Menu and cake tasting", description: "Confirm dietary alternatives and service timing with the caterer." },
      { title: "Apply for the marriage license", description: "Check local validity windows and witness requirements.", priority: "high" },
    ] },
    { name: "Final details", weeksBefore: 6, tasks: [
      { title: "Chase RSVPs and build seating", description: "Group by relationships and keep accessible routes clear.", priority: "high" },
      { title: "Write the day-of run sheet", description: "Share vendor arrivals, contacts, ceremony cues, and payment schedule." },
    ] },
    { name: "Wedding week", weeksBefore: 1, tasks: [
      { title: "Confirm every vendor", description: "Reconfirm final numbers, arrival times, weather plan, and balances.", priority: "high" },
      { title: "Pack the day-of kit", description: "Rings, vows, licenses, chargers, sewing kit, and vendor tips." },
    ] },
    { name: "The day", weeksBefore: 0, tasks: [
      { title: "Hand the plan to your point person", description: "Be present. Let someone else answer vendor questions.", priority: "high" },
    ] },
  ],
  vendors: [
    { id: "venue", label: "Venue", budgetCategoryId: "venue", questions: ["What is included in the rental fee?", "What are the curfew and noise rules?", "What is the severe-weather plan?", "Is the full guest route step-free?"], redFlags: ["Unclear overtime fees", "No written cancellation terms", "No accessible restroom"] },
    { id: "caterer", label: "Caterer", budgetCategoryId: "catering", questions: ["Is service staff included?", "How are allergies handled?", "Can we taste the exact menu?", "What is the final-guest-count deadline?"], redFlags: ["No food-safety certification", "Vague staffing ratio", "No dietary labeling process"] },
    { id: "photographer", label: "Photographer", budgetCategoryId: "photo", questions: ["Can we see three full wedding galleries?", "Who is the backup photographer?", "When do we receive edited images?", "Are print and sharing rights included?"], redFlags: ["Only highlight galleries", "No backup equipment", "No delivery date in contract"] },
    { id: "florist", label: "Florist & stylist", budgetCategoryId: "decor", questions: ["Which flowers will be in season?", "Can ceremony pieces be repurposed?", "Are setup and teardown included?", "What happens if a flower is unavailable?"], redFlags: ["No substitution policy", "Unclear teardown fees", "No venue visit planned"] },
    { id: "music", label: "DJ or band", budgetCategoryId: "music", questions: ["Can you MC announcements?", "What is your backup power and equipment plan?", "How do you handle do-not-play songs?", "How long are breaks?"], redFlags: ["No backup equipment", "No contract", "Unwilling to take a do-not-play list"] },
    { id: "officiant", label: "Officiant", budgetCategoryId: "ceremony", questions: ["Will you help personalize the ceremony?", "Do you handle license filing?", "Is a rehearsal included?", "What is your backup plan?"], redFlags: ["Unfamiliar with local license rules", "No rehearsal or script review"] },
  ],
  ideas: [
    { kind: "Concept", title: "A dinner party, not a production", description: "Long candlelit tables, one generous shared menu, and a short ceremony that flows straight into dinner.", tags: ["intimate", "editorial"] },
    { kind: "Signature moment", title: "One song, everyone in", description: "End the ceremony with a joyful recessional chosen with your guests, then capture one full-group photograph.", tags: ["guest experience", "photo"] },
    { kind: "Menu", title: "A menu with a memory", description: "Build two courses around a place or family recipe that matters to you; print the story in one sentence on the menu.", tags: ["personal", "food"] },
    { kind: "Playlist", title: "Three chapters of the night", description: "Low and familiar during dinner, cross-generational favorites after speeches, then your unapologetic late-night list.", tags: ["music", "low cost"] },
    { kind: "Decor", title: "Spend where guests gather", description: "Keep the ceremony simple and move its florals to the reception. Invest in candlelight and the tables people actually touch.", tags: ["budget smart", "florals"] },
    { kind: "Favors", title: "Edible, local, optional", description: "A small local treat at each place setting with a donation card for guests who would rather skip a physical favor.", tags: ["sustainable", "guests"] },
  ],
  sample: {
    eventType: "wedding", title: "Maya & Dev’s wedding", hostNames: "Maya & Dev", weeksFromNow: 36,
    guests: 120, budget: 2500000, location: "Udaipur, Rajasthan", costLevel: "average",
    priorities: ["catering", "photo", "music"], vibe: "garden",
    notes: "An outdoor ceremony, long dinner tables, and a dance floor that works for every generation.",
    constraints: ["Vegetarian options", "Step-free access"],
  },
};
