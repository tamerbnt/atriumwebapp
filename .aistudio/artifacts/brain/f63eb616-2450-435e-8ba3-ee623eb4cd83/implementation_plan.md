# Onboarding Business Search & Semantic Category Mapper

Intelligent business activity search bar and dictionary mapping engine for Atrium ERP & CRM's onboarding wizard. Empowers new business owners to search their everyday business type (e.g., "Barbershop", "CrossFit", "Pizzeria", "UI/UX Designer", "Coworking Space", "Private Tutor") and automatically maps them to the appropriate 1 of 7 business categories (`membership_session`, `appointment_service`, `pos_inventory`, `project_milestone`, `rental_booking`, `education_cohort`, `freelance_solo`).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following parameters were confirmed via Phase 1 clarification:
> - **Search & Mapping Engine**: Instant client-side dictionary mapping 100+ business activities, keywords, and synonyms (English, French, and local terms) with zero network latency.
> - **Visual Match Presentation**: Search bar auto-selects and highlights the matched category card below, with an explanatory badge (e.g., `Matched from "Barbershop" → Salon & Beauty`) and subtle glowing accent borders.
> - **Manual Override**: The user retains full freedom to click any of the 7 category cards directly at any time.

---

## 1. Overview & Core Concept

### The Problem
Atrium's 7 business categories are technically structured around architectural operational paradigms (`membership_session`, `appointment_service`, `pos_inventory`, `project_milestone`, `rental_booking`, `education_cohort`, `freelance_solo`). For first-time business owners (e.g., a barber, martial arts coach, bakery manager, or freelance translator), these abstract category names create cognitive friction.

### The Solution
A smart search input integrated into **Step 2 (Business Setup & Vertical)** of `PowerOnboardingScreen` and `OnboardingWizard`:
1. Users type what they do in plain words (e.g. `"barber"`, `"pilates"`, `"pâtisserie"`, `"consultant"`, `"wedding planner"`).
2. The engine instantaneously resolves the exact category, automatically updating the active selection.
3. The matching card visually pulses and displays a match context badge.
4. Quick-click popular suggestion chips allow 1-tap selection without typing.

---

## 2. User Experience & Visual Design

### Step 2 Visual Layout & Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│ Step 2 of 4: Business Setup & Vertical                                  │
│                                                                        │
│ ┌─────────────────────────────┐  ┌───────────────────────────────────┐ │
│ │ Business Name *             │  │ First Branch *                    │ │
│ │ [ Atrium Barbershop       ] │  │ [ Hydra Flagship                ] │ │
│ └─────────────────────────────┘  └───────────────────────────────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 🔍  Type your business type (e.g., Barber, Bakery, CrossFit, UI... )│ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  Popular: [Barbershop]  [CrossFit]  [Café & POS]  [Freelance Dev] ...  │
│                                                                        │
│  ✨ Auto-matched from "Barber" → Salon & Beauty                        │
│                                                                        │
│  ┌───────────────────────────┐  ┌───────────────────────────────────┐  │
│  │ 💇 Salon & Beauty [✓]     │  │ 🏋️ Gym & Fitness                 │  │
│  │ (Active - Terracotta Ring)│  │ RFID Turnstiles & Sessions        │  │
│  └───────────────────────────┘  └───────────────────────────────────┘  │
│  ┌───────────────────────────┐  ┌───────────────────────────────────┐  │
│  │ 🍽️ Restaurant & POS       │  │ 💼 Projects & Agency              │  │
│  │ High-Speed POS & Tables   │  │ Retainers & Milestones            │  │
│  └───────────────────────────┘  └───────────────────────────────────┘  │
│  ┌───────────────────────────┐  ┌───────────────────────────────────┐  │
│  │ 🏢 Rentals & Venue        │  │ 🎓 Education & Training           │  │
│  │ Space Occupancy & Booking │  │ Cohort Timetables & Students      │  │
│  └───────────────────────────┘  └───────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 💻 Freelancers & Solo                                            │  │
│  │ Floating Stopwatch, Retainers & Invoices                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Key User Flows

#### Flow 1: Typing Freeform Activity
1. User enters Step 2 and clicks the search bar.
2. User types `"crossfit"`.
3. The mapper detects `membership_session`, selects the Gym & Fitness card, and displays `Matched from "CrossFit" → Gym & Fitness`.
4. User clicks Next to proceed with all workflows pre-configured for their gym.

#### Flow 2: Quick-Tap Popular Chip
1. User sees horizontal suggestion chips: `[Barbershop]`, `[CrossFit / Gym]`, `[Café / Resto]`, `[Agency / Consulting]`, `[Coworking / Venue]`, `[School / Tutor]`, `[Freelancer / Solo]`.
2. Tapping any chip immediately populates the search bar, selects the vertical, and auto-fills recommended facility naming.

#### Flow 3: Manual Direct Selection
1. If user prefers to browse, they can click any card in the 7-vertical grid.
2. Search bar displays the vertical name or clears quietly without blocking manual selection.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Comprehensive Dictionary vs. LLM API Call**
  - *Chosen Approach*: Instant client-side lookup table with 100+ normalized tokens across English and French.
  - *Why*: Instantaneous 0ms feedback while typing, 100% offline reliability (works without active Gemini API keys or network connection), and zero server-side latency.
  - *Alternatives Considered*: Server-side Gemini text classification (slower, requires network connectivity, adds failure states during initial onboarding).

