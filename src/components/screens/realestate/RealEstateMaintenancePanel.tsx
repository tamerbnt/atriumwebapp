import React, { useMemo, useState } from 'react';
import { CheckCircle2, Plus, Wrench, X } from 'lucide-react';
import type {
  RealEstateLease,
  RealEstateMaintenanceTicket,
  RealEstateOwnerLedgerEntry,
  RealEstateProperty,
} from '../../../types/index';
import { formatRealEstateSequentialCode } from '../../../utils/realEstateDepth';
import { formatMoney } from '../../../utils/rules';
import {
  selectCurrentBranchFromState,
  selectCurrentBusinessFromState,
  shallowEqualObjects,
  showToast,
  useAtriumSelector,
} from '../../../services/store';
import { ScreenPod } from '../../ui/kinetic/ScreenPod';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { EmptyState } from '../../../atrium/components/EmptyState';

export interface RealEstateMaintenancePanelProps {
  tickets: RealEstateMaintenanceTicket[];
  properties: RealEstateProperty[];
  leases: RealEstateLease[];
  ownerLedger: RealEstateOwnerLedgerEntry[];
  onAddTicket: (ticket: RealEstateMaintenanceTicket) => void;
  onUpdateTicket: (ticket: RealEstateMaintenanceTicket) => void;
}

