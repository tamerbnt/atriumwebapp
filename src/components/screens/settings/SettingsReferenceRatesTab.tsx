import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Plus,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import {
  isSupabaseConfigured,
  logisticsService,
  referenceDataService,
  type PlatformAdminStatus,
  type StatutoryRateSet,
  type WilayaReferenceRow,
} from '../../../lib/supabase';
import {
  getLocalCodeBaselineStatutoryRate,
  getLocalFallbackWilayasRef,
  getMissingStatutoryParameters,
  selectEffectiveStatutoryRate,
} from '../../../lib/supabase/services/referenceDataService';
import { DEFAULT_TARIFF_RULES, type TariffRule, type WilayaZone } from '../../../utils/logisticsRules';
import { WilayaTariffModal } from '../logistics/WilayaTariffModal';

export const SettingsReferenceRatesTab: React.FC = () => {
  const language = useAtriumSelector((s) => s.language);
  const currentBranchId = useAtriumSelector((s) => s.currentBranchId);

  const [adminStatus, setAdminStatus] = useState<PlatformAdminStatus>({
    isAdmin: false,
    isSuperAdmin: false,
    role: null,
  });
  const [rates, setRates] = useState<StatutoryRateSet[]>(() => [getLocalCodeBaselineStatutoryRate()]);
  const [wilayas, setWilayas] = useState<WilayaReferenceRow[]>(() => getLocalFallbackWilayasRef());
  const [tariffRules, setTariffRules] = useState<Record<WilayaZone, TariffRule>>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_tariffs_v1');
      return saved ? { ...DEFAULT_TARIFF_RULES, ...JSON.parse(saved) } : DEFAULT_TARIFF_RULES;
    } catch {
      return DEFAULT_TARIFF_RULES;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);
  const [wilayaSearch, setWilayaSearch] = useState('');

  // New version form state (always inserts a brand-new row; never mutates historical rates)
  const [showNewVersionForm, setShowNewVersionForm] = useState(false);
  const [newVersionCode, setNewVersionCode] = useState('DZ-STATUTORY-2026');
  const [newEffectiveFrom, setNewEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [newSnmgDzd, setNewSnmgDzd] = useState('');
  const [newCnasSalarialPct, setNewCnasSalarialPct] = useState('9');
  const [newCnasPatronalPct, setNewCnasPatronalPct] = useState('26');
  const [newIrgExemptionDzd, setNewIrgExemptionDzd] = useState('30000');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);

  const loadReferenceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [adminRes, ratesRes, wilayasRes] = await Promise.all([
        referenceDataService.checkIsPlatformAdmin(),
        referenceDataService.fetchStatutoryRates(),
        referenceDataService.fetchWilayasRef(),
      ]);
      setAdminStatus(adminRes);
      setRates(ratesRes.rates);
      setWilayas(wilayasRes.wilayas);

      if (currentBranchId && isSupabaseConfigured()) {
        const remoteTariffs = await logisticsService.fetchWilayaTariffs(currentBranchId);
        if (Object.keys(remoteTariffs).length > 0) {
          setTariffRules((prev) => ({ ...DEFAULT_TARIFF_RULES, ...prev, ...remoteTariffs }));
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentBranchId]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  const activeRate = useMemo(
    () => selectEffectiveStatutoryRate(rates, todayIso) ?? getLocalCodeBaselineStatutoryRate(),
    [rates, todayIso]
  );

  const missingParams = useMemo(() => getMissingStatutoryParameters(activeRate), [activeRate]);

  const filteredWilayas = useMemo(() => {
    const q = wilayaSearch.trim().toLowerCase();
    if (!q) return wilayas;
    return wilayas.filter(
      (w) =>
        String(w.code) === q ||
        w.nameFr.toLowerCase().includes(q) ||
        w.nameEn.toLowerCase().includes(q) ||
        w.nameAr.includes(q) ||
        w.defaultZone.toLowerCase().includes(q)
    );
  }, [wilayas, wilayaSearch]);

  const handleVerifyRate = async (rateId: string, status: 'verified' | 'superseded') => {
    setIsSubmitting(true);
    try {
      const res = await referenceDataService.verifyStatutoryRateVersion(rateId, status);
      if (res.error) {
        showToast({ type: 'error', title: t('ref_statutory_title', language), message: res.error });
        return;
      }
      showToast({
        type: 'success',
        title: t('ref_statutory_title', language),
        message: status === 'verified' ? t('ref_status_verified', language) : t('ref_status_superseded', language),
      });
      await loadReferenceData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const parsedSnmg = newSnmgDzd.trim() === '' ? null : Number(newSnmgDzd);
      const cnasSal = Number(newCnasSalarialPct) / 100;
      const cnasPat = Number(newCnasPatronalPct) / 100;
      const irgEx = Number(newIrgExemptionDzd);

      const res = await referenceDataService.createStatutoryRateVersion({
        versionCode: newVersionCode.trim(),
        effectiveFrom: newEffectiveFrom.trim(),
        cnasSalarialRate: Number.isFinite(cnasSal) ? cnasSal : activeRate.cnasSalarialRate,
        cnasPatronalRate: Number.isFinite(cnasPat) ? cnasPat : activeRate.cnasPatronalRate,
        irgBrackets: activeRate.irgBrackets,
        irgAbatementRate: activeRate.irgAbatementRate,
        irgAbatementMinDzd: activeRate.irgAbatementMinDzd,
        irgAbatementMaxDzd: activeRate.irgAbatementMaxDzd,
        irgExemptionThresholdDzd: Number.isFinite(irgEx) ? irgEx : activeRate.irgExemptionThresholdDzd,
        irgTransitionalMaxDzd: activeRate.irgTransitionalMaxDzd,
        irgTransitionalConfig: activeRate.irgTransitionalConfig,
        snmgDzd: parsedSnmg != null && Number.isFinite(parsedSnmg) ? parsedSnmg : null,
        overtimeMultiplier50: activeRate.overtimeMultiplier50,
        overtimeMultiplier100: activeRate.overtimeMultiplier100,
        tvaRates: activeRate.tvaRates,
        timbreConfig: activeRate.timbreConfig,
        notes: newNotes.trim() || null,
      });

      if (res.error) {
        showToast({ type: 'error', title: t('ref_new_version_title', language), message: res.error });
        return;
      }

      showToast({
        type: 'success',
        title: t('ref_new_version_title', language),
        message: `${res.data?.versionCode || newVersionCode} (${t('ref_status_unverified', language)})`,
      });
      setShowNewVersionForm(false);
      await loadReferenceData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyWilaya = async (code: number) => {
    setIsSubmitting(true);
    try {
      const res = await referenceDataService.verifyWilayaRef(code);
      if (res.error) {
        showToast({ type: 'error', title: t('ref_wilayas_title', language), message: res.error });
        return;
      }
      await loadReferenceData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAllWilayas = async () => {
    setIsSubmitting(true);
    try {
      const res = await referenceDataService.verifyAllLegacyWilayas();
      if (res.error) {
        showToast({ type: 'error', title: t('ref_wilayas_title', language), message: res.error });
        return;
      }
      showToast({
        type: 'success',
        title: t('ref_wilayas_title', language),
        message: `${res.updatedCount} ${t('ref_status_verified', language)}`,
      });
      await loadReferenceData();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-[var(--pod-gap,16px)]">
      {/* 1. Tenant Per-Branch Wilaya Tariff Zones (Tenant + Branch RLS) */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)] pt-[var(--s1,4px)] px-[var(--s3,12px)] pb-[var(--s2,8px)]">
            <div className="flex items-center gap-[var(--card-head-gap,12px)]">
              <div
                data-sq="tile"
                data-sq-border="none"
                className="w-[var(--tile,40px)] h-[var(--tile,40px)] bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] flex items-center justify-center shrink-0"
              >
                <MapPin size={20} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                  {t('ref_tenant_tariffs_title', language)}
                </h3>
                <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  {t('ref_tenant_tariffs_desc', language)}
                </p>
              </div>
            </div>
            <AtriumButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsTariffModalOpen(true)}
              icon={<MapPin size={15} />}
            >
              {t('ref_tenant_tariffs_edit_btn', language)}
            </AtriumButton>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--card-gap,12px)]">
            {(Object.values(tariffRules) as TariffRule[]).map((rule) => (
              <div
                key={rule.zone}
                data-sq="card"
                className="p-[var(--card-pad,16px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="t-label font-semibold text-[var(--text-1)] dark:text-white">
                    {rule.zone.replace('_', ' · ')}
                  </span>
                  <span className="t-small tabular-nums text-[var(--text-2)]">
                    {rule.baseWeightKg} kg
                  </span>
                </div>
                <div className="t-cap tabular-nums text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  {rule.homeBasePriceDzd} DZD / {rule.stopDeskBasePriceDzd} DZD (+{rule.overweightPerKgDzd}/kg)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Global Statutory Rates (Effective-Dated + Platform Admin Verification) */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)] pt-[var(--s1,4px)] px-[var(--s3,12px)] pb-[var(--s2,8px)]">
            <div className="flex items-center gap-[var(--card-head-gap,12px)]">
              <div
                data-sq="tile"
                data-sq-border="none"
                className="w-[var(--tile,40px)] h-[var(--tile,40px)] bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] flex items-center justify-center shrink-0"
              >
                <Scale size={20} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
                  <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                    {t('ref_statutory_title', language)}
                  </h3>
                  {adminStatus.isAdmin && (
                    <span className="px-[var(--pill-px,10px)] h-[var(--pill-h,24px)] inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 t-small font-semibold">
                      <ShieldCheck size={13} />
                      {t('ref_admin_badge', language)}
                    </span>
                  )}
                </div>
                <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  {t('ref_statutory_desc', language)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
              <AtriumButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadReferenceData()}
                disabled={isLoading}
                icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
              >
                {t('ref_refresh_btn', language)}
              </AtriumButton>
              {adminStatus.isAdmin && (
                <AtriumButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setShowNewVersionForm((v) => !v)}
                  icon={<Plus size={14} />}
                >
                  {t('ref_new_version_title', language)}
                </AtriumButton>
              )}
            </div>
          </div>

          {!adminStatus.isAdmin && (
            <div
              data-sq="card"
              className="p-[var(--s3,12px)] bg-white/80 dark:bg-[#22201E] text-[var(--text-2)] dark:text-[var(--text-dark-2)] t-cap flex items-center gap-[var(--s2,8px)]"
            >
              <ShieldAlert size={16} className="text-amber-600 shrink-0" />
              <span>{t('ref_readonly_notice', language)}</span>
            </div>
          )}

          {activeRate.verificationStatus === 'unverified' && (
            <div
              data-sq="card"
              className="p-[var(--s3,12px)] bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 t-small flex items-center gap-[var(--s2,8px)]"
            >
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>{t('ref_unverified_banner', language, { date: todayIso })}</span>
            </div>
          )}

          {missingParams.includes('snmg_dzd') && (
            <div
              data-sq="card"
              className="p-[var(--s3,12px)] bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 t-small flex items-center gap-[var(--s2,8px)]"
            >
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              <span>{t('ref_snmg_missing_banner', language)}</span>
            </div>
          )}

          {/* Active Snapshot Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-[var(--card-gap,12px)]">
            <div data-sq="card" className="p-[var(--card-pad,16px)] bg-white dark:bg-[#22201E]">
              <span className="t-cap text-[var(--text-2)] block">{t('ref_version_code', language)}</span>
              <span className="t-label font-semibold text-[var(--text-1)] dark:text-white block mt-1">
                {activeRate.versionCode}
              </span>
            </div>
            <div data-sq="card" className="p-[var(--card-pad,16px)] bg-white dark:bg-[#22201E]">
              <span className="t-cap text-[var(--text-2)] block">{t('ref_effective_from', language)}</span>
              <span className="t-label font-semibold tabular-nums text-[var(--text-1)] dark:text-white block mt-1">
                {activeRate.effectiveFrom ?? t('ref_date_unknown', language)}
              </span>
            </div>
            <div data-sq="card" className="p-[var(--card-pad,16px)] bg-white dark:bg-[#22201E]">
              <span className="t-cap text-[var(--text-2)] block">{t('ref_cnas_rates', language)}</span>
              <span className="t-label font-semibold tabular-nums text-[var(--text-1)] dark:text-white block mt-1">
                {activeRate.cnasSalarialRate != null ? `${(activeRate.cnasSalarialRate * 100).toFixed(0)}%` : 'NULL'} /{' '}
                {activeRate.cnasPatronalRate != null ? `${(activeRate.cnasPatronalRate * 100).toFixed(0)}%` : 'NULL'}
              </span>
            </div>
            <div data-sq="card" className="p-[var(--card-pad,16px)] bg-white dark:bg-[#22201E]">
              <span className="t-cap text-[var(--text-2)] block">{t('ref_irg_exemption', language)}</span>
              <span className="t-label font-semibold tabular-nums text-[var(--text-1)] dark:text-white block mt-1">
                {activeRate.irgExemptionThresholdDzd != null
                  ? `<= ${activeRate.irgExemptionThresholdDzd.toLocaleString()} DZD`
                  : 'NULL'}
              </span>
            </div>
            <div data-sq="card" className="p-[var(--card-pad,16px)] bg-white dark:bg-[#22201E]">
              <span className="t-cap text-[var(--text-2)] block">{t('ref_snmg_label', language)}</span>
              <span
                className={`t-label font-semibold tabular-nums block mt-1 ${
                  activeRate.snmgDzd == null ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-1)] dark:text-white'
                }`}
              >
                {activeRate.snmgDzd != null ? `${activeRate.snmgDzd.toLocaleString()} DZD` : t('ref_snmg_not_set', language)}
              </span>
            </div>
            <div data-sq="card" className="p-[var(--card-pad,16px)] bg-white dark:bg-[#22201E]">
              <span className="t-cap text-[var(--text-2)] block">{t('ref_tva_rates', language)}</span>
              <span className="t-label font-semibold tabular-nums text-[var(--text-1)] dark:text-white block mt-1">
                {activeRate.tvaRates ? activeRate.tvaRates.map((r) => `${r}%`).join(' / ') : 'NULL'}
              </span>
            </div>
          </div>

          {/* Admin-only Create New Version Form */}
          {adminStatus.isAdmin && showNewVersionForm && (
            <form
              onSubmit={(e) => void handlePublishNewVersion(e)}
              data-sq="card"
              className="p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s3,12px)]"
            >
              <div>
                <h4 className="t-card text-[var(--text-1)] dark:text-white">
                  {t('ref_new_version_title', language)}
                </h4>
                <p className="t-cap text-[var(--text-2)]">{t('ref_new_version_desc', language)}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--card-gap,12px)]">
                <LabelInput
                  label={t('ref_version_code', language)}
                  required
                  value={newVersionCode}
                  onChange={setNewVersionCode}
                />
                <LabelInput
                  label={t('ref_effective_from', language)}
                  type="date"
                  required
                  value={newEffectiveFrom}
                  onChange={setNewEffectiveFrom}
                />
                <LabelInput
                  label={t('ref_snmg_label', language)}
                  type="number"
                  value={newSnmgDzd}
                  placeholder={t('ref_snmg_not_set', language)}
                  onChange={setNewSnmgDzd}
                />
                <LabelInput
                  label="CNAS Employee (%)"
                  type="number"
                  value={newCnasSalarialPct}
                  onChange={setNewCnasSalarialPct}
                />
                <LabelInput
                  label="CNAS Employer (%)"
                  type="number"
                  value={newCnasPatronalPct}
                  onChange={setNewCnasPatronalPct}
                />
                <LabelInput
                  label={t('ref_irg_exemption', language)}
                  type="number"
                  value={newIrgExemptionDzd}
                  onChange={setNewIrgExemptionDzd}
                />
              </div>
              <LabelInput
                label={t('ref_notes_label', language)}
                value={newNotes}
                onChange={setNewNotes}
              />
              <div className="flex justify-end gap-2">
                <AtriumButton type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                  {t('ref_publish_version_btn', language)}
                </AtriumButton>
              </div>
            </form>
          )}

          {/* Version History Table */}
          <div className="flex flex-col gap-[var(--row-gap,8px)]">
            {rates.map((rate) => (
              <div
                key={rate.id}
                data-sq="card"
                className="p-[var(--card-pad,16px)] bg-white dark:bg-[#22201E] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)]"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="t-card text-[var(--text-1)] dark:text-white">{rate.versionCode}</span>
                    <span className="t-small tabular-nums text-[var(--text-2)]">
                      {t('ref_effective_from', language)}: {rate.effectiveFrom ?? t('ref_date_unknown', language)}
                    </span>
                    <span
                      className={`px-[var(--pill-px,10px)] h-[var(--badge-h,22px)] inline-flex items-center rounded-full t-small font-semibold ${
                        rate.verificationStatus === 'verified'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : rate.verificationStatus === 'superseded'
                          ? 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {rate.verificationStatus === 'verified'
                        ? t('ref_status_verified', language)
                        : rate.verificationStatus === 'superseded'
                        ? t('ref_status_superseded', language)
                        : t('ref_status_unverified', language)}
                    </span>
                  </div>
                  {rate.notes && <p className="t-cap text-[var(--text-2)]">{rate.notes}</p>}
                </div>

                {adminStatus.isAdmin && rate.verificationStatus === 'unverified' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <AtriumButton
                      type="button"
                      variant="primary"
                      size="xs"
                      disabled={isSubmitting}
                      onClick={() => void handleVerifyRate(rate.id, 'verified')}
                      icon={<CheckCircle2 size={14} />}
                    >
                      {t('ref_verify_btn', language)}
                    </AtriumButton>
                    <AtriumButton
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={isSubmitting}
                      onClick={() => void handleVerifyRate(rate.id, 'superseded')}
                    >
                      {t('ref_supersede_btn', language)}
                    </AtriumButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Official 69 Wilayas Reference Table */}
      <div className="sq-elev-card">
        <div data-sq="panel" className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)] pt-[var(--s1,4px)] px-[var(--s3,12px)] pb-[var(--s2,8px)]">
            <div className="flex flex-col gap-[var(--s1,4px)]">
              <div className="flex items-center gap-2">
                <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                  {t('ref_wilayas_title', language)}
                </h3>
                <span className="px-[var(--pill-px,10px)] h-[var(--badge-h,22px)] inline-flex items-center rounded-full bg-[#EFE9E2] dark:bg-[#2B2825] text-[var(--text-2)] t-small">
                  {t('ref_wilayas_legacy_badge', language)}
                </span>
              </div>
              <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                {t('ref_wilayas_desc', language)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                <input
                  type="text"
                  value={wilayaSearch}
                  onChange={(e) => setWilayaSearch(e.target.value)}
                  placeholder={t('ref_wilayas_search_ph', language)}
                  className="h-[34px] pl-8 pr-3 rounded-[var(--ctl-r,10px)] bg-white dark:bg-[#22201E] text-[var(--text-1)] dark:text-white t-small border border-[var(--atr-divider)] focus:outline-none"
                />
              </div>
              {adminStatus.isAdmin && wilayas.some((w) => w.verificationStatus === 'unverified') && (
                <AtriumButton
                  type="button"
                  variant="primary"
                  size="xs"
                  disabled={isSubmitting}
                  onClick={() => void handleVerifyAllWilayas()}
                  icon={<CheckCircle2 size={14} />}
                >
                  {t('ref_wilayas_verify_all_btn', language)}
                </AtriumButton>
              )}
            </div>
          </div>

          <div data-sq="card" className="bg-white dark:bg-[#22201E] overflow-x-auto max-h-[380px]">
            <table className="w-full text-start border-collapse">
              <thead className="sticky top-0 bg-[#FAF7F4] dark:bg-[#2B2825] border-b border-[var(--atr-divider)]">
                <tr className="t-cap text-[var(--text-2)]">
                  <th className="py-2.5 px-3 text-start">{t('ref_wilayas_col_code', language)}</th>
                  <th className="py-2.5 px-3 text-start">{t('ref_wilayas_col_name', language)}</th>
                  <th className="py-2.5 px-3 text-start">{t('ref_wilayas_col_zone', language)}</th>
                  <th className="py-2.5 px-3 text-start">{t('ref_wilayas_col_status', language)}</th>
                  {adminStatus.isAdmin && (
                    <th className="py-2.5 px-3 text-end">{t('ref_wilayas_col_action', language)}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--atr-divider)] t-small">
                {filteredWilayas.map((w) => (
                  <tr key={w.code} className="hover:bg-[#FAF7F4]/60 dark:hover:bg-[#2B2825]/40">
                    <td className="py-2 px-3 tabular-nums font-semibold text-[var(--text-1)] dark:text-white">
                      {String(w.code).padStart(2, '0')}
                    </td>
                    <td className="py-2 px-3 text-[var(--text-1)] dark:text-white">
                      {language === 'ar' ? w.nameAr : language === 'en' ? w.nameEn : w.nameFr}
                      <span className="text-[var(--text-3)] ms-2 t-cap">
                        {language === 'ar' ? w.nameFr : w.nameAr}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[var(--text-2)]">{w.defaultZone}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full t-cap font-semibold ${
                          w.verificationStatus === 'verified'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {w.verificationStatus === 'verified'
                          ? t('ref_status_verified', language)
                          : t('ref_status_unverified', language)}
                      </span>
                    </td>
                    {adminStatus.isAdmin && (
                      <td className="py-2 px-3 text-end">
                        {w.verificationStatus === 'unverified' && (
                          <AtriumButton
                            type="button"
                            variant="outline"
                            size="xs"
                            disabled={isSubmitting}
                            onClick={() => void handleVerifyWilaya(w.code)}
                          >
                            {t('ref_verify_btn', language)}
                          </AtriumButton>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <WilayaTariffModal
        isOpen={isTariffModalOpen}
        onClose={() => {
          setIsTariffModalOpen(false);
          void loadReferenceData();
        }}
      />
    </div>
  );
};
