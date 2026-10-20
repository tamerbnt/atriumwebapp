# Complete Membership & Gym Category Localization Plan

A comprehensive architectural and localization plan for the Membership, Fitness & Gym vertical (`membership_subscription` / FacilityType 1) across all 8 core screens, 5 modals, RFID/barcode access control kinetic toasts, filter selects, and Algerian payment methods in French, Modern Standard Arabic, and English.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed in Phase 1:
> - **Terminology Style**: Fitness & Gym terminology (French: *Adhérents, Abonnements, Séances, Salle de sport*; Arabic: *المشتركين، الاشتراكات، الحصص التدريبية، القاعة الرياضية*; English: *Members, Membership Plans, Class Sessions, Fitness Club*).
> - **Scope of Coverage**: Full sweep across all 8 primary screens (Dashboard, Members CRM & 390px Inspector Drawer, Registrations Intake Pipeline, POS Pro Shop, Timetable Scheduler, Finance & Payroll, History & Access Logs, Settings), 5 modals, and kinetic access check-in toasts.
> - **Financial & Payment Context**: Algerian market localization emphasizing Algerian Dinars (DZD), BaridiMob, Edahabia / CIB cards, and Cash / Espèces settlement.

---

### 1. Overview & Core Concept

The Membership & Gym vertical is the operational backbone for fitness clubs, crossfit boxes, martial arts academies, and private sports centers. It drives member lifecycle management: biometric/RFID turnstile check-ins, recurring plan expirations, guest walk-ins, supplement/pro-shop point of sale, trainer group class schedules, and cash register closures.

While core navigation tabs and high-level section titles have translations, our deep audit revealed untranslated strings across:
1. **Member Enrollment Modal (`MemberModal.tsx`)**: Hardcoded English field labels (Gender, Date of Birth, Plan Package, RFID Card, Emergency Contact, Acquisition Channels, Private Notes).
2. **Members CRM & 390px Inspector Drawer (`MembersScreen.tsx`)**: Column headers, plan filter options, access status badges, quick check-in toasts, and inspector drawer tabs (History, Sales, Bookings).
3. **Intake & Prospect Funnel (`RegistrationsScreen.tsx`)**: Pipeline velocity health metrics, SLA counters, prospect conversion dialogs, and preferred package selectors.
4. **Point of Sale & Pro Shop (`ShopScreen.tsx`)**: Cash register order cart, line item discounts, quick cash settlement buttons, thermal receipt template, and parked orders drawer.
5. **Class & Room Timetable (`SchedulerScreen.tsx`)**: Weekly utilization metrics, shift rosters, capacity indicators, day picker chips, and session creation modals.
6. **Finance & Staff Payroll (`FinanceStaffScreen.tsx`)**: Commission tiers, cash register reconciliation, shift logs, and staff salary ledgers.
7. **History & Access Control Audit (`HistoryScreen.tsx`)**: Turnstile gate access events, RFID scan statuses (Access Granted, Expired Plan, Suspended), and export receipts.
8. **Kinetic Access Toasts (`store.ts` & `MembersScreen.tsx`)**: Gate check-in alerts, plan renewal notifications, and quota depletion warnings.

---

### 2. User Experience & Screen-by-Screen Audit

