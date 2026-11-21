import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronUp,
  ChevronDown,
  UserCheck,
  Pencil,
  Lock,
  Unlock,
  RotateCcw,
  Phone,
  Mail,
  Copy,
  Check,
  Trash2,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { Member } from '../../../types/index';
import { calculateDaysRemaining } from '../../../utils/rules';
import { Sp, TUNES, subscribeFrame, wake } from './motion/adherentsMotion';
import { clamp, computePanelMetrics } from './motion/adherentsMath';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentMemberCheckInsFromState,
  selectCurrentSalesFromState,
} from '../../../services/store';
import {
  EmptyState,
  resolveCompactCheckinsEmptyState,
  resolveCompactInvoicesEmptyState,
} from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion } from '../../ui/kinetic/KineticEmptyStateMotion';
import { buildBranchesByIdMap, resolveRecordBranch } from '../../ui/kinetic/branchUtils';

export interface MemberSlideOverInspectorProps {
  isOpen: boolean;
  member: Member | null;
  allMembers: Member[];
  openerElement?: HTMLElement | null;
  initialTab?: 'overview' | 'access' | 'billing';
  onClose: () => void;
  onSelectMember: (member: Member) => void;
  onEdit: (member: Member, originEl?: HTMLElement | null) => void;
  onDelete: (member: Member) => void;
  onCheckIn: (member: Member) => void;
  onRenew: (member: Member) => void;
  onToggleBlock: (member: Member) => void;
  onUpdateNotes: (memberId: string, notes: string) => void;
  showToast: (msg: string) => void;
}

const TABS: Array<{ id: 'overview' | 'access' | 'billing'; label: string }> = [
  { id: 'overview', label: 'Aperçu & Forfait' },
  { id: 'access', label: 'Accès & Séances' },
  { id: 'billing', label: 'Ventes & Factures' },
];

