# Implementation Plan: Restoring Left Showcase Card with Borderless Question Canvas

## 1. Context & User Objectives
- **Restoration of Left Card**: Re-integrate the left card containing the platform image showcase (`PREVIEW_SLIDES`), thumbnail selector (01 to 05), slide titles, and custom image upload dropzone.
- **Maintain Borderless Right Flow**: Keep the right column borderless and open without the rigid card box frame, allowing question elements to flow directly on the dark glowing backdrop.
- **Dedicated Standalone Plans (Step 9)**: By default, displays the Left Card alongside a compact 2x2 plan matrix with the voucher bar, plus a 1-click toggle to expand into a full-width 4-column matrix.
- **Strict Non-Scrollable Layout**: Maintain fixed viewport compliance for screens $\ge 768\text{px}$ in height.

---

## 2. Architecture & Layout Specification

### A. 2-Column Responsive Workstation
- **Left Column (`lg:col-span-5`)**:
  - Refined glass card (`bg-[#181512]/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl`).
  - Strict compliance with "no orange borders" on card containers.
  - Interactive top bar showing slide tag (`VUE 01`, `02`, etc.) and title with an "Importer" custom image trigger.
  - Image viewport displaying active system visual, with interactive dropzone on slot 05.
  - Bottom 5-pill thumbnail switcher for instantaneous slide browsing (`01` through `05`).
  - Automatic slide synchronization by step (e.g. POS view on payment step, Cockpit view on workspace step).
- **Right Column (`lg:col-span-7`)**:
  - Borderless open canvas: Step badge, question title, form inputs/cards, and bottom navigation.
  - No bounding glass card box.
- **Step 9 Dual Mode**:
  - *Default Mode*: Left Card visible on the left + 2x2 SaaS pricing grid on the right with voucher bar.
  - *Wide Mode*: 1-click toggle to expand to a full-width 4-column tier matrix.

---

## 3. Verification & Test Results
- **Compilation**: `compile_applet` passed cleanly with 0 errors.
- **Type Checking**: `tsc --noEmit` passed with 0 errors.
- **Automated Tests**: Vitest test runner reported 65 passing tests across 2 suites with 0 failures.
