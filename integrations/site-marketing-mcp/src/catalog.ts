export type ProjectSlug = "home-for-ai" | "openclinical-ai" | "raven-ai" | "portfolio";

export type Project = {
  slug: ProjectSlug;
  name: string;
  summary: string;
  status: string;
  audience: string[];
  useCases: string[];
  tags: string[];
  links: Record<string, string>;
  safetyNotes: string[];
};

export const projects: Project[] = [
  {
    slug: "home-for-ai",
    name: "Home for AI",
    summary:
      "A local-first desktop MVP for coordinating AI agents, market-data experiments, Raven run records, and a FastAPI backend from a Tauri, React, and TypeScript shell.",
    status: "Early-stage MVP foundation",
    audience: ["agent builders", "local-first AI developers", "desktop application developers"],
    useCases: [
      "desktop agent orchestration",
      "auditable backend calls",
      "local model and connector coordination",
      "Raven run-record previews"
    ],
    tags: ["tauri", "react", "fastapi", "agent orchestration", "local-first"],
    links: {
      github: "https://github.com/simpliibarrii-crypto/home-for-ai",
      portfolio: "https://barry-ai-public.simpliibarrii.chatgpt.site"
    },
    safetyNotes: [
      "Not a certified financial product, broker, investment adviser, or production trading system.",
      "Agent output is experimental workflow assistance."
    ]
  },
  {
    slug: "openclinical-ai",
    name: "OpenClinical AI",
    summary:
      "A development-preview runtime for clinical AI and biology AI workflows, currently focused on PSW shift handoff, signed model manifests, tenant-aware requests, consent checks, and audit logging.",
    status: "Development-preview MVP, not clinically certified",
    audience: ["clinical AI developers", "biology AI researchers", "PSW workflow teams", "healthcare technologists"],
    useCases: [
      "PSW shift-handoff assistance",
      "signed model loading",
      "tenant-aware inference",
      "consent and audit workflows",
      "biology adapter experiments"
    ],
    tags: ["clinical-ai", "biology-ai", "fastapi", "consent", "audit", "local-first"],
    links: {
      github: "https://github.com/simpliibarrii-crypto/openclinical-ai",
      huggingFaceModel: "https://huggingface.co/bclermo/openclinical-ai",
      huggingFaceSpace: "https://huggingface.co/spaces/bclermo/openclinical-ai",
      portfolio: "https://barry-ai-public.simpliibarrii.chatgpt.site"
    },
    safetyNotes: [
      "Not certified, clinically validated, or a medical device.",
      "Public messaging must avoid diagnostic or treatment claims."
    ]
  },
  {
    slug: "raven-ai",
    name: "Raven AI",
    summary:
      "An open-source, local-first sovereign agentic platform for biology, healthcare, and reproducible science, with evidence graphs, token-economy routing, and scientific-agent gates.",
    status: "Open-source development platform",
    audience: ["biology researchers", "clinical AI teams", "lab automation builders", "reproducible-science developers"],
    useCases: [
      "wet-lab planning and computational biology",
      "clinical evidence workflows",
      "reproducible scientific automation",
      "edge and on-device deployments",
      "evidence-linked research outputs"
    ],
    tags: ["biology-ai", "healthcare", "evidence-graphs", "scientific-agents", "sovereign-ai"],
    links: {
      github: "https://github.com/simpliibarrii-crypto/raven-ai",
      huggingFaceSpace: "https://huggingface.co/spaces/bclermo/raven-ai",
      portfolio: "https://barry-ai-public.simpliibarrii.chatgpt.site"
    },
    safetyNotes: [
      "Research and workflow tooling, not a substitute for professional clinical judgment.",
      "Scientific outputs should preserve provenance, reproducibility artifacts, and uncertainty."
    ]
  },
  {
    slug: "portfolio",
    name: "Barry AI Public Portfolio",
    summary:
      "The public doorway connecting Home for AI, OpenClinical AI, Raven AI, research notes, demos, and ecosystem positioning.",
    status: "Public portfolio",
    audience: ["open-source collaborators", "research communities", "AI builders", "potential partners"],
    useCases: ["project discovery", "ecosystem navigation", "public documentation", "collaboration outreach"],
    tags: ["portfolio", "documentation", "open-source", "distribution"],
    links: {
      website: "https://barry-ai-public.simpliibarrii.chatgpt.site",
      github: "https://github.com/simpliibarrii-crypto"
    },
    safetyNotes: ["Only publish claims that match verified repository and demo status."]
  }
];

export function getProject(slug: ProjectSlug): Project {
  const project = projects.find((item) => item.slug === slug);
  if (!project) {
    throw new Error(`Unknown project: ${slug}`);
  }
  return project;
}
