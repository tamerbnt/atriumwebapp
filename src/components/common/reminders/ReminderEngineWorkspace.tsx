import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  Moon,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldBan,
  AlertTriangle,
} from 'lucide-react';
import {
  shallowEqualObjects,
  useAtriumActions,
  useAtriumSelector,
  selectCurrentReminderDeliveryLogsFromState,
  selectCurrentReminderQuietHoursFromState,
  selectCurrentReminderRulesFromState,
  selectCurrentCrmMessageTemplatesFromState,
} from '../../../services/store';
import {
  REMINDER_EVENT_CATALOG,
  isWithinQuietHours,
} from '../../../utils/reminderEngine';
import type {
  ReminderChannel,
  ReminderDeliveryStatus,
  ReminderEventType,
} from '../../../types/index';
import { t } from '../../../utils/i18n';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { Button } from '@/atrium/core';

const CHANNELS: Array<{ id: ReminderChannel; label: string }> = [
  { id: 'in_app', label: 'In-app' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'sms', label: 'SMS' },
  { id: 'email', label: 'Email' },
];

type LogStatusFilter = 'all' | 'sent' | 'deferred_quiet_hours' | 'blocked_opt_out' | 'failed';

export const ReminderEngineWorkspace: React.FC = () => {
  const { language, quietHours, rules, logs, templates } = useAtriumSelector(
    (s) => ({
      language: s.language,
      quietHours: selectCurrentReminderQuietHoursFromState(s),
      rules: selectCurrentReminderRulesFromState(s),
      logs: selectCurrentReminderDeliveryLogsFromState(s),
      templates: selectCurrentCrmMessageTemplatesFromState(s),
    }),
    shallowEqualObjects
  );

  const {
    saveReminderQuietHours,
    upsertReminderRule,
    toggleReminderRule,
    resetReminderSeedForBusiness,
    runReminderEngineScan,
    flushDeferredReminders,
  } = useAtriumActions();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  // Quiet Hours Draft
  const [qhEnabled, setQhEnabled] = useState(quietHours.enabled);
  const [qhStart, setQhStart] = useState(quietHours.startTime);
  const [qhEnd, setQhEnd] = useState(quietHours.endTime);
  const [qhAllowInApp, setQhAllowInApp] = useState(quietHours.allowInAppDuringQuiet);

  useEffect(() => {
    setQhEnabled(quietHours.enabled);
    setQhStart(quietHours.startTime);
    setQhEnd(quietHours.endTime);
    setQhAllowInApp(quietHours.allowInAppDuringQuiet);
  }, [
    quietHours.enabled,
    quietHours.startTime,
    quietHours.endTime,
    quietHours.allowInAppDuringQuiet,
  ]);

  const [statusFilter, setStatusFilter] = useState<LogStatusFilter>('all');
  const [logSearch, setLogSearch] = useState('');

  const quietNowActive = useMemo(
    () =>
      isWithinQuietHours(new Date().toISOString(), {
        enabled: qhEnabled,
        startTime: qhStart,
        endTime: qhEnd,
        timezone: quietHours.timezone || 'Africa/Algiers',
      }),
    [qhEnabled, qhStart, qhEnd, quietHours.timezone]
  );

  const orderedRules = useMemo(() => {
    const byEvent = new Map(rules.map((r) => [r.eventType, r]));
    return REMINDER_EVENT_CATALOG.map((meta) => {
      const rule = byEvent.get(meta.eventType);
      return { meta, rule };
    }).filter((entry) => Boolean(entry.rule));
  }, [rules]);

  const deferredCount = useMemo(
    () => logs.filter((l) => l.status === 'deferred_quiet_hours').length,
    [logs]
  );

  const logCounts = useMemo(() => {
    const counts = {
      all: logs.length,
      sent: 0,
      deferred_quiet_hours: 0,
      blocked_opt_out: 0,
      failed: 0,
    };
    for (const l of logs) {
      if (l.status === 'sent') counts.sent += 1;
      else if (l.status === 'deferred_quiet_hours') counts.deferred_quiet_hours += 1;
      else if (l.status === 'blocked_opt_out') counts.blocked_opt_out += 1;
      else if (l.status === 'failed') counts.failed += 1;
    }
    return counts;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return logs.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (l.entityLabel || '').toLowerCase().includes(q) ||
        l.title.toLowerCase().includes(q) ||
        l.eventType.toLowerCase().includes(q) ||
        l.idempotencyKey.toLowerCase().includes(q)
      );
    });
  }, [logs, statusFilter, logSearch]);

  const handleToggleChannel = (
    eventType: ReminderEventType,
    currentChannels: ReminderChannel[],
    channel: ReminderChannel
  ) => {
    const has = currentChannels.includes(channel);
    if (has && currentChannels.length <= 1) {
      return; // Must keep at least one channel enabled
    }
    const next = has
      ? currentChannels.filter((c) => c !== channel)
      : [...currentChannels, channel];
    upsertReminderRule({ eventType, channels: next });
  };

  const renderLogStatus = (status: ReminderDeliveryStatus) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium whitespace-nowrap">
            <CheckCircle2 size={14} strokeWidth={1.75} />
            <span>{L('Sent', 'Envoyé', 'مرسل')}</span>
          </span>
        );
      case 'deferred_quiet_hours':
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium whitespace-nowrap">
            <Moon size={14} strokeWidth={1.75} />
            <span>{L('Quiet hours', 'Heures calmes', 'مؤجل للهدوء')}</span>
          </span>
        );
      case 'blocked_opt_out':
        return (
          <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-medium whitespace-nowrap">
            <ShieldBan size={14} strokeWidth={1.75} />
            <span>{L('Opt-out', 'Opt-out', 'محظور')}</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-medium whitespace-nowrap">
            <AlertTriangle size={14} strokeWidth={1.75} />
            <span>{L('Failed', 'Échec', 'فشل')}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[var(--text-2)] font-medium whitespace-nowrap">
            <Clock size={14} strokeWidth={1.75} />
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div
      data-testid="reminder-engine-workspace"
      className="flex flex-col gap-[var(--pod-gap,16px)] select-text"
    >
      {/* 1. Header + Quiet Hours Panel */}
      <div
        data-sq="panel"
        data-testid="reminder-quiet-hours-panel"
        className="bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] p-[var(--card-pad,20px)] flex flex-col gap-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              data-sq="tile"
              data-sq-border="none"
              style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
              className="w-10 h-10 flex items-center justify-center shrink-0"
            >
              <Bell size={20} strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="t-pod text-[var(--text-1)] dark:text-white">
                {t('phase2_reminder_title', language)}
              </h2>
              <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                {t('phase2_reminder_desc', language)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <AtriumButton
              type="button"
              size="md"
              data-testid="reminder-run-scan-btn"
              onClick={() => runReminderEngineScan()}
            >
              <Play size={15} strokeWidth={1.75} />
              <span>{t('phase2_reminder_run_scan', language)}</span>
            </AtriumButton>

            <Button
              type="button"
              tone="soft"
              size={40}
              data-testid="reminder-flush-deferred-btn"
              onClick={() => flushDeferredReminders()}
            >
              <Send size={15} strokeWidth={1.5} />
              <span className="tabular-nums">
                {t('phase2_reminder_flush_deferred', language)} ({deferredCount})
              </span>
            </Button>

            <Button
              type="button"
              tone="soft"
              size={40}
              data-testid="reminder-reset-rules-btn"
              onClick={() => resetReminderSeedForBusiness()}
            >
              <RotateCcw size={15} strokeWidth={1.5} />
              <span>{L('Reset', 'Réinitialiser', 'إعادة ضبط')}</span>
            </Button>
          </div>
        </div>

        {/* Quiet Hours Controls */}
        <div className="pt-4 border-t border-[var(--atr-divider)] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-center">
          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white dark:bg-[#22201E] border border-[var(--atr-divider)]">
            <div className="flex items-center gap-2 min-w-0">
              {qhEnabled ? (
                <Moon size={16} strokeWidth={1.5} className="text-[var(--brand-text)] shrink-0" />
              ) : (
                <BellOff size={16} strokeWidth={1.5} className="text-[var(--text-3)] shrink-0" />
              )}
              <span className="t-small font-medium text-[var(--text-1)] dark:text-white truncate">
                {t('phase2_reminder_quiet_hours', language)}
              </span>
            </div>
            <LiveSwitch
              checked={qhEnabled}
              aria-label={t('phase2_reminder_quiet_hours', language)}
              onCheckedChange={(v) => setQhEnabled(v)}
            />
          </div>

          <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#22201E] border border-[var(--atr-divider)]">
            <span className="t-cap text-[var(--text-2)] whitespace-nowrap">
              {L('Start', 'Début', 'البداية')}
            </span>
            <input
              type="time"
              value={qhStart}
              aria-label={L('Quiet hours start time', 'Début heures calmes', 'بداية ساعات الهدوء')}
              onChange={(e) => setQhStart(e.target.value)}
              className="bg-transparent text-sm font-medium tabular-nums text-[var(--text-1)] dark:text-white outline-none"
            />
          </label>

          <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#22201E] border border-[var(--atr-divider)]">
            <span className="t-cap text-[var(--text-2)] whitespace-nowrap">
              {L('End', 'Fin', 'النهاية')}
            </span>
            <input
              type="time"
              value={qhEnd}
              aria-label={L('Quiet hours end time', 'Fin heures calmes', 'نهاية ساعات الهدوء')}
              onChange={(e) => setQhEnd(e.target.value)}
              className="bg-transparent text-sm font-medium tabular-nums text-[var(--text-1)] dark:text-white outline-none"
            />
          </label>

          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white dark:bg-[#22201E] border border-[var(--atr-divider)]">
            <span className="t-small text-[var(--text-1)] dark:text-white truncate">
              {L('Allow in-app', 'In-app autorisé', 'السماح داخل التطبيق')}
            </span>
            <LiveSwitch
              checked={qhAllowInApp}
              aria-label={L('Allow in-app during quiet hours', 'Autoriser in-app pendant heures calmes', 'السماح بالإشعارات الداخلية')}
              onCheckedChange={(v) => setQhAllowInApp(v)}
            />
          </div>

          <div className="flex items-center justify-between xl:justify-end gap-3">
            <span className="t-cap text-[var(--text-2)] tabular-nums">
              {quietHours.timezone || 'Africa/Algiers'} ·{' '}
              {quietNowActive
                ? L('Quiet now', 'Actif', 'نشط الآن')
                : L('Open window', 'Ouvert', 'متاح')}
            </span>
            <AtriumButton
              type="button"
              variant="primary"
              size={36}
              data-testid="reminder-save-quiet-hours-btn"
              onClick={() =>
                saveReminderQuietHours({
                  enabled: qhEnabled,
                  startTime: qhStart,
                  endTime: qhEnd,
                  timezone: quietHours.timezone || 'Africa/Algiers',
                  allowInAppDuringQuiet: qhAllowInApp,
                })
              }
            >
              <span>{L('Save', 'Enregistrer', 'حفظ')}</span>
            </AtriumButton>
          </div>
        </div>
      </div>

      {/* 2. 13-Event Rules Table */}
      <div
        data-sq="panel"
        data-testid="reminder-rules-list"
        className="bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-[var(--atr-divider)] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="t-card font-semibold text-[var(--text-1)] dark:text-white">
              {t('phase2_reminder_rules_title', language)}
            </h3>
            <span className="t-cap text-[var(--text-2)] tabular-nums">
              · {orderedRules.filter((x) => x.rule?.isEnabled).length}/{orderedRules.length}{' '}
              {L('active', 'actives', 'نشطة')}
            </span>
          </div>
          <span className="t-cap text-[var(--text-2)]">
            {L(
              'Idempotent per entity + due date + channel',
              'Idempotent par entité + échéance + canal',
              'إرسال آمن بدون تكرار لكل كيان وقناة'
            )}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-[var(--atr-divider)] bg-[#FAF7F4] dark:bg-[#191716] t-cap text-[var(--text-2)]">
                <th className="py-2.5 px-4 text-start font-medium">
                  {L('Trigger Event', 'Événement déclencheur', 'الحدث')}
                </th>
                <th className="py-2.5 px-3 text-center font-medium whitespace-nowrap">
                  {L('Active', 'Actif', 'مفعّل')}
                </th>
                <th className="py-2.5 px-3 text-end font-medium whitespace-nowrap">
                  {L('Lead (days)', 'Préavis (j)', 'المهلة (أيام)')}
                </th>
                <th className="py-2.5 px-4 text-start font-medium">
                  {L('Channels', 'Canaux', 'القنوات')}
                </th>
                <th className="py-2.5 px-3 text-start font-medium">
                  {L('CRM Template', 'Modèle CRM', 'القالب')}
                </th>
                <th className="py-2.5 px-3 text-center font-medium whitespace-nowrap">
                  {L('Quiet Respect', 'Heures calmes', 'احترام الهدوء')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--atr-divider)]">
              {orderedRules.map(({ meta, rule }) => {
                if (!rule) return null;
                const eventLabel = isAr ? meta.labelAr : isEn ? meta.labelEn : meta.labelFr;
                return (
                  <tr
                    key={meta.eventType}
                    data-testid={`reminder-rule-row-${meta.eventType}`}
                    className="hover:bg-[#FAF7F4]/70 dark:hover:bg-[#2B2825]/60 transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <div className="t-small font-medium text-[var(--text-1)] dark:text-white">
                        {eventLabel}
                      </div>
                      <div className="font-mono text-[11px] text-[var(--text-3)]">
                        {meta.eventType}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex justify-center">
                        <LiveSwitch
                          checked={rule.isEnabled}
                          aria-label={`${eventLabel} enabled`}
                          onCheckedChange={(v) => toggleReminderRule(rule.eventType, v)}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-end">
                      <input
                        type="number"
                        min={0}
                        max={90}
                        aria-label={`${eventLabel} lead days`}
                        value={rule.leadDays}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(90, Number(e.target.value) || 0));
                          upsertReminderRule({ eventType: rule.eventType, leadDays: val });
                        }}
                        className="w-16 px-2 py-1 text-end rounded-lg border border-[var(--atr-divider)] bg-white dark:bg-[#191716] t-small tabular-nums text-[var(--text-1)] dark:text-white"
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex flex-wrap items-center gap-1">
                        {CHANNELS.map((ch) => {
                          const active = rule.channels.includes(ch.id);
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              aria-pressed={active}
                              onClick={() =>
                                handleToggleChannel(rule.eventType, rule.channels, ch.id)
                              }
                              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                                active
                                  ? 'bg-[var(--brand-fill)] text-white'
                                  : 'bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-2)] hover:text-[var(--text-1)] dark:hover:text-white'
                              }`}
                            >
                              {ch.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        aria-label={`${eventLabel} template`}
                        value={rule.templateId || ''}
                        onChange={(e) =>
                          upsertReminderRule({
                            eventType: rule.eventType,
                            templateId: e.target.value || '',
                          })
                        }
                        className="max-w-[180px] px-2.5 py-1.5 rounded-lg border border-[var(--atr-divider)] bg-white dark:bg-[#191716] text-xs text-[var(--text-1)] dark:text-white"
                      >
                        <option value="">{L('Auto / Default', 'Auto / Défaut', 'تلقائي')}</option>
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.code} · {tpl.channel}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex justify-center">
                        <LiveSwitch
                          checked={rule.respectQuietHours}
                          aria-label={`${eventLabel} quiet hours`}
                          onCheckedChange={(v) =>
                            upsertReminderRule({ eventType: rule.eventType, respectQuietHours: v })
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Delivery Log & Idempotency Audit */}
      <div
        data-sq="panel"
        data-testid="reminder-delivery-log-panel"
        className="bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-[var(--atr-divider)] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F3EDE7] dark:bg-[#191716] rounded-lg">
            {(
              [
                { id: 'all', label: L('All', 'Tous', 'الكل'), count: logCounts.all },
                { id: 'sent', label: L('Sent', 'Envoyés', 'مرسل'), count: logCounts.sent },
                {
                  id: 'deferred_quiet_hours',
                  label: L('Deferred', 'Différés', 'مؤجل'),
                  count: logCounts.deferred_quiet_hours,
                },
                {
                  id: 'blocked_opt_out',
                  label: L('Opt-out', 'Opt-out', 'محظور'),
                  count: logCounts.blocked_opt_out,
                },
                { id: 'failed', label: L('Failed', 'Échecs', 'فشل'), count: logCounts.failed },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer tabular-nums ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-[#2B2825] text-[var(--text-1)] dark:text-white shadow-sm'
                    : 'text-[var(--text-2)] hover:text-[var(--text-1)] dark:hover:text-white'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search
              size={14}
              strokeWidth={1.5}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none"
            />
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder={L('Filter entity or key…', 'Filtrer entité ou clé…', 'تصفية السجل…')}
              aria-label={L('Search delivery log', 'Rechercher dans le journal', 'بحث في سجل التذكيرات')}
              className="w-full ps-8 pe-3 py-1.5 rounded-lg border border-[var(--atr-divider)] bg-[#FAF7F4] dark:bg-[#191716] text-xs text-[var(--text-1)] dark:text-white outline-none"
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center gap-2">
            <RefreshCw size={20} strokeWidth={1.5} className="text-[var(--text-3)]" />
            <p className="t-small font-medium text-[var(--text-1)] dark:text-white">
              {L(
                'No reminder dispatches recorded yet.',
                'Aucun rappel journalisé pour le moment.',
                'لا توجد عمليات إرسال مسجلة بعد.'
              )}
            </p>
            <p className="t-cap text-[var(--text-2)]">
              {L(
                'Run a reminder scan to inspect due items across all enabled rules.',
                'Lancez une analyse pour détecter les échéances et notifications actives.',
                'قم بتشغيل فحص التذكيرات لاكتشاف العناصر المستحقة.'
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-[var(--atr-divider)] bg-[#FAF7F4] dark:bg-[#191716] t-cap text-[var(--text-2)]">
                  <th className="py-2.5 px-4 text-start font-medium">
                    {L('Reminder', 'Rappel', 'التذكير')}
                  </th>
                  <th className="py-2.5 px-3 text-start font-medium">
                    {L('Channel', 'Canal', 'القناة')}
                  </th>
                  <th className="py-2.5 px-3 text-start font-medium">
                    {L('Status', 'Statut', 'الحالة')}
                  </th>
                  <th className="py-2.5 px-3 text-start font-medium">
                    {L('Idempotency Key', 'Clé d’idempotence', 'مفتاح عدم التكرار')}
                  </th>
                  <th className="py-2.5 px-4 text-end font-medium">
                    {L('Time', 'Horodatage', 'التوقيت')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--atr-divider)]">
                {filteredLogs.slice(0, 60).map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[#FAF7F4]/70 dark:hover:bg-[#2B2825]/60 transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <div className="t-small font-medium text-[var(--text-1)] dark:text-white">
                        {log.title}
                      </div>
                      <div className="t-cap text-[var(--text-2)] truncate max-w-[360px]">
                        {log.message}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 t-cap font-medium uppercase whitespace-nowrap text-[var(--text-1)] dark:text-white">
                      {log.channel}
                    </td>
                    <td className="py-2.5 px-3">{renderLogStatus(log.status)}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text-2)] max-w-[220px] truncate">
                      {log.idempotencyKey}
                    </td>
                    <td className="py-2.5 px-4 text-end t-cap text-[var(--text-2)] tabular-nums whitespace-nowrap">
                      {(log.deliveredAt || log.scheduledFor || log.createdAt).slice(0, 16).replace('T', ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
