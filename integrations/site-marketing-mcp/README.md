# Site + Marketing MCP

A read-only Model Context Protocol server for the public Home for AI ecosystem. It exposes curated project knowledge and generates review-first distribution plans and channel drafts.

## Boundaries

- Public project information only
- No private repository or account access
- No automatic posting
- No clinical, financial, production-readiness, or regulatory claims beyond the verified project catalog
- No credentials committed to the repository

## Tools

- `list_projects`
- `get_project_profile`
- `search_project_knowledge`
- `build_distribution_plan`
- `draft_channel_copy`

The server also exposes the `portfolio://catalog` resource.

## Local development

```bash
cd integrations/site-marketing-mcp
npm install
npm run build
npm start
```

The default endpoints are:

- Health: `http://localhost:3000/health`
- MCP: `http://localhost:3000/mcp`

Set `PORT` when another port is required.

## Deployment

Deploy this package to a Node.js host that provides a stable public HTTPS URL and supports the configured `PORT`. Configure the service root as `integrations/site-marketing-mcp`, then use:

```text
Build command: npm install --no-audit --no-fund && npm run build
Start command: npm start
Health path: /health
```

After deployment, add the remote MCP endpoint to the client using:

```text
https://YOUR-HOST/mcp
```

Keep the first deployment unauthenticated only while every exposed operation remains strictly public and read-only. Add OAuth or another supported authorization layer before introducing private data or write actions.

## Bright Data Web MCP

Bright Data is a separate connector. Do not place its token in this repository.

Create a Bright Data account, obtain an API token, and add the hosted MCP URL through the client's custom connector screen. Keep Rapid Mode initially to stay inside the free-tier boundary. Enable paid or browser/data tool groups only after reviewing their cost and permissions.

## Publishing workflow

1. Query the verified project profile.
2. Generate a distribution plan.
3. Generate channel-specific copy.
4. Verify every claim and destination rule manually.
5. Publish through the destination's own reviewed workflow.
6. Update the catalog when project status or canonical links change.
