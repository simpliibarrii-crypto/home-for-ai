import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";
import { z } from "zod";
import { getProject, projects, type Project, type ProjectSlug } from "./catalog.js";

const projectSlugSchema = z.enum(["home-for-ai", "openclinical-ai", "raven-ai", "portfolio"]);
const channelSchema = z.enum(["github", "hugging-face", "linkedin", "x", "communities"]);

type Channel = z.infer<typeof channelSchema>;

function textResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }]
  };
}

function searchableText(project: Project): string {
  return [
    project.name,
    project.summary,
    project.status,
    ...project.audience,
    ...project.useCases,
    ...project.tags,
    ...project.safetyNotes
  ]
    .join(" ")
    .toLowerCase();
}

function distributionPlan(project: Project, audience?: string, channels?: Channel[]) {
  const selectedChannels = channels?.length
    ? channels
    : (["github", "hugging-face", "linkedin", "x", "communities"] as Channel[]);

  return {
    project: project.name,
    positioning: project.summary,
    targetAudience: audience || project.audience.join(", "),
    messagePillars: [
      `Problem: ${project.useCases[0] ?? "fragmented AI workflows"}`,
      `Approach: ${project.tags.slice(0, 4).join(", ")}`,
      "Proof: link every claim to a repository, demo, test, diagram, or documented limitation",
      `Trust: state the current maturity level plainly: ${project.status}`
    ],
    launchSequence: [
      "Tighten README hero, status, quickstart, screenshots, and verified claims.",
      "Publish a concise technical walkthrough with one reproducible demo path.",
      "Create channel-specific posts that all point to one canonical project page.",
      "Share with narrowly matched open-source and research communities, following each community's rules.",
      "Measure repository visits, stars, demo starts, documentation clicks, issues, and qualified collaborator replies.",
      "Use feedback to improve onboarding before increasing promotion volume."
    ],
    channels: selectedChannels.map((channel) => ({
      channel,
      objective:
        channel === "github"
          ? "Convert technical visitors into successful quickstarts, stars, issues, and contributions."
          : channel === "hugging-face"
            ? "Make the model or Space easy to test and connect it to the broader ecosystem."
            : channel === "linkedin"
              ? "Explain the problem, architecture, current proof, and collaboration ask professionally."
              : channel === "x"
                ? "Lead with a crisp technical insight, visual proof, and one canonical link."
                : "Earn trust through useful participation before sharing the project."
    })),
    guardrails: project.safetyNotes,
    successChecks: [
      "No unsupported production, clinical, financial, or regulatory claims.",
      "Every promoted feature has a working path, screenshot, test, or clearly labeled roadmap status.",
      "One primary call to action per post.",
      "UTM-tag public campaign links when the hosting surface supports them."
    ]
  };
}

function channelDraft(project: Project, channel: Channel, angle?: string) {
  const focus = angle?.trim() || project.useCases[0] || "the project workflow";
  const primaryLink = project.links.huggingFaceSpace || project.links.github || Object.values(project.links)[0];
  const limitation = project.safetyNotes[0] || "Development status is documented publicly.";

  const drafts: Record<Channel, string> = {
    github: `## Why ${project.name}\n\n${project.summary}\n\n### Start here\n- Explore: ${primaryLink}\n- Focus: ${focus}\n- Status: ${project.status}\n\n### What feedback would help\nIssues covering setup friction, reproducibility, documentation gaps, and narrowly scoped contributions are welcome.\n\n> ${limitation}`,
    "hugging-face": `${project.name} makes ${focus} easier to explore through a public, reproducible AI workflow.\n\nWhat you can test today:\n${project.useCases.slice(0, 3).map((item) => `- ${item}`).join("\n")}\n\nProject status: ${project.status}.\nSource and documentation: ${project.links.github || primaryLink}\n\n${limitation}`,
    linkedin: `I’m building ${project.name}, ${project.summary.charAt(0).toLowerCase()}${project.summary.slice(1)}\n\nThe current focus is ${focus}. The design emphasizes ${project.tags.slice(0, 4).join(", ")}.\n\nWhat exists today:\n${project.useCases.slice(0, 3).map((item) => `• ${item}`).join("\n")}\n\nI’m looking for grounded feedback from ${project.audience.slice(0, 3).join(", ")}.\n\nExplore the project: ${primaryLink}\n\nCurrent limitation: ${limitation}`,
    x: `${project.name}: ${focus}.\n\nBuilt around ${project.tags.slice(0, 3).join(" + ")}.\nStatus: ${project.status}.\n\nExplore: ${primaryLink}\n\n${limitation}`,
    communities: `Sharing ${project.name} because it may be useful for discussions around ${project.tags.slice(0, 4).join(", ")}. The current implementation supports ${project.useCases.slice(0, 3).join(", ")}. I would value technical feedback on setup, reproducibility, and the narrow use case: ${focus}. Source: ${primaryLink}. Current limitation: ${limitation}`
  };

  return {
    project: project.name,
    channel,
    angle: focus,
    draft: drafts[channel],
    reviewBeforePublishing: [
      "Verify every feature claim against the current repository or demo.",
      "Adapt length, formatting, and tags to the destination's current rules.",
      "Do not publish automatically without human review."
    ]
  };
}

