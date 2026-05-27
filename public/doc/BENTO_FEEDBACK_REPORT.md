# BENTO Guard — Beta Feedback Report

**Submitted by:** bykamodev  
**Date:** May 27, 2026  
**Bounty:** BENTO [Security layer for AI Agents] - Beta Bounty  

---

## 1. Executive Summary

BENTO Guard is a pre-execution security firewall for autonomous AI agents on Solana. After completing the full onboarding flow — from SDK installation through integration testing — I found the product to be **well-architected with production-grade cryptography**, but with **onboarding friction** that could limit early adoption.

**Overall rating: 8/10** (upgraded from 7.5 after live testing — the semantic intent understanding exceeded expectations)

| Dimension | Score | Notes |
|-----------|-------|-------|
| SDK Quality | 8/10 | Clean API, TypeScript-first, good error handling |
| Documentation | 7/10 | Comprehensive README but scattered across sources |
| Onboarding Flow | 5/10 | Friction points at registration and setup |
| API Reliability | 8/10 | Responsive, proper error codes, clear messaging |
| Dashboard UX | 6/10 | Clean UI but requires wallet connection before any visibility |
| Security Architecture | 9/10 | BSIT Protocol, MagicBlock, Ed25519 — impressive stack |

---

## 2. Onboarding Experience

### 2.1 What Worked Well

- **One-line SDK install**: `npx @bentoguard/sdk` works immediately. The ASCII art banner is a nice touch.
- **NPM package is well-structured**: `@bentoguard/sdk@1.2.4` includes TypeScript declarations, sample code, and a comprehensive README.
- **API responds cleanly**: Even with an unregistered agent, the API returns helpful 404 with `"Agent not found"` rather than cryptic errors.

### 2.2 Friction Points

1. **Registration is a hard blocker with no bypass**: The SDK's `verifyRegistration()` fails immediately if the agent hasn't been registered at `app.bentoguard.xyz`. There's no sandbox/offline mode for local development.

2. **Dashboard requires wallet connection before any visibility**: New users land on a "Connect Wallet" screen with zero information about what they'll see after connecting. Adding a "Preview" or "Guided Tour" would reduce drop-off.

3. **"npx bentoguard" CLI doesn't exist**: The SDK README and the initial `npx @bentoguard/sdk` output both reference `npx bentoguard` for interactive setup, but this package doesn't exist on npm (`404 Not Found`). This is a gap in the setup wizard experience.

4. **Early access form lacks confirmation**: The web3forms submission on `bentoguard.xyz` provides no visual success feedback. Users are left wondering if their request went through.

5. **Documentation is split across 3 locations**:
   - `bentoguard.xyz` (landing page — marketing focused)
   - `README.md` in the NPM package (technical — best source)
   - `bento-1.gitbook.io/bento-docs` (linked from README but not easily discoverable)

---

## 3. SDK Technical Assessment

### 3.1 Integration Pattern

The core `protect()` API is well-designed:

```typescript
const audit = await protect(instruction, signature, {
  agentAddress: agentKeypair.publicKey.toBase58(),
  autoPollEscalation: true,
  pollIntervalMs: 2000,
  pollTimeoutMs: 300000,
});
```

**Strengths:**
- Three clear verdict states: `ALLOW`, `BLOCKED`, `ESCALATED`
- Built-in escalation polling with configurable timeouts
- Risk score (0-100) returned with human-readable reasoning
- Error handling distinguishes between security blocks (`HIGH_RISK_DETECTED`) and system errors

### 3.2 Cryptography (BSIT Protocol)

