import { useState, useEffect } from 'react';
import { LegalMatter, LegalHearing } from '../../../types';

const INITIAL_MATTERS: LegalMatter[] = [
  {
    id: 'mat_01',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    matterNumber: 'DOS-2026-0091',
    title: 'Contentieux Commercial / Recouvrement Créance SARL Atlas c/ SPA BTP',
    category: 'Commercial',
    clientName: 'SARL Atlas Distribution',
    clientPhone: '0555 88 99 00',
    adversePartyName: 'SPA BTP Méditerranée',
    courtJurisdiction: 'Tribunal de Commerce de Sidi M\'Hamed, Alger',
    assignedLawyer: 'Maître Y. Cherif (Avocat à la Cour)',
    retainerAmountDzd: 250000,
    trustEscrowBalanceDzd: 1200000,
    status: 'PendingHearing',
    nextHearingDate: '2026-05-22',
    createdAt: '2026-05-01T08:00:00Z',
  },
  {
    id: 'mat_02',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    matterNumber: 'DOS-2026-0092',
    title: 'Règlement Successoral & Partage Immobilier Famille Mansouri',
    category: 'Civil',
    clientName: 'Héritiers Feu Hadj Mansouri',
    clientPhone: '0661 44 55 66',
    courtJurisdiction: 'Cour d\'Alger, Section Statut Personnel',
    assignedLawyer: 'Maître L. Boumediene (Notaire & Avocat)',
    retainerAmountDzd: 180000,
    trustEscrowBalanceDzd: 8500000,
    status: 'Active',
    nextHearingDate: '2026-06-05',
    createdAt: '2026-05-04T09:00:00Z',
  },
];

const INITIAL_HEARINGS: LegalHearing[] = [
  {
    id: 'hear_01',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    matterId: 'mat_01',
    matterTitle: 'Contentieux Commercial / Recouvrement Créance SARL Atlas c/ SPA BTP',
    hearingDate: '2026-05-22',
    hearingTime: '09:30',
    courtName: 'Tribunal de Sidi M\'Hamed (Chambre Commerciale 2)',
    benchJudge: 'Président Benalia',
    purpose: 'Plaidoirie sur le fond & communication de pièces contradictoires',
    resultSummary: 'En attente d\'audience',
    isCompleted: false,
  },
];

export const useLegalData = () => {
  const [matters, setMatters] = useState<LegalMatter[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_legal_matters');
      return saved ? JSON.parse(saved) : INITIAL_MATTERS;
    } catch {
      return INITIAL_MATTERS;
    }
  });

  const [hearings, setHearings] = useState<LegalHearing[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_legal_hearings');
      return saved ? JSON.parse(saved) : INITIAL_HEARINGS;
    } catch {
      return INITIAL_HEARINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('atrium_legal_matters', JSON.stringify(matters));
    } catch {}
  }, [matters]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_legal_hearings', JSON.stringify(hearings));
    } catch {}
  }, [hearings]);

  const addMatter = (matter: LegalMatter) => {
    setMatters((prev) => [matter, ...prev]);
  };

  const addHearing = (hearing: LegalHearing) => {
    setHearings((prev) => [hearing, ...prev]);
  };

  return {
    matters,
    hearings,
    addMatter,
    addHearing,
  };
};
