import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
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
  const [notesText, setNotesText] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Retain the last displayed member during close bounce so content stays visible until settled
  const retainedMemberRef = useRef<Member | null>(member);
  if (member) {
    retainedMemberRef.current = member;
  }
  const activeMember = member || retainedMemberRef.current;

  // DOM refs for direct rAF style writes (zero per-frame React state updates)
  const scrimRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
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
  const prevTabRef = useRef(activeTab);
  const entranceEpochRef = useRef(0);

  // Compute entrance epoch synchronously during render (eliminates second mount pass on open/tab/step)
  {
    const curId = activeMember?.id ?? null;
    const justOpened = isOpen && !wasOpenRef.current;
    const switchedMember = isOpen && curId !== prevMemberIdRef.current;
    const switchedTab = isOpen && activeTab !== prevTabRef.current;
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

  // Sync notes text when member changes
  useEffect(() => {
    if (activeMember) {
      setNotesText(activeMember.notes || '');
    }
  }, [activeMember?.id, activeMember?.notes]);

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

    // 2. Tab indicator (only when ix/iw move)
    const ixQ = Math.round(ix.x * 2) / 2;
    const iwQ = Math.round(Math.max(0, iw.x) * 2) / 2;
    const indKey = `${ixQ}|${iwQ}`;
    const isIndMoving = !ix.rest() || !iw.rest();
    if (isIndMoving !== indWillChangeRef.current) {
      indWillChangeRef.current = isIndMoving;
      if (pindRef.current) {
        pindRef.current.style.willChange = isIndMoving ? 'transform' : '';
      }
    }
    if (indKey !== lastIndKeyRef.current) {
      lastIndKeyRef.current = indKey;
      if (pindRef.current) {
        pindRef.current.style.transform = `translate3d(${ixQ}px, 0, 0)`;
        pindRef.current.style.width = `${iwQ}px`;
      }
    }

    // 3. Hold-to-delete spring fill (only when hold moves)
    const hp = clamp(hold.x / 100, 0, 1);
    const holdQ = Math.round(hp * 100);
    if (holdQ !== lastHoldQRef.current) {
      lastHoldQRef.current = holdQ;
      const pctInset = Math.max(0, 100 - holdQ);
      if (holdFillRef.current) {
        holdFillRef.current.style.clipPath = holdQ === 0 ? 'inset(100% 0 0 0)' : `inset(${pctInset}% 0 0 0)`;
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
      if (initialTab && initialTab !== activeTab) {
        setActiveTab(initialTab);
      }

      if (panelRef.current) {
        panelRef.current.setAttribute('aria-hidden', 'false');
      }

      // Snap tab indicator when opening from closed state
      const activeBtn = tabBtnRefs.current[activeTab];
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

  // Progress bar .bar2 next-rAF GPU scaleX fill on open / tab change / prev-next
  useEffect(() => {
    if (!isOpen || activeTab !== 'overview') return;
    const fillEl = barFillRef.current;
    if (!fillEl) return;
    fillEl.style.transform = 'scaleX(0)';
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        if (barFillRef.current) {
          barFillRef.current.style.transform = `scaleX(${sessionPct / 100})`;
        }
      });
    });
    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
    };
  }, [entranceEpoch, isOpen, activeTab]);

  // Update progress bar scale dynamically when sessions change in-place without replaying sections
  useEffect(() => {
    if (!isOpen || activeTab !== 'overview') return;
    if (barFillRef.current) {
      barFillRef.current.style.transform = `scaleX(${sessionPct / 100})`;
    }
  }, [sessionPct, isOpen, activeTab]);

  // Prev / Next step through filtered+sorted list
  const currentIndex = activeMember
    ? allMembers.findIndex((m) => m.id === activeMember.id)
    : -1;
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
    ? 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]'
    : statusLabel === 'Expiré'
    ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
    : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]';

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
        className="scrim scrim-inspector fixed inset-0 z-[50] bg-[#1B1917]/38"
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
        className="pnl pnl-inspector fixed right-[14px] top-[14px] bottom-[14px] w-[560px] max-w-[calc(100vw-28px)] z-[51] rounded-[30px] bg-white dark:bg-[#1E1D1B] border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] text-[var(--atr-ink,#1B1917)] dark:text-[#F2ECE6] shadow-[-12px_0_28px_rgba(0,0,0,0.16)] flex flex-col overflow-hidden font-sans select-none"
      >
        {activeMember && (
          <>
            {/* HEADER (.ph) */}
            <div className="ph flex gap-4 items-start px-[26px] pt-[26px] pb-[18px]">
              <span
                className="pav w-[68px] h-[68px] rounded-[22px] bg-[var(--atr-acc,#C9441F)] text-white font-bold text-[28px] grid place-items-center shrink-0 shadow-sm"
                aria-hidden="true"
              >
                {initials}
              </span>

              <div className="pt flex-1 min-w-0">
                <h2
                  id="member-drawer-title"
                  className="m-0 mb-2 font-bold text-[26px] leading-[1.1] tracking-tight text-[var(--atr-ink,#1B1917)] dark:text-[#F2ECE6] truncate"
                >
                  {memberName}
                </h2>
                <div className="pills flex gap-1.5 flex-wrap">
                  <span className="pill inline-flex items-center px-2.5 py-[3px] rounded-full text-[12px] font-medium bg-[var(--atr-hl,#FBE7DF)] dark:bg-[#2C1D18] text-[var(--atr-acc,#C9441F)] dark:text-[#FF8D7A] border border-[#F3C9BA] dark:border-[#52291F] truncate max-w-full">
                    {planName}
                  </span>
                  <span className={`pill inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[12px] font-medium ${statusPillCls}`}>
                    <i className="w-1.5 h-1.5 rounded-full bg-current" />
                    {statusLabel}
                  </span>
                  {!isBlocked && (
                    <span className="pill inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[12px] font-medium bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]">
                      <ShieldCheck className="w-3 h-3" />
                      Vérifié
                    </span>
                  )}
                </div>
                <small className="block mt-2 font-mono text-[11px] text-[var(--atr-mut,#6B635C)]">
                  ID: RFID-{activeMember.id.slice(0, 8).toUpperCase()}
                </small>
              </div>

              <div className="pnav flex gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => handleStep(-1)}
                  aria-label="Adhérent précédent"
                  title="Adhérent précédent"
                  className="w-[34px] h-[34px] rounded-full border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] bg-white dark:bg-[#262422] grid place-items-center p-0 text-[var(--atr-ink,#1B1917)] dark:text-[#F2ECE6] hover:not-disabled:bg-[var(--atr-hl,#FBE7DF)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => handleStep(1)}
                  aria-label="Adhérent suivant"
                  title="Adhérent suivant"
                  className="w-[34px] h-[34px] rounded-full border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] bg-white dark:bg-[#262422] grid place-items-center p-0 text-[var(--atr-ink,#1B1917)] dark:text-[#F2ECE6] hover:not-disabled:bg-[var(--atr-hl,#FBE7DF)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  ref={closeBtnRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Fermer la fiche"
                  title="Fermer"
                  className="w-[34px] h-[34px] rounded-full border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] bg-white dark:bg-[#262422] grid place-items-center p-0 text-[var(--atr-ink,#1B1917)] dark:text-[#F2ECE6] hover:bg-[var(--atr-hl,#FBE7DF)] cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TABS WITH DUAL-SPRING INDICATOR (.ptabs) */}
            <div
              className="ptabs relative flex mx-[26px] p-1 rounded-[14px] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#262422]"
              role="tablist"
              aria-label="Sections du dossier adhérent"
            >
              <i
                ref={pindRef}
                aria-hidden="true"
                className="absolute top-1 bottom-1 left-0 rounded-[10px] bg-[var(--atr-acc,#C9441F)] z-0 pointer-events-none"
                style={{ width: '0px', transform: 'translate3d(4px, 0, 0)' }}
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
                    className={`relative z-[1] flex-1 h-[38px] border-0 bg-transparent font-semibold text-[13px] rounded-[10px] transition-colors duration-160 cursor-pointer ${
                      isSelected
                        ? 'text-white'
                        : 'text-[var(--atr-ink,#1B1917)] dark:text-[#EAE3DC]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* SCROLLABLE BODY (.pb) WITH REPLAYABLE SECTION ENTRANCES */}
            <div
              key={entranceEpoch}
              role="tabpanel"
              className="pb flex-1 overflow-y-auto px-[26px] pt-1.5 pb-[18px] select-text"
            >
              {activeTab === 'overview' && (
                <>
                  <section style={{ '--k': 0 } as React.CSSProperties}>
                    <h3>Actions rapides</h3>
                    <div className="qa grid grid-cols-4 gap-2.5">
                      <button
                        type="button"
                        onClick={() => onCheckIn(activeMember)}
                        className="flex flex-col items-center gap-2 pt-3.5 px-1.5 pb-3 rounded-[16px] border border-[#F3C9BA] dark:border-[#52291F] bg-[var(--atr-hl,#FBE7DF)] dark:bg-[#2C1D18] text-[var(--atr-acc,#C9441F)] dark:text-[#FF8D7A] text-[12px] font-medium leading-tight text-center cursor-pointer"
                      >
                        <span className="ic w-[38px] h-[38px] rounded-[12px] bg-white dark:bg-[#1E1D1B] grid place-items-center">
                          <UserCheck className="w-[18px] h-[18px]" />
                        </span>
                        <span>Enregistrer présence</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => onEdit(activeMember, e.currentTarget)}
                        className="flex flex-col items-center gap-2 pt-3.5 px-1.5 pb-3 rounded-[16px] border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] bg-white dark:bg-[#262422] text-[var(--atr-ink,#1B1917)] dark:text-[#F2ECE6] text-[12px] font-medium leading-tight text-center cursor-pointer"
                      >
                        <span className="ic w-[38px] h-[38px] rounded-[12px] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#1E1D1B] grid place-items-center">
                          <Pencil className="w-[18px] h-[18px]" />
                        </span>
                        <span>Modifier</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleBlock(activeMember)}
                        className="flex flex-col items-center gap-2 pt-3.5 px-1.5 pb-3 rounded-[16px] border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] bg-white dark:bg-[#262422] text-[var(--atr-ink,#1B1917)] dark:text-[#F2ECE6] text-[12px] font-medium leading-tight text-center cursor-pointer"
                      >
                        <span className="ic w-[38px] h-[38px] rounded-[12px] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#1E1D1B] grid place-items-center">
                          {isBlocked ? (
                            <Unlock className="w-[18px] h-[18px] text-[var(--atr-ok,#0B7A45)]" />
                          ) : (
                            <Lock className="w-[18px] h-[18px] text-amber-500" />
                          )}
                        </span>
                        <span>{isBlocked ? 'Débloquer badge' : 'Bloquer badge'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRenew(activeMember)}
                        className="flex flex-col items-center gap-2 pt-3.5 px-1.5 pb-3 rounded-[16px] border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] bg-white dark:bg-[#262422] text-[var(--atr-ink,#1B1917)] dark:text-[#F2ECE6] text-[12px] font-medium leading-tight text-center cursor-pointer"
                      >
                        <span className="ic w-[38px] h-[38px] rounded-[12px] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#1E1D1B] grid place-items-center">
                          <RotateCcw className="w-[18px] h-[18px]" />
                        </span>
                        <span>Renouveler abonnement</span>
                      </button>
                    </div>
                  </section>

                  <section style={{ '--k': 1 } as React.CSSProperties}>
                    <div className="card rounded-[18px] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#262422] px-[18px] py-1.5 border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734]">
                      <div className="kv flex justify-between items-center gap-3 py-[11px] border-b border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] text-[13px]">
                        <span className="text-[var(--atr-mut,#6B635C)]">Formule d’abonnement</span>
                        <b className="font-mono text-[13px] text-right">{planName}</b>
                      </div>
                      <div className="kv flex justify-between items-center gap-3 py-[11px] border-b border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] text-[13px]">
                        <span className="text-[var(--atr-mut,#6B635C)]">Date d’échéance</span>
                        <b className="font-mono text-[13px] text-right">{memberExp || 'Non spécifiée'}</b>
                      </div>
                      <div className="kv flex justify-between items-center gap-3 py-[11px] border-b border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] text-[13px]">
                        <span className="text-[var(--atr-mut,#6B635C)]">Jours restants</span>
                        <b
                          className="font-mono text-[13px] text-right"
                          style={{
                            color:
                              daysRemaining < 0
                                ? 'var(--atr-danger, #B8321C)'
                                : daysRemaining < 14
                                ? 'var(--atr-acc, #C9441F)'
                                : 'var(--atr-ok, #0B7A45)',
                          }}
                        >
                          {daysRemaining < 0 ? `Expiré (${-daysRemaining}j)` : `${daysRemaining} jours`}
                        </b>
                      </div>
                      <div className="kv flex justify-between items-center gap-3 py-[11px] text-[13px]">
                        <span className="text-[var(--atr-mut,#6B635C)]">Séances restantes</span>
                        <b className="font-mono text-[13px] text-right text-[var(--atr-ok,#0B7A45)] dark:text-[#5BE3A3]">
                          {remainingSessions} séances
                        </b>
                      </div>
                      <div className="bar2 h-[8px] rounded-[4px] bg-[var(--atr-line,#E6DED6)] dark:bg-[#3A3734] overflow-hidden mt-0.5 mb-3">
                        <i
                          ref={barFillRef}
                          className="block w-full h-full rounded-[4px] bg-[var(--atr-ok,#0B7A45)] dark:bg-[#5BE3A3] origin-left rtl:origin-right"
                          style={{ transform: 'scaleX(0)' }}
                        />
                      </div>
                    </div>
                  </section>

                  <section style={{ '--k': 2 } as React.CSSProperties}>
                    <h3>Contact &amp; accès</h3>
                    <div className="card rounded-[18px] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#262422] px-[18px] py-1.5 border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734]">
                      <div className="kv flex justify-between items-center gap-3 py-[11px] border-b border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] text-[13px]">
                        <span className="text-[var(--atr-mut,#6B635C)] flex items-center gap-2">
                          <Phone className="w-[15px] h-[15px]" />
                          Téléphone
                        </span>
                        <span className="flex items-center gap-2">
                          <b className="font-mono text-[13px]">{memberPhone || 'Non renseigné'}</b>
                          {memberPhone && (
                            <button
                              type="button"
                              onClick={() => handleCopy(memberPhone, 'phone')}
                              className="w-7 h-7 rounded-[8px] border-0 bg-transparent hover:bg-[var(--atr-hl,#FBE7DF)] grid place-items-center text-[var(--atr-mut,#6B635C)] hover:text-[var(--atr-acc,#C9441F)] cursor-pointer"
                              aria-label="Copier le téléphone"
                            >
                              {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-[var(--atr-ok,#0B7A45)]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </span>
                      </div>
                      <div className="kv flex justify-between items-center gap-3 py-[11px] text-[13px]">
                        <span className="text-[var(--atr-mut,#6B635C)] flex items-center gap-2">
                          <Mail className="w-[15px] h-[15px]" />
                          E-mail
                        </span>
                        <span className="flex items-center gap-2 min-w-0">
                          <b className="font-mono text-[13px] truncate">{memberEmail || '—'}</b>
                          {memberEmail && (
                            <button
                              type="button"
                              onClick={() => handleCopy(memberEmail, 'email')}
                              className="w-7 h-7 rounded-[8px] border-0 bg-transparent hover:bg-[var(--atr-hl,#FBE7DF)] grid place-items-center text-[var(--atr-mut,#6B635C)] hover:text-[var(--atr-acc,#C9441F)] cursor-pointer"
                              aria-label="Copier l'e-mail"
                            >
                              {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-[var(--atr-ok,#0B7A45)]" /> : <Copy className="w-3.5 h-3.5" />}
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
                          showToast('Notes enregistrées');
                        }
                      }}
                      placeholder="Ajouter une note relative à cet adhérent…"
                      className="w-full box-border min-h-[84px] rounded-[16px] border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#262422] px-3.5 py-3 text-[13px] text-[var(--atr-ink,#1B1917)] dark:text-[#F2ECE6] resize-y"
                    />
                  </section>
                </>
              )}

              {activeTab === 'access' && (
                <>
                  <section style={{ '--k': 0 } as React.CSSProperties}>
                    <h3>Badge &amp; portique</h3>
                    <div className="card rounded-[18px] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#262422] px-[18px] py-1.5 border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734]">
                      <div className="kv flex justify-between items-center gap-3 py-[11px] border-b border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] text-[13px]">
                        <span className="text-[var(--atr-mut,#6B635C)]">Badge</span>
                        <b className="font-mono text-[13px]">RFID-{activeMember.id.slice(0, 8).toUpperCase()}</b>
                      </div>
                      <div className="kv flex justify-between items-center gap-3 py-[11px] border-b border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] text-[13px]">
                        <span className="text-[var(--atr-mut,#6B635C)]">Statut</span>
                        <span className={`pill inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[12px] font-medium ${statusPillCls}`}>
                          <i className="w-1.5 h-1.5 rounded-full bg-current" />
                          {statusLabel}
                        </span>
                      </div>
                      <div className="kv flex justify-between items-center gap-3 py-[11px] text-[13px]">
                        <span className="text-[var(--atr-mut,#6B635C)]">Séances restantes</span>
                        <b className="font-mono text-[13px]">{remainingSessions}</b>
                      </div>
                    </div>
                    <div className="h-2.5" />
                    <button
                      type="button"
                      onClick={() => onToggleBlock(activeMember)}
                      className="wide w-full h-[42px] border-0 rounded-[12px] bg-[#1B1917] dark:bg-[#F2ECE6] text-white dark:text-[#1B1917] font-semibold text-[13.5px] cursor-pointer"
                    >
                      {isBlocked ? 'Débloquer le badge' : 'Bloquer le badge'}
                    </button>
                  </section>

                  <section style={{ '--k': 1 } as React.CSSProperties}>
                    <h3>Passages récents</h3>
                    <div className="card rounded-[18px] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#262422] px-[18px] py-1.5 border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734]">
                      {[
                        { gate: 'Portique A (Principal)', time: 'Aujourd’hui · 18:42', ok: !isBlocked },
                        { gate: 'Portique B (Musculation)', time: 'Il y a 2 jours · 07:55', ok: true },
                        { gate: 'Portique A (Principal)', time: 'Il y a 4 jours · 19:10', ok: true },
                        { gate: 'Portique B (Musculation)', time: 'Il y a 7 jours · 12:31', ok: true },
                      ].map((p, idx) => (
                        <div
                          key={idx}
                          className="li flex justify-between items-center py-[11px] border-b last:border-b-0 border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] text-[13px]"
                        >
                          <span>
                            <span className="font-medium block">{p.gate}</span>
                            <small className="font-mono text-[11px] text-[var(--atr-mut,#6B635C)]">{p.time}</small>
                          </span>
                          <span
                            className={`pill px-2.5 py-[3px] rounded-full text-[12px] font-medium ${
                              p.ok
                                ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
                                : 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]'
                            }`}
                          >
                            {p.ok ? 'Accepté' : 'Refusé'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section style={{ '--k': 2 } as React.CSSProperties}>
                    <button
                      type="button"
                      onClick={() => onCheckIn(activeMember)}
                      className="wide w-full h-[42px] border-0 rounded-[12px] bg-[var(--atr-acc,#C9441F)] text-white font-semibold text-[13.5px] cursor-pointer"
                    >
                      Enregistrer une présence
                    </button>
                  </section>
                </>
              )}

              {activeTab === 'billing' && (
                <>
                  <section style={{ '--k': 0 } as React.CSSProperties}>
                    <h3>Solde à régler</h3>
                    <div className="card rounded-[18px] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#262422] px-[18px] py-3.5 border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734]">
                      <div
                        className="big font-mono font-bold text-[36px] my-1"
                        style={{
                          color: balanceAmount > 0 ? 'var(--atr-acc, #C9441F)' : 'var(--atr-ok, #0B7A45)',
                        }}
                      >
                        {balanceAmount > 0 ? `${balanceAmount.toLocaleString('en-US')} DZD` : 'Soldé'}
                      </div>
                      {balanceAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => showToast(`Solde encaissé pour ${memberName}`)}
                          className="wide mt-2 w-full h-[42px] border-0 rounded-[12px] bg-[var(--atr-acc,#C9441F)] text-white font-semibold text-[13.5px] cursor-pointer"
                        >
                          Encaisser le solde
                        </button>
                      )}
                    </div>
                  </section>

                  <section style={{ '--k': 1 } as React.CSSProperties}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="!m-0">Factures</h3>
                      <button
                        type="button"
                        onClick={() => showToast(`Nouvelle facture pour ${memberName}`)}
                        className="h-8 px-3 rounded-[9px] border-0 bg-[var(--atr-acc,#C9441F)] text-white font-semibold text-[12px] flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Nouvelle
                      </button>
                    </div>
                    <div className="card rounded-[18px] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#262422] px-[18px] py-1.5 border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734]">
                      {[
                        {
                          ref: `F-26-${activeMember.id.slice(0, 4).toUpperCase()} · ${planName}`,
                          date: memberExp || '2026-11-05',
                          amount: balanceAmount > 0 ? `${balanceAmount.toLocaleString('en-US')} DZD` : '6,500 DZD',
                          paid: balanceAmount === 0,
                        },
                        {
                          ref: `F-26-PREV · Renouvellement`,
                          date: '2026-10-05',
                          amount: '6,500 DZD',
                          paid: true,
                        },
                      ].map((inv, idx) => (
                        <div
                          key={idx}
                          className="li flex justify-between items-center py-[11px] border-b last:border-b-0 border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] text-[13px] gap-2"
                        >
                          <span>
                            <span className="font-medium block">{inv.ref}</span>
                            <small className="font-mono text-[11px] text-[var(--atr-mut,#6B635C)]">{inv.date}</small>
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <b className="font-mono text-[12px]">{inv.amount}</b>
                            <span
                              className={`pill px-2 py-[2px] rounded-full text-[11px] font-medium ${
                                inv.paid
                                  ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
                                  : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
                              }`}
                            >
                              {inv.paid ? 'Payée' : 'À régler'}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>

            {/* FOOTER (.pf) */}
            <div className="pf flex justify-between items-center px-[26px] py-4 border-t border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734]">
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
                className="relative overflow-hidden h-10 px-4 rounded-[12px] border border-[#F5BDB3] dark:border-[#5C2B24] text-[var(--atr-danger,#B8321C)] dark:text-[#FF8D7A] font-semibold text-[13px] flex items-center gap-2 cursor-pointer bg-[#FDE4DF]/45 dark:bg-[#3D1E1A]/40"
              >
                <span
                  ref={holdFillRef}
                  className="absolute inset-0 bg-[#C0283D] pointer-events-none"
                  style={{ clipPath: 'inset(100% 0 0 0)' }}
                />
                <span ref={holdTextWrapRef} className="relative z-10 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span ref={holdLabelRef}>Maintenir pour supprimer</span>
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="fer h-[44px] px-7 border-0 rounded-[12px] bg-[var(--atr-acc,#C9441F)] hover:opacity-95 text-white font-semibold text-[14px] cursor-pointer"
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
