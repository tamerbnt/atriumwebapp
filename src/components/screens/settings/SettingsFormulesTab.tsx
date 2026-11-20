import React, { useMemo, useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Copy,
  Archive,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import {
  CategoryFormule,
  CurrencyCode,
  FormuleDurationUnit,
  MembershipPlan,
  ServiceItem,
} from '../../../types/index';
import {
  getFormuleKindForCategory,
  isExecutiveRole,
  validateCategoryFormule,
} from '../../../utils/businessConfig';
import { formatMoney } from '../../../utils/rules';
import { AtriumButton } from '../../ui/AtriumButton';
import { Modal } from '../../ui/Modal';

export const SettingsFormulesTab: React.FC = () => {
  const {
    currentBusiness,
    currentBusinessConfig,
    currentCategoryFormules,
    plans,
    servicesCatalog,
    rentableUnits,
    eduCourses,
    currentUser,
    language,
    addMembershipPlan,
    updateMembershipPlan,
    toggleMembershipPlanActive,
    deleteMembershipPlan,
    addServiceItem,
    updateServiceItem,
    deleteServiceItem,
    addCategoryFormule,
    updateCategoryFormule,
    toggleCategoryFormuleActive,
    duplicateCategoryFormule,
    deleteCategoryFormule,
    setScreen,
  } = useAtriumStore();

  const isAr = language === 'ar';
  const isFr = language === 'fr';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isFr ? fr : en);

  const canEdit = isExecutiveRole(currentUser?.role, currentUser?.roleRank);
  const category = currentBusiness.category;
  const descriptor = useMemo(() => getFormuleKindForCategory(category), [category]);
  const currency: CurrencyCode = currentBusinessConfig.currency || 'DZD';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [blockedArchiveTarget, setBlockedArchiveTarget] = useState<{
    id: string;
    name: string;
    kind: 'plan' | 'formule';
    referenceCount: number;
  } | null>(null);

  // Generic Formule / Plan / Service Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Common Form State
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formRatePercent, setFormRatePercent] = useState<number>(0);
  const [formDurationValue, setFormDurationValue] = useState<number>(30);
  const [formDurationUnit, setFormDurationUnit] = useState<FormuleDurationUnit>('days');
  const [formTaxRate, setFormTaxRate] = useState<number>(currentBusinessConfig.defaultTvaRate ?? 19);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  // Plan-specific extras
  const [planSessionsPerWeek, setPlanSessionsPerWeek] = useState<number>(3);
  const [planIsWalkIn, setPlanIsWalkIn] = useState<boolean>(false);
  const [planIsPT, setPlanIsPT] = useState<boolean>(false);
  // Salon service extras
  const [serviceCategory, setServiceCategory] = useState<ServiceItem['category']>('Hair');
  const [serviceCost, setServiceCost] = useState<number>(500);
  const [serviceBuffer, setServiceBuffer] = useState<number>(10);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setEditingId(null);
    setFormCode('');
    setFormName('');
    setFormDescription('');
    setFormPrice(0);
    setFormRatePercent(0);
    setFormDurationValue(descriptor.mode === 'gym_plans' ? 30 : 1);
    setFormDurationUnit(descriptor.mode === 'salon_services' ? 'minutes' : 'days');
    setFormTaxRate(currentBusinessConfig.defaultTvaRate ?? 19);
    setFormIsActive(true);
    setPlanSessionsPerWeek(3);
    setPlanIsWalkIn(false);
    setPlanIsPT(false);
    setServiceCategory('Hair');
    setServiceCost(500);
    setServiceBuffer(10);
    setFormErrors({});
  };

  const openCreateModal = () => {
    if (!canEdit) return;
    resetForm();
    setIsModalOpen(true);
  };

  const openEditPlan = (plan: MembershipPlan) => {
    if (!canEdit) return;
    resetForm();
    setEditingId(plan.id);
    setFormName(plan.name);
    setFormDescription(plan.description || '');
    setFormPrice(plan.price?.amount ?? 0);
    setFormDurationValue(plan.durationDays ?? 30);
    setFormIsActive(plan.isActive);
    setPlanSessionsPerWeek(plan.sessionsPerWeek ?? 0);
    setPlanIsWalkIn(Boolean(plan.isWalkIn));
    setPlanIsPT(Boolean(plan.isPersonalTraining));
    setIsModalOpen(true);
  };

  const openEditService = (srv: ServiceItem) => {
    if (!canEdit) return;
    resetForm();
    setEditingId(srv.id);
    setFormName(srv.name);
    setFormDescription(srv.category || '');
    setServiceCategory(srv.category || 'Hair');
    setFormPrice(srv.price ?? 0);
    setFormRatePercent(srv.commissionRate ?? 35);
    setFormDurationValue(srv.durationMinutes ?? 30);
    setServiceBuffer(srv.bufferMinutes ?? 10);
    setServiceCost(srv.costPrice ?? 0);
    setIsModalOpen(true);
  };

  const openEditFormule = (frm: CategoryFormule) => {
    if (!canEdit) return;
    resetForm();
    setEditingId(frm.id);
    setFormCode(frm.code || '');
    setFormName(frm.name);
    setFormDescription(frm.description || '');
    setFormPrice(frm.priceAmount ?? 0);
    setFormRatePercent(frm.ratePercent ?? 0);
    setFormDurationValue(frm.durationValue ?? 1);
    setFormDurationUnit(frm.durationUnit || 'days');
    setFormTaxRate(frm.taxRate ?? (currentBusinessConfig.defaultTvaRate ?? 19));
    setFormIsActive(frm.isActive);
    setIsModalOpen(true);
  };

  const handleSubmitModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    const validation = validateCategoryFormule(
      {
        name: formName,
        priceAmount: formPrice,
        ratePercent: formRatePercent,
        durationValue: formDurationValue,
        taxRate: formTaxRate,
      },
      language
    );
    if (Object.keys(validation).length > 0) {
      setFormErrors(validation);
      return;
    }

    if (descriptor.mode === 'gym_plans') {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || L('Standard membership formule', 'Formule d’adhésion standard', 'باقة اشتراك قياسية'),
        durationDays: Math.max(1, Number(formDurationValue) || 30),
        price: { amount: Number(formPrice) || 0, currency },
        isActive: formIsActive,
        sessionsPerWeek: Number(planSessionsPerWeek) || 0,
        isWalkIn: planIsWalkIn,
        isPersonalTraining: planIsPT,
        genderRule: 0 as 0 | 1 | 2,
      };
      if (editingId) {
        updateMembershipPlan(editingId, payload);
      } else {
        addMembershipPlan(payload);
      }
    } else if (descriptor.mode === 'salon_services') {
      const payload = {
        name: formName.trim(),
        category: serviceCategory,
        durationMinutes: Math.max(5, Number(formDurationValue) || 30),
        bufferMinutes: Math.max(0, Number(serviceBuffer) || 0),
        price: Number(formPrice) || 0,
        costPrice: Number(serviceCost) || 0,
        commissionRate: Number(formRatePercent) || 0,
        colorCode: '#C05621',
      };
      if (editingId) {
        updateServiceItem(editingId, payload);
      } else {
        addServiceItem(payload);
      }
    } else {
      const payload = {
        formuleType: descriptor.formuleType,
        code: formCode.trim().toUpperCase() || undefined,
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        priceAmount: Number(formPrice) || 0,
        ratePercent: Number(formRatePercent) || 0,
        durationValue: Number(formDurationValue) || 0,
        durationUnit: formDurationUnit,
        currency,
        taxRate: Number(formTaxRate) || 0,
        isActive: formIsActive,
        sortOrder: editingId ? undefined : currentCategoryFormules.length + 1,
      };
      if (editingId) {
        updateCategoryFormule(editingId, payload);
      } else {
        addCategoryFormule(payload);
      }
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDeletePlan = (plan: MembershipPlan) => {
    const res = deleteMembershipPlan(plan.id);
    if (!res.success && res.blockedByReferences) {
      setBlockedArchiveTarget({
        id: plan.id,
        name: plan.name,
        kind: 'plan',
        referenceCount: res.referenceCount || 1,
      });
      return;
    }
  };

  const handleDeleteFormule = (frm: CategoryFormule) => {
    const res = deleteCategoryFormule(frm.id);
    if (!res.success && res.blockedByReferences) {
      setBlockedArchiveTarget({
        id: frm.id,
        name: frm.name,
        kind: 'formule',
        referenceCount: res.referenceCount || 1,
      });
      return;
    }
  };

  const handleConfirmArchiveBlocked = () => {
    if (!blockedArchiveTarget) return;
    if (blockedArchiveTarget.kind === 'plan') {
      updateMembershipPlan(blockedArchiveTarget.id, { isActive: false });
    } else {
      updateCategoryFormule(blockedArchiveTarget.id, { isActive: false });
    }
    setBlockedArchiveTarget(null);
  };

  const q = searchQuery.trim().toLowerCase();

  const filteredPlans = useMemo(
    () =>
      plans.filter((p) => {
        if (statusFilter === 'active' && !p.isActive) return false;
        if (statusFilter === 'archived' && p.isActive) return false;
        if (!q) return true;
        return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
      }),
    [plans, statusFilter, q]
  );

  const filteredServices = useMemo(
    () =>
      servicesCatalog.filter((s) => {
        if (!q) return true;
        return s.name.toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q);
      }),
    [servicesCatalog, q]
  );

  const filteredFormules = useMemo(
    () =>
      currentCategoryFormules.filter((f) => {
        if (statusFilter === 'active' && !f.isActive) return false;
        if (statusFilter === 'archived' && f.isActive) return false;
        if (!q) return true;
        return (
          f.name.toLowerCase().includes(q) ||
          (f.code || '').toLowerCase().includes(q) ||
          (f.description || '').toLowerCase().includes(q)
        );
      }),
    [currentCategoryFormules, statusFilter, q]
  );

  const titleText = isAr ? descriptor.titleAr : isFr ? descriptor.titleFr : descriptor.titleEn;
  const subtitleText = isAr
    ? descriptor.subtitleAr
    : isFr
    ? descriptor.subtitleFr
    : descriptor.subtitleEn;
  const rateLabel = isAr
    ? descriptor.primaryRateLabelAr
    : isFr
    ? descriptor.primaryRateLabelFr
    : descriptor.primaryRateLabelEn;

  return (
    <div className="flex flex-col gap-[var(--pod-gap,16px)]">
      {!canEdit && (
        <div
          data-sq="card"
          style={{ '--sq-stroke': 'rgba(245,158,11,0.45)' } as React.CSSProperties}
          className="p-[var(--s3,12px)] bg-amber-50/80 dark:bg-amber-950/30 flex items-center gap-[var(--s3,12px)] t-small text-amber-900 dark:text-amber-200"
        >
          <Lock size={16} strokeWidth={1.5} className="shrink-0" />
          <span>
            {L(
              'Read-only catalog: only Owners or Managers can add, edit, archive, or delete formules.',
              'Catalogue en lecture seule : seuls le Gérant ou le Propriétaire peuvent créer ou archiver des formules.',
              'وضع القراءة فقط: تعديل الصيغ والباقات مخصص للمالك أو المدير.'
            )}
          </span>
        </div>
      )}

      {blockedArchiveTarget && (
        <div
          data-sq="card"
          style={{ '--sq-stroke': 'rgba(225,29,72,0.45)' } as React.CSSProperties}
          className="p-[var(--s4,16px)] bg-rose-50/90 dark:bg-rose-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)]"
        >
          <div className="flex items-start gap-[var(--s3,12px)]">
            <AlertTriangle size={18} strokeWidth={1.5} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-[var(--s1,4px)]">
              <span className="t-label font-semibold text-rose-900 dark:text-rose-200">
                {L(
                  `Cannot hard-delete "${blockedArchiveTarget.name}" (${blockedArchiveTarget.referenceCount} linked records)`,
                  `Suppression bloquée : "${blockedArchiveTarget.name}" est liée à ${blockedArchiveTarget.referenceCount} dossiers`,
                  `لا يمكن الحذف النهائي لـ "${blockedArchiveTarget.name}" لارتباطها بـ ${blockedArchiveTarget.referenceCount} سجلات`
                )}
              </span>
              <span className="t-cap text-rose-800 dark:text-rose-300">
                {L(
                  'Archive this formule instead to hide it from new registrations while preserving historical reports.',
                  'Archivez cette formule pour la masquer des nouvelles ventes tout en préservant vos bilans passés.',
                  'يمكنك أرشفتها لإخفائها من المبيعات الجديدة مع الحفاظ على السجلات السابقة.'
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-[var(--s2,8px)] shrink-0">
            <button
              type="button"
              onClick={() => setBlockedArchiveTarget(null)}
              className="h-[34px] px-[var(--s3,12px)] t-small text-[var(--text-2)] hover:text-[var(--text-1)] cursor-pointer"
            >
              {L('Cancel', 'Annuler', 'إلغاء')}
            </button>
            <AtriumButton variant="primary" size="xs" onClick={handleConfirmArchiveBlocked} icon={<Archive size={14} />}>
              {L('Archive Instead', 'Archiver maintenant', 'أرشفة بدلاً من الحذف')}
            </AtriumButton>
          </div>
        </div>
      )}

      <div className="sq-elev-card">
        <div
          data-sq="panel"
          className="bg-[#F3EDE7] dark:bg-[#141312] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)]"
        >
          {/* Pod Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-[var(--s3,12px)] pt-[var(--s1,4px)] px-[var(--s3,12px)]">
            <div className="flex items-center gap-[var(--card-head-gap,12px)]">
              <div
                data-sq="tile"
                data-sq-border="none"
                style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
                className="w-[var(--tile,40px)] h-[var(--tile,40px)] flex items-center justify-center shrink-0"
              >
                <Layers size={20} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <h3 className="t-pod text-[var(--text-1)]">{titleText}</h3>
                <p className="t-cap text-[var(--text-2)]">{subtitleText}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
              {descriptor.mode === 'rental_units' && (
                <button
                  type="button"
                  data-sq="ctl-sm"
                  onClick={() => setScreen('shop')}
                  className="h-[var(--btn-sm-h,34px)] px-[var(--s3,12px)] bg-white dark:bg-neutral-800 text-[var(--text-1)] t-small font-medium cursor-pointer"
                >
                  {L(`Spaces (${rentableUnits.length})`, `Gérer Salles (${rentableUnits.length})`, `القاعات (${rentableUnits.length})`)}
                </button>
              )}
              {descriptor.mode === 'edu_courses' && (
                <button
                  type="button"
                  data-sq="ctl-sm"
                  onClick={() => setScreen('shop')}
                  className="h-[var(--btn-sm-h,34px)] px-[var(--s3,12px)] bg-white dark:bg-neutral-800 text-[var(--text-1)] t-small font-medium cursor-pointer"
                >
                  {L(`Courses (${eduCourses.length})`, `Catalogue Cours (${eduCourses.length})`, `البرامج (${eduCourses.length})`)}
                </button>
              )}
              {canEdit && (
                <AtriumButton size="sm" onClick={openCreateModal} icon={<Plus size={16} strokeWidth={1.5} />}>
                  {L('New Formule', 'Nouvelle Formule', 'صيغة جديدة')}
                </AtriumButton>
              )}
            </div>
          </div>

          {/* Search & Status Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s2,8px)] px-[var(--s3,12px)]">
            <div className="relative flex-1 max-w-md">
              <Search
                size={15}
                strokeWidth={1.5}
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-[12px] text-[var(--text-2)]"
              />
              <input
                type="text"
                data-sq="ctl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={L('Search by name or code...', 'Rechercher par nom ou code...', 'ابحث بالاسم أو الرمز...')}
                className="w-full h-[38px] ps-[36px] pe-[12px] bg-white dark:bg-neutral-900 text-[var(--text-1)] t-small focus:outline-none"
              />
            </div>

            {descriptor.mode !== 'salon_services' && (
              <div className="flex items-center gap-[var(--s1,4px)] bg-white dark:bg-neutral-900 p-[3px]" data-sq="ctl">
                {(['all', 'active', 'archived'] as const).map((status) => {
                  const active = statusFilter === status;
                  const lbl =
                    status === 'all'
                      ? L('All', 'Toutes', 'الكل')
                      : status === 'active'
                      ? L('Active', 'Actives', 'النشطة')
                      : L('Archived', 'Archivées', 'المؤرشفة');
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`h-[30px] px-[12px] t-small font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[var(--brand-fill)] text-white'
                          : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                      }`}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="flex flex-col gap-[var(--row-gap,8px)]">
            {descriptor.mode === 'gym_plans' &&
              (filteredPlans.length === 0 ? (
                <div data-sq="card" className="p-[var(--card-pad,20px)] bg-white dark:bg-neutral-800 text-center t-small text-[var(--text-2)]">
                  {L('No membership formules match this filter.', 'Aucune formule ne correspond à ce filtre.', 'لا توجد باقات مطابقة.')}
                </div>
              ) : (
                filteredPlans.map((plan) => (
                  <div key={plan.id} className="sq-elev-card">
                    <div
                      data-sq="card"
                      className="p-[var(--s4,16px)] bg-white dark:bg-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)]"
                    >
                      <div className="flex flex-col gap-[var(--s1,4px)] min-w-0">
                        <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
                          <span className="t-card font-semibold text-[var(--text-1)]">{plan.name}</span>
                          <span
                            className={`t-small font-semibold tabular-nums ${
                              plan.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-500'
                            }`}
                          >
                            {plan.isActive ? L('Active', 'Active', 'نشطة') : L('Archived', 'Archivée', 'مؤرشفة')}
                          </span>
                        </div>
                        <p className="t-cap text-[var(--text-2)] truncate">
                          {plan.description || '—'} ·{' '}
                          <span className="tabular-nums">
                            {plan.durationDays} {L('days', 'jours', 'يوم')} ·{' '}
                            {plan.sessionsPerWeek > 0
                              ? `${plan.sessionsPerWeek}/${L('wk', 'sem', 'أسبوع')}`
                              : L('Unlimited sessions', 'Séances illimitées', 'حصص غير محدودة')}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-[var(--s3,12px)] shrink-0">
                        <span className="t-card font-semibold text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] tabular-nums">
                          {formatMoney(plan.price?.amount ?? 0, plan.price?.currency || currency)}
                        </span>
                        {canEdit && (
                          <div className="flex items-center gap-[var(--s1,4px)]">
                            <button
                              type="button"
                              onClick={() => openEditPlan(plan)}
                              title={L('Edit', 'Modifier', 'تعديل')}
                              className="w-[34px] h-[34px] flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700 text-[var(--text-2)] hover:text-[var(--text-1)] cursor-pointer"
                            >
                              <Edit2 size={15} strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleMembershipPlanActive(plan.id)}
                              title={plan.isActive ? L('Archive', 'Archiver', 'أرشفة') : L('Restore', 'Réactiver', 'استعادة')}
                              className="w-[34px] h-[34px] flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700 text-[var(--text-2)] hover:text-[var(--text-1)] cursor-pointer"
                            >
                              {plan.isActive ? <Archive size={15} strokeWidth={1.5} /> : <RotateCcw size={15} strokeWidth={1.5} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePlan(plan)}
                              title={L('Delete', 'Supprimer', 'حذف')}
                              className="w-[34px] h-[34px] flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 cursor-pointer"
                            >
                              <Trash2 size={15} strokeWidth={1.5} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ))}

            {descriptor.mode === 'salon_services' &&
              (filteredServices.length === 0 ? (
                <div data-sq="card" className="p-[var(--card-pad,20px)] bg-white dark:bg-neutral-800 text-center t-small text-[var(--text-2)]">
                  {L('No salon service formules found.', 'Aucune prestation trouvée.', 'لا توجد خدمات مطابقة.')}
                </div>
              ) : (
                filteredServices.map((srv) => (
                  <div key={srv.id} className="sq-elev-card">
                    <div
                      data-sq="card"
                      className="p-[var(--s4,16px)] bg-white dark:bg-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)]"
                    >
                      <div className="flex flex-col gap-[var(--s1,4px)] min-w-0">
                        <div className="flex items-center gap-[var(--s2,8px)]">
                          <span className="t-card font-semibold text-[var(--text-1)]">{srv.name}</span>
                          <span className="t-cap text-[var(--text-2)]">{srv.category}</span>
                        </div>
                        <p className="t-cap text-[var(--text-2)] tabular-nums">
                          {srv.durationMinutes} min · {L('Commission', 'Commission', 'العمولة')}: {srv.commissionRate ?? 35}%
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-[var(--s3,12px)] shrink-0">
                        <span className="t-card font-semibold text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] tabular-nums">
                          {formatMoney(srv.price, currency)}
                        </span>
                        {canEdit && (
                          <div className="flex items-center gap-[var(--s1,4px)]">
                            <button
                              type="button"
                              onClick={() => openEditService(srv)}
                              title={L('Edit', 'Modifier', 'تعديل')}
                              className="w-[34px] h-[34px] flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700 text-[var(--text-2)] cursor-pointer"
                            >
                              <Edit2 size={15} strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteServiceItem(srv.id)}
                              title={L('Delete', 'Supprimer', 'حذف')}
                              className="w-[34px] h-[34px] flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 cursor-pointer"
                            >
                              <Trash2 size={15} strokeWidth={1.5} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ))}

            {descriptor.mode !== 'gym_plans' &&
              descriptor.mode !== 'salon_services' &&
              (filteredFormules.length === 0 ? (
                <div data-sq="card" className="p-[var(--card-pad,20px)] bg-white dark:bg-neutral-800 text-center t-small text-[var(--text-2)]">
                  {L('No formules match this filter yet.', 'Aucune formule enregistrée pour ce filtre.', 'لا توجد صيغ مسجلة حالياً.')}
                </div>
              ) : (
                filteredFormules.map((frm) => (
                  <div key={frm.id} className="sq-elev-card">
                    <div
                      data-sq="card"
                      className="p-[var(--s4,16px)] bg-white dark:bg-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)]"
                    >
                      <div className="flex flex-col gap-[var(--s1,4px)] min-w-0">
                        <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
                          {frm.code && (
                            <span className="t-cap font-semibold text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] tabular-nums">
                              {frm.code}
                            </span>
                          )}
                          <span className="t-card font-semibold text-[var(--text-1)]">{frm.name}</span>
                          <span
                            className={`t-small font-medium ${
                              frm.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-500'
                            }`}
                          >
                            {frm.isActive ? L('Active', 'Active', 'نشطة') : L('Archived', 'Archivée', 'مؤرشفة')}
                          </span>
                        </div>
                        <p className="t-cap text-[var(--text-2)] truncate">
                          {frm.description || '—'} ·{' '}
                          <span className="tabular-nums">
                            TVA {frm.taxRate}%
                            {frm.ratePercent > 0 ? ` · ${rateLabel}: ${frm.ratePercent}%` : ''}
                            {frm.durationValue > 0 ? ` · ${frm.durationValue} ${frm.durationUnit}` : ''}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-[var(--s3,12px)] shrink-0">
                        <span className="t-card font-semibold text-[var(--text-1)] tabular-nums">
                          {frm.priceAmount > 0
                            ? formatMoney(frm.priceAmount, frm.currency || currency)
                            : `${frm.ratePercent}%`}
                        </span>
                        {canEdit && (
                          <div className="flex items-center gap-[var(--s1,4px)]">
                            <button
                              type="button"
                              onClick={() => openEditFormule(frm)}
                              title={L('Edit', 'Modifier', 'تعديل')}
                              className="w-[34px] h-[34px] flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700 text-[var(--text-2)] hover:text-[var(--text-1)] cursor-pointer"
                            >
                              <Edit2 size={15} strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicateCategoryFormule(frm.id)}
                              title={L('Duplicate', 'Dupliquer', 'نسخ')}
                              className="w-[34px] h-[34px] flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700 text-[var(--text-2)] hover:text-[var(--text-1)] cursor-pointer"
                            >
                              <Copy size={15} strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleCategoryFormuleActive(frm.id)}
                              title={frm.isActive ? L('Archive', 'Archiver', 'أرشفة') : L('Restore', 'Réactiver', 'استعادة')}
                              className="w-[34px] h-[34px] flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700 text-[var(--text-2)] hover:text-[var(--text-1)] cursor-pointer"
                            >
                              {frm.isActive ? <Archive size={15} strokeWidth={1.5} /> : <RotateCcw size={15} strokeWidth={1.5} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFormule(frm)}
                              title={L('Delete', 'Supprimer', 'حذف')}
                              className="w-[34px] h-[34px] flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 cursor-pointer"
                            >
                              <Trash2 size={15} strokeWidth={1.5} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ))}
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingId
            ? L('Edit Formule', 'Modifier la Formule', 'تعديل الصيغة')
            : L('Create New Formule', 'Créer une Formule', 'إنشاء صيغة جديدة')
        }
        maxWidth="md"
      >
        <form onSubmit={handleSubmitModal} className="flex flex-col gap-[var(--s3,12px)]">
          {descriptor.mode !== 'gym_plans' && descriptor.mode !== 'salon_services' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--s3,12px)]">
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <label className="t-cap text-[var(--text-2)] font-medium">
                  {L('Code', 'Code référence', 'الرمز')}
                </label>
                <input
                  type="text"
                  data-sq="ctl"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="FRM-01"
                  className="h-[40px] px-[var(--s3,12px)] bg-white dark:bg-neutral-900 border border-black/[0.08] dark:border-white/[0.10] t-small uppercase"
                />
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)] sm:col-span-2">
                <label className="t-cap text-[var(--text-2)] font-medium">
                  {L('Formule Name *', 'Nom de la formule *', 'اسم الصيغة *')}
                </label>
                <input
                  type="text"
                  data-sq="ctl"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-[40px] px-[var(--s3,12px)] bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-700 t-small"
                  required
                />
              </div>
            </div>
          )}

          {(descriptor.mode === 'gym_plans' || descriptor.mode === 'salon_services') && (
            <div className="flex flex-col gap-[var(--s1,4px)]">
              <label className="t-cap text-[var(--text-2)] font-medium">
                {L('Name *', 'Nom *', 'الاسم *')}
              </label>
              <input
                type="text"
                data-sq="ctl"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-[40px] px-[var(--s3,12px)] bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-700 t-small"
                required
              />
            </div>
          )}

          {descriptor.mode === 'salon_services' ? (
            <div className="flex flex-col gap-[var(--s1,4px)]">
              <label className="t-cap text-[var(--text-2)] font-medium">
                {L('Service Category', 'Catégorie prestation', 'تصنيف الخدمة')}
              </label>
              <select
                data-sq="ctl"
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value as ServiceItem['category'])}
                className="h-[40px] px-[var(--s3,12px)] bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-700 t-small"
              >
                <option value="Hair">{L('Hair', 'Coiffure', 'شعر')}</option>
                <option value="Barber">{L('Barber', 'Barbier', 'حلاقة')}</option>
                <option value="Nails">{L('Nails', 'Onglerie', 'أظافر')}</option>
                <option value="Facial">{L('Facial', 'Soin Visage', 'العناية بالوجه')}</option>
                <option value="Massage">{L('Massage & Spa', 'Massage & Spa', 'مساج وسبا')}</option>
                <option value="Bridal">{L('Bridal', 'Mariée', 'عرائس')}</option>
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-[var(--s1,4px)]">
              <label className="t-cap text-[var(--text-2)] font-medium">
                {L('Description', 'Description / Détails', 'الوصف')}
              </label>
              <input
                type="text"
                data-sq="ctl"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="h-[40px] px-[var(--s3,12px)] bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-700 t-small"
              />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-[var(--s3,12px)]">
            <div className="flex flex-col gap-[var(--s1,4px)]">
              <label className="t-cap text-[var(--text-2)] font-medium">
                {L(`Price (${currency})`, `Tarif (${currency})`, `السعر (${currency})`)}
              </label>
              <input
                type="number"
                min={0}
                step={10}
                data-sq="ctl"
                value={formPrice}
                onChange={(e) => setFormPrice(Number(e.target.value))}
                className="h-[40px] px-[var(--s3,12px)] bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-700 t-small tabular-nums"
              />
            </div>

            {descriptor.mode === 'gym_plans' ? (
              <>
                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <label className="t-cap text-[var(--text-2)] font-medium">
                    {L('Duration (Days)', 'Durée (Jours)', 'المدة (أيام)')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    data-sq="ctl"
                    value={formDurationValue}
                    onChange={(e) => setFormDurationValue(Number(e.target.value))}
                    className="h-[40px] px-[var(--s3,12px)] bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-700 t-small tabular-nums"
                  />
                </div>
                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <label className="t-cap text-[var(--text-2)] font-medium">
                    {L('Sessions / Week (0=∞)', 'Séances / Sem (0=∞)', 'الحصص/أسبوع')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    data-sq="ctl"
                    value={planSessionsPerWeek}
                    onChange={(e) => setPlanSessionsPerWeek(Number(e.target.value))}
                    className="h-[40px] px-[var(--s3,12px)] bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-700 t-small tabular-nums"
                  />
                </div>
              </>
            ) : descriptor.mode === 'salon_services' ? (
              <>
                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <label className="t-cap text-[var(--text-2)] font-medium">
                    {L('Duration (min)', 'Durée (min)', 'المدة (دقيقة)')}
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    data-sq="ctl"
                    value={formDurationValue}
                    onChange={(e) => setFormDurationValue(Number(e.target.value))}
                    className="h-[40px] px-[var(--s3,12px)] bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-700 t-small tabular-nums"
                  />
                </div>
                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <label className="t-cap text-[var(--text-2)] font-medium">
                    {L('Commission (%)', 'Commission (%)', 'العمولة (%)')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    data-sq="ctl"
                    value={formRatePercent}
                    onChange={(e) => setFormRatePercent(Number(e.target.value))}
                    className="h-[40px] px-[var(--s3,12px)] bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-700 t-small tabular-nums"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <label className="t-cap text-[var(--text-2)] font-medium">{rateLabel}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    data-sq="ctl"
                    value={formRatePercent}
                    onChange={(e) => setFormRatePercent(Number(e.target.value))}
                    className="h-[40px] px-[var(--s3,12px)] bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-700 t-small tabular-nums"
                  />
                </div>
                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <label className="t-cap text-[var(--text-2)] font-medium">TVA (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    data-sq="ctl"
                    value={formTaxRate}
                    onChange={(e) => setFormTaxRate(Number(e.target.value))}
                    className="h-[40px] px-[var(--s3,12px)] bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-700 t-small tabular-nums"
                  />
                </div>
              </>
            )}
          </div>

          {descriptor.mode !== 'gym_plans' && descriptor.mode !== 'salon_services' && (
            <div className="grid grid-cols-2 gap-[var(--s3,12px)]">
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <label className="t-cap text-[var(--text-2)] font-medium">
                  {L('Validity / Duration', 'Durée / Volume', 'المدة / الكمية')}
                </label>
                <input
                  type="number"
                  min={0}
                  data-sq="ctl"
                  value={formDurationValue}
                  onChange={(e) => setFormDurationValue(Number(e.target.value))}
                  className="h-[40px] px-[var(--s3,12px)] bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-700 t-small tabular-nums"
                />
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <label className="t-cap text-[var(--text-2)] font-medium">
                  {L('Unit', 'Unité', 'الوحدة')}
                </label>
                <select
                  data-sq="ctl"
                  value={formDurationUnit}
                  onChange={(e) => setFormDurationUnit(e.target.value as FormuleDurationUnit)}
                  className="h-[40px] px-[var(--s3,12px)] bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-700 t-small"
                >
                  <option value="unit">{L('Per Unit', 'Unité / Acte', 'وحدة')}</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">{L('Hours', 'Heures', 'ساعات')}</option>
                  <option value="days">{L('Days', 'Jours', 'أيام')}</option>
                  <option value="months">{L('Months', 'Mois', 'أشهر')}</option>
                  <option value="sessions">{L('Sessions', 'Séances', 'حصص')}</option>
                </select>
              </div>
            </div>
          )}

          {Object.keys(formErrors).length > 0 && (
            <div className="p-[var(--s2,8px)] bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 t-cap flex items-center gap-[var(--s2,8px)]">
              <AlertTriangle size={14} strokeWidth={1.5} className="shrink-0" />
              <span>{Object.values(formErrors)[0]}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-[var(--s2,8px)] pt-[var(--s2,8px)]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="h-[40px] px-[var(--s4,16px)] t-btn text-[var(--text-2)] hover:text-[var(--text-1)] cursor-pointer"
            >
              {L('Cancel', 'Annuler', 'إلغاء')}
            </button>
            <AtriumButton type="submit" size="md" icon={<CheckCircle2 size={15} />}>
              {editingId ? L('Save Changes', 'Mettre à jour', 'حفظ التغييرات') : L('Create Formule', 'Créer la formule', 'إنشاء')}
            </AtriumButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