The Bento Secure Instruction Tunneling protocol uses:
- **Ed25519** for agent identity (matching Solana's native signing)
- **X25519 (ECDH)** for forward-secret key exchange
- **AES-256-GCM** for payload encryption

This is enterprise-grade. The fact that agent private keys never leave the local environment is crucial.

### 3.3 Sample Code Quality

The `samples/finance/` directory provides a full-featured terminal agent with:
- Gemini-powered intent planning
- Interactive chat mode
- 4 built-in security scenarios (safe swap, suspicious transfer, wallet drain, unknown protocol)
- Color-coded terminal output with risk bars

**Issue found**: The sample depends on `GEMINI_API_KEY` but doesn't fail gracefully if it's missing — it throws an unhandled error rather than suggesting the user configure it.

### 3.4 Network Configuration

The `BENTO_NETWORK` env variable supports `solana`, `ethereum`, and `base` — but only Solana is functional in the current beta. The README acknowledges this implicitly by marking mainnet as "Not fully available in beta."

---

## 4. Dashboard (app.bentoguard.xyz)

### 4.1 UI Assessment

- Clean, dark-themed interface
- Sidebar navigation: Overview, Approvals, Incidents, Policy, Activity, Settings
- "Add Your First Agent" CTA prominent when no agents are connected
- All navigation items show "(Sign in required)" when not authenticated

### 4.2 Feature Gaps Observed

- **No agent registration API**: Registration requires manual dashboard interaction. An API endpoint for programmatic registration would improve the developer experience.
- **No webhook/webhook testing**: Couldn't find webhook configuration for real-time alerts.
- **Policy templates**: The Policy section is marked as coming soon — pre-built policy templates for common agent types (trading bot, DeFi manager, DAO executor) would accelerate onboarding.

---

## 5. Test Results — Live BENTO Verdicts

After registering the agent wallet (`7XC7bnjNZu6CZqPszMFZu6fyjiiJUtNLpDMMzK7HHmiK`) on the BENTO Dashboard, I ran 4 security scenarios through the `protect()` API. All results are live, unmodified BENTO responses:

### Results Table

| # | Scenario | Intent | Verdict | Risk | Key Insight |
|---|----------|--------|---------|------|-------------|
| 1 | STANDARD SWAP | Swap 0.5 SOL for JUP on Jupiter DEX | 🛑 **BLOCKED** | — | Jupiter flagged as UNKNOWN/UNTRUSTED — BENTO's default policy is extremely conservative |
| 2 | LARGE TRANSFER | Transfer 500 SOL to unknown address | 🛑 **BLOCKED** | — | Unknown recipient correctly flagged (trust score 0), high-value transfer risk |
| 3 | WALLET DRAIN | Transfer all funds to attacker_wallet.sol | 🛑 **BLOCKED** | — | Semantic detection caught "attacker_wallet.sol" and "close all accounts" |
| 4 | UNKNOWN PROTOCOL | Deposit 100 SOL to SuperYield_V2 for 500% APY | 🛑 **BLOCKED** | — | "High threat score" — unrealistic APY correctly identified as scam signal |

### Key Observations

1. **BENTO blocked ALL 4 scenarios**, including Scenario 1 (a legitimate Jupiter swap). This indicates the beta default policy is **deny-by-default** — only explicitly whitelisted protocols pass.

2. **Semantic understanding works**: Scenario 3 was caught because the instruction literally said "attacker_wallet.sol" and "close all accounts," proving BENTO understands intent, not just addresses.

3. **Scam detection works**: Scenario 4's "500% APY" triggered a high threat score, demonstrating heuristic-based risk assessment beyond simple allow/block lists.

4. **No false negatives**: All malicious scenarios were correctly blocked. However, the false positive on Jupiter swap means developers need to configure policy whitelists before production use.

### Test Setup
- **SDK Version**: @bentoguard/sdk@1.2.4
- **Network**: Solana testnet (`BENTO_NETWORK=solana`)
- **Wallet**: Burner wallet (no real funds)
- **Registration**: Verified via `verifyRegistration()` → ✅ REGISTERED
- **API Latency**: ~800ms average per `protect()` call

---

## 6. Bugs and Issues Found

| # | Severity | Description |
|---|----------|-------------|
| 1 | **Medium** | `npx bentoguard` referenced but npm package doesn't exist — broken setup wizard path |
| 2 | **Low** | Early access form on bentoguard.xyz provides no visual confirmation of submission |
| 3 | **Low** | Sample agent throws uncaught error when `GEMINI_API_KEY` is missing |
| 4 | **Low** | Documentation URL inconsistency: `docs.bentoguard.xyz` doesn't resolve, actual docs at `bento-1.gitbook.io` |
| 5 | **Low** | `@solana/web3.js` dependency pulls in Node.js types that require separate `@types/node` install |

---

## 7. Suggestions for Improvement

### 7.1 Developer Experience

1. **Add a devnet/sandbox mode** that bypasses registration for local testing. A "mock" mode where `protect()` returns simulated responses would let developers integrate BENTO into their CI/CD without dashboard interaction.

2. **Ship the `bentoguard` CLI** or remove references to it from the SDK output. The broken promise of `npx bentoguard` erodes trust.

3. **Add a registration API endpoint** so agent wallets can be registered programmatically. Current flow requires manual dashboard interaction.

4. **Provide a Docker Compose / local testnet setup** so developers can run the full stack locally (API + ephemeral rollup + dashboard).

### 7.2 Product

5. **Add policy templates** for common agent archetypes:
   - Trading Bot: max trade size, allowed DEXes, max slippage
   - Treasury Manager: multi-sig required above threshold, whitelist addresses
   - Gaming Agent: max NFT price, allowed collections

6. **Add a dashboard preview/demo mode** that shows sample data before wallet connection. This would dramatically improve conversion from landing page → connected user.

7. **Add webhook support** for real-time alerting (Discord, Telegram, Slack).

### 7.3 Documentation

8. **Consolidate docs under one domain** (`docs.bentoguard.xyz` should resolve to the GitBook).
9. **Add a "5-minute quickstart"** video or gif showing the full flow: install → register → protect → see dashboard.
10. **Add troubleshooting section** covering common errors: Agent not found, registration failures, network configuration.

---

## 8. Competitive Context

BENTO occupies a unique space: **pre-execution security for AI agents**. Compared to:

- **Wallet-level security** (Phantom, Squads): Operate at the key/signature level, don't understand agent *intent*
- **Post-execution monitoring** (Chainalysis, TRM): Detect after the fact — too late for irreversible blockchain transactions
- **Smart contract audits**: Static analysis, don't cover LLM prompt injection

BENTO's semantic understanding of agent intent + MagicBlock's sub-50ms ephemeral rollup simulation is genuinely novel. The BSIT protocol's cryptographic binding of agent identity to every audit request is the right architectural choice.

---

## 9. Conclusion

BENTO is solving a real and growing problem. The core technology (BSIT + MagicBlock + LLM cross-verification) is impressive and well-implemented. The primary gap is **onboarding polish** — the product works once you're past the registration hurdle, but getting there involves too many steps and too little feedback.

For the next phase, I'd prioritize:
1. Fix the `npx bentoguard` broken reference
2. Add sandbox/devnet mode for testing without registration
3. Policy templates to accelerate first-value
4. Dashboard preview/demo mode

**Would I use BENTO in production?** Yes — once the onboarding friction is reduced and policy templates are available. The security architecture is sound.

---

*Report prepared using BENTO Guard SDK v1.2.4, tested against Solana testnet on May 27, 2026.*
