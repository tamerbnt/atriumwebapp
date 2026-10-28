import React, { useState } from 'react';
import {
  Scale,
  CreditCard,
  Printer,
  CheckCircle2,
  ShieldCheck,
  DollarSign,
  Eye,
  Send,
  Lock,
  Unlock,
  Receipt,
  Building2,
  X,
  FileCheck,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useLegalData } from './legalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LegalMatter } from '../../../types';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';

export const LegalTrustView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { matters, updateMatter } = useLegalData();

  const [selectedMatter, setSelectedMatter] = useState<LegalMatter | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'sequestre' | 'honoraires' | 'deontologie'>('sequestre');

  const totalTrust = matters.reduce((acc, m) => acc + (m.trustEscrowBalanceDzd || 0), 0);
  const totalRetainers = matters.reduce((acc, m) => acc + m.retainerAmountDzd, 0);

  const handleReleaseTrustFunds = (matter: LegalMatter) => {
    if (!matter.trustEscrowBalanceDzd || matter.trustEscrowBalanceDzd === 0) {
      showToast(isAr ? 'لا يوجد رصيد ودائع متبقي في هذا الحساب' : 'Aucun fond séquestre à débloquer', 'info');
      return;
    }
    const amount = matter.trustEscrowBalanceDzd;
    const updated: LegalMatter = {
      ...matter,
      trustEscrowBalanceDzd: 0,
    };
    updateMatter(updated);
    if (selectedMatter?.id === matter.id) {
      setSelectedMatter(updated);
    }
    showToast(
      isAr
        ? `تم الإفراج عن الوديعة (${formatMoney(amount, language)}) وتحويلها لحساب الموكل`
        : `Déblocage des fonds séquestre (${formatMoney(amount, language)}) validé par CARPA`,
      'success'
    );
  };

  const getTrustActions = (m: LegalMatter): ActionButtonDef[] => [
    {
      label: isAr ? 'معاينة الحساب' : 'Consulter Compte',
      icon: <Eye size={14} />,
      onClick: () => setSelectedMatter(m),
    },
    {
      label: isAr ? 'إفراج عن الوديعة' : 'Débloquer Séquestre',
      icon: <Unlock size={14} />,
      onClick: () => handleReleaseTrustFunds(m),
    },
    {
      label: isAr ? 'كشف CARPA' : 'Relevé CARPA',
      icon: <Printer size={14} />,
      onClick: () => {
        showToast(
          isAr
            ? `طباعة كشف حساب الوديعة للقضية ${m.matterNumber}`
            : `Génération du relevé officiel CARPA (${m.matterNumber})`,
          'info'
        );
      },
    },
    {
      label: isAr ? 'وصل الأتعاب' : 'Quittance Honoraires',
      icon: <Receipt size={14} />,
      onClick: () => {
        showToast(
          isAr
            ? `تم توليد وصل مخالصة الأتعاب للموكل ${m.clientName}`
            : `Quittance d’honoraires certifiée pour ${m.clientName}`,
          'success'
        );
      },
    },
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <CreditCard size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'حساب الحراسة والودائع والأتعاب (Séquestre)' : 'Compte Séquestre CARPA & Honoraires Avocat'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Ordre des Avocats
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'فصل أموال الموكلين المودعة تحت الحراسة القضائية عن الأتعاب التشغيلية للمكتب'
                : 'Séparation stricte des fonds mandants (séquestre) et des honoraires de diligence'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="outline"
            onClick={() => {
              showToast(isAr ? 'طباعة كشف حساب الودائع CARPA' : 'Relevé séquestre CARPA imprimé', 'info');
              window.print();
            }}
            icon={<Printer size={14} />}
          >
            {isAr ? 'كشف Séquestre' : 'Relevé CARPA'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'إدارة أموال الموكلين والودائع القضائية' : 'Comptabilité des Fonds Mandants & Diligences'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'الفصل المحاسبي الصارم بين أتعاب المحامي والمبالغ المودعة على ذمة الأحكام'
              : 'Fonds séquestre protégés et décomptes d\'honoraires selon déontologie du barreau'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Honoraires */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'أتعاب الدفاع والخدمات' : 'Honoraires & Diligences'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {formatMoney(totalRetainers, language)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {matters.length} {isAr ? 'قضية محصلة' : 'affaires conventionnées'}
              </p>
            </div>
          </div>

          {/* Card 2: Affaires avec séquestre */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'قضايا مودعة تحت الحراسة' : 'Dossiers Sous Séquestre'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {matters.filter((m) => (m.trustEscrowBalanceDzd || 0) > 0).length}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'خاضعة لإشراف نقابة المحامين' : 'Contrôlés sous égide déontologique'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'إجمالي الودائع (Séquestre)' : 'Fonds Séquestre Protégés'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Séquestre CARPA
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalTrust, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {matters.length} {isAr ? 'حساب مصفى' : 'comptes audités'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Collection Area + 390px Inspector Drawer */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
          <UniversalDataCollection<LegalMatter>
            title={isAr ? 'سجل الحسابات والودائع' : 'Relevé des Comptes Séquestres CARPA & Honoraires'}
            subtitle={isAr ? 'متابعة الودائع وتصفية الأموال' : 'Comptes affectés et décomptes déontologiques du barreau'}
            items={matters}
            keyExtractor={(m) => m.id}
            searchPlaceholder={isAr ? 'بحث برقم القضية، الموكل، الموضوع...' : 'Rechercher dossier, client, affaire, CARPA...'}
            searchFilter={(m, query) =>
              m.title.toLowerCase().includes(query.toLowerCase()) ||
              m.clientName.toLowerCase().includes(query.toLowerCase()) ||
              m.matterNumber.toLowerCase().includes(query.toLowerCase()) ||
              (m.assignedLawyer || '').toLowerCase().includes(query.toLowerCase())
            }
            onSelectRow={(m) => setSelectedMatter(m)}
            customActions={(m) => getTrustActions(m)}
            columns={[
              {
                id: 'matterNumber',
                header: isAr ? 'رقم القضية' : 'N° Dossier',
                width: '130px',
                sortable: true,
                renderCell: (m) => (
                  <div className="font-mono font-bold text-xs text-[#C4785A]">
                    {m.matterNumber}
                  </div>
                ),
              },
              {
                id: 'matter',
                header: isAr ? 'الموضوع' : 'Affaire & Objet',
                renderCell: (m) => (
                  <div>
                    <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                      {m.title}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {m.category} · {m.courtJurisdiction || 'Tribunal'}
                    </span>
                  </div>
                ),
              },
              {
                id: 'client',
                header: isAr ? 'الموكل' : 'Client Mandant',
                width: '180px',
                renderCell: (m) => (
                  <div className="text-xs">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 block truncate">
                      {m.clientName}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {m.clientPhone || '0550 00 00 00'}
                    </span>
                  </div>
                ),
              },
              {
                id: 'retainer',
                header: isAr ? 'أتعاب المكتب' : 'Honoraires',
                width: '140px',
                sortable: true,
                renderCell: (m) => (
                  <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                    {formatMoney(m.retainerAmountDzd, language)}
                  </span>
                ),
              },
              {
                id: 'trust',
                header: isAr ? 'رصيد Séquestre' : 'Séquestre CARPA',
                width: '160px',
                sortable: true,
                renderCell: (m) => (
                  <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {formatMoney(m.trustEscrowBalanceDzd || 0, language)}
                  </div>
                ),
              },
              {
                id: 'status',
                header: isAr ? 'الرقابة' : 'Audit CARPA',
                width: '130px',
                renderCell: () => (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 inline-flex items-center gap-1">
                    <ShieldCheck size={11} />
                    {isAr ? 'مطابق ومحمي' : 'Conforme'}
                  </span>
                ),
              },
            ]}
            renderCard={(m) => (
              <div className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded">
                    {m.matterNumber}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Conforme CARPA
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-neutral-900 dark:text-white line-clamp-2">
                    {m.title}
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Client: {m.clientName}
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Honoraires</span>
                    <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                      {formatMoney(m.retainerAmountDzd, language)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 block">Fonds Séquestre</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formatMoney(m.trustEscrowBalanceDzd || 0, language)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          />
        </div>

        {/* 390px Side Inspector Drawer */}
        {selectedMatter && (
          <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
            {/* Inspector Top Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5 font-mono">
                    {selectedMatter.matterNumber}
                  </h3>
                  <p className="text-[10px] text-neutral-500 truncate max-w-[210px]">
                    {selectedMatter.clientName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMatter(null)}
                className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2">
              <button
                onClick={() => setInspectorTab('sequestre')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'sequestre'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'الودائع Séquestre' : 'Séquestre'}
              </button>
              <button
                onClick={() => setInspectorTab('honoraires')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'honoraires'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'الأتعاب والمصاريف' : 'Honoraires'}
              </button>
              <button
                onClick={() => setInspectorTab('deontologie')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                  inspectorTab === 'deontologie'
                    ? 'border-[#C4785A] text-[#C4785A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {isAr ? 'المطابقة النقابية' : 'CARPA & Éthique'}
              </button>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {inspectorTab === 'sequestre' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-neutral-300 text-[11px]">
                      <span>Fonds Mandant Sous Séquestre</span>
                      <span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Inaliénable
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono tracking-tight text-white">
                      {formatMoney(selectedMatter.trustEscrowBalanceDzd || 0, language)}
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      Montant bloqué sur sous-compte CARPA jusqu'à décision judiciaire exécutoire.
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Détails de la Consignation
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Sous-compte CARPA:</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">DZ50 0010 0987 6543</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Bénéficiaire désigné:</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedMatter.clientName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Avocat séquestre:</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedMatter.assignedLawyer}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold block text-neutral-900 dark:text-white">Déblocage de Séquestre</span>
                      <span className="text-[10px] text-neutral-500">Sur présentation du jugement définitif</span>
                    </div>
                    <button
                      onClick={() => handleReleaseTrustFunds(selectedMatter)}
                      disabled={!selectedMatter.trustEscrowBalanceDzd || selectedMatter.trustEscrowBalanceDzd === 0}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#C4785A] hover:bg-[#b06a4e] text-white disabled:opacity-50 transition-colors"
                    >
                      Débloquer
                    </button>
                  </div>
                </div>
              )}

              {inspectorTab === 'honoraires' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Décompte d'Honoraires & Diligences
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Convention d'honoraires:</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {formatMoney(selectedMatter.retainerAmountDzd, language)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Droits de plaidoirie & timbres:</span>
                      <span className="font-mono text-neutral-700 dark:text-neutral-300">12 000 DZD</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-200 dark:border-neutral-800">
                      <span className="font-semibold text-neutral-900 dark:text-white">Total Facturé:</span>
                      <span className="font-mono font-bold text-[#C4785A]">
                        {formatMoney(selectedMatter.retainerAmountDzd + 12000, language)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40 space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                      <CheckCircle2 size={13} />
                      <span>Convention Signée & Enregistrée</span>
                    </div>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      Convention préalable d'honoraires signée contradictoirement avec le client.
                    </p>
                  </div>
                </div>
              )}

              {inspectorTab === 'deontologie' && (
                <div className="space-y-4">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Conformité Déontologique Ordre des Avocats
                    </span>
                    <div className="space-y-1.5 text-neutral-700 dark:text-neutral-300">
                      <div className="flex items-center gap-2">
                        <FileCheck size={14} className="text-emerald-500" />
                        <span>Séparation hermétique des comptes de cabinet</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileCheck size={14} className="text-emerald-500" />
                        <span>Contrôle périodique du Conseil de l'Ordre</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileCheck size={14} className="text-emerald-500" />
                        <span>Traçabilité bancaire et conformité anti-blanchiment</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Inspector Footer Actions */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
              <AtriumButton
                variant="primary"
                className="w-full justify-center"
                icon={<Printer size={14} />}
                onClick={() => {
                  showToast(
                    isAr ? 'جاري طباعة الكشف المالي CARPA' : 'Génération du relevé officiel CARPA',
                    'success'
                  );
                }}
              >
                {isAr ? 'طباعة كشف CARPA المالي' : 'Imprimer Relevé CARPA'}
              </AtriumButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
