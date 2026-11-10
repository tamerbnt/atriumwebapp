import React, { useRef, useEffect, useState } from 'react';
import {
  Pencil,
  Mail,
  Trash2,
  ChevronDown,
  Check,
  Snowflake,
  RefreshCw,
  Pin,
  CreditCard,
  ExternalLink,
  Archive,
  Phone,
  FileText,
} from 'lucide-react';
import { Member } from '../../../types/index';
import { calculateDaysRemaining } from '../../../utils/rules';
import { createSpring, stepSpring, isSpringCalm, clamp, formatDec } from './kineticPhysics';

export interface MemberKineticRowProps {
  member: Member;
  isSelected: boolean;
  isPinned: boolean;
  isExpanded: boolean;
  onToggleSelect: (e: React.MouseEvent) => void;
  onToggleExpand: (e: React.MouseEvent) => void;
  onOpenDetails: (member: Member) => void;
  onEdit: (member: Member) => void;
  onEmail: (member: Member) => void;
  onDelete: (member: Member) => void;
  onArchive: (member: Member) => void;
  onToggleStatus: (member: Member) => void;
  onTogglePin: (member: Member) => void;
  onPay: (member: Member) => void;
}

// Deterministic avatar tone based on member id/name
const getToneColor = (seed: string): { bg: string; text: string } => {
  const tones = [
    { bg: 'bg-[#D946EF]', text: 'text-neutral-900' }, // Magenta
    { bg: 'bg-[#3B82F6]', text: 'text-neutral-900' }, // Blue
    { bg: 'bg-[#E8643F]', text: 'text-white' },       // Terracotta
    { bg: 'bg-[#3CE085]', text: 'text-neutral-900' }, // Green
    { bg: 'bg-[#E8B33F]', text: 'text-neutral-900' }, // Yellow
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
  }
  return tones[Math.abs(hash) % tones.length];
};

