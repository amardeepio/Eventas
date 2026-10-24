import type { DomainPack } from "../types";

export const birthdayPack: DomainPack = {
  id: "birthday",
  label: "Birthday",
  shortLabel: "Birthday",
  eyebrow: "For their next chapter",
  description: "A celebration with personality, without the last-minute scramble.",
  terminology: { eventDay: "party day", host: "Host", guest: "guest" },
  defaultGuests: 50,
  defaultBudget: 5000,
  horizonMonths: 3,
  budget: [
    { id: "venue", label: "Venue & rentals", weight: 20, floor: 0, color: "#a5533d", description: "Space hire, furniture, linens, and cleaning." },
    { id: "food", label: "Food & drinks", weight: 26, floor: 10, color: "#c77b57", perGuest: true, description: "Catering or restaurant minimum, staff, and beverages." },
    { id: "cake", label: "Cake", weight: 8, floor: 2, color: "#c28c9c", perGuest: true, description: "Cake, candles, cutting, and delivery." },
    { id: "entertainment", label: "Entertainment", weight: 14, floor: 3, color: "#5d7161", description: "DJ, performer, activity host, or games." },
    { id: "decor", label: "Decor", weight: 12, floor: 2, color: "#b49358", description: "Balloons, florals, lighting, and a photo backdrop." },
    { id: "photo", label: "Photography", weight: 6, floor: 0, color: "#84957f", description: "A photographer or content creator for the key hours." },
    { id: "invitations", label: "Invitations", weight: 3, floor: 0, color: "#9b7c8d", perGuest: true, description: "Digital or printed invitations and reminders." },
    { id: "favors", label: "Favors", weight: 4, floor: 0, color: "#b59d91", perGuest: true, description: "Small take-home gifts or activity supplies." },
    { id: "contingency", label: "Contingency", weight: 7, floor: 5, color: "#ded7cd", description: "Weather, extra guests, transport, and last-minute supplies." },
  ],
  priorities: [
    { id: "food", label: "Great food" }, { id: "entertainment", label: "Entertainment" },
    { id: "decor", label: "A standout theme" }, { id: "venue", label: "The right venue" },
    { id: "photo", label: "Capturing it" }, { id: "cake", label: "A showpiece cake" },
  ],
  vibes: [
    { id: "dinner", label: "Dinner with friends", description: "Good conversation, excellent food, low fuss." },
    { id: "playful", label: "Playful & colorful", description: "A clear theme, interactive moments, big smiles." },
    { id: "dance", label: "Dance party", description: "A great sound system and a late-night energy." },
    { id: "family", label: "All-ages gathering", description: "Comfortable, inclusive, and easy for every generation." },
  ],
  timeline: [
    { name: "Set the direction", weeksBefore: 12, tasks: [
      { title: "Choose the date and guest list", description: "Check with the people who absolutely must be there before paying a deposit.", priority: "high" },
      { title: "Set a realistic budget", description: "Include tax, tips, delivery, and a contingency buffer.", priority: "high" },
    ] },
    { name: "Book the essentials", weeksBefore: 8, tasks: [
      { title: "Reserve the venue or restaurant", description: "Confirm minimum spend, accessibility, parking, and end time.", priority: "high" },
      { title: "Book entertainment and cake", description: "Share the theme, dietary needs, venue access, and delivery window." },
    ] },
    { name: "Invite & personalize", weeksBefore: 5, tasks: [
      { title: "Send invitations", description: "Include arrival time, dress code, directions, RSVP date, and allergy questions.", priority: "high" },
      { title: "Plan one personal moment", description: "A short toast, photo slideshow, memory table, or guestbook is enough." },
    ] },
    { name: "Confirm the details", weeksBefore: 2, tasks: [
      { title: "Confirm final numbers and menu", description: "Send dietary requirements and final count to food vendors.", priority: "high" },
      { title: "Order decor and supplies", description: "Candles, matches, tape, scissors, chargers, and a cleanup kit." },
    ] },
    { name: "Party week", weeksBefore: 1, tasks: [
      { title: "Make the run sheet", description: "Vendor arrivals, food service, speeches, cake, and end time.", priority: "high" },
      { title: "Confirm vendors and weather plan", description: "Share one contact person and a clear wet-weather alternative." },
    ] },
    { name: "Party day", weeksBefore: 0, tasks: [
      { title: "Set up early, then enjoy it", description: "Delegate vendor questions and take the group photo before people leave.", priority: "high" },
    ] },
  ],
  vendors: [
    { id: "venue", label: "Venue", budgetCategoryId: "venue", questions: ["Is there a minimum spend?", "Can we bring our own cake and decor?", "What time can we access the space?", "Is there step-free access?"], redFlags: ["Hidden cleaning fees", "No written end time", "No cancellation policy"] },
    { id: "caterer", label: "Food provider", budgetCategoryId: "food", questions: ["Can you handle the listed allergies?", "Is staffing included?", "What is the final-count deadline?", "How is leftover food handled?"], redFlags: ["No allergy process", "Vague service charges", "No food-safety practices"] },
    { id: "baker", label: "Baker", budgetCategoryId: "cake", questions: ["Can you match this serving count?", "Do you offer dietary alternatives?", "Is delivery included?", "How should the cake be stored?"], redFlags: ["No delivery plan", "Cannot confirm servings", "No allergy information"] },
    { id: "entertainer", label: "Entertainment", budgetCategoryId: "entertainment", questions: ["What space and power do you need?", "Is setup time included?", "What is your backup plan?", "Can you adapt to the age mix?"], redFlags: ["No insurance where required", "No backup equipment", "Unclear performance duration"] },
  ],
  ideas: [
    { kind: "Concept", title: "Their favorites, turned up slightly", description: "Build the whole party around three things they genuinely love rather than a theme that only looks good online.", tags: ["personal", "flexible"] },
    { kind: "Signature moment", title: "The memory table", description: "Ask guests to bring one photo or note. Arrange them on a table and read a few aloud before cake.", tags: ["low cost", "emotional"] },
    { kind: "Menu", title: "Grazing first, cake second", description: "A generous grazing table keeps arrival relaxed and avoids everyone waiting for a formal meal.", tags: ["food", "social"] },
    { kind: "Playlist", title: "One song per year", description: "Build a short playlist with one defining song from each chapter of their life, then hand it to the DJ.", tags: ["music", "personal"] },
    { kind: "Decor", title: "One great backdrop", description: "Concentrate the decor budget on a photo backdrop and the cake table instead of spreading it thinly everywhere.", tags: ["budget smart", "photos"] },
    { kind: "Favors", title: "Take-home treats", description: "Package a few slices of cake or a local snack so the favor is enjoyed instead of left behind.", tags: ["practical", "guests"] },
  ],
  sample: {
    eventType: "birthday", title: "Rina’s 40th birthday", hostNames: "Rina & friends", weeksFromNow: 10,
    guests: 55, budget: 6000, location: "Chicago, IL", costLevel: "average",
    priorities: ["food", "entertainment", "photo"], vibe: "dinner",
    notes: "A warm rooftop dinner with speeches, old photographs, and dancing after dessert.",
    constraints: ["Gluten-free options", "Quiet space for kids"],
  },
};