export const MemberSlideOverInspector: React.FC<MemberSlideOverInspectorProps> = React.memo(({
  isOpen,
  member,
  allMembers,
  openerElement,
  initialTab = 'overview',
  onClose,
  onSelectMember,
  onEdit,
  onDelete,
  onCheckIn,
  onRenew,
  onToggleBlock,
  onUpdateNotes,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'access' | 'billing'>(initialTab);
  const [notesText, setNotesText] = useState(() => member?.notes || '');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const branchState = useAtriumSelector(
    (s) => ({
      branches: s.branches,
      currentBranchId: s.currentBranchId,
      language: s.language,
      memberCheckIns: selectCurrentMemberCheckInsFromState(s),
      sales: selectCurrentSalesFromState(s),
    }),
    shallowEqualObjects
  );
  const esLocale =
    branchState.language === 'ar' ? 'ar' : branchState.language === 'en' ? 'en' : 'fr';

  // Retain the last displayed member during close bounce so content stays visible until settled
  const retainedMemberRef = useRef<Member | null>(member);
  if (member) {
    retainedMemberRef.current = member;
  }
  const activeMember = member || retainedMemberRef.current;

  const branchesById = useMemo(
    () => buildBranchesByIdMap(branchState.branches),
    [branchState.branches]
  );
  const currentBranch = useMemo(
    () =>
      branchState.branches?.find((b: any) => b.id === branchState.currentBranchId) ||
      branchState.branches?.[0],
    [branchState.branches, branchState.currentBranchId]
  );
  const memberBranch = useMemo(
    () =>
      activeMember
        ? resolveRecordBranch(activeMember, branchesById, currentBranch, branchState.language)
        : null,
    [activeMember, branchesById, currentBranch, branchState.language]
  );

  const memberCheckInHistory = useMemo(() => {
    if (!activeMember) return [];
    return branchState.memberCheckIns.filter((log) => log.memberId === activeMember.id);
  }, [activeMember, branchState.memberCheckIns]);

  const memberInvoiceHistory = useMemo(() => {
    if (!activeMember) return [];
    const nameLower = (activeMember.fullName || '').trim().toLowerCase();
    return branchState.sales.filter(
      (sale) =>
        sale.memberId === activeMember.id ||
        (nameLower.length > 0 && sale.memberName?.trim().toLowerCase() === nameLower)
    );
  }, [activeMember, branchState.sales]);

  // DOM refs for direct rAF style writes (zero per-frame React state updates)
  const scrimRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const ptabsRef = useRef<HTMLDivElement | null>(null);
  const ptabsWidthRef = useRef<number>(500);
  const pindRef = useRef<HTMLElement | null>(null);
  const tabBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const barFillRef = useRef<HTMLElement | null>(null);
  const holdFillRef = useRef<HTMLSpanElement | null>(null);
  const holdLabelRef = useRef<HTMLSpanElement | null>(null);
  const holdTextWrapRef = useRef<HTMLSpanElement | null>(null);

  const openerRef = useRef<HTMLElement | null>(null);
  const isHoldingRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  // Panel springs on shared loop
  const ppRef = useRef<Sp | null>(null);
  const ixRef = useRef<Sp | null>(null);
  const iwRef = useRef<Sp | null>(null);
  const holdRef = useRef<Sp | null>(null);

  if (!ppRef.current) {
    ppRef.current = new Sp(0, TUNES.panel);
    ixRef.current = new Sp(0, TUNES.tabIndicator);
    iwRef.current = new Sp(0, TUNES.tabIndicator);
    holdRef.current = new Sp(0, 22);
  }

  const wasOpenRef = useRef(false);
  const prevMemberIdRef = useRef<string | null>(null);
  const prevSyncedNotesKeyRef = useRef<string>('');
  const prevTabRef = useRef(activeTab);
  const entranceEpochRef = useRef(0);

  // Compute entrance epoch & sync notes/initialTab synchronously during render (eliminates double mount passes)
  {
    const curId = activeMember?.id ?? null;
    const justOpened = isOpen && !wasOpenRef.current;
    const switchedMember = isOpen && curId !== prevMemberIdRef.current;
    const switchedTab = isOpen && activeTab !== prevTabRef.current;
    if (justOpened && initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
    const notesSyncKey = `${curId ?? ''}|${activeMember?.notes ?? ''}`;
    if (activeMember && notesSyncKey !== prevSyncedNotesKeyRef.current) {
      prevSyncedNotesKeyRef.current = notesSyncKey;
      const nextNotes = activeMember.notes || '';
      if (notesText !== nextNotes) {
        setNotesText(nextNotes);
      }
    }
    if (justOpened || switchedMember || switchedTab) {
      entranceEpochRef.current += 1;
    }
    wasOpenRef.current = isOpen;
    prevMemberIdRef.current = curId;
    prevTabRef.current = activeTab;
  }
  const entranceEpoch = entranceEpochRef.current;

  // Compute progress percentage for sessions bar
  const planName = activeMember?.membershipPlanName || (activeMember as any)?.membershipType || 'Standard Plan';
  const totalPlanSessions =
    planName.toLowerCase().includes('year') || planName.toLowerCase().includes('annual')
      ? 365
      : planName.toLowerCase().includes('trimest') || planName.toLowerCase().includes('quarter')
      ? 90
      : planName.toLowerCase().includes('10')
      ? 10
      : 30;
  const remainingSessions = activeMember?.remainingSessions ?? 24;
  const sessionPct = clamp((remainingSessions / Math.max(1, totalPlanSessions)) * 100, 0, 100);

  const lastPanelKeyRef = useRef<string>('');
  const lastIndKeyRef = useRef<string>('');
  const lastHoldQRef = useRef<number>(-1);
  const panelWillChangeRef = useRef<boolean>(false);
  const indWillChangeRef = useRef<boolean>(false);

  // Draw panel, scrim, tab indicator, and hold-to-delete fill inside shared rAF loop
  const drawPanel = useCallback(() => {
    const pp = ppRef.current;
    const ix = ixRef.current;
    const iw = iwRef.current;
    const hold = holdRef.current;
    if (!pp || !ix || !iw || !hold) return;

    // 1. Panel + Scrim (only when pp moves or target changes)
    const pm = computePanelMetrics(pp.x, pp.t);
    const txQ = Math.round(pm.translateX * 2) / 2;
    const opQ = Math.round(pm.scrimOpacity * 100) / 100;
    const vis = pm.visible ? 'visible' : 'hidden';
    const ptr = pp.t > 0 ? 'auto' : 'none';
    const panelKey = `${vis}|${txQ}|${opQ}|${ptr}`;

    const isPanelMoving = !pp.rest();
    if (isPanelMoving !== panelWillChangeRef.current) {
      panelWillChangeRef.current = isPanelMoving;
      if (panelRef.current) panelRef.current.style.willChange = isPanelMoving ? 'transform' : '';
      if (scrimRef.current) scrimRef.current.style.willChange = isPanelMoving ? 'opacity' : '';
    }

    if (panelKey !== lastPanelKeyRef.current) {
      lastPanelKeyRef.current = panelKey;
      if (panelRef.current) {
        panelRef.current.style.visibility = vis;
        panelRef.current.style.transform = `translate3d(${txQ}px, 0, 0)`;
      }
      if (scrimRef.current) {
        scrimRef.current.style.visibility = vis;
        scrimRef.current.style.opacity = String(opQ);
        scrimRef.current.style.pointerEvents = ptr;
      }
    }

    // 2. Tab indicator (compositor clip-path, zero per-frame width reflow)
    const ixQ = Math.round(ix.x * 2) / 2;
    const iwQ = Math.round(Math.max(0, iw.x) * 2) / 2;
    const tabsW = ptabsWidthRef.current || 500;
    const leftClip = Math.max(0, ixQ);
    const rightClip = Math.max(0, tabsW - (ixQ + iwQ));
    const indKey = `${leftClip}|${rightClip}`;
    const isIndMoving = !ix.rest() || !iw.rest();
    if (isIndMoving !== indWillChangeRef.current) {
      indWillChangeRef.current = isIndMoving;
      if (pindRef.current) {
        pindRef.current.style.willChange = isIndMoving ? 'clip-path' : '';
      }
    }
    if (indKey !== lastIndKeyRef.current) {
      lastIndKeyRef.current = indKey;
      if (pindRef.current) {
        pindRef.current.style.clipPath = `inset(0 ${rightClip}px 0 ${leftClip}px round 10px)`;
      }
    }

    // 3. Hold-to-delete spring fill (only when hold moves)
    const hp = clamp(hold.x / 100, 0, 1);
    const holdQ = Math.round(hp * 100);
    if (holdQ !== lastHoldQRef.current) {
      lastHoldQRef.current = holdQ;
      if (holdFillRef.current) {
        holdFillRef.current.style.transform = `translate3d(0, 0, 0) scaleY(${hp})`;
      }
      if (holdTextWrapRef.current) {
        holdTextWrapRef.current.style.color = hp > 0.4 ? '#FFFFFF' : '';
      }
      if (holdLabelRef.current) {
        const nextText = hp > 0.1 ? 'Maintenez…' : 'Maintenir pour supprimer';
        if (holdLabelRef.current.textContent !== nextText) {
          holdLabelRef.current.textContent = nextText;
        }
      }
    }

    if (isHoldingRef.current && hp >= 0.96 && activeMember) {
      isHoldingRef.current = false;
      hold.t = 0;
      hold.x = 0;
      hold.v = 0;
      onDelete(activeMember);
      onClose();
    }
  }, [activeMember, onClose, onDelete]);

  useLayoutEffect(() => {
    const unsub = subscribeFrame(drawPanel);
    drawPanel();
    return () => {
      unsub();
    };
  }, [drawPanel]);

  // Open / close orchestration matching Section B exact order (pre-paint for <17ms frame-0)
  useLayoutEffect(() => {
    const pp = ppRef.current;
    const ix = ixRef.current;
    const iw = iwRef.current;
    if (!pp || !ix || !iw) return;

    if (isOpen && activeMember) {
      openerRef.current = openerElement || (document.activeElement as HTMLElement | null);

      if (panelRef.current) {
        panelRef.current.setAttribute('aria-hidden', 'false');
      }

      if (ptabsRef.current && ptabsRef.current.clientWidth > 0) {
        ptabsWidthRef.current = ptabsRef.current.clientWidth;
      }

      // Snap tab indicator when opening from closed state
      const resolvedTab = initialTab || activeTab;
      const activeBtn = tabBtnRefs.current[resolvedTab];
      if (activeBtn) {
        ix.t = activeBtn.offsetLeft;
        iw.t = activeBtn.offsetWidth;
        if (pp.x < 1) {
          ix.snap();
          iw.snap();
        }
      }

      pp.setTarget(100);
      drawPanel();
      wake();

      const focusTimer = setTimeout(() => {
        closeBtnRef.current?.focus({ preventScroll: true });
      }, 40);

      return () => clearTimeout(focusTimer);
    } else {
      pp.setTarget(0);
      if (panelRef.current) {
        panelRef.current.setAttribute('aria-hidden', 'true');
      }
      drawPanel();
      wake();

      if (openerRef.current && openerRef.current.isConnected) {
        openerRef.current.focus({ preventScroll: true });
      }
    }
  }, [isOpen, activeMember?.id]);

  // Sync tab indicator springs on tab changes & resize
  useLayoutEffect(() => {
    const pp = ppRef.current;
    const ix = ixRef.current;
    const iw = iwRef.current;
    if (!pp || !ix || !iw) return;

    if (ptabsRef.current && ptabsRef.current.clientWidth > 0) {
      ptabsWidthRef.current = ptabsRef.current.clientWidth;
    }
    const btn = tabBtnRefs.current[activeTab];
    if (btn) {
      ix.setTarget(btn.offsetLeft);
      iw.setTarget(btn.offsetWidth);
      if (pp.x < 1) {
        ix.snap();
        iw.snap();
      }
      drawPanel();
      wake();
    }
  }, [activeTab, isOpen, drawPanel]);

  // Progress bar .bar2 pre-paint reset + single-rAF GPU scaleX fill
  useLayoutEffect(() => {
    if (!isOpen || activeTab !== 'overview') return;
    const fillEl = barFillRef.current;
    if (!fillEl) return;
    fillEl.style.transform = 'scaleX(0)';
    const raf = requestAnimationFrame(() => {
      if (barFillRef.current) {
        barFillRef.current.style.transform = `scaleX(${sessionPct / 100})`;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [entranceEpoch, isOpen, activeTab]);

  // Update progress bar scale dynamically when sessions change in-place without replaying sections
  useEffect(() => {
    if (!isOpen || activeTab !== 'overview') return;
    if (barFillRef.current) {
      barFillRef.current.style.transform = `scaleX(${sessionPct / 100})`;
    }
  }, [sessionPct, isOpen, activeTab]);

  // O(1) Prev / Next index lookup across 1,000+ filtered+sorted rows
  const memberIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < allMembers.length; i++) {
      map.set(allMembers[i].id, i);
    }
    return map;
  }, [allMembers]);

  const currentIndex = activeMember ? memberIndexMap.get(activeMember.id) ?? -1 : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allMembers.length - 1;

  const handleStep = useCallback(
    (delta: -1 | 1) => {
      if (allMembers.length === 0 || currentIndex < 0) return;
      const nextIdx = clamp(currentIndex + delta, 0, allMembers.length - 1);
      const nextMember = allMembers[nextIdx];
      if (nextMember && nextMember.id !== activeMember?.id) {
        onSelectMember(nextMember);
      }
    },
    [allMembers, currentIndex, activeMember?.id, onSelectMember]
  );

  // Keyboard navigation: Esc closes, ArrowUp/Down steps, Tab focus trap inside .pnl
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Defer only to genuinely visible higher-z modal dialogs
        const otherModals = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
        let hasHigherDialog = false;
        otherModals.forEach((d) => {
          if (d === panelRef.current) return;
          if (
            d.hasAttribute('hidden') ||
            (d as HTMLElement).hidden ||
            d.getAttribute('aria-hidden') === 'true'
          ) {
            return;
          }
          const cs = getComputedStyle(d);
          const z = parseInt(cs.zIndex || '0', 10) || 0;
          if (
            cs.display !== 'none' &&
            cs.visibility !== 'hidden' &&
            parseFloat(cs.opacity || '1') > 0 &&
            z >= 52
          ) {
            hasHigherDialog = true;
          }
        });
        if (hasHigherDialog) return;
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      const tag = (document.activeElement?.tagName || '').toUpperCase();
      if (!/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          handleStep(-1);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleStep(1);
          return;
        }
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(
          (el) => !el.hasAttribute('disabled') && el.tabIndex >= 0 && el.offsetParent !== null
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const insidePanel = panelRef.current.contains(document.activeElement);

        if (!insidePanel) {
          e.preventDefault();
          first.focus();
          return;
        }
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, handleStep]);

  // Destroy springs on unmount
  useEffect(() => {
    return () => {
      ppRef.current?.destroy();
      ixRef.current?.destroy();
      iwRef.current?.destroy();
      holdRef.current?.destroy();
      ppRef.current = null;
      ixRef.current = null;
      iwRef.current = null;
      holdRef.current = null;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  const memberName = activeMember?.fullName || (activeMember as any)?.name || 'Adhérent';
  const memberPhone = activeMember?.phoneNumber || (activeMember as any)?.phone || '';
  const memberEmail = activeMember?.email || '';
  const memberExp = activeMember?.expirationDate || (activeMember as any)?.expiryDate || '';
  const daysRemaining = activeMember ? calculateDaysRemaining(false, memberExp) : 0;
  const isBlocked = Boolean(
    activeMember &&
      (activeMember.status === 'Suspended' ||
        activeMember.status === 'Banned' ||
        (activeMember as any).isBlocked)
  );
  const statusLabel = isBlocked ? 'Bloqué' : daysRemaining <= 0 || activeMember?.status === 'Expired' ? 'Expiré' : 'Actif';
  const statusPillCls = isBlocked
    ? 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]'
    : statusLabel === 'Expiré'
    ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
    : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]';

  const balanceAmount = Math.round((activeMember as any)?.balance || 0);

  const initials = memberName
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleCopy = (text: string, fieldKey: string) => {
    try {
      navigator.clipboard?.writeText(text);
    } catch {
      // ignore clipboard errors
    }
    setCopiedField(fieldKey);
    showToast(`Copié : ${text}`);
    setTimeout(() => setCopiedField(null), 1800);
  };

  return createPortal(
    <>
      {/* Full-Screen Scrim (.scrim) */}
      <div
        ref={scrimRef}
        className="scrim scrim-inspector fixed inset-0 z-[50] bg-[#1F1D1B]/40"
        onMouseDown={onClose}
        aria-hidden="true"
      />

      {/* Floating Card Slide-In Panel (.pnl) */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        aria-labelledby="member-drawer-title"
        data-sq="panel"
        data-sq-border="solid"
        className="pnl pnl-inspector fixed right-[14px] top-[14px] bottom-[14px] w-[560px] max-w-[calc(100vw-28px)] z-[51] bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] text-[var(--atr-ink,#000000)] dark:text-white flex flex-col overflow-hidden font-sans select-none"
      >
        {activeMember && (
          <>
            {/* HEADER (.ph) */}
            <div className="ph flex gap-4 items-start px-[26px] pt-[26px] pb-[18px]">
              <span
                data-sq="tile-lg"
                data-sq-border="none"
                className="pav w-[68px] h-[68px] bg-[var(--atr-acc,#d4522f)] text-white font-semibold t-dialog grid place-items-center shrink-0"
                aria-hidden="true"
              >
                {initials}
              </span>

              <div className="pt flex-1 min-w-0">
                <h2
                  id="member-drawer-title"
                  className="m-0 mb-2 font-semibold t-dialog leading-[1.1] text-[var(--atr-ink,#000000)] dark:text-white truncate"
                >
                  {memberName}
                </h2>
                <div className="pills flex gap-2 flex-wrap">
                  <span className="pill inline-flex items-center px-2.5 py-[3px] rounded-full t-small font-medium bg-[var(--atr-hl,rgba(212,82,47,0.12))] dark:bg-[#2C1D18] text-[var(--atr-acc-text,#ab391a)] dark:text-[#FF8D7A] truncate max-w-full">
                    {planName}
                  </span>
                  {memberBranch && (
                    <span className="pill inline-flex items-center px-2.5 py-[3px] rounded-full t-small font-medium bg-[#F3EDE7] dark:bg-[#2B2825] text-black dark:text-white truncate max-w-full">
                      {memberBranch.name}
                    </span>
                  )}
                  <span className={`pill inline-flex items-center gap-2 px-2.5 py-[3px] rounded-full t-small font-medium ${statusPillCls}`}>
                    <i className="w-1.5 h-1.5 rounded-full bg-current" />
                    {statusLabel}
                  </span>
                  {!isBlocked && (
                    <span className="pill inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full t-small font-medium bg-[#DDF5E8] dark:bg-[#143324] text-[#096b40] dark:text-[#5BE3A3]">
                      <ShieldCheck className="w-3 h-3" />
                      Vérifié
                    </span>
                  )}
                </div>
                <small className="block mt-2 tabular-nums t-cap text-[var(--atr-mut,rgba(0,0,0,0.68))] dark:text-white/68">
                  ID: RFID-{activeMember.id.slice(0, 8).toUpperCase()}
                </small>
              </div>

              <div className="pnav flex gap-2 shrink-0">
                <button
                  type="button"
                  data-no-liquid="true"
                  disabled={!hasPrev}
                  onClick={() => handleStep(-1)}
                  aria-label="Adhérent précédent"
                  title="Adhérent précédent"
                  className="w-[34px] h-[34px] rounded-full bg-[#F3EDE7] dark:bg-[#2B2825] grid place-items-center p-0 text-[var(--atr-ink,#000000)] dark:text-white hover:not-disabled:bg-[var(--atr-hl,rgba(212,82,47,0.12))] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  data-no-liquid="true"
                  disabled={!hasNext}
                  onClick={() => handleStep(1)}
                  aria-label="Adhérent suivant"
                  title="Adhérent suivant"
                  className="w-[34px] h-[34px] rounded-full bg-[#F3EDE7] dark:bg-[#2B2825] grid place-items-center p-0 text-[var(--atr-ink,#000000)] dark:text-white hover:not-disabled:bg-[var(--atr-hl,rgba(212,82,47,0.12))] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  ref={closeBtnRef}
                  type="button"
                  data-no-liquid="true"
                  onClick={onClose}
                  aria-label="Fermer la fiche"
                  title="Fermer"
                  className="w-[34px] h-[34px] rounded-full bg-[#F3EDE7] dark:bg-[#2B2825] grid place-items-center p-0 text-[var(--atr-ink,#000000)] dark:text-white hover:bg-[var(--atr-hl,rgba(212,82,47,0.12))] cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TABS WITH DUAL-SPRING CLIP-PATH INDICATOR (.ptabs) */}
            <div
              ref={ptabsRef}
              data-sq="ctl"
              data-sq-border="none"
              className="ptabs relative flex mx-[26px] p-[3px] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#191716]"
              role="tablist"
              aria-label="Sections du dossier adhérent"
            >
              <i
                ref={pindRef}
                aria-hidden="true"
                className="absolute top-[3px] bottom-[3px] left-0 right-0 rounded-[var(--r-thumb,9px)] bg-[var(--atr-acc,#d4522f)] z-0 pointer-events-none"
                style={{ clipPath: 'inset(0 100% 0 3px round 9px)' }}
              />
              {TABS.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabBtnRefs.current[tab.id] = el;
                    }}
                    type="button"
                    role="tab"
                    data-t={tab.id}
                    aria-selected={isSelected}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative z-[1] flex-1 h-[38px] border-0 bg-transparent font-semibold t-label rounded-[var(--r-thumb,9px)] transition-colors duration-160 cursor-pointer ${
                      isSelected
                        ? 'text-white'
                        : 'text-[var(--atr-ink,#000000)] dark:text-white/88'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* SCROLLABLE BODY (.pb) WITH REPLAYABLE SECTION ENTRANCES (toggles data-anim without remounting DOM) */}
            <div
              data-anim={entranceEpoch & 1}
              role="tabpanel"
              className="pb flex-1 overflow-y-auto px-[26px] pt-2 pb-[18px] select-text"
            >
              {activeTab === 'overview' && (
                <>
                  <section style={{ '--k': 0 } as React.CSSProperties}>
                    <h3>Actions rapides</h3>
                    <div className="qa grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        data-no-liquid="true"
                        data-sq="card"
                        data-sq-border="none"
                        onClick={() => onCheckIn(activeMember)}
                        className="flex flex-col items-center gap-2 pt-4 px-2 pb-3 border-0 bg-[var(--atr-hl,rgba(212,82,47,0.12))] dark:bg-[#2C1D18] text-[var(--atr-acc-text,#ab391a)] dark:text-[#FF8D7A] t-small font-medium leading-tight text-center cursor-pointer"
                      >
                        <span data-sq="tile" data-sq-border="none" className="ic w-[38px] h-[38px] bg-white dark:bg-[#22201E] grid place-items-center">
                          <UserCheck className="w-[18px] h-[18px]" />
                        </span>
                        <span>Enregistrer présence</span>
                      </button>

                      <button
                        type="button"
                        data-no-liquid="true"
                        data-sq="card"
                        data-sq-border="none"
                        onClick={(e) => onEdit(activeMember, e.currentTarget)}
                        className="flex flex-col items-center gap-2 pt-4 px-2 pb-3 border-0 bg-[#F5F1EC] dark:bg-[#2B2825] hover:bg-[#EAE2D9] dark:hover:bg-[#332F2B] text-[var(--atr-ink,#000000)] dark:text-white t-small font-medium leading-tight text-center transition-colors cursor-pointer"
                      >
                        <span data-sq="tile" data-sq-border="none" className="ic w-[38px] h-[38px] bg-white dark:bg-[#22201E] grid place-items-center">
                          <Pencil className="w-[18px] h-[18px]" />
                        </span>
                        <span>Modifier</span>
                      </button>

                      <button
                        type="button"
                        data-no-liquid="true"
                        data-sq="card"
                        data-sq-border="none"
                        onClick={() => onToggleBlock(activeMember)}
                        className="flex flex-col items-center gap-2 pt-4 px-2 pb-3 border-0 bg-[#F5F1EC] dark:bg-[#2B2825] hover:bg-[#EAE2D9] dark:hover:bg-[#332F2B] text-[var(--atr-ink,#000000)] dark:text-white t-small font-medium leading-tight text-center transition-colors cursor-pointer"
                      >
                        <span data-sq="tile" data-sq-border="none" className="ic w-[38px] h-[38px] bg-white dark:bg-[#22201E] grid place-items-center">
                          {isBlocked ? (
                            <Unlock className="w-[18px] h-[18px] text-[var(--atr-ok,#096b40)]" />
                          ) : (
                            <Lock className="w-[18px] h-[18px] text-amber-500" />
                          )}
                        </span>
                        <span>{isBlocked ? 'Débloquer badge' : 'Bloquer badge'}</span>
                      </button>

                      <button
                        type="button"
                        data-no-liquid="true"
                        data-sq="card"
                        data-sq-border="none"
                        onClick={() => onRenew(activeMember)}
                        className="flex flex-col items-center gap-2 pt-4 px-2 pb-3 border-0 bg-[#F5F1EC] dark:bg-[#2B2825] hover:bg-[#EAE2D9] dark:hover:bg-[#332F2B] text-[var(--atr-ink,#000000)] dark:text-white t-small font-medium leading-tight text-center transition-colors cursor-pointer"
                      >
                        <span data-sq="tile" data-sq-border="none" className="ic w-[38px] h-[38px] bg-white dark:bg-[#22201E] grid place-items-center">
                          <RotateCcw className="w-[18px] h-[18px]" />
                        </span>
                        <span>Renouveler abonnement</span>
                      </button>
                    </div>
                  </section>

                  <section style={{ '--k': 1 } as React.CSSProperties}>
                    <div data-sq="card" data-sq-border="none" className="card bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#1D1B19] px-[18px] py-2 border-0">
                      <div className="kv flex justify-between items-center gap-3 py-[11px] border-b border-[var(--atr-divider)] t-body">
                        <span className="text-[var(--atr-mut,rgba(0,0,0,0.72))] dark:text-white/75">Formule d’abonnement</span>
                        <b className="tabular-nums t-body text-right">{planName}</b>
                      </div>
                      <div className="kv flex justify-between items-center gap-3 py-[11px] border-b border-[var(--atr-divider)] t-body">
                        <span className="text-[var(--atr-mut,rgba(0,0,0,0.72))] dark:text-white/75">Date d’échéance</span>
                        <b className="tabular-nums t-body text-right">{memberExp || 'Non spécifiée'}</b>
                      </div>
                      <div className="kv flex justify-between items-center gap-3 py-[11px] border-b border-[var(--atr-divider)] t-body">
                        <span className="text-[var(--atr-mut,rgba(0,0,0,0.72))] dark:text-white/75">Jours restants</span>
                        <b
                          className="tabular-nums t-body text-right"
                          style={{
                            color:
                              daysRemaining < 0
                                ? 'var(--atr-danger, #c0283d)'
                                : daysRemaining < 14
                                ? 'var(--atr-acc, #d4522f)'
                                : 'var(--atr-ok, #096b40)',
                          }}
                        >
                          {daysRemaining < 0 ? `Expiré (${-daysRemaining}j)` : `${daysRemaining} jours`}
                        </b>
                      </div>
                      <div className="kv flex justify-between items-center gap-3 py-[11px] t-body">
                        <span className="text-[var(--atr-mut,rgba(0,0,0,0.72))] dark:text-white/75">Séances restantes</span>
                        <b className="tabular-nums t-body text-right text-[var(--atr-ok,#096b40)] dark:text-[#5BE3A3]">
                          {remainingSessions} séances
                        </b>
                      </div>
                      <div className="bar2 h-[8px] rounded-full bg-[var(--atr-divider)] overflow-hidden mt-0.5 mb-3">
                        <i
                          ref={barFillRef}
                          className="block w-full h-full rounded-full bg-[var(--atr-ok,#096b40)] dark:bg-[#5BE3A3] origin-left rtl:origin-right"
                          style={{ transform: 'scaleX(0)' }}
                        />
                      </div>
                    </div>
                  </section>

                  <section style={{ '--k': 2 } as React.CSSProperties}>
                    <h3>Contact &amp; accès</h3>
                    <div data-sq="card" data-sq-border="none" className="card bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#1D1B19] px-[18px] py-2 border-0">
                      <div className="kv flex justify-between items-center gap-3 py-[11px] border-b border-[var(--atr-divider)] t-body">
                        <span className="text-[var(--atr-mut,rgba(0,0,0,0.72))] dark:text-white/75 flex items-center gap-2">
                          <Phone className="w-[15px] h-[15px]" />
                          Téléphone
                        </span>
                        <span className="flex items-center gap-2">
                          <b className="tabular-nums t-body">{memberPhone || 'Non renseigné'}</b>
                          {memberPhone && (
                            <button
                              type="button"
                              data-sq="ctl-sm"
                              data-sq-border="none"
                              onClick={() => handleCopy(memberPhone, 'phone')}
                              className="w-7 h-7 border-0 bg-transparent hover:bg-[var(--atr-hl,rgba(212,82,47,0.12))] grid place-items-center text-[var(--atr-mut,rgba(0,0,0,0.68))] dark:text-white/68 hover:text-[var(--atr-acc,#d4522f)] cursor-pointer"
                              aria-label="Copier le téléphone"
                            >
                              {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-[var(--atr-ok,#096b40)]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </span>
                      </div>
                      <div className="kv flex justify-between items-center gap-3 py-[11px] t-body">
                        <span className="text-[var(--atr-mut,rgba(0,0,0,0.72))] dark:text-white/75 flex items-center gap-2">
                          <Mail className="w-[15px] h-[15px]" />
                          E-mail
                        </span>
                        <span className="flex items-center gap-2 min-w-0">
                          <b className="tabular-nums t-body truncate">{memberEmail || '—'}</b>
                          {memberEmail && (
                            <button
                              type="button"
                              data-sq="ctl-sm"
                              data-sq-border="none"
                              onClick={() => handleCopy(memberEmail, 'email')}
                              className="w-7 h-7 border-0 bg-transparent hover:bg-[var(--atr-hl,rgba(212,82,47,0.12))] grid place-items-center text-[var(--atr-mut,rgba(0,0,0,0.68))] dark:text-white/68 hover:text-[var(--atr-acc,#d4522f)] cursor-pointer"
                              aria-label="Copier l'e-mail"
                            >
                              {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-[var(--atr-ok,#096b40)]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </span>
                      </div>
                    </div>
                  </section>

                  <section style={{ '--k': 3 } as React.CSSProperties}>
                    <h3>Notes du personnel</h3>
                    <textarea
                      aria-label="Notes du personnel"
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      onBlur={() => {
                        if (activeMember && notesText.trim() !== (activeMember.notes || '').trim()) {
                          onUpdateNotes(activeMember.id, notesText.trim());
                        }
                      }}
                      placeholder="Ajouter une note relative à cet adhérent…"
                      className="w-full box-border min-h-[84px] rounded-[var(--r-card,16px)] border-0 bg-[#F5F1EC] dark:bg-[#2B2825] focus:bg-white dark:focus:bg-[#312D2A] focus:outline-none focus:ring-2 focus:ring-[#d4522f]/30 px-4 py-3 t-body text-[var(--atr-ink,#000000)] dark:text-white placeholder:text-black/48 dark:placeholder:text-white/50 resize-y transition-all"
                    />
                  </section>
                </>
              )}

              {activeTab === 'access' && (
                <>
                  <section style={{ '--k': 0 } as React.CSSProperties}>
                    <h3>Badge &amp; portique</h3>
                    <div data-sq="card" data-sq-border="none" className="card bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#1D1B19] px-[18px] py-2 border-0">
                      <div className="kv flex justify-between items-center gap-3 py-[11px] border-b border-[var(--atr-divider)] t-body">
                        <span className="text-[var(--atr-mut,rgba(0,0,0,0.72))] dark:text-white/75">Badge</span>
                        <b className="tabular-nums t-body">RFID-{activeMember.id.slice(0, 8).toUpperCase()}</b>
                      </div>
                      <div className="kv flex justify-between items-center gap-3 py-[11px] border-b border-[var(--atr-divider)] t-body">
                        <span className="text-[var(--atr-mut,rgba(0,0,0,0.72))] dark:text-white/75">Statut</span>
                        <span className={`pill inline-flex items-center gap-2 px-2.5 py-[3px] rounded-full t-small font-medium ${statusPillCls}`}>
                          <i className="w-1.5 h-1.5 rounded-full bg-current" />
                          {statusLabel}
                        </span>
                      </div>
                      <div className="kv flex justify-between items-center gap-3 py-[11px] t-body">
                        <span className="text-[var(--atr-mut,rgba(0,0,0,0.72))] dark:text-white/75">Séances restantes</span>
                        <b className="tabular-nums t-body">{remainingSessions}</b>
                      </div>
                    </div>
                    <div className="h-2.5" />
                    <button
                      type="button"
                      data-sq="ctl"
                      data-sq-border="none"
                      onClick={() => onToggleBlock(activeMember)}
                      className="wide w-full h-[42px] border-0 bg-[#1F1D1B] dark:bg-white text-white dark:text-black font-semibold t-label cursor-pointer"
                    >
                      {isBlocked ? 'Débloquer le badge' : 'Bloquer le badge'}
                    </button>
                  </section>

                  <section style={{ '--k': 1 } as React.CSSProperties}>
                    <h3>Passages récents</h3>
                    {memberCheckInHistory.length > 0 ? (
                      <div data-sq="card" data-sq-border="none" className="card bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#1D1B19] px-[18px] py-2 border-0">
                        {memberCheckInHistory.slice(0, 8).map((log) => {
                          const ok =
                            log.accessStatus === 'Granted' ||
                            log.accessStatus === 'Warning_Expiring';
                          const tsLabel = (() => {
                            try {
                              return new Date(log.timestamp).toLocaleString(
                                esLocale === 'ar' ? 'ar-DZ' : esLocale === 'en' ? 'en-US' : 'fr-FR',
                                { dateStyle: 'short', timeStyle: 'short' }
                              );
                            } catch {
                              return log.timestamp;
                            }
                          })();
                          return (
                            <div
                              key={log.id}
                              className="li flex justify-between items-center py-[11px] border-b last:border-b-0 border-[var(--atr-divider)] t-body"
                            >
                              <span>
                                <span className="font-medium block">
                                  {log.checkInMethod === 'nfc_card'
                                    ? 'Portique RFID'
                                    : log.checkInMethod === 'barcode_scanner'
                                    ? 'Scanner Accueil'
                                    : 'Validation Accueil'}
                                </span>
                                <small className="tabular-nums t-cap text-[var(--atr-mut,rgba(0,0,0,0.68))] dark:text-white/68">
                                  {tsLabel}
                                </small>
                              </span>
                              <span
                                className={`pill px-2.5 py-[3px] rounded-full t-small font-medium ${
                                  ok
                                    ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#096b40] dark:text-[#5BE3A3]'
                                    : 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#c0283d] dark:text-[#FF8D7A]'
                                }`}
                              >
                                {ok ? 'Accepté' : 'Refusé'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <KineticEmptyStateMotion motionKey={`member-checkins-empty-${activeMember.id}-${esLocale}`}>
                        <EmptyState
                          {...resolveCompactCheckinsEmptyState({
                            name: memberName,
                            onAction: () => onCheckIn(activeMember),
                            locale: esLocale,
                          })}
                        />
                      </KineticEmptyStateMotion>
                    )}
                  </section>

                  {memberCheckInHistory.length > 0 && (
                    <section style={{ '--k': 2 } as React.CSSProperties}>
                      <button
                        type="button"
                        data-sq="ctl"
                        data-sq-border="none"
                        onClick={() => onCheckIn(activeMember)}
                        className="wide w-full h-[42px] border-0 bg-[var(--atr-acc,#d4522f)] text-white font-semibold t-label cursor-pointer"
                      >
                        Enregistrer une présence
                      </button>
                    </section>
                  )}
                </>
              )}

              {activeTab === 'billing' && (
                <>
                  <section style={{ '--k': 0 } as React.CSSProperties}>
                    <h3>Solde à régler</h3>
                    <div data-sq="card" data-sq-border="none" className="card bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#1D1B19] px-[18px] py-4 border-0">
                      <div
                        className="big tabular-nums t-kpi-m uppercase my-1"
                        style={{
                          color: balanceAmount > 0 ? 'var(--atr-acc, #d4522f)' : 'var(--atr-ok, #096b40)',
                        }}
                      >
                        {balanceAmount > 0 ? `${balanceAmount.toLocaleString('en-US')} DZD` : 'Soldé'}
                      </div>
                      {balanceAmount > 0 && (
                        <button
                          type="button"
                          data-sq="ctl"
                          data-sq-border="none"
                          onClick={() => showToast(`Solde encaissé pour ${memberName}`)}
                          className="wide mt-2 w-full h-[42px] border-0 bg-[var(--atr-acc,#d4522f)] text-white font-semibold t-label cursor-pointer"
                        >
                          Encaisser le solde
                        </button>
                      )}
                    </div>
                  </section>

                  <section style={{ '--k': 1 } as React.CSSProperties}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="!m-0">Factures</h3>
                      {memberInvoiceHistory.length > 0 && (
                        <button
                          type="button"
                          data-sq="ctl-sm"
                          data-sq-border="none"
                          onClick={() => showToast(`Nouvelle facture pour ${memberName}`)}
                          className="h-8 px-3 border-0 bg-[var(--atr-acc,#d4522f)] text-white font-semibold t-small flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Nouvelle
                        </button>
                      )}
                    </div>
                    {memberInvoiceHistory.length > 0 ? (
                      <div data-sq="card" data-sq-border="none" className="card bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#1D1B19] px-[18px] py-2 border-0">
                        {memberInvoiceHistory.slice(0, 8).map((inv) => {
                          const paid = inv.status !== 'Voided' && inv.paymentMethod !== 'Credit';
                          const label =
                            inv.items?.[0]?.productName ||
                            `${inv.id.slice(0, 8).toUpperCase()} · ${planName}`;
                          const dateStr = inv.createdAt ? inv.createdAt.split('T')[0] : '—';
                          return (
                            <div
                              key={inv.id}
                              className="li flex justify-between items-center py-[11px] border-b last:border-b-0 border-[var(--atr-divider)] t-body gap-2"
                            >
                              <span>
                                <span className="font-medium block">{label}</span>
                                <small className="tabular-nums t-cap text-[var(--atr-mut,rgba(0,0,0,0.68))] dark:text-white/68">
                                  {dateStr}
                                </small>
                              </span>
                              <span className="flex items-center gap-2 shrink-0">
                                <b className="tabular-nums t-cap">
                                  {Math.round(inv.totalAmount).toLocaleString('en-US')} DZD
                                </b>
                                <span
                                  className={`pill px-2 py-[2px] rounded-full t-small font-medium ${
                                    paid
                                      ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#096b40] dark:text-[#5BE3A3]'
                                      : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
                                  }`}
                                >
                                  {paid ? 'Payée' : 'À régler'}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <KineticEmptyStateMotion motionKey={`member-billing-empty-${activeMember.id}-${esLocale}`}>
                        <EmptyState
                          {...resolveCompactInvoicesEmptyState({
                            onAction: () => showToast(`Nouvelle vente pour ${memberName}`),
                            locale: esLocale,
                          })}
                        />
                      </KineticEmptyStateMotion>
                    )}
                  </section>
                </>
              )}
            </div>

            {/* FOOTER (.pf) */}
            <div className="pf flex justify-between items-center px-[26px] py-4 border-t border-[var(--atr-divider)]">
              <button
                type="button"
                onPointerDown={() => {
                  isHoldingRef.current = true;
                  holdRef.current?.setTarget(100);
                  wake();
                }}
                onPointerUp={() => {
                  isHoldingRef.current = false;
                  holdRef.current?.setTarget(0);
                  wake();
                }}
                onPointerLeave={() => {
                  isHoldingRef.current = false;
                  holdRef.current?.setTarget(0);
                  wake();
                }}
                onPointerCancel={() => {
                  isHoldingRef.current = false;
                  holdRef.current?.setTarget(0);
                  wake();
                }}
                onClick={(e) => {
                  if (e.detail === 0 && activeMember) {
                    onDelete(activeMember);
                    onClose();
                  }
                }}
                aria-label="Maintenir pour supprimer l'adhérent"
                data-no-liquid="true"
                data-sq="ctl"
                data-sq-border="none"
                className="relative overflow-hidden h-10 px-4 border-0 text-[var(--atr-danger,#c0283d)] dark:text-[#FF8D7A] font-semibold t-label flex items-center gap-2 cursor-pointer bg-[#FDE4DF]/75 dark:bg-[#3D1E1A]/65 hover:bg-[#FDE4DF] dark:hover:bg-[#3D1E1A] transition-colors"
              >
                <span
                  ref={holdFillRef}
                  className="absolute inset-0 bg-[#c0283d] pointer-events-none origin-bottom transform-gpu"
                  style={{ transform: 'translate3d(0, 0, 0) scaleY(0)' }}
                />
                <span ref={holdTextWrapRef} className="relative z-10 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span ref={holdLabelRef}>Maintenir pour supprimer</span>
                </span>
              </button>

              <button
                type="button"
                data-sq="ctl"
                data-sq-border="none"
                onClick={onClose}
                className="fer h-[44px] px-7 border-0 bg-[var(--atr-acc,#d4522f)] hover:opacity-95 text-white font-semibold t-label cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </>
        )}
      </aside>
    </>,
    document.body
  );
});

MemberSlideOverInspector.displayName = 'MemberSlideOverInspector';
