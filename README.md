# OpsPulse: Autonomous Agentic SRE & Incident Responder

OpsPulse is an open-source, full-stack autonomous Site Reliability Engineering (SRE) agent. It automatically triages production alerts, investigates root causes using Model Context Protocol (MCP) tools, searches historical postmortems in long-term memory, streams real-time reasoning tokens, and drafts automated remediation PRs with rollback plans.

---

## ⚡ Core Architecture & Highlights

* **Token & Tool Streaming**: Server-Sent Events (SSE) streaming model tokens, intermediate tool events, and diagnostic steps in real time via FastAPI and LangGraph's `astream_events(version="v2")`.
* **State Checkpointing & Resume Chat**: Sessions are keyed by persistent `thread_id` (e.g., `INC-8092`) backed by Supabase PostgreSQL (`PostgresSaver`). Reload or switch incidents at any time without context loss.
* **Model Context Protocol (MCP)**: Native integration with MCP servers to inspect GitHub commits, diffs, pull requests, and live container logs.
* **Bounded Agent Loop**: Limits each investigation turn to five reasoning iterations and asks the model for a final summary if tool requests continue, avoiding runaway loops.
* **Long-Term Memory Engine**: Semantic vector search with `pgvector` retrieves the most relevant historical postmortems and runbooks.
* **Observability**: Live distributed tracing of agent execution trees, token usage, and latency powered by Langfuse.
* **Open-Source Stack**: Uses Groq-hosted open-weight models, with free tiers available from several providers and services; availability and limits depend on each account.

---

## 🔑 1. Free API Keys Setup (Zero Cost)

1. **Groq Cloud API (Free LLM Inference)**
   - Sign up at https://console.groq.com.
   - Go to **API Keys** > **Create API Key**.
   - Copy key (starts with `gsk_`). Choose an available model in the Groq console; the default is `qwen/qwen3.8-27b`.
   - Model IDs identify the model family, not the API provider: this model is served by Groq using `GROQ_API_KEY`, not an OpenAI API key.

2. **Supabase (Free Postgres & pgvector)**
   - Sign up at https://supabase.com and create a new project.
   - Go to **Project Settings** > **Database** > **Connection string** > **URI**.
   - Copy the connection URI: `postgresql://postgres.[ref]:[password]@...:5432/postgres`.
   - In the SQL Editor, run: `CREATE EXTENSION IF NOT EXISTS vector;`.

3. **Langfuse (Free Tracing & Observability)**
   - Sign up at https://cloud.langfuse.com.
   - Create a project and navigate to **Settings** > **API Keys**.
   - Copy `Public Key` and `Secret Key`.
   - Add `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASE_URL` to `backend/.env`.
   - Each incident chat turn is traced separately and grouped by its incident session. Prompts, model replies, and tool activity are sent to Langfuse; common credentials and email addresses are redacted first. Review this against your data-handling policy before enabling it in production.

4. **GitHub Personal Access Token (Free MCP / GitHub Tooling)**
   - In GitHub, go to **Settings** > **Developer settings** > **Personal access tokens** (classic).
   - Generate token with `repo` scope to enable codebase search, commit inspection, and automated PR generation.

---

## 🚀 2. Local Quickstart

```bash
# 1. Unzip the project
unzip opspulse.zip
cd opspulse

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env and replace the example values with your own valid credentials.
# In particular, GROQ_API_KEY must be an active key from https://console.groq.com/keys.
# Docker Compose loads backend credentials from backend/.env.
# For Supabase persistence, set SUPABASE_POSTGRES_URL to the connection URI from
# Supabase Database settings. Use a real host and URL-encode special password
# characters (for example, @ as %40); do not leave template brackets/placeholders.

# 3. Start the entire stack with Docker
docker compose up --build
```
Open http://localhost:5173 in your browser.

If Groq returns `401 Invalid API Key`, create a new API key in the Groq console,
update `GROQ_API_KEY` in `backend/.env`, and restart the backend. Do not put real
credentials in `.env.example` or commit them to source control.
