import React, { useState, useEffect, useRef } from 'react';
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
  Copy,
  Check,
  Trash2,
  Receipt,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { Member } from '../../../types/index';
import { calculateDaysRemaining } from '../../../utils/rules';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import {
  createSpring,
  stepSpring,
  isSpringCalm,
  clamp,
  formatDec,
  createWaveVessel,
  WaveVessel,
} from './kineticPhysics';

export interface MemberSlideOverInspectorProps {
  isOpen: boolean;
  member: Member | null;
  allMembers: Member[];
  onClose: () => void;
  onSelectMember: (member: Member) => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
  onCheckIn: (member: Member) => void;
  onRenew: (member: Member) => void;
  onToggleBlock: (member: Member) => void;
  onUpdateNotes: (memberId: string, notes: string) => void;
  showToast: (msg: string) => void;
}

export const MemberSlideOverInspector: React.FC<MemberSlideOverInspectorProps> = ({
  isOpen,
  member,
  allMembers,
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
  const [activeTab, setActiveTab] = useState<'overview' | 'access' | 'billing'>('overview');
  const [notesText, setNotesText] = useState(member?.notes || '');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Sync notes when member changes
  useEffect(() => {
    if (member) {
      setNotesText(member.notes || '');
    }
  }, [member?.id, member?.notes]);

  // Drawer slide spring (x: 0 -> 1)
  const drawerSpring = useRef(createSpring(isOpen ? 1 : 0, 160, 0.65));
  const drawerPanelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Liquid wave vessels for remaining days and sessions
  const v1Ref = useRef<WaveVessel>(createWaveVessel(0.6));
  const v2Ref = useRef<WaveVessel>(createWaveVessel(0.8));
  const [v1Path, setV1Path] = useState('');
  const [v2Path, setV2Path] = useState('');

  // Hold-to-delete spring physics
  const holdSpring = useRef(createSpring(0, 40, 0.85));
  const isHoldingRef = useRef(false);
  const holdBtnRef = useRef<HTMLButtonElement>(null);
  const [holdProgress, setHoldProgress] = useState(0);

  // Animation RAF loop with sleep governor
  const rafId = useRef<number>(0);

  // Update wave levels when member changes
  useEffect(() => {
    if (!member) return;
    const expDate = member.expirationDate || (member as any).expiryDate;
    const days = calculateDaysRemaining(false, expDate);
    const planName = member.membershipPlanName || (member as any).membershipType || '';
    const planDays = planName.toLowerCase().includes('year') ? 365 : planName.toLowerCase().includes('quarter') ? 90 : 30;
    const daysRatio = clamp(days / planDays, 0, 1);
    const sessions = member.remainingSessions ?? 24;
    const sessionsRatio = clamp(sessions / 30, 0, 1);

    v1Ref.current.level.t = daysRatio;
    v2Ref.current.level.t = sessionsRatio;
    v1Ref.current.poke(30);
    v2Ref.current.poke(30);
  }, [member?.id, member?.expirationDate, (member as any)?.expiryDate]);

  useEffect(() => {
    drawerSpring.current.t = isOpen ? 1 : 0;

    let isRunning = true;
    const tick = () => {
      if (!isRunning) return;

      // 1. Drawer slide spring
      stepSpring(drawerSpring.current, 1 / 120);
      const x = clamp(drawerSpring.current.x, 0, 1);
      if (drawerPanelRef.current) {
        drawerPanelRef.current.style.transform = `translateX(${(1 - x) * 100}%)`;
      }
      if (backdropRef.current) {
        backdropRef.current.style.opacity = formatDec(x);
      }

      // 2. Liquid wave vessels
      v1Ref.current.tick(1 / 120);
      v2Ref.current.tick(1 / 120);
      setV1Path(v1Ref.current.computeSvgPath(44, 64));
      setV2Path(v2Ref.current.computeSvgPath(44, 64));

      // 3. Hold to delete progress
      holdSpring.current.t = isHoldingRef.current ? 1 : 0;
      stepSpring(holdSpring.current, 1 / 120);
      const hp = clamp(holdSpring.current.x, 0, 1.02);
      setHoldProgress(hp);

      if (isHoldingRef.current && hp > 0.96) {
        isHoldingRef.current = false;
        holdSpring.current.x = 0;
        holdSpring.current.t = 0;
        if (member) {
          onDelete(member);
          onClose();
        }
      }

      // Check if animation is settled
      const isDrawerSettled = isSpringCalm(drawerSpring.current);
      const isV1Settled = v1Ref.current.isSettled();
      const isV2Settled = v2Ref.current.isSettled();
      const isHoldSettled = isSpringCalm(holdSpring.current) && !isHoldingRef.current;

      if (!isDrawerSettled || !isV1Settled || !isV2Settled || !isHoldSettled || isOpen) {
        rafId.current = requestAnimationFrame(tick);
      }
    };

    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(tick);

    return () => {
      isRunning = false;
      cancelAnimationFrame(rafId.current);
    };
  }, [isOpen, member?.id]);

  if (!isOpen && isSpringCalm(drawerSpring.current) && drawerSpring.current.x <= 0.01) {
    return null;
  }

  if (!member) return null;

  // Calculate member relative days
  const memberName = member.fullName || (member as any).name || 'Adhérent';
  const memberPhone = member.phoneNumber || (member as any).phone || '';
  const memberExp = member.expirationDate || (member as any).expiryDate || '';
  const memberPlan = member.membershipPlanName || (member as any).membershipType || 'Standard Plan';
  const daysRemaining = calculateDaysRemaining(false, memberExp);
  const remainingDaysDisplay =
    daysRemaining > 0
      ? `${daysRemaining} jours`
      : daysRemaining === 0
      ? 'Expire aujourd’hui'
      : 'Expiré';
  const remainingSessions = member.remainingSessions ?? 24;
  const isBlocked = member.status === 'Suspended' || member.status === 'Banned' || Boolean((member as any).isBlocked);

  // Previous / Next Member Navigation
  const currentIndex = allMembers.findIndex((m) => m.id === member.id);
  const handleStep = (delta: number) => {
    if (allMembers.length < 2) return;
    const nextIndex = (currentIndex + delta + allMembers.length) % allMembers.length;
    onSelectMember(allMembers[nextIndex]);
  };

  // Copy helper
  const handleCopy = (text: string, fieldKey: string) => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
    } catch {}
    setCopiedField(fieldKey);
    showToast(`Copié : ${text}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const memberInitials = memberName
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-hidden font-sans select-none"
      style={{
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
    >
      {/* Frosted / Dim Backdrop */}
      <div
        ref={backdropRef}
        onClick={onClose}
        className="absolute inset-0 bg-[#0A0806]/50 dark:bg-black/60 transition-opacity duration-200"
        style={{ opacity: 0 }}
      />

      {/* 560px Slide-Over Panel (.sp) */}
      <aside
        ref={drawerPanelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-drawer-title"
        style={{ transform: 'translateX(100%)' }}
        className="absolute right-0 top-0 bottom-0 w-[560px] max-w-[100vw] bg-white dark:bg-[#1A1A1A] border-l border-neutral-200/90 dark:border-neutral-800 shadow-[-24px_0_60px_rgba(0,0,0,0.3)] flex flex-col rounded-l-[18px] overflow-hidden"
      >
        {/* ================= HEADER (.sh) ================= */}
        <div className="flex gap-4 items-center p-6 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
          {/* 56px Avatar */}
          <div className="w-14 h-14 rounded-[16px] bg-[#E8643F] text-white font-bold text-[22px] font-['Barlow_Condensed'] grid place-items-center uppercase tracking-wider shrink-0 shadow-sm">
            {memberInitials}
          </div>

          {/* Member Name & Badges */}
          <div className="flex-1 min-w-0">
            <h2
              id="member-drawer-title"
              className="m-0 font-bold text-[32px] leading-tight font-['Barlow_Condensed'] uppercase tracking-wide text-neutral-900 dark:text-neutral-100 truncate"
            >
              {memberName}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-block px-2.5 py-0.5 rounded-[8px] bg-[#E8643F]/10 border border-[#E8643F]/30 text-[#E8643F] dark:text-[#F4A07F] text-[12px] font-medium truncate">
                {memberPlan}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="w-3 h-3" />
                Adhérent vérifié
              </span>
            </div>
            <small className="block mt-1 font-mono text-[11.5px] text-neutral-500 dark:text-neutral-400">
              ID: RFID-{member.id.slice(0, 8).toUpperCase()}
            </small>
          </div>

          {/* Header Controls: Prev, Next, Close */}
          <div className="flex items-center gap-1.5 self-start shrink-0">
            <button
              type="button"
              onClick={() => handleStep(-1)}
              aria-label="Adhérent précédent"
              title="Adhérent précédent"
              className="w-9 h-9 rounded-[10px] border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 grid place-items-center transition-colors cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleStep(1)}
              aria-label="Adhérent suivant"
              title="Adhérent suivant"
              className="w-9 h-9 rounded-[10px] border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 grid place-items-center transition-colors cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              title="Fermer"
              className="w-9 h-9 rounded-[10px] border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 text-neutral-700 dark:text-neutral-300 grid place-items-center transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= TAB SWITCHER (Atrium Branded Switcher Toggle) ================= */}
        <div className="px-6 py-3 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40">
          <LiveSegmentedControl
            size="md"
            className="w-full flex [&>button]:flex-1"
            options={[
              { value: 'overview', label: 'Aperçu & Forfait' },
              { value: 'access', label: 'Accès & Séances' },
              { value: 'billing', label: 'Ventes & Factures' },
            ]}
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as any)}
            aria-label="Navigation dossier adhérent"
          />
        </div>

        {/* ================= SCROLLABLE TAB CONTENT ================= */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 select-text">
          {/* TAB 1: APERÇU & FORFAIT */}
          {activeTab === 'overview' && (
            <>
              {/* 4 Quick Action Tiles (.tl4) */}
              <div>
                <h3 className="m-0 mb-2.5 font-semibold text-[12px] font-['Barlow_Condensed'] tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
                  Actions rapides
                </h3>
                <div className="grid grid-cols-4 gap-2.5">
                  {/* Action 1: Enregistrer passage (Primary Orange) */}
                  <button
                    type="button"
                    onClick={() => {
                      onCheckIn(member);
                      v2Ref.current.poke(40);
                    }}
                    className="flex flex-col items-center justify-center gap-2 h-[84px] rounded-[14px] bg-[#E8643F] text-white hover:bg-[#d4522f] transition-colors p-2 text-center cursor-pointer shadow-sm group"
                  >
                    <UserCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-[11.5px] font-semibold leading-tight">
                      Enregistrer passage
                    </span>
                  </button>

                  {/* Action 2: Modifier */}
                  <button
                    type="button"
                    onClick={() => onEdit(member)}
                    className="flex flex-col items-center justify-center gap-2 h-[84px] rounded-[14px] bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 hover:border-[#E8643F] text-neutral-800 dark:text-neutral-200 transition-colors p-2 text-center cursor-pointer"
                  >
                    <Pencil className="w-5 h-5 text-[#E8643F]" />
                    <span className="text-[11.5px] font-medium leading-tight">
                      Modifier
                    </span>
                  </button>

                  {/* Action 3: Bloquer / Débloquer badge */}
                  <button
                    type="button"
                    onClick={() => onToggleBlock(member)}
                    className="flex flex-col items-center justify-center gap-2 h-[84px] rounded-[14px] bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 hover:border-amber-500 text-neutral-800 dark:text-neutral-200 transition-colors p-2 text-center cursor-pointer"
                  >
                    {isBlocked ? (
                      <Unlock className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Lock className="w-5 h-5 text-amber-500" />
                    )}
                    <span className="text-[11.5px] font-medium leading-tight">
                      {isBlocked ? 'Débloquer badge' : 'Bloquer badge'}
                    </span>
                  </button>

                  {/* Action 4: Renouveler abonnement */}
                  <button
                    type="button"
                    onClick={() => {
                      onRenew(member);
                      v1Ref.current.poke(40);
                    }}
                    className="flex flex-col items-center justify-center gap-2 h-[84px] rounded-[14px] bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-700 hover:border-[#E8643F] text-neutral-800 dark:text-neutral-200 transition-colors p-2 text-center cursor-pointer"
                  >
                    <RotateCcw className="w-5 h-5 text-[#E8643F]" />
                    <span className="text-[11.5px] font-medium leading-tight">
                      Renouveler abonnement
                    </span>
                  </button>
                </div>
              </div>

              {/* 2 Dynamic Liquid Wave Vessels (.sub) */}
              <div className="flex gap-5 p-4 rounded-[14px] bg-[#F6F3F0] dark:bg-[#232323] border border-neutral-200/80 dark:border-neutral-800 items-center">
                {/* Vessel 1: Jours restants */}
                <div className="flex items-center gap-3.5 flex-1">
                  <svg
                    className="w-[44px] h-[64px] shrink-0"
                    viewBox="0 0 44 64"
                    aria-hidden="true"
                  >
                    <defs>
                      <clipPath id="vessel-clip-1">
                        <rect x="1" y="1" width="42" height="62" rx="6" />
                      </clipPath>
                    </defs>
                    <g clipPath="url(#vessel-clip-1)">
                      <path
                        className="fill-[#E8643F]"
                        d={v1Path || 'M0 64L0 32L44 32L44 64Z'}
                      />
                    </g>
                    <rect
                      x="1"
                      y="1"
                      width="42"
                      height="62"
                      rx="6"
                      className="fill-none stroke-neutral-400 dark:stroke-neutral-600 stroke-[1.5]"
                    />
                  </svg>
                  <div>
                    <small className="block text-neutral-500 dark:text-neutral-400 text-[12px]">
                      Jours restants
                    </small>
                    <b className="block font-bold text-[30px] leading-tight font-['Barlow_Condensed'] text-neutral-900 dark:text-neutral-100">
                      {remainingDaysDisplay}
                    </b>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-[1px] h-12 bg-neutral-300 dark:bg-neutral-700" />

                {/* Vessel 2: Séances restantes */}
                <div className="flex items-center gap-3.5 flex-1">
                  <svg
                    className="w-[44px] h-[64px] shrink-0"
                    viewBox="0 0 44 64"
                    aria-hidden="true"
                  >
                    <defs>
                      <clipPath id="vessel-clip-2">
                        <rect x="1" y="1" width="42" height="62" rx="6" />
                      </clipPath>
                    </defs>
                    <g clipPath="url(#vessel-clip-2)">
                      <path
                        className="fill-[#E8643F]"
                        d={v2Path || 'M0 64L0 20L44 20L44 64Z'}
                      />
                    </g>
                    <rect
                      x="1"
                      y="1"
                      width="42"
                      height="62"
                      rx="6"
                      className="fill-none stroke-neutral-400 dark:stroke-neutral-600 stroke-[1.5]"
                    />
                  </svg>
                  <div>
                    <small className="block text-neutral-500 dark:text-neutral-400 text-[12px]">
                      Séances restantes
                    </small>
                    <b className="block font-bold text-[30px] leading-tight font-['Barlow_Condensed'] text-neutral-900 dark:text-neutral-100">
                      {remainingSessions} séances
                    </b>
                  </div>
                </div>
              </div>

              {/* Plan Summary Card (.cardp) */}
              <div className="rounded-[14px] bg-[#F6F3F0] dark:bg-[#232323] border border-neutral-200/80 dark:border-neutral-800 px-4 py-2">
                <div className="flex justify-between items-center py-2.5 border-b border-neutral-200/70 dark:border-neutral-800 text-[13px]">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Formule d’abonnement
                  </span>
                  <b className="text-neutral-900 dark:text-neutral-100 font-semibold">
                    {memberPlan}
                  </b>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-neutral-200/70 dark:border-neutral-800 text-[13px]">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Date d’échéance
                  </span>
                  <b className="font-mono text-neutral-900 dark:text-neutral-100 font-semibold">
                    {memberExp || 'Non spécifiée'}
                  </b>
                </div>
                <div className="flex justify-between items-center py-2.5 text-[13px]">
                  <span className="text-neutral-500 dark:text-neutral-400">Solde</span>
                  <b className="font-mono text-neutral-900 dark:text-neutral-100 font-semibold">
                    {Math.round((member as any).balance || 0).toLocaleString()} DZD
                  </b>
                </div>
              </div>

              {/* Contact & Accès with Copy Buttons */}
              <div>
                <h3 className="m-0 mb-2 font-semibold text-[12px] font-['Barlow_Condensed'] tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
                  Contact & accès
                </h3>
                <div className="rounded-[14px] bg-[#F6F3F0] dark:bg-[#232323] border border-neutral-200/80 dark:border-neutral-800 px-4 py-2">
                  {/* Phone */}
                  <div className="flex justify-between items-center py-2 border-b border-neutral-200/70 dark:border-neutral-800 text-[13px]">
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {memberPhone || 'Non renseigné'}
                    </span>
                    {memberPhone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(memberPhone, 'phone')}
                        className="w-8 h-8 rounded-[8px] hover:bg-[#E8643F]/15 grid place-items-center text-neutral-500 hover:text-[#E8643F] transition-colors cursor-pointer"
                        title="Copier le téléphone"
                      >
                        {copiedField === 'phone' ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex justify-between items-center py-2 border-b border-neutral-200/70 dark:border-neutral-800 text-[13px]">
                    <span className="text-neutral-800 dark:text-neutral-200 truncate">
                      {member.email || 'Sans email'}
                    </span>
                    {member.email && (
                      <button
                        type="button"
                        onClick={() => handleCopy(member.email, 'email')}
                        className="w-8 h-8 rounded-[8px] hover:bg-[#E8643F]/15 grid place-items-center text-neutral-500 hover:text-[#E8643F] transition-colors cursor-pointer"
                        title="Copier l'email"
                      >
                        {copiedField === 'email' ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* RFID Identifier */}
                  <div className="flex justify-between items-center py-2 text-[13px]">
                    <span className="font-mono text-[12px] text-neutral-500 dark:text-neutral-400">
                      RFID UID: {member.id.slice(0, 12)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(member.id, 'rfid')}
                      className="w-8 h-8 rounded-[8px] hover:bg-[#E8643F]/15 grid place-items-center text-neutral-500 hover:text-[#E8643F] transition-colors cursor-pointer"
                      title="Copier le tag RFID"
                    >
                      {copiedField === 'rfid' ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes du personnel */}
              <div>
                <h3 className="m-0 mb-2 font-semibold text-[12px] font-['Barlow_Condensed'] tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
                  Notes du personnel
                </h3>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  onBlur={() => {
                    if (member) {
                      onUpdateNotes(member.id, notesText.trim());
                      showToast('Note enregistrée');
                    }
                  }}
                  placeholder="Ajouter une note relative à cet adhérent…"
                  rows={3}
                  className="w-full p-3 rounded-[12px] bg-[#F6F3F0] dark:bg-[#232323] border border-neutral-200/80 dark:border-neutral-800 text-[13.5px] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-[#E8643F] resize-none"
                />
              </div>
            </>
          )}

          {/* TAB 2: ACCÈS & SÉANCES */}
          {activeTab === 'access' && (
            <div className="flex flex-col gap-3">
              <h3 className="m-0 font-semibold text-[12px] font-['Barlow_Condensed'] tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
                Passages récents au portique
              </h3>

              <div className="flex flex-col gap-2">
                {[
                  {
                    gate: 'Entrée portique A (Principal)',
                    time: 'Aujourd’hui · 18:42',
                    status: 'Autorisé',
                  },
                  {
                    gate: 'Entrée portique A (Principal)',
                    time: 'Il y a 2 jours · 07:58',
                    status: 'Autorisé',
                  },
                  {
                    gate: 'Entrée portique B (Musculation)',
                    time: 'Il y a 4 jours · 17:10',
                    status: 'Autorisé',
                  },
                  {
                    gate: 'Entrée portique A (Principal)',
                    time: 'Il y a 6 jours · 19:05',
                    status: 'Autorisé',
                  },
                ].map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 rounded-[12px] bg-[#F6F3F0] dark:bg-[#232323] border border-neutral-200/80 dark:border-neutral-800 text-[13px]"
                  >
                    <div>
                      <b className="block text-neutral-900 dark:text-neutral-100 font-semibold">
                        {entry.gate}
                      </b>
                      <small className="block font-mono text-[11.5px] text-neutral-500 dark:text-neutral-400">
                        {entry.time}
                      </small>
                    </div>
                    <span className="px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      {entry.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: VENTES & FACTURES */}
          {activeTab === 'billing' && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h3 className="m-0 font-semibold text-[12px] font-['Barlow_Condensed'] tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
                  Factures & Cotisations
                </h3>
                <button
                  type="button"
                  onClick={() => showToast(`Nouvelle facture pour ${member.fullName}`)}
                  className="h-8 px-3 rounded-[8px] bg-[#E8643F] hover:bg-[#d4522f] text-white font-medium text-[12px] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Créer une facture
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {[
                  {
                    ref: 'Facture 0412 · Abonnement',
                    date: member.expirationDate || '2026-11-05',
                    amount: '6,500 DZD',
                  },
                  {
                    ref: 'Facture 0388 · Boisson / Boutique',
                    date: '2026-10-18',
                    amount: '400 DZD',
                  },
                  {
                    ref: 'Facture 0351 · Renouvellement',
                    date: '2026-10-05',
                    amount: '6,500 DZD',
                  },
                ].map((inv, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 rounded-[12px] bg-[#F6F3F0] dark:bg-[#232323] border border-neutral-200/80 dark:border-neutral-800 text-[13px]"
                  >
                    <div>
                      <b className="block text-neutral-900 dark:text-neutral-100 font-semibold">
                        {inv.ref}
                      </b>
                      <small className="block font-mono text-[11.5px] text-neutral-500 dark:text-neutral-400">
                        {inv.date}
                      </small>
                    </div>
                    <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                      {inv.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================= FOOTER (.sf) ================= */}
        <div className="flex justify-between items-center p-4 px-6 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-[#1A1A1A]">
          {/* Spring "Hold to Delete" Button */}
          <button
            ref={holdBtnRef}
            type="button"
            onPointerDown={() => {
              isHoldingRef.current = true;
            }}
            onPointerUp={() => {
              isHoldingRef.current = false;
            }}
            onPointerLeave={() => {
              isHoldingRef.current = false;
            }}
            onPointerCancel={() => {
              isHoldingRef.current = false;
            }}
            onClick={(e) => {
              // Immediate confirmation on keyboard activation
              if (e.detail === 0 && member) {
                onDelete(member);
                onClose();
              }
            }}
            aria-label="Maintenir pour supprimer l'adhérent"
            className="relative overflow-hidden h-10 px-4 rounded-[12px] border border-rose-500/40 text-rose-600 dark:text-rose-400 font-medium text-[13px] flex items-center gap-2 cursor-pointer transition-colors bg-rose-50/40 dark:bg-rose-950/20"
          >
            {/* Red progressive fill clip-path */}
            <span
              className="absolute inset-0 bg-[#C0283D] pointer-events-none transition-none"
              style={{
                clipPath: `inset(${(1 - holdProgress) * 100}% 0 0 0)`,
              }}
            />
            {/* Button text on top */}
            <span
              className="relative z-10 flex items-center gap-2 transition-colors"
              style={{
                color: holdProgress > 0.4 ? '#FFFFFF' : undefined,
              }}
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {holdProgress > 0.1
                  ? 'Maintenez…'
                  : 'Maintenir pour supprimer'}
              </span>
            </span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-6 rounded-[12px] bg-[#E8643F] hover:bg-[#d4522f] text-white font-semibold text-[13.5px] transition-colors cursor-pointer shadow-sm"
          >
            Fermer
          </button>
        </div>
      </aside>
    </div>,
    document.body
  );
};