- **Decision 2: Non-Destructive Filtering (Selection over Pruning)**
  - *Chosen Approach*: When a search query matches, highlight and auto-select the card while keeping other cards visible (with subtle dimming or re-ordering).
  - *Why*: Prevents user panic if they search for an uncommon term; they can always see all 7 categories and pick the closest fit manually.

- **Decision 3: Zero-Pill Aesthetic Compliance**
  - *Chosen Approach*: Match banners use subtle background glows (`#FDF4F0` / dark neutral) with unboxed typographic feedback strings (`Matched: "Barber" · Category: Salon & Beauty`), avoiding loud candy-colored badges.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                    Onboarding Step 2: Industry Discovery Engine               │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ User Search Input (e.g., "barbershop", "pilates", "boulangerie", "dev") │  │
│  └────────────────────────────────────┬────────────────────────────────────┘  │
│                                       │                                       │
│                                       ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Normalized Matching Engine (src/utils/businessMapping.ts)               │  │
│  │  - Lowercase, trim, diacritics stripping (accents, punctuation)         │  │
│  │  - 100+ Multi-Lingual Token Inverted Index                             │  │
│  │  - Fuzzy substring & synonym scoring                                    │  │
│  └────────────────────────────────────┬────────────────────────────────────┘  │
│                                       │                                       │
│                                       ▼                                       │
│               ┌───────────────────────────────────────────────┐               │
│               │ Match Result: Category + Matched Token Label  │               │
│               └───────────────────────┬───────────────────────┘               │
│                                       │                                       │
│                                       ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ PowerOnboardingScreen State:                                            │  │
│  │  - `category`: BusinessCategory ('appointment_service', etc.)           │  │
│  │  - `matchedLabel`: string ("Barbershop & Grooming")                     │  │
│  │  - `highlightedCardId`: string                                          │  │
│  └────────────────────────────────────┬────────────────────────────────────┘  │
│                                       │                                       │
│                                       ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Active UI State: Selected Card Ring + Contextual Feedback Banner        │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Keyword & Synonym Taxonomy Mapping (Sample of 100+ Tokens)

1. **`membership_session` (Gym & Fitness)**:
   - *Keywords*: gym, fitness, salle de sport, crossfit, martial arts, karate, judo, bjj, boxing, mma, kickboxing, yoga, pilates, personal trainer, bodybuilding, musculation, swimming pool, tennis club, athletics, gymnase, club sportif.
2. **`appointment_service` (Salon, Spa & Aesthetics)**:
   - *Keywords*: salon, barber, coiffeur, barbershop, beauty, spa, massage, nails, onglerie, aesthetician, esthetique, hair salon, salon de beauté, lash bar, tanning, facial, clinic, dental, physiotherapy, kine, tattoo, piercing.
3. **`pos_inventory` (Restaurant, Café & Retail POS)**:
   - *Keywords*: restaurant, cafe, coffee shop, bistro, pizzeria, burger, fast food, bakery, boulangerie, patisserie, grocery, superette, boutique, retail, clothing store, store, shop, bar, snack, creperie, boucherie.
4. **`project_milestone` (Projects, Law & Consulting Agency)**:
   - *Keywords*: agency, agence, marketing, design agency, architecture, architecte, cabinet, legal, lawyer, avocat, notary, notaire, consulting, engineering, bureau d'etudes, accounting, comptable, pr agency, production house.
5. **`rental_booking` (Rentals, Coworking & Venues)**:
   - *Keywords*: coworking, event venue, salle des fetes, wedding hall, photography studio, studio photo, equipment rental, car rental, location voiture, space rental, meeting room, warehouse, dark kitchen, storage.
6. **`education_cohort` (Education, Training & Bootcamps)**:
   - *Keywords*: school, ecole, academy, academie, bootcamp, training center, centre de formation, language school, cours de langue, tuition, tutoring, cours de soutien, university, driving school, auto-ecole, crèche, daycare.
7. **`freelance_solo` (Freelancers & Solo Practitioners)**:
   - *Keywords*: freelance, solo, independent, dev, developer, software engineer, web designer, ui designer, ux designer, graphic designer, copywriter, translator, traducteur, video editor, monteurs, consultant, photographer, remote worker.

---

## 5. Execution Steps (For Approval)

1. **Step 1: Create Dedicated Mapping Module (`src/utils/businessMapping.ts`)**:
   - Construct inverted index mapping keywords and multi-word phrases to `BusinessCategory`.
   - Implement `findCategoryByBusinessSearch(query: string)` with normalization and synonym matching.
2. **Step 2: Update `PowerOnboardingScreen.tsx` Step 2**:
   - Add search bar with `Search` icon, clear button (`X`), and animated match indicator.
   - Add suggested quick-search chips under the input.
   - Wire auto-selection so matched category updates `category` state and highlights the matching card.
3. **Step 3: Update `OnboardingWizard.tsx`**:
   - Mirror the business search bar in the standard onboarding modal for consistency.
4. **Step 4: Unit Testing & Verification**:
   - Add test suite in `src/utils/rules.test.ts` covering 15+ search queries across English and French to guarantee accurate mapping.
   - Run `lint_applet` and `compile_applet` to confirm build health.