export const RealEstateMaintenancePanel: React.FC<RealEstateMaintenancePanelProps> = ({
  tickets,
  properties,
  leases,
  ownerLedger,
  onAddTicket,
  onUpdateTicket,
}) => {
  const { account, currentBusiness, currentBranch, currentUser, language } = useAtriumSelector(
    (s) => ({
      account: s.account,
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      currentUser: s.currentUser,
      language: s.language,
    }),
    shallowEqualObjects
  );

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [propertyId, setPropertyId] = useState(() => properties[0]?.id || '');
  const [category, setCategory] = useState<RealEstateMaintenanceTicket['category']>('Plumbing');
  const [priority, setPriority] = useState<RealEstateMaintenanceTicket['priority']>('Medium');
  const [chargeTarget, setChargeTarget] = useState<RealEstateMaintenanceTicket['chargeTarget']>('Owner');
  const [title, setTitle] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [estimatedCostDzd, setEstimatedCostDzd] = useState('15000');

  const ownerDebitsTotal = useMemo(
    () =>
      ownerLedger
        .filter((e) => e.entryType === 'MaintenanceDebit')
        .reduce((sum, e) => sum + Number(e.amountDzd || 0), 0),
    [ownerLedger]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find((p) => p.id === propertyId) || properties[0];
    if (!prop || !title.trim()) {
      showToast(L('Select property and enter issue title.', 'Sélectionnez le bien et décrivez le sinistre.', 'اختر العقار وأدخل وصف العطل.'), 'warning');
      return;
    }

    const activeLease = leases.find((l) => l.propertyId === prop.id && l.status === 'Active');
    const nowIso = new Date().toISOString();
    const ticketNumber = formatRealEstateSequentialCode(
      'MTK',
      tickets.map((t) => t.ticketNumber)
    );

    const ticket: RealEstateMaintenanceTicket = {
      id: `mtk_${Date.now()}`,
      accountId: prop.accountId || currentBranch?.accountId || account.id || '',
      businessId: currentBusiness?.id || prop.businessId || '',
      branchId: currentBranch?.id || prop.branchId || '',
      staffId: currentUser?.id || '',
      ticketNumber,
      propertyId: prop.id,
      propertyTitle: prop.title,
      leaseId: activeLease?.id,
      ownerName: prop.ownerName,
      tenantName: activeLease?.tenantName,
      category,
      priority,
      title: title.trim(),
      vendorName: vendorName.trim() || undefined,
      vendorPhone: vendorPhone.trim() || undefined,
      estimatedCostDzd: Math.max(0, Number(estimatedCostDzd) || 0),
      actualCostDzd: Math.max(0, Number(estimatedCostDzd) || 0),
      chargeTarget,
      status: 'Open',
      reportedAt: nowIso.slice(0, 10),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    onAddTicket(ticket);
    setTitle('');
    setVendorName('');
    setVendorPhone('');
    setIsModalOpen(false);
    showToast(
      chargeTarget === 'Owner'
        ? L(`Ticket ${ticketNumber} logged & Owner ledger debited.`, `Ticket ${ticketNumber} créé & imputé au grand livre bailleur.`, `تم تسجيل التذكرة ${ticketNumber} وخصمها من حساب المالك.`)
        : L(`Ticket ${ticketNumber} logged.`, `Ticket ${ticketNumber} enregistré.`, `تم تسجيل التذكرة ${ticketNumber}.`),
      'success'
    );
  };

  const handleResolve = (t: RealEstateMaintenanceTicket) => {
    onUpdateTicket({
      ...t,
      status: 'Resolved',
      resolvedAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
    });
    showToast(L(`Ticket ${t.ticketNumber} resolved.`, `Ticket ${t.ticketNumber} clôturé.`, `تم إغلاق التذكرة ${t.ticketNumber}.`), 'success');
  };

  return (
    <ScreenPod>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="t-pod font-semibold text-black dark:text-white flex items-center gap-2">
              <Wrench size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
              <span>{L('Maintenance Tickets & Owner Chargebacks', 'Sinistres, Travaux & Imputation Bailleur', 'تذاكر الصيانة والخصم على الملاك')}</span>
            </h2>
            <p className="t-cap text-black/55 dark:text-white/60 mt-0.5">
              {L(
                'Owner-imputed repairs automatically debit the Landlord Ledger before payout.',
                'Les travaux imputés au bailleur débitent automatiquement son grand livre avant reversement.',
                'تخصم تكاليف الصيانة المحملة على المالك تلقائياً من كشف حسابه قبل التحويل.'
              )}
            </p>
          </div>
          <AtriumButton variant="primary" size="sm" icon={<Plus size={15} />} onClick={() => setIsModalOpen(true)}>
            {L('New Maintenance Ticket', 'Nouveau Ticket Travaux', 'تذكرة صيانة جديدة')}
          </AtriumButton>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
          <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <span className="t-cap text-black/55 dark:text-white/60 block">{L('Open / Active Tickets', 'Tickets Actifs', 'التذاكر النشطة')}</span>
            <span className="t-card font-semibold text-black dark:text-white">
              {tickets.filter((t) => t.status !== 'Resolved' && t.status !== 'Closed').length}
            </span>
          </div>
          <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <span className="t-cap text-black/55 dark:text-white/60 block">{L('Total Tickets', 'Total Interventions', 'إجمالي التذاكر')}</span>
            <span className="t-card font-semibold text-black dark:text-white">{tickets.length}</span>
          </div>
          <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <span className="t-cap text-black/55 dark:text-white/60 block">{L('Owner Ledger Debits', 'Débits Imputés Bailleurs', 'خصومات حسابات الملاك')}</span>
            <span className="t-card font-semibold text-amber-700 dark:text-amber-400">{formatMoney(ownerDebitsTotal, language)}</span>
          </div>
        </div>

        {tickets.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={<Wrench />}
            title={L('No maintenance tickets logged', 'Aucun ticket de maintenance', 'لا توجد تذاكر صيانة')}
            description={L('Log a repair ticket and assign cost responsibility.', 'Enregistrez une intervention technique et son imputation.', 'سجل طلباً للصيانة وحدد جهة التحمل.')}
          />
        ) : (
          <div data-sq="table" data-sq-border="solid" className="overflow-x-auto bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <table className="w-full text-left rtl:text-right t-cap">
              <thead className="bg-[#F5F1EC] dark:bg-[#191716] border-b border-[var(--atr-divider)] text-black/55 dark:text-white/55">
                <tr>
                  <th className="py-2 px-3">{L('Ticket', 'Ticket', 'التذكرة')}</th>
                  <th className="py-2 px-3">{L('Property / Owner', 'Bien / Bailleur', 'العقار / المالك')}</th>
                  <th className="py-2 px-3">{L('Vendor', 'Prestataire', 'المقاول')}</th>
                  <th className="py-2 px-3">{L('Imputation', 'Imputation', 'التحمل')}</th>
                  <th className="py-2 px-3 text-right">{L('Cost', 'Coût', 'التكلفة')}</th>
                  <th className="py-2 px-3">{L('Status', 'Statut', 'الحالة')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--atr-divider)] tabular-nums">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-[#FAF7F4] dark:hover:bg-[#282523]">
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-[#BF431F] dark:text-[#FF8F63] block">{t.ticketNumber}</span>
                      <span className="text-black dark:text-white font-medium">{t.title}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-black dark:text-white block">{t.propertyTitle}</span>
                      <span className="text-black/55 dark:text-white/55">{t.ownerName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-black/75 dark:text-white/75">{t.vendorName || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 font-semibold">
                        {t.chargeTarget}
                      </span>
                      {t.ownerLedgerEntryId && (
                        <span className="block text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                          {L('Ledger debited', 'Débit enregistré', 'مقيد بالدفتر')}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-black dark:text-white">
                      {formatMoney(t.actualCostDzd || t.estimatedCostDzd, language)}
                    </td>
                    <td className="py-2.5 px-3">
                      {t.status === 'Resolved' || t.status === 'Closed' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 size={13} />
                          {t.status}
                        </span>
                      ) : (
                        <AtriumButton variant="secondary" size="sm" onClick={() => handleResolve(t)}>
                          {L('Mark Resolved', 'Clôturer', 'إغلاق')}
                        </AtriumButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <KineticModalShell isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidthClass="max-w-md" zIndexClass="z-50" scrimClassName="bg-black/60">
        <div data-sq="panel" data-sq-border="solid" className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4 max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
            <h2 className="t-card font-semibold text-black dark:text-white">{L('Log Maintenance Ticket', 'Nouveau Ticket Travaux', 'تسجيل تذكرة صيانة')}</h2>
            <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3 t-cap">
            <LabelSelect
              label={L('Property *', 'Bien *', 'العقار *')}
              value={propertyId}
              onChange={setPropertyId}
              options={properties.map((p) => ({ value: p.id, label: p.title }))}
            />
            <LabelInput label={L('Issue Title *', 'Objet des travaux *', 'عنوان العطل *')} value={title} onChange={setTitle} required />
            <div className="grid grid-cols-2 gap-3">
              <LabelSelect
                label={L('Category', 'Catégorie', 'الفئة')}
                value={category}
                onChange={(v) => setCategory(v as RealEstateMaintenanceTicket['category'])}
                options={[
                  { value: 'Plumbing', label: L('Plumbing', 'Plomberie', 'ترصيص') },
                  { value: 'Electrical', label: L('Electrical', 'Électricité', 'كهرباء') },
                  { value: 'Hvac', label: 'HVAC / Clim' },
                  { value: 'Elevator', label: L('Elevator', 'Ascenseur', 'مصعد') },
                  { value: 'Structural', label: L('Structural', 'Gros œuvre', 'أشغال') },
                  { value: 'General', label: L('General', 'Général', 'عام') },
                ]}
              />
              <LabelSelect
                label={L('Charge To', 'Imputé à', 'تحمل التكلفة')}
                value={chargeTarget}
                onChange={(v) => setChargeTarget(v as RealEstateMaintenanceTicket['chargeTarget'])}
                options={[
                  { value: 'Owner', label: L('Owner (Ledger Debit)', 'Bailleur (Débit Livre)', 'المالك (خصم)') },
                  { value: 'Tenant', label: L('Tenant', 'Locataire', 'المستأجر') },
                  { value: 'Agency', label: L('Agency', 'Agence', 'الوكالة') },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LabelSelect
                label={L('Priority', 'Priorité', 'الأولوية')}
                value={priority}
                onChange={(v) => setPriority(v as RealEstateMaintenanceTicket['priority'])}
                options={[
                  { value: 'Low', label: L('Low', 'Basse', 'منخفضة') },
                  { value: 'Medium', label: L('Medium', 'Moyenne', 'متوسطة') },
                  { value: 'High', label: L('High', 'Haute', 'عالية') },
                  { value: 'Urgent', label: L('Urgent', 'Urgente', 'عاجل') },
                ]}
              />
              <LabelInput type="number" label={L('Cost (DZD)', 'Coût (DA)', 'التكلفة (دج)')} value={estimatedCostDzd} onChange={setEstimatedCostDzd} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LabelInput label={L('Vendor Name', 'Prestataire', 'المقاول')} value={vendorName} onChange={setVendorName} />
              <LabelInput label={L('Vendor Phone', 'Tél. Prestataire', 'هاتف المقاول')} value={vendorPhone} onChange={setVendorPhone} />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                {L('Cancel', 'Annuler', 'إلغاء')}
              </AtriumButton>
              <AtriumButton type="submit" variant="primary" size="sm">
                {L('Save Ticket', 'Enregistrer Ticket', 'حفظ التذكرة')}
              </AtriumButton>
            </div>
          </form>
        </div>
      </KineticModalShell>
    </ScreenPod>
  );
};