#### A. Academy & Gym Pulse Dashboard (`DashboardScreen.tsx`)
- **Metric Cards & Pillars**:
  - Daily entries counter (*Entrées du jour / الحضور اليومي / Today's Entries*).
  - Active athlete capacity gauge (*Athlètes présents / المتواجدون في القاعة / Live Occupancy*).
  - Hourly crowd distribution pillar chart tooltips (*Affluence par heure / كثافة الحضور بالساعة*).
- **Recent Turnstile Feed**:
  - Live access timeline entries (*Badge RFID scanné / تسجيل دخول بالبطاقة / RFID Gate Check-in*).
  - Operation badges (*Vente boutique / Encaissement / دفع نقدي / Abonnement renouvelé*).
- **Gym Master Tips Carousel**:
  - Ensure all 5 gym operational tips (*Contrôle d'accès, Relances abonnements expirés, Vente de compléments, Réservations cours collectifs, Clôture de caisse*) are fully articulated across FR, AR, and EN.

#### B. Members Directory & Inspector Drawer (`MembersScreen.tsx`)
- **Filter Capsules**:
  - *Tous les adhérents / جميع المشتركين / All Members*
  - *Abonnements actifs / اشتراكات سارية / Active Memberships*
  - *À renouveler (<14j) / أوشكت على الانتهاء / Expiring Soon*
  - *Abonnements expirés / اشتراكات منتهية / Expired*
  - *Comptes suspendus / مجمد ومحجوب / Suspended & Blocked*
- **Table Data Grid Headers**:
  - Member Card/ID (*N° Adhérent / رقم العضوية / Member ID*)
  - Full Name & Contact (*Nom & Téléphone / الاسم ورقم الهاتف / Name & Phone*)
  - Plan Name (*Formule d'abonnement / باقة الاشتراك / Plan Package*)
  - Expiration & Days Remaining (*Date d'échéance & Jours restants / تاريخ الانتهاء والأيام المتبقية*)
  - Turnstile Access Status (*Statut d'accès / حالة الدخول / Access Status*)
- **390px Detail Inspector Drawer**:
  - Header badge (*Adhérent Vérifié / عضوية موثقة / Verified Member*).
  - Quick actions (*Enregistrer passage / تسجيل حضور, Renouveler forfait / تجديد الاشتراك, Bloquer badge / حظر البطاقة*).
  - Sub-tabs (*Historique des passages / سجل الدخول, Achats boutique / مشتريات المتجر, Réservations / الحصص المحجوزة*).
  - Emergency contact and medical alert notes.

#### C. Member Enrollment & Edit Modal (`MemberModal.tsx`)
- **Section 1: Identité & Contact**:
  - Full Name (*Nom complet / الاسم الكامل*)
  - Phone (*Numéro de téléphone / رقم الهاتف*)
  - Email (*Adresse e-mail / البريد الإلكتروني*)
  - Gender Dropdown (*Homme, Femme, Autre / ذكر، أنثى، آخر / Male, Female, Other*)
  - Birth Date (*Date de naissance / تاريخ الميلاد*)
- **Section 2: Formule & Accès**:
  - Plan Package Picker (*Formule d'abonnement / باقة الاشتراك*) with localized sublabels (`30 jours · 4 500 DA` / `30 يوماً · 4,500 د.ج`).
  - Start Date (*Date de début / تاريخ البداية*).
  - RFID / Barcode Card (*N° Badge RFID ou Code-barres / رقم بطاقة الدخول أو الباركود*).
- **Section 3: Contact d'Urgence & Canal**:
  - Emergency Contact (*Nom du contact d'urgence / جهة الاتصال في حالة الطوارئ*).
  - Emergency Phone (*Téléphone d'urgence / هاتف الطوارئ*).
  - Acquisition Channel (*Canal d'acquisition / قناة الاستقطاب*): Walk-in (*Visite spontanée / زيارة مباشرة*), Instagram, Facebook, Referral (*Recommandation / ترشيح صديق*), Partner (*Partenaire VIP / شريك تجاري*).
  - Private Notes (*Observations médicales, préférences d'entraînement / ملاحظات صحية وتفضيلات رياضية*).

#### D. Registrations & Intake Pipeline (`RegistrationsScreen.tsx`)
- **Intake Velocity Banner**:
  - *Active Intake Pipeline / Dossiers en attente d'inscription / طلبات الاشتراك الجديدة*
  - *Converted Members / Adhésions confirmées / الاشتراكات المؤكدة*
  - *Intake Response SLA / Délai moyen de traitement / متوسط سرعة المعالجة*
- **Lead Qualification & Conversion Modal**:
  - Convert Lead to Active Member (*Valider l'adhésion / اعتماد العضوية وتسجيل الاشتراك*).
  - Assign starting plan package and generate RFID credentials.

#### E. Point of Sale & Pro Shop (`ShopScreen.tsx`)
- **Register Cart Panel**:
  - Cart header (*Panier de caisse en cours / طلب الكاشير الحالي / Current Register Order*).
  - Customer attribution (*Client / Adhérent / العضو المشترك* vs *Client de passage / زائر غير مسجل*).
  - Line item discount & Cart order discount (*Remise par article / خصم على الصنف, Remise globale / خصم إجمالي*).
  - Price summary (*Sous-total / المجموع الفرعي, Remises déduites / إجمالي الخصومات, Net à payer / المبلغ المستحق*).
- **Algerian Cash Settlement Grid**:
  - Quick cash tender buttons (*Espèces / نقد, 1 000 DA, 2 000 DA, 5 000 DA*).
  - Change calculation (*Rendu monnaie / المبلغ المتبقي / Change Due*).
  - BaridiMob & Edahabia card tender (*Paiement BaridiMob / دفع عبر بريدي موب, Carte CIB / Edahabia / بطاقة ذهبية / بنكية*).
- **Thermal Receipt Customization**:
  - Receipt headers (*Reçu d'encaissement / وصل إثبات الدفع, N° Transaction / رقم العملية, Club Sportif / القاعة الرياضية*).

#### F. Class & Room Timetable (`SchedulerScreen.tsx`)
- **Day Navigation**:
  - Monday through Sunday tabs with full localized day labels.
- **Utilization Header**:
  - *Taux d'occupation & Santé du planning / مؤشرات الإشغال الأسبوعي / Weekly Utilization & Attendance Health*.
  - Weekly Scheduled Classes (*Séances programmées / الحصص المجدولة*).
  - Enrolled Athletes (*Athlètes inscrits / الرياضيون المسجلون*).
  - Peak Floor Capacity (*Capacité maximale en heures de pointe / أوقات الذروة والقاعة القصوى*).
- **Session Modal**:
  - Class Title (*Intitulé du cours / عنوان الحصة الرياضية*).
  - Coach / Trainer (*Coach ou Entraîneur / المدرب المشرف*).
  - Studio Room (*Salle ou Plateau / القاعة أو المساحة التدريبية*).
  - Max Attendance Quota (*Jauge maximale / السعة القصوى للحصة*).

#### G. Access Control Kinetic Toasts (`src/services/store.ts` & `MembersScreen.tsx`)
- **Check-In Events**:
  - Access Granted (*Accès autorisé / تم السماح بالدخول*): `"{memberName} ({cardId}) session recorded."` -> `"{memberName} : Séance enregistrée avec succès."` / `"{memberName} : تم تسجيل الحضور والدخول بنجاح."`
  - Access Denied / Expired (*Accès refusé - Abonnement expiré / تم رفض الدخول - الاشتراك منتهي*).
  - Quota Exhausted (*Accès refusé - Forfait de séances épuisé / تم استنفاد رصيد الحصص المتاحة*).
- **Member Modifications**:
  - Member Enrolled (*Nouvel adhérent enregistré / تم تسجيل المشترك بنجاح*).
  - Plan Renewed (*Abonnement renouvelé / تم تجديد الاشتراك بنجاح*).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Specialized Fitness Terminology over Generic "Clients"**
  - *Chosen Approach*: Use specialized sports vocabulary (*Adhérent, Abonnement, Séance, Coach, Salle*) when the facility category is `membership_subscription`.
  - *Why*: Fitness operators in Algeria and North Africa exclusively refer to gym goers as *Adhérents* (French) and *مشتركين* (Arabic), never generic *clients* or *users*.
- **Decision 2: Direct Algerian Currency Formatting (`DA` / `د.ج`)**
  - *Chosen Approach*: In gym context, financial amounts format with `DA` (FR/EN) and `د.ج` (AR), with quick cash settlement chips for 1,000 DA, 2,000 DA, and 5,000 DA notes.
  - *Why*: Matches physical currency denominations handled at gym front-desk registers in Algeria.
- **Decision 3: Single-Key Bidirectional RTL Alignment**
  - *Chosen Approach*: Mirror table column layout, inspector drawers, and checkout cart panels to right-align when Arabic (`dir="rtl"`) is selected.
  - *Why*: Provides high visual polish and natural reading flow for Algerian front-desk staff.

---

### 4. Technical Architecture & Component Flow

```
┌────────────────────────────────────────────────────────┐
│                   TopBar & App State                   │
│         [Language Selector: EN | FR | AR]              │
└──────────────────────────┬─────────────────────────────┘
                           │ Active Language & dir (RTL/LTR)
                           ▼
┌────────────────────────────────────────────────────────┐
│               Atrium i18n Core Engine                  │
│       src/utils/i18n.ts & src/utils/useTranslation     │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│       Membership Screens      │ │       Membership Modals       │
│ ───────────────────────────── │ │ ───────────────────────────── │
│ • DashboardScreen (Pulse)     │ │ • MemberModal (Enroll & RFID) │
│ • MembersScreen (CRM & Drawer)│ │ • LeadModal (Intake)          │
│ • RegistrationsScreen (Leads) │ │ • AppointmentModal (Coaching) │
│ • ShopScreen (POS & Register) │ │ • VoucherModal (License)      │
│ • SchedulerScreen (Classes)   │ │ • FastSwitchModal (Branches)  │
│ • FinanceStaffScreen (Paie)   │ │ • Kinetic Check-in Toasts     │
│ • HistoryScreen (Access Log)  │ │ • Thermal Checkout Slip       │
└───────────────────────────────┘ └───────────────────────────────┘
```

#### Planned Dictionary Expansion (`src/utils/i18n.ts`)
Add ~50 consolidated keys across `TRANSLATIONS_EN`, `TRANSLATIONS_FR`, and `TRANSLATIONS_AR`:
- **Member Management**: `member_filter_all`, `member_filter_active`, `member_filter_expiring`, `member_filter_expired`, `member_filter_archived`, `member_col_card_id`, `member_col_plan`, `member_col_expiration`, `member_col_access`, `member_drawer_title`, `member_drawer_verified`, `member_drawer_quick_checkin`, `member_drawer_renew`, `member_drawer_block`.
- **Member Modal Fields**: `member_field_gender`, `member_gender_male`, `member_gender_female`, `member_gender_other`, `member_field_birth_date`, `member_field_plan_package`, `member_field_start_date`, `member_field_rfid_card`, `member_field_emergency_contact`, `member_field_emergency_phone`, `member_field_acquisition`, `member_channel_walkin`, `member_channel_instagram`, `member_channel_facebook`, `member_channel_referral`, `member_channel_partner`, `member_field_private_notes`, `member_ph_medical_alerts`.
- **Intake & Funnel**: `reg_pipeline_health_title`, `reg_pipeline_health_desc`, `reg_active_intake_label`, `reg_converted_members_label`, `reg_intake_sla_label`, `reg_avg_processing_time`.
- **POS & Register**: `pos_current_order_title`, `pos_customer_attribution`, `pos_guest_walkin`, `pos_line_discount`, `pos_order_discount`, `pos_subtotal`, `pos_total_due`, `pos_quick_cash`, `pos_change_due`, `pos_tender_cash`, `pos_tender_baridimob`, `pos_tender_card`.
- **Timetable & Classes**: `schedule_utilization_title`, `schedule_utilization_desc`, `schedule_weekly_classes`, `schedule_enrolled_athletes`, `schedule_peak_capacity`, `schedule_field_trainer`, `schedule_field_room`, `schedule_field_quota`.
- **Access Check-in Toasts**: `toast_checkin_granted_title`, `toast_checkin_granted_msg`, `toast_checkin_denied_title`, `toast_checkin_denied_msg`, `toast_checkin_quota_exhausted`.

---

### Verification & Testing Plan
1. **Compilation & Syntax**: Run `compile_applet` and `lint_applet` (`tsc --noEmit`).
2. **Automated Test Suite**: Execute `npm test` (`rules.test.ts`) to ensure 100% pass rate.
3. **Language & RTL Switching**: Verify that switching between EN, FR, and AR seamlessly changes labels, table orientations, and drawer alignments without page reload.
