# R-Dent Tasks

## Project Overview
Node.js task management application for R-dent (dental industry). Uses Express and Nodemailer.

## Tech Stack
- Runtime: Node.js (CommonJS)
- Framework: Express 5
- Email: Nodemailer

## Available Skills

### Core Business Skills
| Skill | Trigger Phrases | Description |
|---|---|---|
| `executive-brief` | "turn these notes into a brief", "clean this up" | Transforms messy notes, voice memos, meeting dumps into structured CEO-level executive briefs |
| `pl-stress-test` | "stress test this P&L", "find problems in these numbers" | Reviews P&L data and forces a ruthless stress-test of the numbers |
| `sales-rep-coaching` | "coaching report", "rep notes", "rep activity" | Converts rep call notes, territory notes, iCortica data into structured weekly coaching reports |
| `meeting-action-plan` | "turn this into action items", "meeting notes" | Converts meeting transcripts/Fireflies exports into structured action plans with owners and dates |
| `pricing-benchmark` | "compare this pricing", "are we underpriced" | Compares fee guides against competitor pricing and market benchmarks |
| `manager-accountability` | "manager scorecard", "weekly accountability" | Builds structured weekly scorecards for department managers with KPI status, misses, root cause |
| `dental-lead-research` | "research this dentist", "prep for sales call" | Researches and profiles dentists, practices, DSOs for outbound sales |
| `marketing-message` | "write marketing copy", "draft an email to dentists" | Creates dentist-facing marketing copy in R-dent's brand voice |
| `customer-concentration-analysis` | "customer concentration", "revenue by account" | Analyzes revenue by account to identify concentration risk for PE due diligence |
| `competitor-price-compare` | "how do we compare on price", "what does [competitor] charge" | Side-by-side pricing comparisons vs NDX Green, Dandy, Glidewell |
| `dso-proposal` | "[DSO name] proposal", "pitch deck for [DSO]" | Custom DSO sales proposals with product recs, pricing tables, competitive positioning |
| `cost-reducer` | "cut costs", "find margin", "where are we wasting money" | Identifies cost reduction opportunities across materials, labor, remakes, vendors, software |
| `exit-readiness-scorecard` | "exit readiness", "how ready are we to sell" | Scores exit readiness across EBITDA, revenue quality, customer concentration, SOPs, leadership, tech |
| `kpi-dashboard-builder` | "build a dashboard", "format this KPI data" | Generates formatted weekly/monthly dashboards with trends, RAG status, department breakdowns |

### AI & Workflow Skills
| Skill | Trigger Phrases | Description |
|---|---|---|
| `ai-tool-comparison` | "should I use ChatGPT or Claude", "which AI for this" | Decides whether a task is best handled by Claude, ChatGPT, Perplexity, or Gemini |
| `prompt-master` | "write a prompt for", "optimize this prompt" | Generates optimized prompts for any AI tool (LLM, Cursor, Midjourney, coding agents, etc.) |
| `self-healing` | (auto-triggered on failures) | Detects failures, recovers from errors, diagnoses broken workflows, improves skills over time |
| `weekly-review` | "weekly review", "run my review" | Automates 20-min weekly review — processes inbox, prunes memory, flags contradictions, updates open-loops |

### Technical / Infrastructure Skills
| Skill | Trigger Phrases | Description |
|---|---|---|
| `n8n` | "build a workflow", "automate this", "connect [system] to [system]" | Designs, builds, debugs n8n automation workflows |
| `scalability` | "can this scale", "audit our infrastructure" | Audits infrastructure, APIs, databases for growth readiness |
| `security` | "security audit", "harden our setup" | Audits security posture — Azure App Registration, API keys, Mac Mini, M365, web/desktop apps |
| `claude-api` | (auto-triggered when code imports anthropic SDK) | Build apps with Claude API, Anthropic SDK, or Agent SDK |

### Document & File Skills
| Skill | Trigger Phrases | Description |
|---|---|---|
| `pdf` | any mention of PDF files | Read, merge, split, create, watermark, extract from PDFs |
| `docx` | "Word doc", ".docx", "create a document" | Create, read, edit, manipulate Word documents |
| `pptx` | any mention of .pptx or presentations | Create, read, edit PowerPoint presentations |
| `xlsx` | any mention of spreadsheet files | Open, read, edit, create spreadsheets (.xlsx, .xlsm, .csv, .tsv) |