export const MemberKineticRow: React.FC<MemberKineticRowProps> = ({
  member,
  isSelected,
  isPinned,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  onOpenDetails,
  onEdit,
  onEmail,
  onDelete,
  onArchive,
  onToggleStatus,
  onTogglePin,
  onPay,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Accordion height spring physics (0 -> 1)
  const springRef = useRef(createSpring(isExpanded ? 1 : 0, 150, 0.7));
  const rafRef = useRef<number>(0);

  useEffect(() => {
    springRef.current.t = isExpanded ? 1 : 0;
    const tick = () => {
      stepSpring(springRef.current, 1 / 120);
      const e = clamp(springRef.current.x, 0, 1.08);
      if (rowRef.current) {
        // H = 72px base, DH = 150px expanded drawer, G = 8px gap
        const h = 72 + 8 + e * (150 + 8);
        rowRef.current.style.height = `${formatDec(h)}px`;
        const dtEl = rowRef.current.querySelector<HTMLElement>('.kinetic-dt');
        if (dtEl) {
          dtEl.style.opacity = formatDec(clamp((e - 0.4) / 0.5, 0, 1));
          dtEl.style.pointerEvents = e > 0.8 ? 'auto' : 'none';
        }
      }
      if (!isSpringCalm(springRef.current)) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        springRef.current.x = springRef.current.t;
        springRef.current.v = 0;
      }
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isExpanded]);

  // Derived member metadata with robust fallbacks
  const memberName = member.fullName || (member as any).name || 'Adhérent';
  const memberPhone = member.phoneNumber || (member as any).phone || '';
  const memberPlan = member.membershipPlanName || (member as any).membershipType || 'Standard Plan';
  const memberExp = member.expirationDate || (member as any).expiryDate || '';
  const daysRemaining = calculateDaysRemaining(false, memberExp);
  const remainingText =
    daysRemaining > 0
      ? `${daysRemaining} j restants`
      : daysRemaining === 0
      ? 'Expire aujourd’hui'
      : 'Expiré';

  const memberInitials = memberName
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const tone = getToneColor(member.id || memberName);

  const formattedBalance = (member as any).balance
    ? `${Math.round((member as any).balance).toLocaleString()} DZD`
    : '0 DZD';

  // Status mapping
  const isBlocked = member.status === 'Suspended' || member.status === 'Banned' || Boolean((member as any).isBlocked);
  const isExp = member.status === 'Expired' || daysRemaining <= 0;

  return (
    <div
      ref={rowRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        height: isExpanded ? '238px' : '80px',
        contain: 'layout style',
      }}
      className={`relative w-full overflow-hidden transition-colors select-none group font-sans ${
        isSelected ? 'kinetic-row-selected' : ''
      }`}
      data-x={isExpanded ? '1' : undefined}
      data-sel={isSelected ? '1' : undefined}
    >
      {/* ================= 72px MAIN SLAB ROW ================= */}
      <div className="absolute left-0 right-0 top-0 h-[72px]">
        {/* Background slab with border and active ring */}
        <div
          className={`absolute inset-0 rounded-[14px] border transition-all duration-150 ${
            isSelected
              ? 'bg-[#E8643F]/10 border-[#E8643F] shadow-[0_0_0_1px_#E8643F] dark:bg-[#E8643F]/15'
              : isPinned
              ? 'bg-white dark:bg-[#1A1A1A] border-amber-400 dark:border-amber-500 shadow-sm'
              : isHovered
              ? 'bg-[#FDFCFA] dark:bg-[#202020] border-neutral-300 dark:border-neutral-700 shadow-sm'
              : 'bg-white dark:bg-[#1A1A1A] border-neutral-200/90 dark:border-neutral-800'
          }`}
        />

        {/* Content grid columns */}
        <div
          onClick={() => onOpenDetails(member)}
          className="absolute inset-0 grid items-center gap-3.5 px-4 pr-[150px] cursor-pointer"
          style={{
            gridTemplateColumns: '22px 40px minmax(200px, 1.5fr) minmax(140px, 1fr) 95px 145px 105px',
          }}
        >
          {/* Col 0: Checkbox */}
          <button
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(e);
            }}
            className={`w-[22px] h-[22px] rounded-[6px] border-[1.5px] grid place-items-center transition-colors cursor-pointer ${
              isSelected
                ? 'bg-[#E8643F] border-[#E8643F] text-white'
                : 'border-neutral-400/80 bg-transparent hover:border-[#E8643F]'
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          {/* Col 1: Avatar */}
          <div
            className={`w-10 h-10 rounded-[12px] grid place-items-center font-bold text-[15px] font-['Barlow_Condensed'] uppercase tracking-wider shrink-0 ${tone.bg} ${tone.text}`}
          >
            {memberInitials}
          </div>

          {/* Col 2: Name + ID & Phone */}
          <div className="flex flex-col min-w-0 pr-2">
            <span className="font-semibold text-[14.5px] text-neutral-900 dark:text-neutral-100 truncate">
              {memberName}
            </span>
            <span className="text-[11.5px] font-mono text-neutral-500 dark:text-neutral-400 truncate">
              ID: {member.id.slice(0, 8)} · {memberPhone || 'Sans tél'}
            </span>
          </div>

          {/* Col 3: Plan */}
          <div className="truncate">
            <span className="inline-block max-w-full px-2.5 py-1 rounded-[8px] bg-[#E8643F]/10 border border-[#E8643F]/40 text-[#E8643F] dark:text-[#F4A07F] text-[12px] font-medium truncate">
              {memberPlan}
            </span>
          </div>

          {/* Col 4: Status */}
          <div className="justify-self-start">
            <span
              className={`inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-[8px] text-[12px] font-semibold ${
                isBlocked
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : isExp
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <i className="w-1.5 h-1.5 rounded-full bg-current" />
              {isBlocked ? 'Bloqué' : isExp ? 'Expiré' : 'Actif'}
            </span>
          </div>

          {/* Col 5: Due Date */}
          <div className="flex flex-col text-[12.5px] leading-tight">
            <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
              {memberExp || 'Non spécifié'}
            </span>
            <small
              className={`text-[11px] ${
                daysRemaining < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : daysRemaining <= 7
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {remainingText}
            </small>
          </div>

          {/* Col 6: Balance */}
          <div className="font-mono text-[13px] font-medium text-neutral-800 dark:text-neutral-200 truncate">
            {formattedBalance}
          </div>
        </div>

        {/* ================= CORNER-FAN HOVER ACTIONS (.act) ================= */}
        {/* Button 2: Edit */}
        <button
          type="button"
          aria-label={`Modifier ${memberName}`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(member);
          }}
          style={{
            transform: isHovered || isExpanded
              ? 'translate(calc(2 * -40px - 44px), 0) scale(1)'
              : 'translate(0, 0) scale(0.7)',
            opacity: isHovered || isExpanded ? 1 : 0,
            visibility: isHovered || isExpanded ? 'visible' : 'hidden',
            transition: 'transform 260ms cubic-bezier(.24,1.34,.38,1) 90ms, opacity 140ms 90ms, scale 160ms',
          }}
          className="absolute top-[18px] right-[18px] z-[2] w-9 h-9 rounded-[11px] bg-[#F6F3F0] dark:bg-[#2A2A2A] text-neutral-700 dark:text-neutral-200 hover:bg-[#E8643F] hover:text-white grid place-items-center transition-colors cursor-pointer border border-neutral-200/50 dark:border-neutral-700"
          title="Modifier l'adhérent"
        >
          <Pencil className="w-4 h-4" />
        </button>

        {/* Button 1: Email / Message */}
        <button
          type="button"
          aria-label={`Écrire à ${memberName}`}
          onClick={(e) => {
            e.stopPropagation();
            onEmail(member);
          }}
          style={{
            transform: isHovered || isExpanded
              ? 'translate(calc(1 * -40px - 44px), 0) scale(1)'
              : 'translate(0, 0) scale(0.7)',
            opacity: isHovered || isExpanded ? 1 : 0,
            visibility: isHovered || isExpanded ? 'visible' : 'hidden',
            transition: 'transform 260ms cubic-bezier(.24,1.34,.38,1) 45ms, opacity 140ms 45ms, scale 160ms',
          }}
          className="absolute top-[18px] right-[18px] z-[2] w-9 h-9 rounded-[11px] bg-[#F6F3F0] dark:bg-[#2A2A2A] text-neutral-700 dark:text-neutral-200 hover:bg-[#E8643F] hover:text-white grid place-items-center transition-colors cursor-pointer border border-neutral-200/50 dark:border-neutral-700"
          title="Écrire à l'adhérent"
        >
          <Mail className="w-4 h-4" />
        </button>

        {/* Button 0: Delete (Red hover) */}
        <button
          type="button"
          aria-label={`Supprimer ${memberName}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(member);
          }}
          style={{
            transform: isHovered || isExpanded
              ? 'translate(-44px, 0) scale(1)'
              : 'translate(0, 0) scale(0.7)',
            opacity: isHovered || isExpanded ? 1 : 0,
            visibility: isHovered || isExpanded ? 'visible' : 'hidden',
            transition: 'transform 260ms cubic-bezier(.24,1.34,.38,1) 0ms, opacity 140ms 0ms, scale 160ms',
          }}
          className="absolute top-[18px] right-[18px] z-[2] w-9 h-9 rounded-[11px] bg-[#F6F3F0] dark:bg-[#2A2A2A] text-neutral-700 dark:text-neutral-200 hover:bg-[#C0283D] hover:text-white grid place-items-center transition-colors cursor-pointer border border-neutral-200/50 dark:border-neutral-700"
          title="Supprimer l'adhérent"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Expand Chevron Button (.rb) */}
        <button
          type="button"
          data-no-liquid="true"
          aria-expanded={isExpanded}
          aria-label={`Aperçu rapide de ${memberName}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(e);
          }}
          style={{
            position: 'absolute',
            top: '18px',
            right: '14px',
            left: 'auto',
            zIndex: 10,
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 240ms cubic-bezier(.2,0,.2,1)',
          }}
          className="rb absolute top-[18px] right-[14px] z-10 w-9 h-9 rounded-[11px] bg-[#F6F3F0] dark:bg-[#2A2A2A] text-neutral-700 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white grid place-items-center transition-colors cursor-pointer border border-neutral-200/50 dark:border-neutral-700"
          title="Aperçu rapide"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* ================= INLINE ACCORDION QUICK DRAWER (.dt) ================= */}
      <div
        className="kinetic-dt absolute left-0 right-0 top-[80px] h-[150px] rounded-[14px] bg-white dark:bg-[#1A1A1A] border border-neutral-200/90 dark:border-neutral-800 grid gap-6 p-4 px-6 box-border opacity-0 select-text"
        style={{
          gridTemplateColumns: '1fr 1.2fr 1.2fr auto',
        }}
      >
        {/* Col 1: Contact */}
        <div>
          <h4 className="m-0 mb-2 font-semibold text-[12.5px] font-['Barlow_Condensed'] tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
            Contact
          </h4>
          <p className="m-0 mb-1 font-mono text-[13px] text-neutral-800 dark:text-neutral-200">
            {memberPhone || 'Non renseigné'}
          </p>
          <p className="m-0 text-[13px] text-neutral-600 dark:text-neutral-400 truncate">
            {member.email || 'Sans email'}
          </p>
          {(member as any).address && (
            <p className="m-0 mt-1 text-[11.5px] text-neutral-400 dark:text-neutral-500 truncate">
              {(member as any).address}
            </p>
          )}
        </div>

        {/* Col 2: Forfait & Séances */}
        <div>
          <h4 className="m-0 mb-2 font-semibold text-[12.5px] font-['Barlow_Condensed'] tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
            Forfait & Séances
          </h4>
          <p className="m-0 mb-1 text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
            {memberPlan}
          </p>
          <p className="m-0 text-[12px] text-neutral-600 dark:text-neutral-400">
            {remainingText}
          </p>
          <p className="m-0 mt-1 font-mono text-[12px] text-neutral-500 dark:text-neutral-400">
            {member.remainingSessions ?? 24} séances disponibles
          </p>
        </div>

        {/* Col 3: Notes du personnel */}
        <div>
          <h4 className="m-0 mb-2 font-semibold text-[12.5px] font-['Barlow_Condensed'] tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
            Notes du personnel
          </h4>
          <p className="m-0 text-[13px] text-neutral-600 dark:text-neutral-400 line-clamp-3 italic">
            {member.notes || 'Aucune note enregistrée pour cet adhérent.'}
          </p>
        </div>

        {/* Col 4: Action Cluster (.db + relocated hover actions) */}
        <div className="flex flex-col justify-between items-end gap-2.5">
          {/* Primary View & Archive */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onArchive(member)}
              className="h-[34px] px-3.5 rounded-[10px] bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-medium text-[12.5px] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              Archiver
            </button>
            <button
              type="button"
              onClick={() => onOpenDetails(member)}
              className="h-[34px] px-4 rounded-[10px] bg-[#E8643F] hover:bg-[#d4522f] text-white font-medium text-[12.5px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir la fiche
            </button>
          </div>

          {/* Dedicated Secondary Action Cluster (Freeze, Pin, Pay) */}
          <div className="flex items-center gap-1.5 p-1 rounded-[10px] bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60">
            {/* Freeze / Reactivate */}
            <button
              type="button"
              onClick={() => onToggleStatus(member)}
              className="h-[28px] px-2.5 rounded-[7px] text-[11.5px] font-medium flex items-center gap-1 text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              title={isBlocked ? 'Débloquer le badge' : 'Bloquer / Geler le badge'}
            >
              {isBlocked ? (
                <>
                  <RefreshCw className="w-3 h-3 text-emerald-500" />
                  <span>Réactiver</span>
                </>
              ) : (
                <>
                  <Snowflake className="w-3 h-3 text-cyan-500" />
                  <span>Geler</span>
                </>
              )}
            </button>

            {/* Pin to Top */}
            <button
              type="button"
              onClick={() => onTogglePin(member)}
              className={`h-[28px] px-2.5 rounded-[7px] text-[11.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer hover:bg-white dark:hover:bg-neutral-700 ${
                isPinned ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-neutral-700 dark:text-neutral-300'
              }`}
              title={isPinned ? 'Détacher' : 'Épingler en haut'}
            >
              <Pin className={`w-3 h-3 ${isPinned ? 'fill-current' : ''}`} />
              <span>{isPinned ? 'Épinglé' : 'Épingler'}</span>
            </button>

            {/* Finance / Pay */}
            <button
              type="button"
              onClick={() => onPay(member)}
              className="h-[28px] px-2.5 rounded-[7px] text-[11.5px] font-medium flex items-center gap-1 text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              title="Encaisser un paiement / Cotisation"
            >
              <CreditCard className="w-3 h-3 text-[#E8643F]" />
              <span>Encaisser</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
