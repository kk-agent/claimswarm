export type Finding = {
  id: string;
  title: string;
  year: number;
  excerpt: string;
  tags: string[];
};

export const CORPUS: Finding[] = [
  {
    id: "bloom-ctrip-2015",
    title: "Bloom, Liang, Roberts, Ying — Does Working from Home Work? (Ctrip, QJE)",
    year: 2015,
    excerpt:
      "A randomized Ctrip experiment found a 13% performance increase for call-center staff working from home, plus lower attrition, with some promotion-rate tradeoffs.",
    tags: ["wfh", "productivity", "rct", "call-center"],
  },
  {
    id: "gibbs-2021",
    title: "Gibbs, Mengel, Siemroth — Work from Home & Productivity (Chicago Booth)",
    year: 2021,
    excerpt:
      "IT professionals at a large Asian firm were 8–19% less productive at home during COVID, with more time spent and more meetings.",
    tags: ["wfh", "productivity", "it", "covid"],
  },
  {
    id: "eisfeldt-2022",
    title: "Eisfeldt, Schubert, Zhang, Taska — The Financial Effects of Working from Home",
    year: 2022,
    excerpt:
      "Job-posting text shows WFH-capable roles and links remote work to firm-level outcomes that are not uniformly positive across industries.",
    tags: ["wfh", "finance", "jobs"],
  },
  {
    id: "microsoft-wti",
    title: "Microsoft Work Trend Index — hybrid collaboration patterns",
    year: 2023,
    excerpt:
      "Survey and telemetry snapshots show more meetings and chat after the shift to hybrid, with managers and ICs reporting different focus-time losses.",
    tags: ["hybrid", "meetings", "collaboration"],
  },
  {
    id: "barrero-bloom-davis",
    title: "Barrero, Bloom, Davis — Why Working from Home Will Stick",
    year: 2021,
    excerpt:
      "Survey evidence argues a large share of paid days will remain remote because workers value the amenity and firms learned it can function.",
    tags: ["wfh", "survey", "persistence"],
  },
];

export function searchCorpus(query: string, limit = 3): Finding[] {
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return CORPUS.map((finding) => {
    const hay = `${finding.title} ${finding.excerpt} ${finding.tags.join(" ")}`.toLowerCase();
    const score = tokens.reduce((sum, token) => sum + (hay.includes(token) ? 1 : 0), 0);
    return { finding, score };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || b.finding.year - a.finding.year)
    .slice(0, limit)
    .map((row) => row.finding);
}
