# Master Architectural Plan: 4-Step Guided Onboarding & Intelligent Category Recommender

A comprehensive architectural overhaul replacing the single-card setup with an intuitive, desktop-grade 4-step onboarding journey. This guided discovery experience eliminates user hesitation when picking a business vertical by capturing business scale, operational modules, and activities, culminating in an intelligent category recommendation with full 1-click manual override across all 16 platform verticals.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed User Decisions & Specifications**:
> - **4-Step Sequential Flow**: `Step 1: Account & Location` ➔ `Step 2: Activity & Scale` ➔ `Step 3: Daily Modules` ➔ `Step 4: Smart Recommendation & Launch`.
> - **Input Methodology**: Interactive selection chips with icons for fast 1-click choices, supplemented by an instant fuzzy write-in search box for specialized business types.
> - **Recommendation & Governance**: Prominently highlight the highest-scoring vertical with matched module tags, while providing a clean 1-click expander to browse and override with any of the 16 platform categories.
> - **Desktop Presence & Layout**: Refactor away from a cramped floating single card into a balanced two-column desktop workstation layout (Brand anchor & step timeline on left; spacious interactive card on right).

---

## 1. Overview & Core Concept

### What It Does
When a new user boots Atrium ERP & CRM or registers an account, they are often unsure which of the 16 specialized verticals matches their business (e.g., whether a multi-specialty wellness clinic should use *Medical Clinic*, *Salon & Spa*, or *Membership*). 

The new onboarding engine solves this by asking 4 simple, practical questions:
1. **Who are you & what is your organization name?** (Owner identity, contact, password / Google 1-click, business title, city/wilaya).
2. **What does your business do and how large is your team?** (Visual activity chips + size scale: Solo, 2-5, 6-20, 20+).
3. **What operational tools do you need day-to-day?** (Barcode POS, stylist schedule, turnstiles, B2B wholesale, time tracking, venue booking, cohorts, patient files, repair orders, leases, BOM, court dockets, delivery manifests, BTP situations, crop parcels).
4. **Intelligent Match & Launch**: A client-side deterministic scoring engine recommends the optimal vertical, explains *why* it fits with pre-configured features, and provisions the workspace with 1 click.

### Target Audience & Persona
- Business owners, managers, clinic directors, contractors, and independent practitioners in Algeria and North Africa.
- Users who need immediate clarity without navigating complex ERP configuration menus.

### Key Value Delivered
- **Zero Confusion**: No need to study vertical definitions before starting.
- **Tailored Day-One Workspace**: The recommended vertical activates the exact screens, KPIs, and data structures the business requires.
- **Speed**: Completed in under 60 seconds with simple taps/clicks.

---

## 2. User Experience & Visual Design

