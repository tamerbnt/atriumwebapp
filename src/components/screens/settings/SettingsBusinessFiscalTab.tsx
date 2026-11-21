import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Receipt,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Save,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import {
  CategorySpecificSettings,
  CurrencyCode,
  FiscalProfile,
  ReceiptConfig,
} from '../../../types/index';
import {
  getDefaultFiscalLicenseLabel,
  isExecutiveRole,
  validateFiscalProfile,
} from '../../../utils/businessConfig';
import { AtriumButton } from '../../ui/AtriumButton';
import { Toggle } from '@/atrium';

interface SettingsBusinessFiscalTabProps {
  focusSection?: string | null;
  onClearFocus?: () => void;
}

export const SettingsBusinessFiscalTab: React.FC<SettingsBusinessFiscalTabProps> = ({
  focusSection,
  onClearFocus,
}) => {
  const {
    currentBusiness,
    currentBusinessConfig,
    currentUser,
    language,
    receiptConfig,
    updateBusinessIdentity,
    updateBusinessConfig,
    updateReceiptConfig,
  } = useAtriumStore();

  const isAr = language === 'ar';
  const isFr = language === 'fr';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isFr ? fr : en);

  const canEdit = isExecutiveRole(currentUser?.role, currentUser?.roleRank);
  const category = currentBusiness.category;

  // Identity state
  const [bizName, setBizName] = useState(currentBusiness.name || '');
  const [bizDisplayName, setBizDisplayName] = useState(currentBusiness.displayName || currentBusiness.name || '');
  const [bizAddress, setBizAddress] = useState(currentBusiness.address || '');
  const [bizPhone, setBizPhone] = useState(currentBusiness.phone || '');

  // Fiscal & TVA state
  const [currency, setCurrency] = useState<CurrencyCode>(currentBusinessConfig.currency || 'DZD');
  const [defaultTvaRate, setDefaultTvaRate] = useState<number>(currentBusinessConfig.defaultTvaRate ?? 19);
  const [applyTimbreFiscal, setApplyTimbreFiscal] = useState<boolean>(
    currentBusinessConfig.applyTimbreFiscal ?? true
  );
  const [fiscal, setFiscal] = useState<FiscalProfile>({ ...currentBusinessConfig.fiscalProfile });
  const [catSettings, setCatSettings] = useState<CategorySpecificSettings>({
    ...currentBusinessConfig.categorySettings,
  });
  const [posReceipt, setPosReceipt] = useState<ReceiptConfig>({ ...receiptConfig });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const identityRef = useRef<HTMLFormElement>(null);
  const fiscalRef = useRef<HTMLDivElement>(null);
  const rulesRef = useRef<HTMLDivElement>(null);

  // Sync local form state when switching business or receiving cloud updates
  useEffect(() => {
    setBizName(currentBusiness.name || '');
    setBizDisplayName(currentBusiness.displayName || currentBusiness.name || '');
    setBizAddress(currentBusiness.address || '');
    setBizPhone(currentBusiness.phone || '');
    setCurrency(currentBusinessConfig.currency || 'DZD');
    setDefaultTvaRate(currentBusinessConfig.defaultTvaRate ?? 19);
    setApplyTimbreFiscal(currentBusinessConfig.applyTimbreFiscal ?? true);
    setFiscal({ ...currentBusinessConfig.fiscalProfile });
    setCatSettings({ ...currentBusinessConfig.categorySettings });
    setPosReceipt({ ...receiptConfig });
    setErrors({});
  }, [currentBusiness.id, currentBusinessConfig.updatedAt]);

  useEffect(() => {
    if (!focusSection) return;
    const targetRef =
      focusSection === 'business_identity'
        ? identityRef
        : focusSection === 'fiscal_profile'
        ? fiscalRef
        : rulesRef;
    setHighlighted(focusSection);
    targetRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    const timer = setTimeout(() => {
      setHighlighted(null);
      onClearFocus?.();
    }, 2400);
    return () => clearTimeout(timer);
  }, [focusSection, onClearFocus]);

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!bizName.trim()) {
      setErrors((prev) => ({
        ...prev,
        bizName: L('Business name is required.', 'Le nom commercial est obligatoire.', 'اسم المنشأة مطلوب.'),
      }));
      return;
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next.bizName;
      return next;
    });
    updateBusinessIdentity({
      name: bizName.trim(),
      displayName: (bizDisplayName.trim() || bizName.trim()),
      address: bizAddress.trim(),
      phone: bizPhone.trim(),
    });
  };

  const handleSaveFiscalAndRules = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    const validationErrors = validateFiscalProfile(fiscal, defaultTvaRate, language);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    updateBusinessConfig({
      currency,
      defaultTvaRate,
      applyTimbreFiscal,
      fiscalProfile: fiscal,
      categorySettings: catSettings,
    });
    if (category === 'pos_inventory') {
      updateReceiptConfig(posReceipt);
    }
  };

  const updateSetting = <K extends keyof CategorySpecificSettings>(
    key: K,
    val: CategorySpecificSettings[K]
  ) => {
    setCatSettings((prev) => ({ ...prev, [key]: val }));
  };

  const licenseLabel = getDefaultFiscalLicenseLabel(category, language);

  const inputClass =
    'w-full h-[40px] px-[var(--s3,12px)] bg-[#F5F1EC] dark:bg-[#2B2825] border-0 text-[var(--text-1)] dark:text-white t-small focus:outline-none focus:ring-2 focus:ring-[var(--brand-text)]/30 disabled:opacity-60 disabled:cursor-not-allowed';

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
              'Read-only mode: fiscal parameters and business rules can only be modified by an Owner or Manager.',
              'Mode lecture seule : seuls les profils Direction / Gérant peuvent modifier les paramètres fiscaux.',
              'وضع القراءة فقط: تعديل الملف الجبائي وإعدادات الفئة مخصص للمالك أو المدير.'
            )}
          </span>
        </div>
      )}

      {/* Card 1: Business Identity */}
      <form
        ref={identityRef}
        onSubmit={handleSaveIdentity}
        className="sq-elev-card"
      >
        <div
          data-sq="panel"
          className={`bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)] transition-all ${
            highlighted === 'business_identity' ? 'ring-2 ring-[var(--brand-text)]' : ''
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)] pt-[var(--s1,4px)] px-[var(--s3,12px)] pb-[var(--s2,8px)]">
            <div className="flex items-center gap-[var(--card-head-gap,12px)]">
              <div
                data-sq="tile"
                data-sq-border="none"
                style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
                className="w-[var(--tile,40px)] h-[var(--tile,40px)] flex items-center justify-center shrink-0"
              >
                <Building2 size={20} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <h3 className="t-pod text-[var(--text-1)]">
                  {L('Business Identity & Headquarters', 'Identité Commerciale & Siège', 'هوية المنشأة والمقر الرئيسي')}
                </h3>
                <p className="t-cap text-[var(--text-2)]">
                  {L(
                    'Displayed on invoices, quittances, ordonnances, and thermal receipts.',
                    'Affichée sur vos factures, quittances, ordonnances et tickets.',
                    'تظهر في الفواتير والوصولات والوصفات والتذاكر.'
                  )}
                </p>
              </div>
            </div>
            {canEdit && (
              <AtriumButton type="submit" size="sm" icon={<Save size={15} strokeWidth={1.5} />}>
                {L('Save Identity', 'Enregistrer identité', 'حفظ الهوية')}
              </AtriumButton>
            )}
          </div>

          <div
            data-sq="card"
            className="p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] grid grid-cols-1 md:grid-cols-2 gap-[var(--s3,12px)]"
          >
            <div className="flex flex-col gap-[var(--s1,4px)]">
              <label className="t-cap text-[var(--text-2)] font-medium">
                {L('Legal / Registered Name', 'Raison sociale / Nom officiel', 'الاسم القانوني للمنشأة')}
              </label>
              <input
                type="text"
                data-sq="ctl"
                value={bizName}
                disabled={!canEdit}
                onChange={(e) => setBizName(e.target.value)}
                className={inputClass}
              />
              {errors.bizName && (
                <span className="t-cap text-rose-600 dark:text-rose-400">{errors.bizName}</span>
              )}
            </div>

            <div className="flex flex-col gap-[var(--s1,4px)]">
              <label className="t-cap text-[var(--text-2)] font-medium">
                {L('Commercial Display Name', 'Nom d’enseigne affiché', 'الاسم التجاري المعروض')}
              </label>
              <input
                type="text"
                data-sq="ctl"
                value={bizDisplayName}
                disabled={!canEdit}
                onChange={(e) => setBizDisplayName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-[var(--s1,4px)]">
              <label className="t-cap text-[var(--text-2)] font-medium">
                {L('Headquarters Address', 'Adresse du siège social', 'عنوان المقر')}
              </label>
              <input
                type="text"
                data-sq="ctl"
                value={bizAddress}
                disabled={!canEdit}
                onChange={(e) => setBizAddress(e.target.value)}
                placeholder="14 Rue Didouche Mourad, Alger"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-[var(--s1,4px)]">
              <label className="t-cap text-[var(--text-2)] font-medium">
                {L('Business Phone', 'Téléphone principal', 'هاتف التواصل')}
              </label>
              <input
                type="text"
                data-sq="ctl"
                value={bizPhone}
                disabled={!canEdit}
                onChange={(e) => setBizPhone(e.target.value)}
                placeholder="+213 550 00 00 00"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </form>

      {/* Card 2 & 3 Combined Save Form: Fiscal IDs + Category Operational Parameters */}
      <form onSubmit={handleSaveFiscalAndRules} className="flex flex-col gap-[var(--pod-gap,16px)]">
        {/* Card 2: Fiscal, TVA & Algerian DGI Identifiers */}
        <div ref={fiscalRef} className="sq-elev-card">
          <div
            data-sq="panel"
            className={`bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)] transition-all ${
              highlighted === 'fiscal_profile' ? 'ring-2 ring-[var(--brand-text)]' : ''
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)] pt-[var(--s1,4px)] px-[var(--s3,12px)] pb-[var(--s2,8px)]">
              <div className="flex items-center gap-[var(--card-head-gap,12px)]">
                <div
                  data-sq="tile"
                  data-sq-border="none"
                  style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
                  className="w-[var(--tile,40px)] h-[var(--tile,40px)] flex items-center justify-center shrink-0"
                >
                  <Receipt size={20} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <h3 className="t-pod text-[var(--text-1)]">
                    {L('Fiscal Regime, TVA & Legal IDs', 'Régime Fiscal, TVA & Identifiants Légaux', 'النظام الضريبي وTVA والمعرفات القانونية')}
                  </h3>
                  <p className="t-cap text-[var(--text-2)]">
                    {L(
                      'Applied automatically across billing, quotes, POS tickets, and DGI compliance.',
                      'Appliqués automatiquement aux devis, factures, caisses POS et quittances.',
                      'تُطبق تلقائياً في الفواتير والعروض ونقاط البيع والوصولات.'
                    )}
                  </p>
                </div>
              </div>
              {canEdit && (
                <AtriumButton type="submit" size="sm" icon={<Save size={15} strokeWidth={1.5} />}>
                  {L('Save Fiscal & Rules', 'Enregistrer tout', 'حفظ الإعدادات')}
                </AtriumButton>
              )}
            </div>

            <div
              data-sq="card"
              className="p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s4,16px)]"
            >
              {/* Currency + TVA + Timbre Fiscal row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--s3,12px)]">
                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <label className="t-cap text-[var(--text-2)] font-medium">
                    {L('Primary Currency', 'Devise principale', 'العملة الأساسية')}
                  </label>
                  <select
                    data-sq="ctl"
                    value={currency}
                    disabled={!canEdit}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className={inputClass}
                  >
                    <option value="DZD">DZD · Dinar Algérien</option>
                    <option value="EUR">EUR · Euro (€)</option>
                    <option value="USD">USD · US Dollar ($)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <label className="t-cap text-[var(--text-2)] font-medium">
                    {L('Default TVA Rate (%)', 'Taux TVA par défaut (%)', 'نسبة الضريبة TVA (%)')}
                  </label>
                  <div className="flex items-center gap-[var(--s2,8px)]">
                    <select
                      data-sq="ctl"
                      value={[0, 9, 19].includes(defaultTvaRate) ? String(defaultTvaRate) : 'custom'}
                      disabled={!canEdit}
                      onChange={(e) => {
                        if (e.target.value !== 'custom') {
                          setDefaultTvaRate(Number(e.target.value));
                        }
                      }}
                      className={`${inputClass} flex-1`}
                    >
                      <option value="19">19% · {L('Standard Rate', 'Taux Normal', 'المعدل العادي')}</option>
                      <option value="9">9% · {L('Reduced Rate', 'Taux Réduit', 'المعدل المخفض')}</option>
                      <option value="0">0% · {L('TVA Exempt', 'Exonéré TVA', 'معفى من الضريبة')}</option>
                      {![0, 9, 19].includes(defaultTvaRate) && (
                        <option value="custom">{defaultTvaRate}%</option>
                      )}
                    </select>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      data-sq="ctl"
                      value={defaultTvaRate}
                      disabled={!canEdit}
                      onChange={(e) => setDefaultTvaRate(Number(e.target.value))}
                      className={`${inputClass} w-[84px] tabular-nums text-center`}
                      aria-label="TVA %"
                    />
                  </div>
                  {errors.defaultTvaRate && (
                    <span className="t-cap text-rose-600 dark:text-rose-400">{errors.defaultTvaRate}</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-[var(--s3,12px)] px-[var(--s3,12px)] py-[var(--s2,8px)] bg-[#F5F1EC] dark:bg-[#2B2825] border-0" data-sq="ctl" data-sq-border="none">
                  <div className="flex flex-col">
                    <span className="t-small font-medium text-[var(--text-1)]">
                      {L('Timbre Fiscal (Cash)', 'Timbre Fiscal (Espèces)', 'الطابع الجبائي (نقداً)')}
                    </span>
                    <span className="t-cap text-[var(--text-2)]">
                      {L('DGI LF 2025 cash bracket', 'Barème DGI sur règlements espèces', 'تطبيق رسم الطابع عند الدفع نقداً')}
                    </span>
                  </div>
                  <Toggle
                    checked={applyTimbreFiscal}
                    onCheckedChange={(val) => {
                      if (canEdit) setApplyTimbreFiscal(val);
                    }}
                    aria-label="Timbre Fiscal"
                  />
                </div>
              </div>

              {/* Legal Form + Wilaya + DGI Fiscal IDs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--s3,12px)]">
                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <label className="t-cap text-[var(--text-2)] font-medium">
                    {L('Legal Entity Form', 'Forme Juridique', 'الشكل القانوني')}
                  </label>
                  <select
                    data-sq="ctl"
                    value={fiscal.legalForm || 'SARL'}
                    disabled={!canEdit}
                    onChange={(e) => setFiscal((p) => ({ ...p, legalForm: e.target.value as any }))}
                    className={inputClass}
                  >
                    <option value="SARL">SARL</option>
                    <option value="EURL">EURL</option>
                    <option value="SPA">SPA</option>
                    <option value="SNC">SNC</option>
                    <option value="AutoEntrepreneur">Auto-Entrepreneur</option>
                    <option value="Liberal">Profession Libérale</option>
                    <option value="Other">{L('Other', 'Autre', 'أخرى')}</option>
                  </select>
                </div>

                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <label className="t-cap text-[var(--text-2)] font-medium">RC (Registre Commerce)</label>
                  <input
                    type="text"
                    data-sq="ctl"
                    disabled={!canEdit}
                    value={fiscal.rc || ''}
                    onChange={(e) => setFiscal((p) => ({ ...p, rc: e.target.value }))}
                    placeholder="16/00-0987654B21"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>

                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <label className="t-cap text-[var(--text-2)] font-medium">NIF (Identifiant Fiscal)</label>
                  <input
                    type="text"
                    data-sq="ctl"
                    disabled={!canEdit}
                    value={fiscal.nif || ''}
                    onChange={(e) => setFiscal((p) => ({ ...p, nif: e.target.value }))}
                    placeholder="002116098765432"
                    className={`${inputClass} tabular-nums`}
                  />
                  {errors.nif && (
                    <span className="t-cap text-rose-600 dark:text-rose-400">{errors.nif}</span>
                  )}
                </div>

                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <label className="t-cap text-[var(--text-2)] font-medium">NIS (Statistique)</label>
                  <input
                    type="text"
                    data-sq="ctl"
                    disabled={!canEdit}
                    value={fiscal.nis || ''}
                    onChange={(e) => setFiscal((p) => ({ ...p, nis: e.target.value }))}
                    placeholder="002116098765412"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>

                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <label className="t-cap text-[var(--text-2)] font-medium">
                    {category === 'freelance_solo' || category === 'agriculture_farming'
                      ? 'IFU / Article Imposition (AI)'
                      : "Article d'Imposition (AI)"}
                  </label>
                  <input
                    type="text"
                    data-sq="ctl"
                    disabled={!canEdit}
                    value={fiscal.ai || fiscal.ifu || ''}
                    onChange={(e) =>
                      setFiscal((p) => ({ ...p, ai: e.target.value, ifu: e.target.value }))
                    }
                    placeholder="16290045120"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>

                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <label className="t-cap text-[var(--text-2)] font-medium">{licenseLabel}</label>
                  <input
                    type="text"
                    data-sq="ctl"
                    disabled={!canEdit}
                    value={fiscal.licenseNumber || ''}
                    onChange={(e) => setFiscal((p) => ({ ...p, licenseNumber: e.target.value }))}
                    placeholder="AGR-2026-00412"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>

                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <label className="t-cap text-[var(--text-2)] font-medium">CCP (Algérie Poste)</label>
                  <input
                    type="text"
                    data-sq="ctl"
                    disabled={!canEdit}
                    value={fiscal.ccp || ''}
                    onChange={(e) => setFiscal((p) => ({ ...p, ccp: e.target.value }))}
                    placeholder="0021459812 Clé 44"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>

                <div className="flex flex-col gap-[var(--s1,4px)] sm:col-span-2">
                  <label className="t-cap text-[var(--text-2)] font-medium">RIB Bancaire (20 chiffres)</label>
                  <input
                    type="text"
                    data-sq="ctl"
                    disabled={!canEdit}
                    value={fiscal.rib || ''}
                    onChange={(e) => setFiscal((p) => ({ ...p, rib: e.target.value }))}
                    placeholder="004 00123 4100987654 22"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Category-Calibrated Operational Knobs */}
        <div ref={rulesRef} className="sq-elev-card">
          <div
            data-sq="panel"
            className={`bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)] transition-all ${
              highlighted === 'category_rules' ? 'ring-2 ring-[var(--brand-text)]' : ''
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)] pt-[var(--s1,4px)] px-[var(--s3,12px)] pb-[var(--s2,8px)]">
              <div className="flex items-center gap-[var(--card-head-gap,12px)]">
                <div
                  data-sq="tile"
                  data-sq-border="none"
                  style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
                  className="w-[var(--tile,40px)] h-[var(--tile,40px)] flex items-center justify-center shrink-0"
                >
                  <Sliders size={20} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <h3 className="t-pod text-[var(--text-1)]">
                    {L('Category Operational Parameters', 'Paramètres Métier Spécifiques', 'معايير التشغيل الخاصة بالفئة')}
                  </h3>
                  <p className="t-cap text-[var(--text-2)]">
                    {L(
                      'Calibrated exclusively for your active business category.',
                      'Options calibrées spécifiquement pour votre secteur d’activité.',
                      'إعدادات مخصصة بدقة لطبيعة نشاط منشأتك.'
                    )}
                  </p>
                </div>
              </div>
              {canEdit && (
                <AtriumButton type="submit" size="sm" variant="primary" icon={<CheckCircle2 size={15} strokeWidth={1.5} />}>
                  {L('Apply Category Settings', 'Appliquer les règles', 'تطبيق القواعد')}
                </AtriumButton>
              )}
            </div>

            <div
              data-sq="card"
              className="p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] grid grid-cols-1 md:grid-cols-3 gap-[var(--s3,12px)]"
            >
              {category === 'membership_session' && (
                <>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('RFID Expiry Alert (Days)', 'Alerte expiration RFID (Jours)', 'تنبيه انتهاء البطاقة (أيام)')}
                    </label>
                    <input type="number" min={1} max={30} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.rfidExpiryWarningDays ?? 5}
                      onChange={(e) => updateSetting('rfidExpiryWarningDays', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Max Freeze Quota (Days/Year)', 'Quota gel annuel max (Jours)', 'أقصى مدة تجميد (يوم/سنة)')}
                    </label>
                    <input type="number" min={0} max={180} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.maxFreezeDaysPerYear ?? 30}
                      onChange={(e) => updateSetting('maxFreezeDaysPerYear', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Default Walk-in Day Pass', 'Tarif Séance Libre (DZD)', 'سعر الحصة اليومية')}
                    </label>
                    <input type="number" min={0} step={50} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.defaultDayPassDzd ?? 1000}
                      onChange={(e) => updateSetting('defaultDayPassDzd', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Studio / Floor Max Capacity', 'Capacité max salle', 'السعة القصوى للقاعة')}
                    </label>
                    <input type="number" min={1} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.studioCapacity ?? 45}
                      onChange={(e) => updateSetting('studioCapacity', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                </>
              )}

              {category === 'appointment_service' && (
                <>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Default Stylist Commission (%)', 'Commission coiffeur par défaut (%)', 'عمولة الحلاق الافتراضية (%)')}
                    </label>
                    <input type="number" min={0} max={100} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.defaultCommissionPercent ?? 35}
                      onChange={(e) => updateSetting('defaultCommissionPercent', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Booking Slot Interval', 'Granularité créneaux (min)', 'مدة الفترة الزمنية')}
                    </label>
                    <select data-sq="ctl" disabled={!canEdit}
                      value={catSettings.slotIntervalMinutes ?? 30}
                      onChange={(e) => updateSetting('slotIntervalMinutes', Number(e.target.value) as any)}
                      className={inputClass}>
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Cancellation Notice (Hours)', 'Délai annulation (Heures)', 'مهلة الإلغاء (ساعات)')}
                    </label>
                    <input type="number" min={0} max={72} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.cancellationWindowHours ?? 12}
                      onChange={(e) => updateSetting('cancellationWindowHours', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                </>
              )}

              {category === 'pos_inventory' && (
                <>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Opening Cash Float (DZD)', 'Fond de caisse initial (DZD)', 'رصيد افتتاح الصندوق')}
                    </label>
                    <input type="number" min={0} step={500} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.openingCashFloatDzd ?? 15000}
                      onChange={(e) => updateSetting('openingCashFloatDzd', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Low Stock Warning Threshold', 'Seuil alerte stock bas', 'حد تنبيه انخفاض المخزون')}
                    </label>
                    <input type="number" min={0} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.lowStockThreshold ?? 10}
                      onChange={(e) => updateSetting('lowStockThreshold', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Thermal Receipt Header', 'En-tête ticket thermique', 'ترويسة الوصل الحراري')}
                    </label>
                    <input type="text" data-sq="ctl" disabled={!canEdit}
                      value={posReceipt.headerTitle || ''}
                      onChange={(e) => setPosReceipt((p) => ({ ...p, headerTitle: e.target.value }))}
                      className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)] md:col-span-2">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Thermal Receipt Footer', 'Message pied de ticket', 'تذييل الوصل الحراري')}
                    </label>
                    <input type="text" data-sq="ctl" disabled={!canEdit}
                      value={posReceipt.footerMessage || ''}
                      onChange={(e) => setPosReceipt((p) => ({ ...p, footerMessage: e.target.value }))}
                      className={inputClass} />
                  </div>
                  <div className="flex items-center justify-between px-[var(--s3,12px)] py-[var(--s2,8px)] bg-[#F5F1EC] dark:bg-[#2B2825] border-0" data-sq="ctl" data-sq-border="none">
                    <span className="t-small text-[var(--text-1)]">
                      {L('Allow Negative Stock', 'Autoriser stock négatif', 'السماح بالمخزون السالب')}
                    </span>
                    <Toggle
                      checked={Boolean(catSettings.allowNegativeStock)}
                      onCheckedChange={(val) => {
                        if (canEdit) updateSetting('allowNegativeStock', val);
                      }}
                      aria-label="Negative Stock"
                    />
                  </div>
                </>
              )}

              {category === 'project_milestone' && (
                <>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Direction Approval Threshold (DZD)', 'Seuil validation Direction (DZD)', 'سقف مصادقة الإدارة')}
                    </label>
                    <input type="number" min={0} step={5000} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.directionApprovalThresholdDzd ?? 100000}
                      onChange={(e) => updateSetting('directionApprovalThresholdDzd', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Target Project Margin (%)', 'Marge projet cible (%)', 'هامش الربح المستهدف (%)')}
                    </label>
                    <input type="number" min={0} max={100} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.targetMarginPercent ?? 28}
                      onChange={(e) => updateSetting('targetMarginPercent', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex items-center justify-between px-[var(--s3,12px)] py-[var(--s2,8px)] bg-[#F5F1EC] dark:bg-[#2B2825] border-0" data-sq="ctl" data-sq-border="none">
                    <span className="t-small text-[var(--text-1)]">
                      {L('Require BAT Before Print', 'Exiger BAT avant impression', 'إلزامية BAT قبل الطباعة')}
                    </span>
                    <Toggle
                      checked={Boolean(catSettings.requireBatBeforePrint ?? true)}
                      onCheckedChange={(val) => {
                        if (canEdit) updateSetting('requireBatBeforePrint', val);
                      }}
                      aria-label="Require BAT"
                    />
                  </div>
                </>
              )}

              {category === 'rental_booking' && (
                <>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Default Security Deposit (%)', 'Caution par défaut (%)', 'نسبة مبلغ الضمان (%)')}
                    </label>
                    <input type="number" min={0} max={100} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.defaultSecurityDepositPercent ?? 30}
                      onChange={(e) => updateSetting('defaultSecurityDepositPercent', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Room Turnover Buffer (Hours)', 'Battement remise en état (h)', 'فترة التجهيز بين الحجوزات (س)')}
                    </label>
                    <input type="number" min={0} max={24} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.turnoverBufferHours ?? 2}
                      onChange={(e) => updateSetting('turnoverBufferHours', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Overtime Hourly Surcharge (DZD)', 'Majoration heure supp. (DZD)', 'تعريفة الساعة الإضافية')}
                    </label>
                    <input type="number" min={0} step={500} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.overtimeHourlyFeeDzd ?? 3500}
                      onChange={(e) => updateSetting('overtimeHourlyFeeDzd', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                </>
              )}

              {category === 'education_cohort' && (
                <>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Default Registration Fee (DZD)', "Frais d'inscription dossier (DZD)", 'رسوم التسجيل الافتراضية')}
                    </label>
                    <input type="number" min={0} step={500} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.registrationFeeDzd ?? 2500}
                      onChange={(e) => updateSetting('registrationFeeDzd', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Passing Grade (/20)', 'Note minimale passage (/20)', 'معدل النجاح (/20)')}
                    </label>
                    <input type="number" min={1} max={20} step={0.5} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.passingGradeOutOf20 ?? 10}
                      onChange={(e) => updateSetting('passingGradeOutOf20', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Min Attendance for Certificate (%)', 'Assiduité min attestation (%)', 'نسبة الحضور للشهادة (%)')}
                    </label>
                    <input type="number" min={0} max={100} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.minAttendancePercentForCertificate ?? 80}
                      onChange={(e) => updateSetting('minAttendancePercentForCertificate', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                </>
              )}

              {category === 'freelance_solo' && (
                <>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L(`Default Hourly Rate (${currency})`, `Taux horaire par défaut (${currency})`, `سعر الساعة الافتراضي (${currency})`)}
                    </label>
                    <input type="number" min={0} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.defaultHourlyRate ?? 45}
                      onChange={(e) => updateSetting('defaultHourlyRate', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Tax / IRG Reserve (%)', 'Réserve Fiscale IFU/IRG (%)', 'نسبة الاحتياط الضريبي (%)')}
                    </label>
                    <input type="number" min={0} max={60} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.taxReservePercent ?? 20}
                      onChange={(e) => updateSetting('taxReservePercent', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Invoice Net Terms (Days)', 'Délai règlement factures (Jours)', 'أجل استحقاق الفاتورة (يوم)')}
                    </label>
                    <input type="number" min={0} max={180} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.invoicePaymentTermsDays ?? 15}
                      onChange={(e) => updateSetting('invoicePaymentTermsDays', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                </>
              )}

              {category === 'trading_commercial' && (
                <>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Default Client Credit Limit (DZD)', 'Plafond crédit client B2B (DZD)', 'سقف الائتمان للعميل')}
                    </label>
                    <input type="number" min={0} step={10000} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.defaultCreditLimitDzd ?? 500000}
                      onChange={(e) => updateSetting('defaultCreditLimitDzd', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Default Net Payment Terms (Days)', 'Échéance B2B par défaut (Jours)', 'أجل الدفع الآجل (أيام)')}
                    </label>
                    <input type="number" min={0} max={180} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.defaultNetDays ?? 30}
                      onChange={(e) => updateSetting('defaultNetDays', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex items-center justify-between px-[var(--s3,12px)] py-[var(--s2,8px)] bg-[#F5F1EC] dark:bg-[#2B2825] border-0" data-sq="ctl" data-sq-border="none">
                    <span className="t-small text-[var(--text-1)]">
                      {L('Mandatory RC/NIF on Facture', 'RC/NIF obligatoires sur Facture', 'إلزامية RC/NIF في الفاتورة')}
                    </span>
                    <Toggle
                      checked={Boolean(catSettings.requireLegalIdsOnFacture ?? true)}
                      onCheckedChange={(val) => {
                        if (canEdit) updateSetting('requireLegalIdsOnFacture', val);
                      }}
                      aria-label="Require Legal IDs"
                    />
                  </div>
                </>
              )}

              {category === 'medical_clinic' && (
                <>
                  <div className="flex items-center justify-between px-[var(--s3,12px)] py-[var(--s2,8px)] bg-[#F5F1EC] dark:bg-[#2B2825] border-0" data-sq="ctl" data-sq-border="none">
                    <span className="t-small text-[var(--text-1)]">
                      {L('CNAS / Chifa Reimbursement Mode', 'Mode Tiers-Payant CNAS / Chifa', 'تفعيل تعويض بطاقة الشفاء')}
                    </span>
                    <Toggle
                      checked={Boolean(catSettings.cnasChifaEnabled ?? true)}
                      onCheckedChange={(val) => {
                        if (canEdit) updateSetting('cnasChifaEnabled', val);
                      }}
                      aria-label="Chifa Enabled"
                    />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Ordonnance Print Format', 'Format impression ordonnance', 'حجم ورق الوصفة الطبية')}
                    </label>
                    <select data-sq="ctl" disabled={!canEdit}
                      value={catSettings.ordonnancePaperSize || 'A5'}
                      onChange={(e) => updateSetting('ordonnancePaperSize', e.target.value as 'A4' | 'A5')}
                      className={inputClass}>
                      <option value="A5">A5 (Cabinet Standard)</option>
                      <option value="A4">A4 (Clinique / Compte-rendu)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Waiting Room Ticket Prefix', 'Préfixe file d’attente TV', 'بادئة تذاكر قاعة الانتظار')}
                    </label>
                    <input type="text" maxLength={8} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.queueTicketPrefix ?? 'M-'}
                      onChange={(e) => updateSetting('queueTicketPrefix', e.target.value)}
                      className={inputClass} />
                  </div>
                </>
              )}

              {category === 'auto_garage' && (
                <>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Workshop Hourly Labor Rate (DZD/h)', "Taux horaire main-d'œuvre (DZD/h)", 'سعر ساعة اليد العاملة')}
                    </label>
                    <input type="number" min={0} step={100} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.workshopHourlyRateDzd ?? 2500}
                      onChange={(e) => updateSetting('workshopHourlyRateDzd', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Repair Warranty (Days)', 'Garantie atelier (Jours)', 'مدة الضمان (أيام)')}
                    </label>
                    <input type="number" min={0} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.warrantyDays ?? 90}
                      onChange={(e) => updateSetting('warrantyDays', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Repair Warranty (Kilometers)', 'Garantie kilométrique (km)', 'ضمان المسافة (كم)')}
                    </label>
                    <input type="number" min={0} step={500} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.warrantyKm ?? 5000}
                      onChange={(e) => updateSetting('warrantyKm', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                </>
              )}

              {category === 'real_estate' && (
                <>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Agency Rental Mgmt Fee (%)', 'Honoraires gestion locative (%)', 'عمولة التسيير الإيجاري (%)')}
                    </label>
                    <input type="number" min={0} max={50} step={0.5} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.defaultAgencyManagementFeePercent ?? 7}
                      onChange={(e) => updateSetting('defaultAgencyManagementFeePercent', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Default Sale Commission (%)', 'Commission vente par défaut (%)', 'عمولة البيع الافتراضية (%)')}
                    </label>
                    <input type="number" min={0} max={25} step={0.5} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.defaultSaleCommissionPercent ?? 2}
                      onChange={(e) => updateSetting('defaultSaleCommissionPercent', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Quittance Monthly Due Day', 'Jour échéance quittances', 'يوم استحقاق وصل الإيجار')}
                    </label>
                    <input type="number" min={1} max={28} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.quittanceBillingDay ?? 5}
                      onChange={(e) => updateSetting('quittanceBillingDay', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                </>
              )}

              {category === 'manufacturing_production' && (
                <>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Indirect Overhead Allocation (%)', 'Frais généraux atelier (%)', 'نسبة المصاريف غير المباشرة (%)')}
                    </label>
                    <input type="number" min={0} max={100} step={0.5} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.overheadPercent ?? 12}
                      onChange={(e) => updateSetting('overheadPercent', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('QC Scrap Tolerance (%)', 'Tolérance rebuts QC (%)', 'نسبة التالف المسموحة (%)')}
                    </label>
                    <input type="number" min={0} max={50} step={0.5} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.scrapTolerancePercent ?? 3}
                      onChange={(e) => updateSetting('scrapTolerancePercent', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Batch Traceability Prefix', 'Préfixe traçabilité Lots', 'بادئة رقم الدفعة')}
                    </label>
                    <input type="text" maxLength={12} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.batchCodePrefix ?? 'LOT-'}
                      onChange={(e) => updateSetting('batchCodePrefix', e.target.value)}
                      className={inputClass} />
                  </div>
                </>
              )}

              {category === 'legal_accounting' && (
                <>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Cabinet Practice Mode', 'Spécialité du cabinet', 'تخصص المكتب')}
                    </label>
                    <select data-sq="ctl" disabled={!canEdit}
                      value={catSettings.legalPracticeMode || 'Avocat'}
                      onChange={(e) => updateSetting('legalPracticeMode', e.target.value as any)}
                      className={inputClass}>
                      <option value="Avocat">Cabinet d&apos;Avocat</option>
                      <option value="Notaire">Étude Notariale</option>
                      <option value="Comptable">Cabinet Comptable / CAC</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('CPCA / G50 Alert Window (Days)', 'Alerte délais CPCA/G50 (Jours)', 'مهلة تنبيه الآجال القانونية (يوم)')}
                    </label>
                    <input type="number" min={1} max={60} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.cpcaAlertDays ?? 10}
                      onChange={(e) => updateSetting('cpcaAlertDays', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Default Retainer Provision (%)', 'Provision d’honoraires (%)', 'نسبة التسبيق الافتراضية (%)')}
                    </label>
                    <input type="number" min={0} max={100} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.defaultRetainerPercent ?? 40}
                      onChange={(e) => updateSetting('defaultRetainerPercent', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                </>
              )}

              {category === 'logistics_delivery' && (
                <>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('COD Remittance Fee (%)', 'Commission retour COD (%)', 'عمولة تحصيل الدفع عند الاستلام (%)')}
                    </label>
                    <input type="number" min={0} max={25} step={0.1} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.codRemittanceFeePercent ?? 1.5}
                      onChange={(e) => updateSetting('codRemittanceFeePercent', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Base Parcel Weight (kg)', 'Poids forfaitaire base (kg)', 'الوزن المرجعي الأساسي (كغ)')}
                    </label>
                    <input type="number" min={1} max={100} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.baseWeightThresholdKg ?? 5}
                      onChange={(e) => updateSetting('baseWeightThresholdKg', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Parcel Waybill Prefix', 'Préfixe bordereaux colis', 'بادئة تتبع الطرود')}
                    </label>
                    <input type="text" maxLength={12} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.parcelTrackingPrefix ?? 'ATR-'}
                      onChange={(e) => updateSetting('parcelTrackingPrefix', e.target.value)}
                      className={inputClass} />
                  </div>
                </>
              )}

              {category === 'construction_contractor' && (
                <>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Retenue de Garantie (%)', 'Retenue de garantie (%)', 'نسبة اقتطاع الضمان (%)')}
                    </label>
                    <input type="number" min={0} max={30} step={0.5} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.retenueGarantiePercent ?? 5}
                      onChange={(e) => updateSetting('retenueGarantiePercent', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Avance Forfaitaire (%)', 'Avance forfaitaire (%)', 'التسبيق الجزافي (%)')}
                    </label>
                    <input type="number" min={0} max={50} step={0.5} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.avanceForfaitairePercent ?? 15}
                      onChange={(e) => updateSetting('avanceForfaitairePercent', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('Default Situations Unit', 'Unité Situations par défaut', 'وحدة قياس الوضعيات')}
                    </label>
                    <select data-sq="ctl" disabled={!canEdit}
                      value={catSettings.defaultSituationsUnit || 'm2'}
                      onChange={(e) => updateSetting('defaultSituationsUnit', e.target.value as any)}
                      className={inputClass}>
                      <option value="m2">m² (Surface)</option>
                      <option value="m3">m³ (Volume Béton / Terrassement)</option>
                      <option value="ml">ml (Mètre linéaire)</option>
                      <option value="forfait">Forfait</option>
                    </select>
                  </div>
                </>
              )}

              {category === 'agriculture_farming' && (
                <>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('ANRH Water Quota (m³/ha)', 'Quota eau ANRH (m³/ha)', 'حصة المياه المسموحة (م³/هـ)')}
                    </label>
                    <input type="number" min={0} step={100} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.waterQuotaM3PerHa ?? 4500}
                      onChange={(e) => updateSetting('waterQuotaM3PerHa', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('ONIL Milk Price (DZD/L)', 'Prix lait collecte ONIL (DZD/L)', 'سعر لتر الحليب المرجعي')}
                    </label>
                    <input type="number" min={0} step={1} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.onilMilkPricePerLiterDzd ?? 48}
                      onChange={(e) => updateSetting('onilMilkPricePerLiterDzd', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <label className="t-cap text-[var(--text-2)] font-medium">
                      {L('ONIL State Subsidy (DZD/L)', 'Prime État ONIL (DZD/L)', 'منحة دعم الدولة (دج/ل)')}
                    </label>
                    <input type="number" min={0} step={1} data-sq="ctl" disabled={!canEdit}
                      value={catSettings.onilSubsidyPerLiterDzd ?? 12}
                      onChange={(e) => updateSetting('onilSubsidyPerLiterDzd', Number(e.target.value))}
                      className={`${inputClass} tabular-nums`} />
                  </div>
                </>
              )}
            </div>

            {Object.keys(errors).length > 0 && (
              <div className="px-[var(--s3,12px)] py-[var(--s2,8px)] bg-rose-50 dark:bg-rose-950/30 [--sq-stroke:#fecdd3] dark:[--sq-stroke:#9f1239] flex items-center gap-[var(--s2,8px)] t-small text-rose-700 dark:text-rose-300" data-sq="ctl">
                <AlertTriangle size={15} strokeWidth={1.5} className="shrink-0" />
                <span>{Object.values(errors)[0]}</span>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
