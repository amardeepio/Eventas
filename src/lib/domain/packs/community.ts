import type { DomainPack } from "../types";

export const communityPack: DomainPack = {
  id: "community",
  label: "Community event",
  shortLabel: "Community",
  eyebrow: "For the whole neighborhood",
  description: "A safe, inclusive gathering with clear owners and a realistic run of show.",
  terminology: { eventDay: "event day", host: "Organizing team", guest: "attendee" },
  defaultGuests: 300,
  defaultBudget: 500000,
  horizonMonths: 6,
  budget: [
    { id: "venue", label: "Venue & site", weight: 18, floor: 5, color: "#a5533d", description: "Site rental, shelters, fencing, toilets, and cleaning." },
    { id: "catering", label: "Food & water", weight: 20, floor: 8, color: "#c77b57", perGuest: true, description: "Food vendors, drinking water, volunteer meals, and service." },
    { id: "programming", label: "Programming", weight: 16, floor: 5, color: "#5d7161", description: "Performers, speakers, workshops, and activities." },
    { id: "marketing", label: "Outreach", weight: 10, floor: 2, color: "#9b7c8d", description: "Print, translation, community partners, and digital promotion." },
    { id: "av", label: "AV & power", weight: 12, floor: 4, color: "#728b9b", description: "Stage, sound, lighting, generators, and technicians." },
    { id: "permits", label: "Permits & safety", weight: 8, floor: 3, color: "#807a70", perGuest: true, description: "Permits, insurance, security, first aid, and accessibility." },
    { id: "decor", label: "Wayfinding & decor", weight: 5, floor: 1, color: "#b49358", description: "Signage, maps, banners, and gathering spaces." },
    { id: "supplies", label: "Supplies", weight: 4, floor: 1, color: "#b59d91", perGuest: true, description: "Wristbands, radios, volunteer kits, and consumables." },
    { id: "contingency", label: "Contingency", weight: 7, floor: 5, color: "#ded7cd", description: "Weather response, attendance changes, and emergency needs." },
  ],
  priorities: [
    { id: "programming", label: "Great programming" }, { id: "catering", label: "Food for everyone" },
    { id: "permits", label: "Safety & inclusion" }, { id: "marketing", label: "Community turnout" },
    { id: "av", label: "Sound & stage" }, { id: "venue", label: "The right location" },
  ],
  vibes: [
    { id: "festival", label: "Neighborhood festival", description: "Music, food, local makers, and room to wander." },
    { id: "family", label: "Family day", description: "All-ages activities, shade, seating, and an easy pace." },
    { id: "cultural", label: "Cultural celebration", description: "Heritage performances, food, and community storytelling." },
    { id: "cause", label: "Cause & connection", description: "A clear purpose, partner booths, and practical resources." },
  ],
  timeline: [
    { name: "Purpose & permissions", weeksBefore: 26, tasks: [
      { title: "Define purpose, audience, and success", description: "Agree on who the event serves, attendance goals, accessibility commitments, and measures of success.", priority: "high" },
      { title: "Check venue and permit requirements", description: "Start insurance, noise, food, road, and public-gathering approvals early.", priority: "high" },
    ] },
    { name: "Team & funding", weeksBefore: 20, tasks: [
      { title: "Assign workstream owners", description: "Name one owner each for program, site, volunteers, safety, vendors, and outreach.", priority: "high" },
      { title: "Confirm sponsors and community partners", description: "Document cash, in-kind support, recognition, and delivery deadlines." },
    ] },
    { name: "Program & suppliers", weeksBefore: 14, tasks: [
      { title: "Book performers, AV, and food", description: "Share schedules, power needs, dietary requirements, insurance, and cancellation terms.", priority: "high" },
      { title: "Publish the accessibility and safety plan", description: "Cover step-free routes, toilets, quiet space, first aid, lost children, and severe weather.", priority: "high" },
    ] },
    { name: "Outreach", weeksBefore: 8, tasks: [
      { title: "Launch multilingual outreach", description: "Use neighborhood groups, schools, local press, posters, and partner newsletters.", priority: "high" },
      { title: "Open volunteer registration", description: "Publish role descriptions, shift lengths, training, and access requirements." },
    ] },
    { name: "Operations", weeksBefore: 4, tasks: [
      { title: "Finalize site map and run of show", description: "Mark entrances, stages, water, first aid, toilets, vendors, accessible routes, and emergency exits.", priority: "high" },
      { title: "Brief volunteers and vendors", description: "Share contacts, arrival windows, radios, escalation paths, and code-of-conduct expectations." },
    ] },
    { name: "Event week", weeksBefore: 1, tasks: [
      { title: "Run the final safety check", description: "Confirm weather thresholds, permits, first aid, staffing, and incident reporting.", priority: "high" },
      { title: "Print essential operations packs", description: "Maps, contacts, schedules, incident forms, and offline copies for every lead." },
    ] },
    { name: "Event day", weeksBefore: 0, tasks: [
      { title: "Open the command point", description: "Check in leads, test radios, log incidents, and keep decision-makers reachable.", priority: "high" },
      { title: "Close, clean, and debrief", description: "Confirm safe site handover, vendor load-out, lost property, and a dated team debrief." },
    ] },
  ],
  vendors: [
    { id: "venue", label: "Venue / site", budgetCategoryId: "venue", questions: ["Which permits are required?", "What is the wet-weather policy?", "Are accessible toilets and routes available?", "What are power and water access points?"], redFlags: ["No emergency access", "No accessible facilities", "Unclear liability terms"] },
    { id: "av", label: "AV & power", budgetCategoryId: "av", questions: ["Is a qualified technician on site all day?", "What is the backup power plan?", "Are cables safely ramped?", "Can you meet the noise restrictions?"], redFlags: ["Unprotected public cable runs", "No backup power", "No qualified operator"] },
    { id: "safety", label: "Safety & first aid", budgetCategoryId: "permits", questions: ["What coverage does our attendance require?", "Where is the treatment point?", "How are incidents escalated?", "What documentation will we receive?"], redFlags: ["No incident process", "Insufficient coverage for attendance", "No safeguarding procedure"] },
    { id: "food", label: "Food vendors", budgetCategoryId: "catering", questions: ["Are permits and food-safety certificates current?", "Can you label common allergens?", "What power and water do you need?", "How are queues kept accessible?"], redFlags: ["Missing permits", "No allergen labels", "No handwashing provision"] },
    { id: "security", label: "Security", budgetCategoryId: "permits", questions: ["Are staff licensed where required?", "What is the safeguarding approach?", "How do you support rather than escalate?", "Who is the event-lead contact?"], redFlags: ["No licensing evidence", "No safeguarding training", "No incident log"] },
  ],
  ideas: [
    { kind: "Concept", title: "A village of small moments", description: "Organize the event as a few distinct zones—eat, make, listen, rest—so people can participate at their own pace.", tags: ["inclusive", "flow"] },
    { kind: "Signature moment", title: "The community stage", description: "Reserve short slots for local schools, elders, and emerging performers alongside the headline program.", tags: ["local", "program"] },
    { kind: "Menu", title: "Local vendors, clear choices", description: "Curate a small vendor mix with visible prices, allergen labels, drinking water, and at least one substantial low-cost option.", tags: ["food", "access"] },
    { kind: "Playlist", title: "Between-set neighborhood radio", description: "Use local hosts for short interviews and announcements between performances instead of generic background music.", tags: ["low cost", "local"] },
    { kind: "Decor", title: "Wayfinding people actually use", description: "Spend first on large high-contrast maps, water and toilet signs, accessible routes, and a clearly marked welcome point.", tags: ["practical", "accessibility"] },
    { kind: "Favors", title: "A useful takeaway", description: "Replace generic swag with a printed neighborhood resource map or seeds from a local grower.", tags: ["sustainable", "useful"] },
  ],
  sample: {
    eventType: "community", title: "Indiranagar Spring Festival", hostNames: "Indiranagar Residents’ Association", weeksFromNow: 22,
    guests: 350, budget: 500000, location: "Bengaluru, Karnataka", costLevel: "average",
    priorities: ["programming", "permits", "catering"], vibe: "festival",
    notes: "A free neighborhood festival with local performers, food stalls, family activities, and a quiet zone.",
    constraints: ["Step-free routes", "Multilingual signage", "Quiet sensory space"],
  },
};
