# Streamlined Onboarding: Google/Work Email Auth, Late Workspace Naming & Subscription Plan Switcher

A strategic redesign of the Atrium OS onboarding architecture that elevates the initial authentication to a high-converting, friction-free entry point (Google One-Click + Work Email with animated `LabelInput`), strips unneeded fields (Wilaya removed), defers workspace naming and phone verification to the final deployment step, and introduces an interactive multi-tier subscription plan switcher with real-time voucher validation and a "Request License" action.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural refinements have been synthesized from your instructions:
> 
> - **Step 0: Frictionless Identity (Google SSO or Work Email)**: Replace the overloaded first screen with clean authentication. Prominent "Sign in with Google" button alongside a work email form (Full Name, Work Email, Password) utilizing the proprietary animated notch `LabelInput`.
> - **Elimination of Wilaya**: The Wilaya dropdown is removed entirely from onboarding, simplifying friction.
> - **Late Space Naming & Phone Number**: Workspace title and direct phone number are moved to Step 8 (after 16-vertical category discovery and trade matching).
> - **Interactive Subscription Plan Switcher (Final Step)**: Users can select between **Free Web**, **Starter**, **Pro**, and **Enterprise**. Selecting a paid plan displays a license voucher box (`LabelInput`) with real-time validation, accompanied by a "Demander une licence" (Request License / WhatsApp & Invoice) action modal.

---

## 1. Overview & Core Concept

- **What It Delivers**: A fast, frictionless onboarding experience that lets business owners register instantly with Google or their corporate email, experience tailored conversational discovery (challenges, goals, workflows, 160+ business trades), and configure their final workspace identity, phone, and subscription plan right before launching.
- **Visual Feeling**: High-density Swiss workstation aesthetic in deep obsidian (`#0C0C0E`) and terracotta accents (`#C4785A`), featuring crisp SVG notch line-art animations on all text inputs.
- **Problem Solved**: Reduces cognitive load on initial entry, removes irrelevant geographic friction, and provides transparent subscription plan options with instant voucher verification.

---

## 2. Onboarding Flow & Step Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 0: FAST IDENTITY & AUTHENTICATION                                       │
│ • Prominent "Continuer avec Google" button (1-click instant access)          │
│ • Divider: "OU AVEC UN E-MAIL PROFESSIONNEL"                                 │
│ • Proprietary animated LabelInput: Nom & Prénom, Email Pro, Mot de Passe     │
│ • (Wilaya, Workspace Name, and Phone Number completely removed from Step 0)  │
├──────────────────────────────────────────────────────────────────────────────┤
│ STEPS 1 – 7: CONVERSATIONAL VERTICAL DISCOVERY                               │
│ • Step 1: Operational Challenge / Frustration (Auto-advance)                 │
│ • Step 2: Strategic Goal & Interactive Blueprint Modal                       │
│ • Step 3: Daily Customer & Operational Interaction (Auto-advance)            │
│ • Step 4: Team Scale & Working Hierarchy (Auto-advance)                      │
│ • Step 5: Primary Settlement & Fiscal Flow (Auto-advance)                    │
│ • Step 6: 16-Vertical Business Catalog (160+ trades, internal search)        │
│ • Step 7: Referral Source / "Where did you hear from us" (Auto-advance)      │
├──────────────────────────────────────────────────────────────────────────────┤
│ STEP 8: FINAL WORKSPACE TAILORING & SUBSCRIPTION PLAN SWITCHER               │
│ • Bespoke Vertical OS confirmation badge (e.g., Studio Créatif & Agence)     │
│ • Workspace Name input using LabelInput (defaults to trade name)             │
│ • Phone Number input using LabelInput                                        │
│ • Interactive Subscription Plan Switcher:                                    │
│   ├── Free Web Tier (0 DZD / Lifetime free web access)                       │
│   ├── Starter (19,000 DZD / 2 branches, 5 terminals)                         │
│   ├── Pro (49,000 DZD / 5 branches, unlimited POS terminals, multi-report)   │
│   └── Enterprise (99,000 DZD / Unlimited branches, dedicated SLA)            │
│ • For Paid Plans:                                                            │
│   ├── License Voucher field (LabelInput) with real-time validation           │
│   └── "Demander une licence" button (Contact Commercial / CCP Proforma)      │
│ • Primary CTA: "Lancer mon espace Atrium OS"                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Architecture

### A. Step 0: Fast Auth (`PowerOnboardingScreen.tsx`)
- **Google Sign-In Button**:
  - Official 4-color Google G icon SVG.
  - One-click instant login: generates an authenticated profile with full name and email, prefilling account credentials and advancing directly to Step 1.
- **Work Email Credentials**:
  - Implements `LabelInput`:
    - Full Name: `LabelInput` with user icon prefix, animated expanding notch.
    - Work Email: `LabelInput` with email format checking.
    - Password: `LabelInput` with toggleable show/hide eye icon.
  - "Créer mon compte et continuer" primary button with keyboard shortcut (Enter).

### B. Step 8: Late Workspace Configuration & Plan Switcher
- **Inputs**:
  - `LabelInput` for **Workspace Name** (pre-populated with trade title or custom name, e.g. "Atlas Creative Studio").
  - `LabelInput` for **Phone Number** (formatted e.g. `+213 550 12 34 56`).
- **Interactive Subscription Plan Cards**:
  - 4 selectable plan capsules:
    1. **Free Web**: Free forever, 1 branch, 1 POS device, 2 staff accounts.
    2. **Starter**: 19,000 DZD / lifetime, 2 branches, 5 POS devices.
    3. **Pro (Recommandé)**: 49,000 DZD / lifetime, 5 branches, unlimited POS devices, consolidated analytics.
    4. **Enterprise**: 99,000 DZD, unlimited scale, dedicated Algerian support.
- **Voucher & License Request Modal**:
  - When a paid plan is selected:
    - Input field for voucher code (`ATR-PRO-LIFE-XXXX-XXXX`) with instant validation badge.
    - Button: **"Demander une licence" / "Request a License"**:
      - Opens a high-finish modal with instant options:
        1. **Commercial Support & Devis / Facture Proforma** (phone / WhatsApp / email).
        2. **Virement CCP / BaridiMob** instructions for instant activation.
        3. **Test Demo Voucher** button for instant development verification.

### C. State & Store Synchronization
- **`OnboardingParams`**:
  - `fullName`, `email`, `password` (captured in Step 0).
  - `businessName`, `phone` (captured in Step 8).
  - `category` (derived or overridden in Step 6 / 8).
  - `branchName` ('Siège Principal').
  - `voucherCode` (if entered and validated for Starter/Pro/Enterprise).
  - `subscriptionTier`: activates correct plan in `store.account.subscription`.

---

## 4. Verification & Testing Plan

1. **Type Safety & Lint**: Run `tsc --noEmit` to ensure clean types across all components.
2. **Unit & Fiscal Tests**: Run `npm test` to verify all 14 test cases pass (voucher validator, quotas, money formatting, SFP 01 number-to-words).
3. **Step Navigation Verification**:
   - Test Google Sign-In button on Step 0 -> advances smoothly to Step 1.
   - Test Work Email form on Step 0 -> validates inputs, advances to Step 1.
   - Verify Step 1 through Step 7 flow without layout jump.
   - Verify Step 8 contains Workspace Name, Phone Number, and Plan Switcher.
   - Verify selecting Free Web allows instant launch without voucher.
   - Verify selecting Pro/Starter displays voucher input and "Request License" modal.
   - Verify final submission creates the workspace and launches Atrium OS.
4. **Applet Compilation**: Run `compile_applet` to confirm production build success.
