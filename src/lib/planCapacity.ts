/**
 * Marketing copy for plan capacity. Numbers are rounded up for feel while
 * staying in the ballpark of cost-plus metering (112 cr / 5s Kling O1 Pro,
 * ~70 cr / Assistant turn after caching). Exact math lives in billing; this
 * file is for buyer psychology on the website.
 */

export type PlanCapacity = {
  creditsLabel: string;
  creditsSub: string;
  capacityBlurb: string;
  whatYouCanDo: string[];
  /** Short bullets for the Dashboard plan tiles. */
  tileBullets?: string[];
};

export const PLAN_CAPACITY = {
  free: {
    creditsLabel: "200",
    creditsSub: "credits / mo · free forever",
    capacityBlurb:
      "Generate a full five-second AI clip on us, chat with the Assistant, and edit on the timeline without limits. No card, no clock.",
    whatYouCanDo: [
      "Unlimited timeline editing — cut, fade, layer, place. Always free",
      "1 full five-second AI video clip, on the house",
      "Credits left over to chat with the Assistant and explore the canvas",
      "Local Ollama models cost nothing · Claude Code thinking runs on your own sub",
      "The fastest way to feel the workflow before you commit",
    ],
  },
  starter_monthly: {
    creditsLabel: "2,500",
    creditsSub: "≈ $25 of AI power",
    capacityBlurb:
      "25+ five-second AI clips, or 35+ Assistant edits, or 2+ hours of smart indexing. Timeline editing is unlimited and free.",
    tileBullets: ["2,500 credits · 25+ AI clips", "35+ Assistant edits", "Unlimited timeline edits, free"],
    whatYouCanDo: [
      "Unlimited timeline editing, always free — the real power tool",
      "25+ five-second AI video clips (or 10+ ten-second shots) every month",
      "35+ Zenvi Assistant edits — describe it, watch it get cut",
      "2+ hours of smart clip indexing, so you can search your footage in plain English",
      "Mix freely: a dozen AI shots plus 15 Assistant edits and you're still covered",
      "No watermark · everything you need to ship every week",
    ],
  },
  starter_annual: {
    creditsLabel: "3,000",
    creditsSub: "credits / mo · annual bonus",
    capacityBlurb:
      "25+ five-second AI clips with extra headroom, or 40+ Assistant edits, or 2+ hours of smart indexing. Timeline editing is unlimited and free.",
    whatYouCanDo: [
      "Unlimited timeline editing, always free",
      "25+ five-second AI video clips every month, with bonus headroom on top",
      "40+ Zenvi Assistant edits — 500 more credits a month than monthly billing",
      "2.5+ hours of smart clip indexing",
      "Mix freely across clips, chat, and indexing",
      "No watermark · annual pricing locks in the savings",
    ],
  },
  pro_monthly: {
    creditsLabel: "5,500",
    creditsSub: "≈ $55 of AI power",
    capacityBlurb:
      "50+ five-second AI clips, or 80+ Assistant edits, or 5 hours of smart indexing. Built for real production volume.",
    tileBullets: ["5,500 credits · 50+ AI clips", "80+ Assistant edits", "3 seats · priority queue"],
    whatYouCanDo: [
      "Unlimited timeline editing, always free",
      "50+ five-second AI video clips (or 25+ ten-second shots) every month",
      "80+ Zenvi Assistant edits — enough for a serious month of cutting",
      "5 hours of smart indexing across your whole library",
      "Real production mix: 20 AI shots and 40 Assistant edits with credits to spare",
      "3 seats · priority queue at peak · the plan most teams grow into",
    ],
  },
  pro_annual: {
    creditsLabel: "6,600",
    creditsSub: "credits / mo · annual bonus",
    capacityBlurb:
      "55+ five-second AI clips, or 90+ Assistant edits, or 6 hours of smart indexing. 1,100 extra credits every month.",
    whatYouCanDo: [
      "Unlimited timeline editing, always free",
      "55+ five-second AI video clips every month",
      "90+ Zenvi Assistant edits",
      "6 hours of smart indexing across your library",
      "1,100 bonus credits every month — more shots, zero rationing",
      "3 seats · priority queue · best value for small teams",
    ],
  },
  max_monthly: {
    creditsLabel: "25,000",
    creditsSub: "≈ $250 of AI power",
    capacityBlurb:
      "220+ five-second AI clips, or 350+ Assistant edits, or 20+ hours of smart indexing. Agency-scale runway.",
    tileBullets: ["25,000 credits · 220+ AI clips", "350+ Assistant edits", "8 seats · priority 24/7"],
    whatYouCanDo: [
      "Unlimited timeline editing, always free",
      "220+ five-second AI video clips (or 110+ ten-second shots) every month",
      "350+ Zenvi Assistant edits — stop thinking about the meter",
      "20+ hours of smart indexing for big libraries and back catalogs",
      "Run parallel projects and client work: 100 AI shots and 150 Assistant edits in one month",
      "8 seats · priority 24/7 · the never-run-dry plan",
    ],
  },
  max_annual: {
    creditsLabel: "20,000",
    creditsSub: "≈ $200 of AI power",
    capacityBlurb:
      "175+ five-second AI clips, or 280+ Assistant edits, or 18+ hours of smart indexing. Serious volume at our best Max rate.",
    whatYouCanDo: [
      "Unlimited timeline editing, always free",
      "175+ five-second AI video clips every month",
      "280+ Zenvi Assistant edits",
      "18+ hours of smart indexing",
      "Agency-scale volume at the lowest effective monthly price",
      "8 seats · priority 24/7 · custom voices",
    ],
  },
} as const satisfies Record<string, PlanCapacity>;

export const CREDITS_FOOTNOTE =
  "Credits power AI generation, the Assistant, and indexing. Timeline editing is always free. Claude Code / Codex thinking runs on your own subscription. Capacities are estimates for a single use; mix and match however you create.";
