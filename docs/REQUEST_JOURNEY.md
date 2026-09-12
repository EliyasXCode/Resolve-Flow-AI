# The End-to-End Request Journey — ResolveFlow AI

This guide is written for you as a fresher AI / Full-Stack engineer to master and explain in technical interviews how data flows from the browser, through backend security gates, database models, AI agents, and back.

---

## 1. Step-by-Step Architecture Flow

```
[React Browser UI]
       │
       ▼ (1) User submits Complaint form
[Axios API Client]
       │ (2) Injects X-CSRF-Token header & sends HTTP-only JWT Cookie
       ▼
[Express Server (app.js)]
       │
       ├─► (3) Helmet: Sets HTTP security headers (X-Frame-Options, CSP, etc.)
       ├─► (4) CORS: Verifies Origin matches CLIENT_URL & allows credentials
       ├─► (5) CookieParser: Reads cookies from request header
       ├─► (6) CSRF Middleware: Compares header token vs XSRF-TOKEN cookie
       ├─► (7) Auth Middleware: Verifies JWT signature & checks tokenVersion in DB
       ├─► (8) Zod Validator: Parses and sanitizes title, description, orderId
       │
       ▼ (9) Controller Layer (complaintController.js)
[Order Ownership Verification]
       │ (10) Queries MongoDB Order where _id == orderId
       │      Asserts: order.customerId == req.user._id
       ▼
[MongoDB Atlas Database]
       │ (11) Stores Complaint document with status: 'SUBMITTED'
       ▼
[Controller Response]
       │ (12) Returns 201 Created with populated complaint object
       ▼
[React UI State Update]
       │ (13) Component refreshes complaints list; renders StatusBadge
```

---

## 2. Detailed Technical Breakdown

### Step 1 & 2: Client Request & CSRF Protection
- **Why not store JWT in localStorage?**
  Storing tokens in `localStorage` leaves the application vulnerable to **Cross-Site Scripting (XSS)**. Any malicious script injected into the page can read `localStorage.getItem('token')` and exfiltrate user credentials.
- **Why HTTP-only Cookies?**
  An `httpOnly: true` cookie cannot be read by JavaScript `document.cookie`. The browser sends it automatically with requests.
- **How Double-Submit CSRF works:**
  Because cookies are automatically attached by browsers, Cross-Site Request Forgery (CSRF) is a risk. We defend against this by writing a non-httpOnly cookie named `XSRF-TOKEN`. The React client reads this token from `document.cookie` and sends it in the `X-CSRF-Token` header. A malicious third-party site cannot read cookies from our domain due to Same-Origin Policy, so it cannot construct the matching header. The server verifies that the header matches the cookie before executing any mutating request (`POST`, `PUT`, `DELETE`).

### Step 3–7: Express Middleware Defense-in-Depth
1. **Helmet**: Protects against clickjacking, MIME-type sniffing, and cross-site scripting by enforcing strict HTTP headers.
2. **CORS**: Configured with `origin: env.CLIENT_URL` and `credentials: true`. Wildcards (`*`) are prohibited when credentials (cookies) are enabled.
3. **Session Revocation via `tokenVersion`**:
   Standard JWTs are stateless and cannot be revoked until they expire. In ResolveFlow AI, each User record has a `tokenVersion` counter. If an account is suspended or the password is reset, `tokenVersion` increments in MongoDB. The auth middleware compares `user.tokenVersion === decoded.tokenVersion`. If they mismatch, the request is immediately rejected (`401 Unauthorized`), giving us the performance of JWTs with the revocation control of sessions.

### Step 8: Zod Schema Validation
- Rather than checking types manually inside controller functions, incoming payloads are parsed through Zod schemas.
- If a malicious client sends unexpected keys or an invalid MongoDB ObjectId, Zod halts execution early and returns an informative `400 Bad Request` with exact field errors.

### Step 9 & 10: Multi-Tenant Isolation & Order Ownership
- **Tenant Isolation**: When a customer queries `/api/complaints`, the controller forces `{ customerId: req.user._id }`. Even if a customer inspects the network tab and changes the query parameters, the server ignores customer-supplied IDs and binds the query to the authenticated session.
- **Order Ownership Verification**: Before creating a complaint linked to an order, the server loads the referenced order:
  ```javascript
  if (order.customerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Order ownership verification failed." });
  }
  ```
  This guarantees that a user cannot lodge fraudulent refund requests against another customer's purchases.

---

## 3. Senior Interview Q&A Cheatsheet

### Q1: "How does ResolveFlow AI prevent role escalation during user registration?"
> **Answer:** "Public registration strictly routes through `authController.register`, which unconditionally sets `role = 'customer'` in the Mongoose model creation call. Furthermore, our Zod `registerSchema` has a custom refinement that rejects any request containing privileged roles like `admin` or `support` with a `400 Bad Request`. Privileged accounts can only be provisioned through secure, authenticated CLI scripts (`seedAdmin.js`) executed locally."

### Q2: "Why do you call this an 'orchestrated multi-agent workflow' instead of an autonomous agent?"
> **Answer:** "In enterprise complaint resolution, legal compliance and financial actions like refunds cannot be left to an unconstrained LLM loop. ResolveFlow AI uses a backend-controlled finite state machine. The LLM acts as specialized functional modules: one agent triages categories, one drafts responses, and vector search deterministically retrieves policies. State transitions, parameter checks, and financial action approvals are strictly guarded by backend business logic and human approval."

### Q3: "How do you protect customer privacy between tenants?"
> **Answer:** "We enforce isolation at the database query level, never in the frontend. When fetching complaints or viewing an individual ticket by ID, the controller verifies `complaint.customerId.toString() === req.user._id.toString()`. If a customer attempts to query another user's complaint ID, the server returns `403 Forbidden`."
