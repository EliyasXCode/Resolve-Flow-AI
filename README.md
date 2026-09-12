# 🌊 ResolveFlow AI — Enterprise Multi-Agent Complaint Resolution Platform

> An orchestrated, production-grade AI platform that resolves customer grievances in seconds using **Google Gemini**, **MongoDB Atlas Vector Search (RAG)**, **Human-in-the-Loop oversight**, and **Simulated Financial & Logistics Execution**.

---

## 📌 Table of Contents
1. [What is ResolveFlow AI & What Does It Do?](#1-what-is-resolveflow-ai--what-does-it-do)
2. [Why Is It Useful? (Business Value & ROI)](#2-why-is-it-useful-business-value--roi)
3. [Complete Technology Stack](#3-complete-technology-stack)
4. [How It Works: Step-by-Step Pipeline (Start to End)](#4-how-it-works-step-by-step-pipeline-start-to-end)
5. [System Architecture Diagram](#5-system-architecture-diagram)
6. [Database Models & MongoDB Compass Guide](#6-database-models--mongodb-compass-guide)
7. [Enterprise Security & Defenses](#7-enterprise-security--defenses)
8. [Demo Accounts & User Roles](#8-demo-accounts--user-roles)
9. [Step-by-Step Local Setup Guide](#9-step-by-step-local-setup-guide)
10. [Automated Testing Suite](#10-automated-testing-suite)
11. [Interview & Presentation Guide](#11-interview--presentation-guide)

---

## 1. What is ResolveFlow AI & What Does It Do?

In modern e-commerce and SaaS enterprises, resolving customer complaints is traditionally **slow, fragmented, and error-prone**:
- Support teams spend **3 to 7 business days** passing tickets between departments.
- Human agents struggle to locate the latest return and refund policies across hundreds of PDF pages.
- Manual data entry leads to unauthorized refunds or incorrect replacement items being shipped.
- Unmonitored AI chatbots often hallucinate false return promises or offer unauthorized discounts.

### The ResolveFlow Solution:
**ResolveFlow AI** replaces manual ticket queues with an **orchestrated multi-agent finite state machine (FSM)**:
1. A customer files a complaint linked to a verified purchase order.
2. The **AI Triage Agent** instantly analyzes urgency, sentiment, and category.
3. The **Knowledge Agent** runs vector similarity search on MongoDB Atlas to retrieve the exact relevant legal and store policy clauses.
4. The **Resolution Agent** formulates a policy-grounded remedy proposal (refund, replacement, or evidence request).
5. The pipeline **strictly halts at the Human Review Gate** (`PENDING_APPROVAL`), where human support staff must verify, adjust, or approve the proposal.
6. Once authorized, the **Communication Agent** drafts an empathetic, personalized customer email.
7. The **Action Agent** triggers simulated financial settlements (Stripe Sandbox) or parcel courier dispatches (FedEx tracking).

---

## 2. Why Is It Useful? (Business Value & ROI)

| Traditional Manual Support | ResolveFlow Multi-Agent AI |
| :--- | :--- |
| ⏱️ **3–7 days** resolution turnaround | ⚡ **Under 30 seconds** end-to-end processing |
| 💸 High financial leakage from rogue refunds | 🔒 **Zero unauthorized payouts** via policy RAG & human review gates |
| 📄 Agents spend 60% of time searching policies | 🎯 **Automatic vector retrieval** from company knowledge base |
| 📉 Inconsistent email tones and missed SLAs | 🤝 **Empathetic, schema-validated customer communications** |
| ❌ Black-box actions with no audit trail | 📊 **Full telemetry logging** (latency, token consumption, model IDs) |

---

## 3. Complete Technology Stack

### Frontend (Client)
- **Framework:** React 18 with Vite for lightning-fast HMR and building.
- **Styling:** Tailwind CSS with modern cards, badges, and responsive layouts.
- **Icons:** Lucide React (`Bot`, `Scale`, `Mail`, `CreditCard`, `Truck`, `Zap`, `CheckCheck`).
- **HTTP Client:** Axios with credentials (`withCredentials: true`) and automatic CSRF header injection.
- **Routing:** React Router v6 with role-protected route guards (`ProtectedRoute.jsx`).

### Backend (Server)
- **Runtime:** Node.js (v22+ LTS) using ES Modules (`"type": "module"`).
- **Web Framework:** Express.js REST API.
- **Database ODM:** Mongoose with MongoDB Atlas.
- **Vector Search Engine:** MongoDB Atlas Vector Search (`policy_vector_index`).
- **LLM & Embeddings:** Google Gemini via the official `@google/genai` SDK:
  - Model: `gemini-flash-lite-latest` (fast, structured JSON generation)
  - Embedding Model: `gemini-embedding-001` (768-dimensional dense vectors)
- **Validation Engine:** Zod schemas for both client API requests and LLM structured outputs.
- **Logging & Observability:** Custom Winston logger with ISO timestamps and agent execution telemetry.

### Testing & Tooling
- **Test Runner:** Vitest (modern, fast ES-native test framework).
- **Integration Testing:** Supertest for HTTP assertions.
- **Database Tooling:** MongoDB Compass for visual schema and document inspection.

---

## 4. How It Works: Step-by-Step Pipeline (Start to End)

```
[Customer Complaint] ──► [Stage 1: Ingestion & Auth]
                               │
                               ▼
                     [Stage 2: AI Triage Agent]
                               │
                               ▼
               [Stage 3: Policy Vector RAG (Atlas)]
                               │
                               ▼
                 [Stage 4: Resolution Agent]
                               │
                               ▼
                 ╔═══════════════════════════╗
                 ║   HUMAN REVIEW GATE (HITL) ║ ◄── Support Staff Approves/Edits
                 ╚═══════════════════════════╝
                               │
                               ▼
              [Stage 5: Customer Communication Agent]
                               │
                               ▼
                [Stage 6: Simulated Action Agent]
                               │
                               ▼
                  [Stage 7: COMPLETED State]
```

### Stage 1: Ingestion & Order Verification
- The customer submits a grievance (`title`, `description`, optional `orderId`).
- The system verifies that the specified order actually belongs to the authenticated customer in MongoDB.
- Workflow is initialized in the `SUBMITTED` state.

### Stage 2: AI Triage Agent (`triageAgent.js`)
- Powered by Google Gemini.
- Evaluates customer text inside untrusted prompt boundaries.
- Outputs strict Zod-validated JSON:
  - `category`: `DAMAGED_ITEM`, `WRONG_ITEM`, `LATE_DELIVERY`, `REFUND_REQUEST`, etc.
  - `urgency`: integer score from 1 to 10 (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - `sentiment`: `POSITIVE`, `NEUTRAL`, `FRUSTRATED`, `ANGRY`.
  - `extractedEntities`: items, order numbers, defective parts.
- State advances to `TRIAGING` → `TRIAGE`.

### Stage 3: Policy Knowledge Retrieval (Atlas Vector Search RAG) (`knowledgeStage.js`)
- The customer grievance is converted into a **768-dimensional dense vector** using `gemini-embedding-001`.
- An aggregation pipeline queries the MongoDB Atlas collection `policy_chunks` using `$vectorSearch`:
  - Vector Index: `policy_vector_index`
  - Metric: Cosine Similarity
  - Filter: `{ active: true }`
- Returns top 3 most relevant policy chunks with exact clauses and citation IDs.
- State advances to `RETRIEVING_KNOWLEDGE` → `KNOWLEDGE`.

### Stage 4: Resolution Recommendation Agent (`resolutionAgent.js`)
- Synthesizes the complaint facts, verified order total, and retrieved policy clauses.
- Outputs structured resolution:
  - `action`: `REFUND`, `REPLACEMENT`, `REQUEST_INFORMATION`, `REJECT`, or `ESCALATE`.
  - `confidenceScore`: decimal from 0.0 to 1.0.
  - `justification`: grounded policy explanation citing specific clauses.
  - `proposedParameters`: exact refund dollar amount, replacement SKU, or requested evidence.
- Defensive fallback: If no policy citations match, automatically sets action to `ESCALATE` and triggers `NEEDS_MANUAL_REVIEW`.

### Stage 5: Human-in-the-Loop Review Gate (`reviewResolution`)
- **Strict safety rule:** The pipeline halts at `PENDING_APPROVAL` (or `NEEDS_MANUAL_REVIEW`).
- Support staff can:
  1. **1-Click Approve:** Accepts recommendations as-is.
  2. **Modify & Approve:** Adjusts refund amounts, changes remedy type, or adds custom notes.
  3. **Reject Claim:** Rejects with mandatory staff reasoning.
- An immutable `Approval` audit record is permanently stored in MongoDB linking `reviewedBy`, `originalResolution`, and `finalResolution`.

### Stage 6: Customer Communication Agent (`communicationAgent.js`)
- Powered by Google Gemini with strict prompt instructions.
- Drafts an empathetic, professional email explaining the decision, next steps, and contact options.
- Validated via Zod (`subject`, `body`, `tone`, `keyPointsCovered`, `simulatedDelivery`).
- Marked with `[SIMULATED DISPATCH]` badge.

### Stage 7: Simulated Action Execution (`actionAgent.js`)
- Executes the authorized action via realistic simulated providers:
  - **Refund:** Simulates Stripe Sandbox settlement, generates `TXN_REFUND_...` ID, records card mask `•••• 4242`, and calculates fees.
  - **Replacement:** Simulates FedEx carrier dispatch, generates `TRK_FEDEX_...` tracking slip, assigns warehouse facility (`WH-EAST-DISTRIBUTION-04`), and estimates delivery dates.
  - **Evidence Request:** Generates secure evidence upload portal ticket (`TICKET_INFO_...`) with a 7-day deadline.
- Updates Workflow and Complaint status to **`COMPLETED`**.
- Displays the top celebration banner: **"Complaint Successfully Resolved & Executed — Full SLA Met"**.

---

## 5. System Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React 18 + Vite)"]
        UI["User Interface<br/>(Tailwind CSS + Lucide)"]
        Axios["Axios Client<br/>(X-CSRF-Token + HTTP-only Cookies)"]
        Modal["Human Review Modal<br/>(Staff Decision Engine)"]
    end

    subgraph API["Backend API (Node.js + Express)"]
        AuthMid["Auth & Role Guard<br/>(JWT + CSRF + TokenVersion)"]
        FSM["Workflow State Machine<br/>(Atomic Transitions)"]
        Orch["Orchestrator Service<br/>(1-Click Pipeline Coordinator)"]
    end

    subgraph Agents["Multi-Agent Pipeline"]
        A1["Stage 1: Triage Agent<br/>(Gemini Flash + Zod)"]
        A2["Stage 2: Knowledge RAG<br/>(768-dim Vector Search)"]
        A3["Stage 3: Resolution Agent<br/>(Policy Sizing & Citations)"]
        A4["Stage 4: Review Gate<br/>(Human-in-the-Loop Audit)"]
        A5["Stage 5: Communication Agent<br/>(Gemini Email Drafting)"]
        A6["Stage 6: Action Agent<br/>(Stripe / FedEx Simulation)"]
    end

    subgraph Storage["Data & Cloud Layer"]
        Atlas[("MongoDB Atlas<br/>Database: resolveflowai")]
        VIndex[("Atlas Vector Search<br/>policy_vector_index")]
        Gemini[("Google Gemini AI<br/>Flash Lite & Embedding-001")]
    end

    UI --> Axios
    Axios --> AuthMid
    AuthMid --> FSM
    FSM --> Orch
    Orch --> A1
    A1 --> A2
    A2 --> A3
    A3 --> A4
    A4 --> Modal
    Modal --> A5
    A5 --> A6
    A6 --> FSM

    A1 -.-> Gemini
    A2 -.-> VIndex
    A3 -.-> Gemini
    A5 -.-> Gemini
    FSM -.-> Atlas
```

---

## 6. Database Models & MongoDB Compass Guide

### How to Connect in MongoDB Compass
1. Open **MongoDB Compass**.
2. Paste your connection string into the URI field:
   ```text
   mongodb+srv://eliyasmulla79_db_user:GKz6gCeU8PgU8ldi@resolveflowai.nygfptj.mongodb.net/resolveflowai?retryWrites=true&w=majority&appName=ResolveFlowAI
   ```
3. Click **"Connect"** and open the **`resolveflowai`** database.

### Database Collections:
- **`complaints`**: Master grievance records (`title`, `description`, `customerId`, `orderId`, `status`, `priority`, `category`).
- **`workflows`**: State machine document tracking `currentStage`, `status`, `version` (optimistic locking), and nested `stageOutputs` (`triage`, `knowledge`, `resolution`, `draft`, `action`).
- **`approvals`**: Human-in-the-loop audit records (`reviewedBy`, `decision`, `originalResolution`, `finalResolution`, `notes`).
- **`agentexecutions`**: Complete telemetry logs (`workflowId`, `stage`, `model`, `durationMs`, `tokenUsage`, `status`).
- **`policy_chunks`**: Overlapping text chunks storing 768-dimensional dense vectors indexed by `policy_vector_index`.
- **`orders`**: Verified purchase records (`orderNumber`, `items`, `totalAmount`, `status`).
- **`users`**: User records with `role` (`customer`, `support`, `admin`), `passwordHash`, and `tokenVersion`.

---

## 7. Enterprise Security & Defenses

1. **HTTP-Only, SameSite JWT Cookies**: Neutralizes Cross-Site Scripting (XSS) by preventing JavaScript from accessing authentication tokens.
2. **Double-Submit CSRF Protection**: A random `XSRF-TOKEN` cookie must match the `X-CSRF-Token` HTTP header on all write requests, stopping Cross-Site Request Forgery.
3. **Instant Session Revocation (`tokenVersion`)**: Changing a user's password or logging out immediately increments `tokenVersion`, invalidating old tokens across all devices.
4. **Tenant Isolation & IDOR Defense**: Database queries are strictly scoped: customers can only view their own complaints (`{ customerId: req.user._id }`).
5. **Strict Role Escalation Defense**: The registration endpoint (`/api/auth/register`) strictly sets `role = 'customer'`. Tampering with `role` is rejected with `400 Bad Request`.

---

## 8. Demo Accounts & User Roles

| Role | Email | Password | What You Can Do |
| :--- | :--- | :--- | :--- |
| **Customer** | `john.customer@example.com` | `CustomerPassword123!` | File complaints against owned orders, trigger 1-click pipeline, view real-time status. |
| **Support Staff** | `support@resolveflow.ai` | `SupportPassword123!` | View entire support queue, review resolutions, approve/edit in modal, execute actions. |
| **Administrator** | `admin@resolveflow.ai` | `AdminPassword123!` | Full system administration, seed scripts, vector index audits, telemetry logs. |

---

## 9. Step-by-Step Local Setup Guide

### Prerequisites
- Node.js v20+ or v22+ LTS (`node -v`)
- PowerShell or bash terminal

### 1. Start Backend Server
```powershell
cd server
npm install
npm run dev
```
*Backend runs on `http://localhost:5001`.*

### 2. Start Frontend Client
In a second terminal:
```powershell
cd client
npm install
npm run dev
```
*Frontend runs on `http://localhost:5175`.*

### 3. Build for Production
```powershell
cd client
npm run build
```

---

## 10. Automated Testing Suite

The project includes an end-to-end integration test suite using **Vitest** and **Supertest**:

```powershell
cd server
npm test
```

### Test Results: 6 Files, 34 Tests Passing (100% Success)
```text
 ✓ tests/auth.test.js (5 tests) — Auth, JWT cookies, CSRF validation, session revocation
 ✓ tests/complaint.test.js (8 tests) — Order verification, customer isolation, CRUD
 ✓ tests/triage.test.js (5 tests) — Gemini triage, schema validation, telemetry
 ✓ tests/knowledge.test.js (6 tests) — Atlas Vector RAG, cosine retrieval, resolution agent
 ✓ tests/approval.test.js (5 tests) — Human review gate, role protection, draft agent
 ✓ tests/orchestration.test.js (5 tests) — Action agent, Stripe/FedEx simulation, 1-click pipeline

 Test Files  6 passed (6)
      Tests  34 passed (34)
   Duration  12.92s
```

---

## 11. Interview & Presentation Guide

For in-depth explanations of architecture decisions, technical trade-offs, and answers to real-world interviewer questions, refer to our companion guide:

👉 **[Read the Full INTERVIEW_GUIDE.md](./INTERVIEW_GUIDE.md)**

### Key Interview Talking Points:
- **Why an Orchestrated State Machine vs an Autonomous Swarm?** Determinism, audit compliance, predictable latency, zero financial leakage.
- **Why Vector Search RAG vs Fine-Tuning?** Instant policy updates, zero hallucination on dates and numbers, verifiable citations, cost efficiency.
- **Why Human-in-the-Loop (HITL)?** Eliminates legal and financial liability by ensuring AI never executes payouts without human sign-off.