### A. Layout Structure: Two-Column Desktop Workstation
Instead of a single isolated card centered in an empty void, the onboarding experience utilizes a balanced two-column desktop layout adhering to the Master Design System:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ATRIUM ONBOARDING WORKSTATION (Outer Canvas: #E8ECEF dark:#0C0C0E)                    │
│                                                                                        │
│ ┌─ LEFT COLUMN (38% width): BRAND & PROGRESS ─┐ ┌─ RIGHT COLUMN (62% width): STEP CARD ──┐ │
│ │                                             │ │                                      │ │
│ │  [FiveCubes Icon + ATRIUM ERP & CRM]        │ │  [Step Header: Title + Subtitle]     │ │
│ │  "The Unified Operating System for Business"│ │                                      │ │
│ │                                             │ │  ┌─ ACTIVE STEP CONTENT ───────────┐ │ │
│ │  ┌─ VERTICAL STEP TIMELINE ───────────────┐ │ │  │ Step 1: Account & Facility      │ │ │
│ │  │ ① Account & Organization      [✓ Done] │ │ │  │ Step 2: Activity & Scale        │ │ │
│ │  │ ② Business Activity & Size    [Active] │ │ │  │ Step 3: Operational Needs       │ │ │
│ │  │ ③ Operations & Modules        [Next]   │ │ │  │ Step 4: Matched Category Match  │ │ │
│ │  │ ④ Smart Recommendation        [Next]   │ │ │  └─────────────────────────────────┘ │ │
│ │  └────────────────────────────────────────┘ │ │                                      │ │
│ │                                             │ │  ┌─ ACTION FOOTER ─────────────────┐ │ │
│ │  ┌─ DYNAMIC SUMMARY POD ──────────────────┐ │ │  │ [← Précédent]      [Continuer ➔]│ │ │
│ │  │ Organization: Atrium Studio            │ │ │  └─────────────────────────────────┘ │ │
│ │  │ Scale: 2-5 Collaborators               │ │ └──────────────────────────────────────┘ │
│ │  │ Modules Selected: 4                    │ │                                          │
│ │  └────────────────────────────────────────┘ │                                          │
│ │                                             │                                          │
│ │  [Language Selector: FR | العربية | EN]     │                                          │
│ └─────────────────────────────────────────────┘                                          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### B. Detailed Step-by-Step User Flow

#### Step 1: Account, Organization & Location
- **Owner Credentials**: Full name, work email, phone (+213 prefix default), password.
- **Quick Auth**: Google 1-Click OAuth button with fallback to email credentials.
- **Business Identity**: Legal entity / trading name, primary branch name, physical address & Algerian Wilaya picker (58 wilayas).
- **Controls**: Modern `LabelInput` notched inputs with terracotta focus glow.

#### Step 2: Business Activity & Team Scale
- **Header**: *"Que fait votre entreprise au quotidien ?"* / *"ما هو النشاط الرئيسي لمؤسستك؟"*
- **Core Activity Chips** (Grid of 16 interactive cards with iconography):
  - *Salon, Coiffure & Esthétique* (Scissors)
  - *Salle de Sport & Fitness* (Dumbbell)
  - *Restauration & Commerce de Détail* (Utensils)
  - *Commerce de Gros & Distribution B2B* (Package)
  - *Consultant, Freelance & Studio* (Laptop)
  - *Salles des Fêtes & Événements* (Calendar)
  - *École, Académie & Formations* (GraduationCap)
  - *Agence Marketing & Projets Print* (Briefcase)
  - *Cabinet Médical & Clinique* (Stethoscope)
  - *Garage Automobile & Réparation* (Wrench)
  - *Agence Immobilière & Gestion Locative* (Home)
  - *Atelier de Fabrication & Industrie Légère* (Factory)
  - *Cabinet Juridique, Notaire & Comptabilité* (Scale)
  - *Transport, Colis & Livraison COD* (Truck)
  - *BTP, Chantier & Génie Civil* (HardHat)
  - *Exploitation Agricole & Élevage* (Sprout)
- **Instant Search Fallback**: `Seek` input at the top allowing the user to type anything (e.g. *"dentiste"*, *"pâtisserie"*, *"transitaire"*) with real-time automatic chip selection.
- **Team Scale Chips**:
  - `Solo / Indépendant` (1 personne)
  - `Petite Équipe` (2 à 5 collaborateurs)
  - `Entreprise en Croissance` (6 à 20 collaborateurs)
  - `Multi-Sites / Réseau` (Plus de 20 collaborateurs)

#### Step 3: Daily Operational Modules & Needs
- **Header**: *"Quels outils opérationnels utilisez-vous chaque jour ?"* / *"ما هي الأدوات والوحدات التي تحتاجها يومياً؟"*
- **Operational Need Check-Chips** (Multi-select with checkmarks):
  - 🛒 *Caisse Comptoir & Code-Barres POS* (Encaissement direct, tickets)
  - 📅 *Prise de Rendez-vous & Planning Coiffeurs/Praticiens*
  - 💳 *Abonnements Récurrents & Contrôle d'Accès RFID*
  - 📦 *Gestion Commerciale B2B, Devis, BL & Factures Avoir*
  - ⏱️ *Suivi du Temps Facturable, Tâches & Livrables*
  - 🏛️ *Réservation d'Espaces & Dépôts de Caution Séquestre*
  - 🎓 *Cohortes, Emplois du Temps & Émargement 1-Clic*
  - 📋 *Sprints de Campagnes, Revue BAT & Plafonds Terrain (CCP)*
  - 🩺 *Dossiers Médicaux Patients, Ordonnances & Triage*
  - 🚗 *Ordres de Réparation (OR) Atelier & Stock Pièces Détachées*
  - 🏢 *Contrats de Bail, Quittances & États des Lieux*
  - 🏭 *Nomenclatures (BOM), Ordres de Fabrication & CQ ISO*
  - ⚖️ *Rôle d'Audience, Dossiers d'Affaires & Compte CARPA*
  - 🚚 *Bordereaux d'Expédition, Tournées Chauffeurs & Encaissement COD*
  - 🏗️ *Devis Quantitatifs (BOQ/DQE) & Situations de Travaux BTP*
  - 🌾 *Parcelles de Culture, Phénologie, Silos & Cheptel*

#### Step 4: Intelligent Category Recommendation & Launch
- **Hero Recommendation Pod**:
  - Displays the recommended vertical with a glowing `#FCEEE8` border and terracotta checkmark badge: *"Configuration Idéale Recommandée"*.
  - Category icon, title, and descriptive summary.
  - **Feature Alignment Tags**: Shows which of the user's selected modules are natively built into this vertical.
  - **Workspace Setup Overview**: Confirms organization name, branch location, team size tier.
- **1-Click Manual Override Expander**:
  - *"Vous préférez un autre secteur ?"* / *"هل تفضل اختيار قطاع آخر يدوياً؟"*
  - Clicking smoothly expands an inline grid of all 16 platform categories, allowing the user to override the recommendation with a single click.
- **Voucher Code Input (Optional)**: Collapsible input to activate Pro/Enterprise lifetime licensing vouchers.
- **Launch CTA**: High-contrast terracotta `AtriumButton` (`"Lancer mon Espace Atrium"`) with kinetic loading spinner.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Deterministic Weighted Match Engine vs. Blind AI Call
- *Chosen Approach*: Client-side deterministic scoring engine combining activity keywords, team size heuristics, and module mappings.
- *Why*: Instantaneous response (<5ms) with zero API latency, 100% offline reliability, zero failure points during critical first impression, perfectly aligned with the existing 16 `BusinessCategory` IDs.

### Decision 2: Multi-Select Module Discovery
- *Chosen Approach*: Users can select 2-6 modules they care about.
- *Why*: Business activities often overlap (e.g. a medical spa uses appointments + retail POS; a construction contractor uses BOQ + subcontracts). The scoring engine weights the overlapping needs to select the most comprehensive matching vertical.

### Decision 3: Non-Intrusive Override vs. Rigid Locking
- *Chosen Approach*: The recommended category is selected by default, but an accessible drawer/accordion lets users inspect and choose any of the other 15 categories.
- *Why*: Users feel empowered and never trapped by an automated suggestion.

---

## 4. Technical Architecture & Data Strategy

### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ONBOARDING STATE CONTROLLER                           │
│                     (src/components/auth/OnboardingWizard.tsx)                  │
└─────────┬───────────────────────────┬─────────────────────────────┬─────────────┘
          │                           │                             │
          ▼                           ▼                             ▼
┌──────────────────┐        ┌───────────────────┐        ┌────────────────────────┐
│ STEP 1: IDENTITY │        │ STEP 2: DISCOVERY │        │ STEP 3: MODULES        │
│ • Full Name      │        │ • Core Activity   │        │ • Multi-select needs   │
│ • Email & Phone  │───────>│ • Team Scale      │───────>│ • Feature mapping      │
│ • Business Name  │        │ • Fuzzy Search    │        │ • Operational priority │
│ • Wilaya Address │        │   Keyword Engine  │        │                        │
└──────────────────┘        └───────────────────┘        └───────────┬────────────┘
                                                                     │
                                                                     ▼
                                                         ┌────────────────────────┐
                                                         │ STEP 4: RECOMMENDATION │
                                                         │ • Category Scorer      │
                                                         │ • Top Match Highlight  │
                                                         │ • 16-Vertical Override │
                                                         │ • Voucher Provisioning │
                                                         └───────────┬────────────┘
                                                                     │
                                                                     ▼
                                                         ┌────────────────────────┐
                                                         │ WORKSPACE BOOTSTRAP    │
                                                         │ completeOnboarding()   │
                                                         │ Seed Initial Datasets  │
                                                         │ Mount Vertical Screens │
                                                         └────────────────────────┘
```

### Recommendation Scoring Algorithm

$$\text{Score}(c) = W_{\text{activity}} \cdot \mathbf{1}_{\{c = c_{\text{chip}}\}} + W_{\text{search}} \cdot \text{FuzzyMatch}(q, c) + \sum_{m \in M_{\text{selected}}} W_m \cdot \text{ModuleAffinity}(m, c)$$

- **$W_{\text{activity}} = 50$**: Direct selection of an activity chip strongly anchors the recommendation.
- **$W_{\text{search}} = 40$**: High-confidence keyword matches from `findCategoryByBusinessSearch(q)`.
- **$W_m = 15$**: Each matching operational module provides affinity points.
- The vertical with the highest score is automatically selected as `recommendedCategory`, with runner-ups available in the override drawer.

### File Refactoring Plan
- **`src/components/auth/PowerOnboardingScreen.tsx`**: Refactor from the old 2-step single card into the modern 4-step Two-Column Desktop Workstation.
- **`src/components/auth/OnboardingWizard.tsx`**: Update to mirror the new 4-step discovery architecture.
- **`src/utils/businessMapping.ts`**: Expand the semantic dictionary to support the new activity chips, module affinities, and team scale heuristics.
- **`src/utils/i18n.ts`**: Ensure 100% trilingual translation keys for all questions, activity chips, scale tiers, and module descriptions in French, Modern Standard Arabic (RTL), and English.