### Utility / Meta Skills
| Skill | Trigger Phrases | Description |
|---|---|---|
| `skill-creator` | "create a skill", "edit this skill", "run evals" | Create, modify, eval, and benchmark skills |
| `claude-md-management:revise-claude-md` | "update CLAUDE.md" | Update CLAUDE.md with learnings from current session |
| `claude-md-management:claude-md-improver` | "audit CLAUDE.md", "improve CLAUDE.md" | Audit and improve CLAUDE.md files for quality |
| `firecrawl:skill-gen` | "generate a skill from this URL" | Generate a complete skill from a documentation URL using Firecrawl |
| `firecrawl:firecrawl-cli` | any URL, web scraping, research | Web scraping, crawling, research with LLM-optimized output |
| `amazon-location-service` | "add maps", "geocode", "calculate route" | Maps, geocoding, routing via AWS Amazon Location Service |
| `schedule` | "schedule a task", "set up a cron job" | Create/manage scheduled remote agents on cron |
| `loop` | "check every 5 minutes", "poll for status" | Run a prompt or command on a recurring interval |
| `simplify` | "review this code", "clean this up" | Review changed code for reuse, quality, and efficiency |
| `update-config` | "configure settings", "set up a hook" | Configure Claude Code harness via settings.json |

## Connected MCP Services
- **Gmail** — Email read/draft/search
- **Canva** — Design creation and editing
- **Vercel** — Deployments and project management
- **Stripe** — Payments, customers, subscriptions
- **Fireflies** — Meeting transcripts and summaries
- **GitHub** — Repos, PRs, issues

## Claude Tools Daxton Uses (know what each can do)

Daxton works across three Anthropic products. Know the difference so you route requests correctly.

### Claude Code (this environment)
- CLI + IDE + web. What you're running in right now.
- Best for: coding, git-tracked changes, repo work, architectural decisions, anything that should land on a branch.
- Gmail MCP here is **read-only** — can search/read/draft, cannot create labels/filters or modify threads. Use the `scripts/gmail-reorg/` Node.js script for write operations.
- Has a full read/write GitHub MCP scoped to `ddump33-a11y/r-dent-tasks`.

### Claude Cowork (GA April 2026, macOS + Windows)
- Agentic desktop assistant. Included with Claude Pro ($20/mo) and Max ($100/$200/mo). Max 5x = $100, Max 20x = $200. Usage resets every 5 hours, not daily.
- Runs on Daxton's Mac directly — **can control the desktop, read/write local files without upload, drive apps and browsers**, execute code in a VM.
- Organized into **Projects** with their own files, context, instructions, and memory.
- **MCP connectors** with granular per-tool permissions (admin can allow Gmail-read but block Gmail-send, etc.). Zoom MCP connector is built in.
- Has a **Dispatch** feature — assign tasks from phone, come back to find them done on desktop.
- Best for: Daxton delegating end-to-end tasks to an agent that literally clicks through apps. Better than Claude Code for ongoing tweaks to Gmail, local file ops, or anything that spans multiple desktop apps.
- Daxton should point Cowork at `~/Desktop/r-dent-tasks/scripts/gmail-reorg/` (config.js + README) so it reuses the existing script + saved OAuth token for Gmail changes instead of freelancing.
- Caveats: consumes more tokens than regular chat (hits limits faster on Pro), no free trial, Enterprise bills tokens on top of seat cost.

### Claude.ai (web chat)
- Browser interface. Includes Projects, Artifacts, Skills.
- Best for: one-off questions, writing, research, image/doc analysis. No persistent filesystem or desktop access.

### Routing guide — which to use when
| Request | Tool |
|---|---|
| "Add a Gmail filter for X" | **Cowork** (runs the script locally; no need to push through git) |
| "Rewrite the label hierarchy" | **Claude Code** (architectural change, wants versioned config) |
| "Summarize this PDF" | **Claude.ai** |
| "Fix a bug in server.js" | **Claude Code** |
| "Rename 100 files on my Mac" | **Cowork** |
| "Draft a marketing email" | **Claude.ai** or **Cowork** |

## Rules
- Be direct, no fluff. Lead with the answer, not the reasoning.
- When rejecting Daxton's idea and proposing an alternative, give direct time and/or money reasons why.
- Use tables whenever possible. Compare "before and after" or multiple options side-by-side, apples to apples.
- Always explain the reasoning behind recommendations — why this option over others.
- If Daxton is off track, say so briefly with the reason why, then redirect to the right path.
- Never fabricate information. Fact-check before responding. Be confident enough to defend every claim.

## Key Context
- **Industry**: Dental lab services
- **Competitors**: NDX Green, Dandy, Glidewell
- **User**: Daxton (CEO)
- **Infrastructure**: Azure, Mac Mini, M365