function createServer(): McpServer {
  const server = new McpServer({
    name: "home-for-ai-site-marketing",
    version: "0.1.0"
  });

  server.registerTool(
    "list_projects",
    {
      title: "List public AI projects",
      description: "List the public projects and canonical links in Barry Clerjuste's AI ecosystem.",
      inputSchema: z.object({})
    },
    async () => textResult(projects)
  );

  server.registerTool(
    "get_project_profile",
    {
      title: "Get project profile",
      description: "Return the verified public positioning, status, use cases, links, and safety notes for one project.",
      inputSchema: z.object({ slug: projectSlugSchema })
    },
    async ({ slug }) => textResult(getProject(slug as ProjectSlug))
  );

  server.registerTool(
    "search_project_knowledge",
    {
      title: "Search project knowledge",
      description: "Search the curated public project catalog without exposing private repository or personal data.",
      inputSchema: z.object({
        query: z.string().min(2).max(200),
        slug: projectSlugSchema.optional()
      })
    },
    async ({ query, slug }) => {
      const terms = query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      const candidates = slug ? [getProject(slug as ProjectSlug)] : projects;
      const matches = candidates
        .map((project) => ({
          project,
          score: terms.reduce((score, term) => score + (searchableText(project).includes(term) ? 1 : 0), 0)
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ project, score }) => ({ score, ...project }));

      return textResult({ query, count: matches.length, matches });
    }
  );

  server.registerTool(
    "build_distribution_plan",
    {
      title: "Build distribution plan",
      description: "Create a careful channel plan grounded in the project's verified current status and public claims.",
      inputSchema: z.object({
        slug: projectSlugSchema,
        audience: z.string().max(300).optional(),
        channels: z.array(channelSchema).max(5).optional()
      })
    },
    async ({ slug, audience, channels }) =>
      textResult(distributionPlan(getProject(slug as ProjectSlug), audience, channels as Channel[] | undefined))
  );

  server.registerTool(
    "draft_channel_copy",
    {
      title: "Draft channel copy",
      description: "Draft reviewable, non-automatically-published copy for GitHub, Hugging Face, LinkedIn, X, or communities.",
      inputSchema: z.object({
        slug: projectSlugSchema,
        channel: channelSchema,
        angle: z.string().max(240).optional()
      })
    },
    async ({ slug, channel, angle }) =>
      textResult(channelDraft(getProject(slug as ProjectSlug), channel as Channel, angle))
  );

  server.registerResource(
    "portfolio-catalog",
    "portfolio://catalog",
    {
      title: "AI ecosystem public catalog",
      description: "Curated public project summaries and canonical links.",
      mimeType: "application/json"
    },
    async () => ({
      contents: [
        {
          uri: "portfolio://catalog",
          mimeType: "application/json",
          text: JSON.stringify(projects, null, 2)
        }
      ]
    })
  );

  return server;
}

const app = createMcpExpressApp();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.path === "/mcp" && req.method === "POST" && !req.is("application/json")) {
    res.status(415).json({ error: "Content-Type must be application/json" });
    return;
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "home-for-ai-site-marketing", version: "0.1.0" });
});

app.post("/mcp", async (req: Request, res: Response) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request failed", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null
      });
    }
  } finally {
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  }
});

for (const method of ["get", "delete"] as const) {
  app[method]("/mcp", (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed for this stateless MCP server." },
      id: null
    });
  });
}

export default app;

if (process.env.VERCEL !== "1") {
  const port = Number.parseInt(process.env.PORT || "3000", 10);
  app.listen(port, "0.0.0.0", (error?: Error) => {
    if (error) {
      console.error("Failed to start MCP server", error);
      process.exit(1);
    }
    console.log(`Home for AI Site + Marketing MCP listening on port ${port}`);
  });
}
