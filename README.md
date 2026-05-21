# Mneme

**Persistent, verifiable memory for AI agents — built on Shelby.**

Mneme gives AI agents long-term memory that survives across sessions, with every read backed by a cryptographic receipt anchored on-chain. Agents store what matters, recall what's relevant, and prove what they remembered — all without relying on centralized vector databases.

> Built as a reference implementation for [Shelby](https://shelby.xyz)'s hot storage protocol. Currently using a mocked SDK that mirrors the production API surface; will swap to `@shelby-protocol/sdk` once early access is granted.

**🔗 Live demo: [mneme-ai.vercel.app](https://mneme-ai.vercel.app)**

---

## The Problem

Today's AI agents are amnesiac. Between sessions, they forget everything. Developers patch this by stuffing context into centralized vector databases like Pinecone, Weaviate, or Chroma — but this approach has structural issues:

- **Centralized**: One provider holds your agent's entire memory and pricing leverage.
- **Unverifiable**: No way to prove memories weren't modified between writes and reads.
- **Expensive at scale**: High-frequency agents (trading, monitoring, multi-step research) need fast, repeated reads — exactly what these databases charge premium for.
- **No provenance**: Regulated industries can't audit what an agent "knew" at a given point in time.

As autonomous agents move into production (trading, customer service, research assistants), the demand for verifiable, low-latency memory infrastructure grows fast — but no decentralized storage protocol has been able to serve the high-frequency read patterns agents require.

**Until Shelby.**

---

## Why Shelby

Shelby's hot storage architecture is the first decentralized storage protocol fast enough for live agent workloads:

- **Sub-second retrieval** — comparable to centralized cloud storage, suitable for inference loops
- **Cryptographic receipts on every read** — anchored on Aptos for verifiable provenance
- **Paid-reads model** — storage providers only get rewarded when they deliver correctly
- **Dedicated fiber transport (via DoubleZero)** — lower latency than public-internet decentralized alternatives

Mneme turns these properties into a portable, verifiable memory layer that any agent framework can plug into.

---

## How It Works

```
┌────────────────────────────────────────────────────────────────┐
│                          Mneme                                 │
│                                                                │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  User Chat  │───▶│  Agent (LLM) │───▶│  Memory Director │   │
│  └─────────────┘    └──────────────┘    └────────┬─────────┘   │
│         ▲                  │                     │             │
│         │                  │ recall(query)       │ put(memory) │
│         │                  ▼                     ▼             │
│         │           ┌────────────────────────────────┐         │
│         └───────────│       Shelby SDK Layer         │         │
│                     └──────────────┬─────────────────┘         │
│                                    │                           │
└────────────────────────────────────┼───────────────────────────┘
                                     │
                       ┌─────────────▼──────────────┐
                       │   Shelby Hot Storage       │
                       │   + Aptos-anchored receipts│
                       └────────────────────────────┘
```

**Flow per message:**

1. User sends a message to the agent
2. Mneme queries Shelby for memories relevant to the message (`recall`)
3. Relevant memories are injected into the agent's context window
4. Agent responds; the response includes a `[MEMORY: ...]` directive if anything new is worth remembering
5. New memories are stored via Shelby (`put`); a cryptographic receipt is returned
6. The receipt hash and storage metadata surface in the UI for verification

---

## Features

- **Self-extracting memory directives** — the agent decides what to remember, not the developer
- **Hybrid recall** — keyword overlap + recency fallback (a placeholder for real embedding search in production)
- **Persistent across sessions** — memories survive page refreshes and new conversations
- **Live receipts** — every storage and retrieval surfaces hash, network, and latency in the UI
- **Memory Vault inspector** — visual audit trail of everything the agent has remembered
- **Production-aligned SDK surface** — mock implementation mirrors the real Shelby SDK signatures

---

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS + shadcn/ui** for the interface
- **Anthropic Claude API** (`@anthropic-ai/sdk`) for the agent
- **Mocked Shelby SDK** (`lib/shelby.ts`) — content-addressed storage, receipt generation, and persistent state via localStorage
- **Lucide** for icons

---

## Running Locally

```bash
# Clone
git clone https://github.com/jenzylove/mneme.git
cd mneme

# Install
pnpm install

# Add your Anthropic API key
echo "ANTHROPIC_API_KEY=your_key_here" > .env.local

# Run
pnpm dev
# or, if you have port conflicts:
npx next dev --port 3001
```

Then open [http://localhost:3001](http://localhost:3001) and start chatting. The agent will remember what you tell it, surface storage receipts in real time, and persist memories across page reloads.

---

## Project Structure

```
mneme/
├── app/
│   ├── api/chat/route.ts    # Claude integration + memory directive parsing
│   ├── page.tsx             # Chat UI + Memory Vault
│   └── layout.tsx
├── lib/
│   └── shelby.ts            # Mock Shelby SDK (production-aligned API surface)
├── components/ui/           # shadcn/ui components
└── ...
```

---

## What's Mocked vs. Real

| Layer | Status | Notes |
|---|---|---|
| Claude API integration | ✅ Real | Uses `@anthropic-ai/sdk` with the `claude-haiku-4-5` model |
| Memory extraction | ✅ Real | Agent emits `[MEMORY: ...]` directives parsed server-side |
| Storage layer | 🧪 Mocked | `lib/shelby.ts` mirrors the production SDK surface; persists to `localStorage` |
| Cryptographic receipts | 🧪 Simulated | Realistic hash generation; will be replaced with real Aptos-anchored receipts |
| Retrieval latency | 🧪 Simulated | 40–90ms range to match real Shelby retrieval times |
| Recall scoring | 🧪 Keyword + recency | Production will use embedding-based vector similarity |

The mock SDK was intentionally designed to mirror Shelby's public API surface so that swapping `@/lib/shelby` for `@shelby-protocol/sdk` requires near-zero code changes once early access is granted.

---

## Roadmap

- [ ] Swap mock SDK for real `@shelby-protocol/sdk` (pending early access)
- [ ] Replace keyword recall with embedding-based vector similarity
- [ ] Expose Mneme as a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server so any agent framework can plug in
- [ ] Per-user authentication and namespaced memories (Aptos wallet sign-in scoped to `shelby.list({ namespace: userAddr })`)
- [ ] Multi-agent memory namespacing for shared knowledge bases
- [ ] Verifiable retrieval proofs in the UI (link to Aptos explorer per receipt)
- [ ] Streaming responses
- [ ] Memory pinning, archival, and access control

---

## Why I'm Building This

Hi, I'm Dee — a solo developer building infrastructure for AI agents. I've shipped two apps recently ([Claimr](https://github.com/jenzylove/claimr) and a creator marketplace) and Mneme is my third — but the first that combines my interests in agent infrastructure, verifiable systems, and the web3 storage stack.

I believe agent memory is one of the most under-built layers of the AI infrastructure stack right now, and Shelby is uniquely positioned to be the substrate for it. This project is my attempt to prove that thesis with working code.

If you're on the Shelby team and reading this: I'd love early access to integrate the real SDK and ship the first production-grade memory layer on Shelby.

— [@dollar782](https://twitter.com/dollar782)

---

## License

MIT