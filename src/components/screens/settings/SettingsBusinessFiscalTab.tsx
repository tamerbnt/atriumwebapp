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
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBusinessConfigFromState,
} from '../../../services/store';
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
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { LiveSwitch } from '../../ui/live/LiveSwitch';

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
  } = useAtriumSelector(
    (s) => ({
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBusinessConfig: selectCurrentBusinessConfigFromState(s),
      currentUser: s.currentUser,
      language: s.language,
      receiptConfig: s.receiptConfig,
    }),
    shallowEqualObjects
  );
  const { updateBusinessIdentity, updateBusinessConfig, updateReceiptConfig } = useAtriumActions();

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
  const [invoiceFooter, setInvoiceFooter] = useState<string>(currentBusinessConfig.invoiceFooter || '');
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
    setInvoiceFooter(currentBusinessConfig.invoiceFooter || '');
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
      invoiceFooter: invoiceFooter.trim() || undefined,
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
            <LabelInput
              label={L('Legal / Registered Name', 'Raison sociale / Nom officiel', 'الاسم القانوني للمنشأة')}
              value={bizName}
              disabled={!canEdit}
              onChange={setBizName}
              error={errors.bizName}
            />

            <LabelInput
              label={L('Commercial Display Name', 'Nom d’enseigne affiché', 'الاسم التجاري المعروض')}
              value={bizDisplayName}
              disabled={!canEdit}
              onChange={setBizDisplayName}
            />

            <LabelInput
              label={L('Headquarters Address', 'Adresse du siège social', 'عنوان المقر')}
              value={bizAddress}
              disabled={!canEdit}
              onChange={setBizAddress}
              placeholder="14 Rue Didouche Mourad, Alger"
            />

            <LabelInput
              type="tel"
              label={L('Business Phone', 'Téléphone principal', 'هاتف التواصل')}
              value={bizPhone}
              disabled={!canEdit}
              onChange={setBizPhone}
              placeholder="+213 550 00 00 00"
            />
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--s3,12px)] items-end">
                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <span className="t-cap text-[var(--text-2)] font-medium">
                    {L('Primary Currency', 'Devise principale', 'العملة الأساسية')}
                  </span>
                  <LiveSegmentedControl
                    aria-label={L('Primary Currency', 'Devise principale', 'العملة الأساسية')}
                    size="md"
                    fullWidth
                    value={currency}
                    onValueChange={(val) => {
                      if (canEdit) setCurrency(val as CurrencyCode);
                    }}
                    options={[
                      { value: 'DZD', label: 'DZD', disabled: !canEdit },
                      { value: 'EUR', label: 'EUR (€)', disabled: !canEdit },
                      { value: 'USD', label: 'USD ($)', disabled: !canEdit },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-[var(--s1,4px)]">
                  <div className="flex items-start gap-[var(--s2,8px)]">
                    <div className="flex-1 min-w-0">
                      <LabelSelect
                        label={L('Default TVA Rate (%)', 'Taux TVA par défaut (%)', 'نسبة الضريبة TVA (%)')}
                        value={[0, 9, 19].includes(defaultTvaRate) ? String(defaultTvaRate) : 'custom'}
                        disabled={!canEdit}
                        onChange={(val) => {
                          if (val !== 'custom') {
                            setDefaultTvaRate(Number(val));
                          }
                        }}
                        options={[
                          { value: '19', label: `19% · ${L('Standard Rate', 'Taux Normal', 'المعدل العادي')}` },
                          { value: '9', label: `9% · ${L('Reduced Rate', 'Taux Réduit', 'المعدل المخفض')}` },
                          { value: '0', label: `0% · ${L('TVA Exempt', 'Exonéré TVA', 'معفى من الضريبة')}` },
                          ...([0, 9, 19].includes(defaultTvaRate) ? [] : [{ value: 'custom', label: `${defaultTvaRate}%` }]),
                        ]}
                      />
                    </div>
                    <div className="w-[96px] shrink-0">
                      <LabelInput
                        type="number"
                        label="%"
                        min={0}
                        max={100}
                        step={0.5}
                        value={defaultTvaRate}
                        disabled={!canEdit}
                        onChange={(val) => setDefaultTvaRate(Number(val) || 0)}
                        error={errors.defaultTvaRate}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-[var(--s3,12px)] px-[var(--s3,12px)] py-[var(--s2,8px)] bg-[var(--lbi-bg,#F5F1EC)] dark:bg-[var(--lbi-bg,#292624)] border-0 min-h-[40px]" data-sq="ctl" data-sq-border="none">
                  <div className="flex flex-col">
                    <span className="t-small font-medium text-[var(--text-1)]">
                      {L('Timbre Fiscal (Cash)', 'Timbre Fiscal (Espèces)', 'الطابع الجبائي (نقداً)')}
                    </span>
                    <span className="t-cap text-[var(--text-2)]">
                      {L('DGI LF 2025 cash bracket', 'Barème DGI sur règlements espèces', 'تطبيق رسم الطابع عند الدفع نقداً')}
                    </span>
                  </div>
                  <LiveSwitch
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
                <LabelSelect
                  label={L('Legal Entity Form', 'Forme Juridique', 'الشكل القانوني')}
                  value={fiscal.legalForm || 'SARL'}
                  disabled={!canEdit}
                  onChange={(val) => setFiscal((p) => ({ ...p, legalForm: val as any }))}
                  options={[
                    { value: 'SARL', label: 'SARL' },
                    { value: 'EURL', label: 'EURL' },
                    { value: 'SPA', label: 'SPA' },
                    { value: 'SNC', label: 'SNC' },
                    { value: 'AutoEntrepreneur', label: 'Auto-Entrepreneur' },
                    { value: 'Liberal', label: 'Profession Libérale' },
                    { value: 'Other', label: L('Other', 'Autre', 'أخرى') },
                  ]}
                />

                <LabelInput
                  label="RC (Registre Commerce)"
                  disabled={!canEdit}
                  value={fiscal.rc || ''}
                  onChange={(val) => setFiscal((p) => ({ ...p, rc: val }))}
                  placeholder="16/00-0987654B21"
                />

                <LabelInput
                  label="NIF (Identifiant Fiscal)"
                  disabled={!canEdit}
                  value={fiscal.nif || ''}
                  onChange={(val) => setFiscal((p) => ({ ...p, nif: val }))}
                  placeholder="002116098765432"
                  error={errors.nif}
                />

                <LabelInput
                  label="NIS (Statistique)"
                  disabled={!canEdit}
                  value={fiscal.nis || ''}
                  onChange={(val) => setFiscal((p) => ({ ...p, nis: val }))}
                  placeholder="002116098765412"
                />

                <LabelInput
                  label={
                    category === 'freelance_solo' || category === 'agriculture_farming'
                      ? 'IFU / Article Imposition (AI)'
                      : "Article d'Imposition (AI)"
                  }
                  disabled={!canEdit}
                  value={fiscal.ai || fiscal.ifu || ''}
                  onChange={(val) => setFiscal((p) => ({ ...p, ai: val, ifu: val }))}
                  placeholder="16290045120"
                />

                <LabelInput
                  label={licenseLabel}
                  disabled={!canEdit}
                  value={fiscal.licenseNumber || ''}
                  onChange={(val) => setFiscal((p) => ({ ...p, licenseNumber: val }))}
                  placeholder="AGR-2026-00412"
                />

                <LabelInput
                  label="CCP (Algérie Poste)"
                  disabled={!canEdit}
                  value={fiscal.ccp || ''}
                  onChange={(val) => setFiscal((p) => ({ ...p, ccp: val }))}
                  placeholder="0021459812 Clé 44"
                />

                <div className="sm:col-span-2">
                  <LabelInput
                    label="RIB Bancaire (20 chiffres)"
                    disabled={!canEdit}
                    value={fiscal.rib || ''}
                    onChange={(val) => setFiscal((p) => ({ ...p, rib: val }))}
                    placeholder="004 00123 4100987654 22"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <LabelInput
                    label={L('Invoice Footer / Legal Mention', 'Pied de facture / Mention légale', 'تذييل الفاتورة / البيان القانوني')}
                    disabled={!canEdit}
                    value={invoiceFooter}
                    onChange={setInvoiceFooter}
                    placeholder={L(
                      'Ex: Bank settlement within 15 days · Late payment penalties apply.',
                      'Ex : Règlement par virement sous 15 jours · Merci de votre confiance.',
                      'مثال: السداد عبر التحويل خلال 15 يوماً · شكراً لثقتكم.'
                    )}
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
              className="p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] grid grid-cols-1 md:grid-cols-3 gap-[var(--s3,12px)] items-end"
            >
              {category === 'membership_session' && (
                <>
                  <LabelInput
                    type="number"
                    min={1}
                    max={30}
                    disabled={!canEdit}
                    label={L('RFID Expiry Alert (Days)', 'Alerte expiration RFID (Jours)', 'تنبيه انتهاء البطاقة (أيام)')}
                    value={catSettings.rfidExpiryWarningDays ?? 5}
                    onChange={(val) => updateSetting('rfidExpiryWarningDays', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    max={180}
                    disabled={!canEdit}
                    label={L('Max Freeze Quota (Days/Year)', 'Quota gel annuel max (Jours)', 'أقصى مدة تجميد (يوم/سنة)')}
                    value={catSettings.maxFreezeDaysPerYear ?? 30}
                    onChange={(val) => updateSetting('maxFreezeDaysPerYear', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    step={50}
                    disabled={!canEdit}
                    label={L('Default Walk-in Day Pass', 'Tarif Séance Libre (DZD)', 'سعر الحصة اليومية')}
                    value={catSettings.defaultDayPassDzd ?? 1000}
                    onChange={(val) => updateSetting('defaultDayPassDzd', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={1}
                    disabled={!canEdit}
                    label={L('Studio / Floor Max Capacity', 'Capacité max salle', 'السعة القصوى للقاعة')}
                    value={catSettings.studioCapacity ?? 45}
                    onChange={(val) => updateSetting('studioCapacity', Number(val) || 1)}
                  />
                </>
              )}

              {category === 'appointment_service' && (
                <>
                  <LabelInput
                    type="number"
                    min={0}
                    max={100}
                    disabled={!canEdit}
                    label={L('Default Stylist Commission (%)', 'Commission coiffeur par défaut (%)', 'عمولة الحلاق الافتراضية (%)')}
                    value={catSettings.defaultCommissionPercent ?? 35}
                    onChange={(val) => updateSetting('defaultCommissionPercent', Number(val) || 0)}
                  />
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <span className="t-cap text-[var(--text-2)] font-medium">
                      {L('Booking Slot Interval', 'Granularité créneaux (min)', 'مدة الفترة الزمنية')}
                    </span>
                    <LiveSegmentedControl
                      aria-label={L('Booking Slot Interval', 'Granularité créneaux (min)', 'مدة الفترة الزمنية')}
                      size="md"
                      fullWidth
                      value={String(catSettings.slotIntervalMinutes ?? 30)}
                      onValueChange={(val) => {
                        if (canEdit) updateSetting('slotIntervalMinutes', Number(val) as any);
                      }}
                      options={[
                        { value: '15', label: '15m', disabled: !canEdit },
                        { value: '30', label: '30m', disabled: !canEdit },
                        { value: '45', label: '45m', disabled: !canEdit },
                        { value: '60', label: '60m', disabled: !canEdit },
                      ]}
                    />
                  </div>
                  <LabelInput
                    type="number"
                    min={0}
                    max={72}
                    disabled={!canEdit}
                    label={L('Cancellation Notice (Hours)', 'Délai annulation (Heures)', 'مهلة الإلغاء (ساعات)')}
                    value={catSettings.cancellationWindowHours ?? 12}
                    onChange={(val) => updateSetting('cancellationWindowHours', Number(val) || 0)}
                  />
                </>
              )}

              {category === 'pos_inventory' && (
                <>
                  <LabelInput
                    type="number"
                    min={0}
                    step={500}
                    disabled={!canEdit}
                    label={L('Opening Cash Float (DZD)', 'Fond de caisse initial (DZD)', 'رصيد افتتاح الصندوق')}
                    value={catSettings.openingCashFloatDzd ?? 15000}
                    onChange={(val) => updateSetting('openingCashFloatDzd', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    disabled={!canEdit}
                    label={L('Low Stock Warning Threshold', 'Seuil alerte stock bas', 'حد تنبيه انخفاض المخزون')}
                    value={catSettings.lowStockThreshold ?? 10}
                    onChange={(val) => updateSetting('lowStockThreshold', Number(val) || 0)}
                  />
                  <LabelInput
                    disabled={!canEdit}
                    label={L('Thermal Receipt Header', 'En-tête ticket thermique', 'ترويسة الوصل الحراري')}
                    value={posReceipt.headerTitle || ''}
                    onChange={(val) => setPosReceipt((p) => ({ ...p, headerTitle: val }))}
                  />
                  <div className="md:col-span-2">
                    <LabelInput
                      disabled={!canEdit}
                      label={L('Thermal Receipt Footer', 'Message pied de ticket', 'تذييل الوصل الحراري')}
                      value={posReceipt.footerMessage || ''}
                      onChange={(val) => setPosReceipt((p) => ({ ...p, footerMessage: val }))}
                    />
                  </div>
                  <div className="flex items-center justify-between px-[var(--s3,12px)] py-[var(--s2,8px)] bg-[var(--lbi-bg,#F5F1EC)] dark:bg-[var(--lbi-bg,#292624)] border-0 min-h-[40px]" data-sq="ctl" data-sq-border="none">
                    <span className="t-small text-[var(--text-1)]">
                      {L('Allow Negative Stock', 'Autoriser stock négatif', 'السماح بالمخزون السالب')}
                    </span>
                    <LiveSwitch
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
                  <LabelInput
                    type="number"
                    min={0}
                    step={5000}
                    disabled={!canEdit}
                    label={L('Direction Approval Threshold (DZD)', 'Seuil validation Direction (DZD)', 'سقف مصادقة الإدارة')}
                    value={catSettings.directionApprovalThresholdDzd ?? 100000}
                    onChange={(val) => updateSetting('directionApprovalThresholdDzd', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    max={100}
                    disabled={!canEdit}
                    label={L('Target Project Margin (%)', 'Marge projet cible (%)', 'هامش الربح المستهدف (%)')}
                    value={catSettings.targetMarginPercent ?? 28}
                    onChange={(val) => updateSetting('targetMarginPercent', Number(val) || 0)}
                  />
                  <div className="flex items-center justify-between px-[var(--s3,12px)] py-[var(--s2,8px)] bg-[var(--lbi-bg,#F5F1EC)] dark:bg-[var(--lbi-bg,#292624)] border-0 min-h-[40px]" data-sq="ctl" data-sq-border="none">
                    <span className="t-small text-[var(--text-1)]">
                      {L('Require BAT Before Print', 'Exiger BAT avant impression', 'إلزامية BAT قبل الطباعة')}
                    </span>
                    <LiveSwitch
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
                  <LabelInput
                    type="number"
                    min={0}
                    max={100}
                    disabled={!canEdit}
                    label={L('Default Security Deposit (%)', 'Caution par défaut (%)', 'نسبة مبلغ الضمان (%)')}
                    value={catSettings.defaultSecurityDepositPercent ?? 30}
                    onChange={(val) => updateSetting('defaultSecurityDepositPercent', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    max={24}
                    disabled={!canEdit}
                    label={L('Room Turnover Buffer (Hours)', 'Battement remise en état (h)', 'فترة التجهيز بين الحجوزات (س)')}
                    value={catSettings.turnoverBufferHours ?? 2}
                    onChange={(val) => updateSetting('turnoverBufferHours', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    step={500}
                    disabled={!canEdit}
                    label={L('Overtime Hourly Surcharge (DZD)', 'Majoration heure supp. (DZD)', 'تعريفة الساعة الإضافية')}
                    value={catSettings.overtimeHourlyFeeDzd ?? 3500}
                    onChange={(val) => updateSetting('overtimeHourlyFeeDzd', Number(val) || 0)}
                  />
                </>
              )}

              {category === 'education_cohort' && (
                <>
                  <LabelInput
                    type="number"
                    min={0}
                    step={500}
                    disabled={!canEdit}
                    label={L('Default Registration Fee (DZD)', "Frais d'inscription dossier (DZD)", 'رسوم التسجيل الافتراضية')}
                    value={catSettings.registrationFeeDzd ?? 2500}
                    onChange={(val) => updateSetting('registrationFeeDzd', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={1}
                    max={20}
                    step={0.5}
                    disabled={!canEdit}
                    label={L('Passing Grade (/20)', 'Note minimale passage (/20)', 'معدل النجاح (/20)')}
                    value={catSettings.passingGradeOutOf20 ?? 10}
                    onChange={(val) => updateSetting('passingGradeOutOf20', Number(val) || 1)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    max={100}
                    disabled={!canEdit}
                    label={L('Min Attendance for Certificate (%)', 'Assiduité min attestation (%)', 'نسبة الحضور للشهادة (%)')}
                    value={catSettings.minAttendancePercentForCertificate ?? 80}
                    onChange={(val) => updateSetting('minAttendancePercentForCertificate', Number(val) || 0)}
                  />
                </>
              )}

              {category === 'freelance_solo' && (
                <>
                  <LabelInput
                    type="number"
                    min={0}
                    disabled={!canEdit}
                    label={L(`Default Hourly Rate (${currency})`, `Taux horaire par défaut (${currency})`, `سعر الساعة الافتراضي (${currency})`)}
                    value={catSettings.defaultHourlyRate ?? 45}
                    onChange={(val) => updateSetting('defaultHourlyRate', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    max={60}
                    disabled={!canEdit}
                    label={L('Tax / IRG Reserve (%)', 'Réserve Fiscale IFU/IRG (%)', 'نسبة الاحتياط الضريبي (%)')}
                    value={catSettings.taxReservePercent ?? 20}
                    onChange={(val) => updateSetting('taxReservePercent', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    max={180}
                    disabled={!canEdit}
                    label={L('Invoice Net Terms (Days)', 'Délai règlement factures (Jours)', 'أجل استحقاق الفاتورة (يوم)')}
                    value={catSettings.invoicePaymentTermsDays ?? 15}
                    onChange={(val) => updateSetting('invoicePaymentTermsDays', Number(val) || 0)}
                  />
                </>
              )}

              {category === 'trading_commercial' && (
                <>
                  <LabelInput
                    type="number"
                    min={0}
                    step={10000}
                    disabled={!canEdit}
                    label={L('Default Client Credit Limit (DZD)', 'Plafond crédit client B2B (DZD)', 'سقف الائتمان للعميل')}
                    value={catSettings.defaultCreditLimitDzd ?? 500000}
                    onChange={(val) => updateSetting('defaultCreditLimitDzd', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    max={180}
                    disabled={!canEdit}
                    label={L('Default Net Payment Terms (Days)', 'Échéance B2B par défaut (Jours)', 'أجل الدفع الآجل (أيام)')}
                    value={catSettings.defaultNetDays ?? 30}
                    onChange={(val) => updateSetting('defaultNetDays', Number(val) || 0)}
                  />
                  <div className="flex items-center justify-between px-[var(--s3,12px)] py-[var(--s2,8px)] bg-[var(--lbi-bg,#F5F1EC)] dark:bg-[var(--lbi-bg,#292624)] border-0 min-h-[40px]" data-sq="ctl" data-sq-border="none">
                    <span className="t-small text-[var(--text-1)]">
                      {L('Mandatory RC/NIF on Facture', 'RC/NIF obligatoires sur Facture', 'إلزامية RC/NIF في الفاتورة')}
                    </span>
                    <LiveSwitch
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
                  <div className="flex items-center justify-between px-[var(--s3,12px)] py-[var(--s2,8px)] bg-[var(--lbi-bg,#F5F1EC)] dark:bg-[var(--lbi-bg,#292624)] border-0 min-h-[40px]" data-sq="ctl" data-sq-border="none">
                    <span className="t-small text-[var(--text-1)]">
                      {L('CNAS / Chifa Reimbursement Mode', 'Mode Tiers-Payant CNAS / Chifa', 'تفعيل تعويض بطاقة الشفاء')}
                    </span>
                    <LiveSwitch
                      checked={Boolean(catSettings.cnasChifaEnabled ?? true)}
                      onCheckedChange={(val) => {
                        if (canEdit) updateSetting('cnasChifaEnabled', val);
                      }}
                      aria-label="Chifa Enabled"
                    />
                  </div>
                  <div className="flex flex-col gap-[var(--s1,4px)]">
                    <span className="t-cap text-[var(--text-2)] font-medium">
                      {L('Ordonnance Print Format', 'Format impression ordonnance', 'حجم ورق الوصفة الطبية')}
                    </span>
                    <LiveSegmentedControl
                      aria-label={L('Ordonnance Print Format', 'Format impression ordonnance', 'حجم ورق الوصفة الطبية')}
                      size="md"
                      fullWidth
                      value={catSettings.ordonnancePaperSize || 'A5'}
                      onValueChange={(val) => {
                        if (canEdit) updateSetting('ordonnancePaperSize', val as 'A4' | 'A5');
                      }}
                      options={[
                        { value: 'A5', label: 'A5 (Cabinet)', disabled: !canEdit },
                        { value: 'A4', label: 'A4 (Clinique)', disabled: !canEdit },
                      ]}
                    />
                  </div>
                  <LabelInput
                    disabled={!canEdit}
                    label={L('Waiting Room Ticket Prefix', 'Préfixe file d’attente TV', 'بادئة تذاكر قاعة الانتظار')}
                    value={catSettings.queueTicketPrefix ?? 'M-'}
                    onChange={(val) => updateSetting('queueTicketPrefix', val.slice(0, 8))}
                  />
                </>
              )}

              {category === 'auto_garage' && (
                <>
                  <LabelInput
                    type="number"
                    min={0}
                    step={100}
                    disabled={!canEdit}
                    label={L('Workshop Hourly Labor Rate (DZD/h)', "Taux horaire main-d'œuvre (DZD/h)", 'سعر ساعة اليد العاملة')}
                    value={catSettings.workshopHourlyRateDzd ?? 2500}
                    onChange={(val) => updateSetting('workshopHourlyRateDzd', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    disabled={!canEdit}
                    label={L('Repair Warranty (Days)', 'Garantie atelier (Jours)', 'مدة الضمان (أيام)')}
                    value={catSettings.warrantyDays ?? 90}
                    onChange={(val) => updateSetting('warrantyDays', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    step={500}
                    disabled={!canEdit}
                    label={L('Repair Warranty (Kilometers)', 'Garantie kilométrique (km)', 'ضمان المسافة (كم)')}
                    value={catSettings.warrantyKm ?? 5000}
                    onChange={(val) => updateSetting('warrantyKm', Number(val) || 0)}
                  />
                </>
              )}

              {category === 'real_estate' && (
                <>
                  <LabelInput
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    disabled={!canEdit}
                    label={L('Agency Rental Mgmt Fee (%)', 'Honoraires gestion locative (%)', 'عمولة التسيير الإيجاري (%)')}
                    value={catSettings.defaultAgencyManagementFeePercent ?? 7}
                    onChange={(val) => updateSetting('defaultAgencyManagementFeePercent', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    max={25}
                    step={0.5}
                    disabled={!canEdit}
                    label={L('Default Sale Commission (%)', 'Commission vente par défaut (%)', 'عمولة البيع الافتراضية (%)')}
                    value={catSettings.defaultSaleCommissionPercent ?? 2}
                    onChange={(val) => updateSetting('defaultSaleCommissionPercent', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={1}
                    max={28}
                    disabled={!canEdit}
                    label={L('Quittance Monthly Due Day', 'Jour échéance quittances', 'يوم استحقاق وصل الإيجار')}
                    value={catSettings.quittanceBillingDay ?? 5}
                    onChange={(val) => updateSetting('quittanceBillingDay', Number(val) || 1)}
                  />
                </>
              )}

              {category === 'manufacturing_production' && (
                <>
                  <LabelInput
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    disabled={!canEdit}
                    label={L('Indirect Overhead Allocation (%)', 'Frais généraux atelier (%)', 'نسبة المصاريف غير المباشرة (%)')}
                    value={catSettings.overheadPercent ?? 12}
                    onChange={(val) => updateSetting('overheadPercent', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    disabled={!canEdit}
                    label={L('QC Scrap Tolerance (%)', 'Tolérance rebuts QC (%)', 'نسبة التالف المسموحة (%)')}
                    value={catSettings.scrapTolerancePercent ?? 3}
                    onChange={(val) => updateSetting('scrapTolerancePercent', Number(val) || 0)}
                  />
                  <LabelInput
                    disabled={!canEdit}
                    label={L('Batch Traceability Prefix', 'Préfixe traçabilité Lots', 'بادئة رقم الدفعة')}
                    value={catSettings.batchCodePrefix ?? 'LOT-'}
                    onChange={(val) => updateSetting('batchCodePrefix', val.slice(0, 12))}
                  />
                </>
              )}

              {category === 'legal_accounting' && (
                <>
                  <LabelSelect
                    label={L('Cabinet Practice Mode', 'Spécialité du cabinet', 'تخصص المكتب')}
                    disabled={!canEdit}
                    value={catSettings.legalPracticeMode || 'Avocat'}
                    onChange={(val) => updateSetting('legalPracticeMode', val as any)}
                    options={[
                      { value: 'Avocat', label: "Cabinet d'Avocat" },
                      { value: 'Notaire', label: 'Étude Notariale' },
                      { value: 'Comptable', label: 'Cabinet Comptable / CAC' },
                    ]}
                  />
                  <LabelInput
                    type="number"
                    min={1}
                    max={60}
                    disabled={!canEdit}
                    label={L('CPCA / G50 Alert Window (Days)', 'Alerte délais CPCA/G50 (Jours)', 'مهلة تنبيه الآجال القانونية (يوم)')}
                    value={catSettings.cpcaAlertDays ?? 10}
                    onChange={(val) => updateSetting('cpcaAlertDays', Number(val) || 1)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    max={100}
                    disabled={!canEdit}
                    label={L('Default Retainer Provision (%)', 'Provision d’honoraires (%)', 'نسبة التسبيق الافتراضية (%)')}
                    value={catSettings.defaultRetainerPercent ?? 40}
                    onChange={(val) => updateSetting('defaultRetainerPercent', Number(val) || 0)}
                  />
                </>
              )}

              {category === 'logistics_delivery' && (
                <>
                  <LabelInput
                    type="number"
                    min={0}
                    max={25}
                    step={0.1}
                    disabled={!canEdit}
                    label={L('COD Remittance Fee (%)', 'Commission retour COD (%)', 'عمولة تحصيل الدفع عند الاستلام (%)')}
                    value={catSettings.codRemittanceFeePercent ?? 1.5}
                    onChange={(val) => updateSetting('codRemittanceFeePercent', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={1}
                    max={100}
                    disabled={!canEdit}
                    label={L('Base Parcel Weight (kg)', 'Poids forfaitaire base (kg)', 'الوزن المرجعي الأساسي (كغ)')}
                    value={catSettings.baseWeightThresholdKg ?? 5}
                    onChange={(val) => updateSetting('baseWeightThresholdKg', Number(val) || 1)}
                  />
                  <LabelInput
                    disabled={!canEdit}
                    label={L('Parcel Waybill Prefix', 'Préfixe bordereaux colis', 'بادئة تتبع الطرود')}
                    value={catSettings.parcelTrackingPrefix ?? 'ATR-'}
                    onChange={(val) => updateSetting('parcelTrackingPrefix', val.slice(0, 12))}
                  />
                </>
              )}

              {category === 'construction_contractor' && (
                <>
                  <LabelInput
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    disabled={!canEdit}
                    label={L('Retenue de Garantie (%)', 'Retenue de garantie (%)', 'نسبة اقتطاع الضمان (%)')}
                    value={catSettings.retenueGarantiePercent ?? 5}
                    onChange={(val) => updateSetting('retenueGarantiePercent', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    disabled={!canEdit}
                    label={L('Avance Forfaitaire (%)', 'Avance forfaitaire (%)', 'التسبيق الجزافي (%)')}
                    value={catSettings.avanceForfaitairePercent ?? 15}
                    onChange={(val) => updateSetting('avanceForfaitairePercent', Number(val) || 0)}
                  />
                  <LabelSelect
                    label={L('Default Situations Unit', 'Unité Situations par défaut', 'وحدة قياس الوضعيات')}
                    disabled={!canEdit}
                    value={catSettings.defaultSituationsUnit || 'm2'}
                    onChange={(val) => updateSetting('defaultSituationsUnit', val as any)}
                    options={[
                      { value: 'm2', label: 'm² (Surface)' },
                      { value: 'm3', label: 'm³ (Volume Béton / Terrassement)' },
                      { value: 'ml', label: 'ml (Mètre linéaire)' },
                      { value: 'forfait', label: 'Forfait' },
                    ]}
                  />
                </>
              )}

              {category === 'agriculture_farming' && (
                <>
                  <LabelInput
                    type="number"
                    min={0}
                    step={100}
                    disabled={!canEdit}
                    label={L('ANRH Water Quota (m³/ha)', 'Quota eau ANRH (m³/ha)', 'حصة المياه المسموحة (م³/هـ)')}
                    value={catSettings.waterQuotaM3PerHa ?? 4500}
                    onChange={(val) => updateSetting('waterQuotaM3PerHa', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    step={1}
                    disabled={!canEdit}
                    label={L('ONIL Milk Price (DZD/L)', 'Prix lait collecte ONIL (DZD/L)', 'سعر لتر الحليب المرجعي')}
                    value={catSettings.onilMilkPricePerLiterDzd ?? 48}
                    onChange={(val) => updateSetting('onilMilkPricePerLiterDzd', Number(val) || 0)}
                  />
                  <LabelInput
                    type="number"
                    min={0}
                    step={1}
                    disabled={!canEdit}
                    label={L('ONIL State Subsidy (DZD/L)', 'Prime État ONIL (DZD/L)', 'منحة دعم الدولة (دج/ل)')}
                    value={catSettings.onilSubsidyPerLiterDzd ?? 12}
                    onChange={(val) => updateSetting('onilSubsidyPerLiterDzd', Number(val) || 0)}
                  />
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
