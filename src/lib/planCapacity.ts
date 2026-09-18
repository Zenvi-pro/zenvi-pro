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
};

export const PLAN_CAPACITY = {
  free: {
    creditsLabel: "200",
    creditsSub: "credits / mo",
    capacityBlurb:
      "A full five-second AI clip to try, plus room to chat and explore. Unlimited timeline editing — always free.",
    whatYouCanDo: [
      "Unlimited timeline editing (cut, fade, place) — always free",
      "1 full five-second AI clip to try",
      "Extra credits for Assistant chat & exploring the canvas",
      "Local Ollama models free · Claude Code thinking on your sub",
      "Perfect for testing the workflow before you commit",
    ],
  },
  starter_monthly: {
    creditsLabel: "2,500",
    creditsSub: "≈ $25 of AI power",
    capacityBlurb:
      "25+ five-second AI clips · or 35+ Assistant edits · or a full hour of indexing. Timeline edits unlimited & free.",
    whatYouCanDo: [
      "Unlimited timeline editing — always free (the real power tool)",
      "25+ five-second AI video clips (or 10+ ten-second)",
      "35+ Zenvi Assistant edit turns",
      "Up to 60 min of smart clip indexing",
      "Mix freely: e.g. a dozen AI shots + a full week of Assistant edits",
      "1 seat · no watermark · everything you need to ship",
    ],
  },
  starter_annual: {
    creditsLabel: "3,000",
    creditsSub: "credits / mo (annual bonus)",
    capacityBlurb:
      "25+ five-second AI clips · or 40+ Assistant edits · or a full hour of indexing. Timeline edits unlimited & free.",
    whatYouCanDo: [
      "Unlimited timeline editing — always free",
      "25+ five-second AI video clips (bonus headroom vs monthly)",
      "40+ Zenvi Assistant edit turns",
      "Up to 60 min of smart clip indexing",
      "Mix freely across clips, chat, and indexing",
      "1 seat · annual savings baked in",
    ],
  },
  pro_monthly: {
    creditsLabel: "5,500",
    creditsSub: "≈ $55 of AI power",
    capacityBlurb:
      "50+ five-second AI clips · or 80+ Assistant edits · or 4+ hours of indexing. Built for real production volume.",
    whatYouCanDo: [
      "Unlimited timeline editing — always free",
      "50+ five-second AI video clips (or 25+ ten-second)",
      "80+ Zenvi Assistant edit turns — enough for a serious edit month",
      "Up to 250 min of indexing across your library",
      "Example mix: 25 AI shots + 40 Assistant turns and still have runway",
      "3 seats · priority queue at peak · the plan most teams grow into",
    ],
  },
  pro_annual: {
    creditsLabel: "6,600",
    creditsSub: "credits / mo (annual bonus)",
    capacityBlurb:
      "55+ five-second AI clips · or 90+ Assistant edits · or 4+ hours of indexing. Extra headroom every month.",
    whatYouCanDo: [
      "Unlimited timeline editing — always free",
      "55+ five-second AI video clips",
      "90+ Zenvi Assistant edit turns",
      "Up to 250 min of indexing",
      "Annual bonus credits = more shots, less rationing",
      "3 seats · priority queue · best value for small teams",
    ],
  },
  max_monthly: {
    creditsLabel: "25,000",
    creditsSub: "≈ $250 of AI power",
    capacityBlurb:
      "220+ five-second AI clips · or 350+ Assistant edits · or 10 hours of indexing. Agency-scale runway.",
    whatYouCanDo: [
      "Unlimited timeline editing — always free",
      "220+ five-second AI video clips (or 110+ ten-second)",
      "350+ Zenvi Assistant edit turns — stop thinking about the meter",
      "Up to 600 min of indexing for big libraries",
      "Room for parallel projects, clients, and heavy gen weeks",
      "8 seats · priority 24/7 · the “never run dry” plan",
    ],
  },
  max_annual: {
    creditsLabel: "20,000",
    creditsSub: "≈ $200 of AI power",
    capacityBlurb:
      "175+ five-second AI clips · or 280+ Assistant edits · or 10 hours of indexing. Still massive headroom.",
    whatYouCanDo: [
      "Unlimited timeline editing — always free",
      "175+ five-second AI video clips",
      "280+ Zenvi Assistant edit turns",
      "Up to 600 min of indexing",
      "Serious volume at the best Max annual rate",
      "8 seats · priority 24/7 · custom voices",
    ],
  },
} as const satisfies Record<string, PlanCapacity>;

export const CREDITS_FOOTNOTE =
  "Credits meter AI generation, Assistant, and indexing. Timeline editing is always free. Claude Code / Codex thinking runs on your subscription; Kling and indexing still use credits. Capacities are approximate or-mix estimates — mix and match however you create.";
