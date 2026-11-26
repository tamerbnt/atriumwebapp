import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  GitMerge,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  ShieldBan,
  StickyNote,
  Users,
} from 'lucide-react';
import { Button } from '@/atrium/core';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LabelTextarea } from '../../ui/LabelTextarea';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import {
  buildParty360Summary,
  detectPartyDuplicates,
  normalizeAlgerianPhoneForCrm,
  renderCrmTemplate,
} from '../../../utils/crmPartyEngine';
import type {
  CrmChannel,
  CrmLinkEntityType,
  CrmParty,
  CrmPartyKind,
  CrmPartyNote,
  CrmTaskChannel,
} from '../../../types/index';
import {
  useAtriumActions,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentCrmPartiesFromState,
  selectCurrentCrmPartyLinksFromState,
  selectCurrentCrmPartyNotesFromState,
  selectCurrentCrmFollowUpTasksFromState,
  selectCurrentCrmMessageTemplatesFromState,
  selectCurrentCrmCommunicationLogsFromState,
  selectCurrentUnifiedDocumentsFromState,
  selectCurrentUnifiedPaymentsFromState,
  selectCurrentCommercialDocsFromState,
  selectCurrentSalesFromState,
  selectCurrentAppointmentsFromState,
  selectCurrentMemberCheckInsFromState,
  selectCurrentBusinessFromState,
} from '../../../services/store';
import { CrmPartyMergeModal } from './CrmPartyMergeModal';

export interface Customer360PanelProps {
  sourceVertical: string;
  entityType: CrmLinkEntityType;
  entityId: string;
  displayName: string;
  partyKind?: CrmPartyKind;
  phone?: string;
  email?: string;
  nif?: string;
  rc?: string;
  nis?: string;
  ai?: string;
  address?: string;
  wilayaCode?: string;
}

type CrmSubView = 'timeline' | 'tasks' | 'comms';

export const Customer360Panel: React.FC<Customer360PanelProps> = ({
  sourceVertical,
  entityType,
  entityId,
  displayName,
  partyKind,
  phone,
  email,
  nif,
  rc,
  nis,
  ai,
  address,
  wilayaCode,
}) => {
  const {
    language,
    currentBusiness,
    parties,
    links,
    notes,
    tasks,
    templates,
    comms,
    unifiedDocuments,
    unifiedPayments,
    commercialDocs,
    sales,
    appointments,
    checkIns,
  } = useAtriumSelector(
    (s) => ({
      language: s.language,
      currentBusiness: selectCurrentBusinessFromState(s),
      parties: selectCurrentCrmPartiesFromState(s),
      links: selectCurrentCrmPartyLinksFromState(s),
      notes: selectCurrentCrmPartyNotesFromState(s),
      tasks: selectCurrentCrmFollowUpTasksFromState(s),
      templates: selectCurrentCrmMessageTemplatesFromState(s),
      comms: selectCurrentCrmCommunicationLogsFromState(s),
      unifiedDocuments: selectCurrentUnifiedDocumentsFromState(s),
      unifiedPayments: selectCurrentUnifiedPaymentsFromState(s),
      commercialDocs: selectCurrentCommercialDocsFromState(s),
      sales: selectCurrentSalesFromState(s),
      appointments: selectCurrentAppointmentsFromState(s),
      checkIns: selectCurrentMemberCheckInsFromState(s),
    }),
    shallowEqualObjects
  );

  const {
    ensurePartyForEntity,
    upsertCrmParty,
    addCrmPartyNote,
    upsertCrmFollowUpTask,
    completeCrmFollowUpTask,
    sendCrmCommunication,
    retryCrmCommunication,
  } = useAtriumActions();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const [subView, setSubView] = useState<CrmSubView>('timeline');
  const [mergeTarget, setMergeTarget] = useState<CrmParty | null>(null);

  // Note & Follow-Up Form
  const [noteType, setNoteType] = useState<CrmPartyNote['noteType']>('note');
  const [noteBody, setNoteBody] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskChannel, setTaskChannel] = useState<CrmTaskChannel>('call');
  const [taskDueAt, setTaskDueAt] = useState(() =>
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  );

  // Communication Composer State
  const [selectedTplId, setSelectedTplId] = useState<string>('');
  const [commChannel, setCommChannel] = useState<CrmChannel>('whatsapp');
  const [commLang, setCommLang] = useState<'en' | 'fr' | 'ar'>(
    isAr ? 'ar' : isEn ? 'en' : 'fr'
  );
  const [varDocNumber, setVarDocNumber] = useState('');
  const [varAmount, setVarAmount] = useState('');
  const [varDueDate, setVarDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [allowMissingVars, setAllowMissingVars] = useState(false);

  // Resolve or lazily ensure linked CrmParty for this vertical record
  const matchedLink = useMemo(
    () =>
      links.find(
        (l) => l.entityType === entityType && l.entityId === entityId && !l.deletedAt
      ),
    [links, entityType, entityId]
  );

  const activeParty = useMemo(() => {
    if (!matchedLink) return null;
    return parties.find((p) => p.id === matchedLink.partyId && !p.deletedAt) || null;
  }, [matchedLink, parties]);

  useEffect(() => {
    if (!entityId || activeParty) return;
    ensurePartyForEntity({
      sourceVertical,
      entityType,
      entityId,
      partyKind,
      displayName,
      phone,
      email,
      nif,
      rc,
      nis,
      ai,
      address,
      wilayaCode,
    });
  }, [
    entityId,
    activeParty,
    sourceVertical,
    entityType,
    partyKind,
    displayName,
    phone,
    email,
    nif,
    rc,
    nis,
    ai,
    address,
    wilayaCode,
    ensurePartyForEntity,
  ]);

  // Select default template when templates load
  useEffect(() => {
    if (!selectedTplId && templates.length > 0) {
      setSelectedTplId(templates[0].id);
      setCommChannel(templates[0].channel);
    }
  }, [selectedTplId, templates]);

  const phoneNorm = useMemo(
    () => normalizeAlgerianPhoneForCrm(activeParty?.phoneRaw || phone),
    [activeParty?.phoneRaw, phone]
  );

  const duplicates = useMemo(() => {
    if (!activeParty) return [];
    return detectPartyDuplicates(
      {
        id: activeParty.id,
        businessId: activeParty.businessId,
        displayName: activeParty.displayName,
        phone: activeParty.phoneRaw,
        email: activeParty.email,
        nif: activeParty.nif,
        sharedPhoneGroup: activeParty.sharedPhoneGroup,
      },
      parties
    );
  }, [activeParty, parties]);

  const summary = useMemo(() => {
    if (!activeParty) return null;
    return buildParty360Summary({
      party: activeParty,
      links,
      unifiedDocuments,
      unifiedPayments,
      commercialDocs,
      sales,
      appointments,
      checkIns,
      notes,
      tasks,
      communications: comms,
    });
  }, [
    activeParty,
    links,
    unifiedDocuments,
    unifiedPayments,
    commercialDocs,
    sales,
    appointments,
    checkIns,
    notes,
    tasks,
    comms,
  ]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTplId) || templates[0],
    [templates, selectedTplId]
  );

  const templateVariables = useMemo(
    () => ({
      name: activeParty?.displayName || displayName,
      doc_number: varDocNumber.trim(),
      amount: varAmount.trim(),
      due_date: varDueDate.trim(),
      business_name: currentBusiness?.name || 'Atrium',
      phone: currentBusiness?.phone || activeParty?.phoneE164 || '',
    }),
    [activeParty, displayName, varDocNumber, varAmount, varDueDate, currentBusiness]
  );

  const previewRender = useMemo(() => {
    if (!selectedTemplate) {
      return { subject: '', body: '', missingVariables: [] as string[] };
    }
    return renderCrmTemplate(selectedTemplate, commLang, templateVariables);
  }, [selectedTemplate, commLang, templateVariables]);

  if (!activeParty || !summary) {
    return (
      <div className="p-4 text-center t-small text-black/60 dark:text-white/60">
        {L('Loading Customer 360° profile…', 'Chargement du profil 360°…', 'جاري تحميل الملف الموحد…')}
      </div>
    );
  }

  const partyNotes = notes.filter((n) => n.partyId === activeParty.id && !n.deletedAt);
  const partyTasks = tasks.filter((t) => t.partyId === activeParty.id && !t.deletedAt);
  const partyComms = comms.filter((c) => c.partyId === activeParty.id);

  const handleSend = () => {
    sendCrmCommunication({
      partyId: activeParty.id,
      templateId: selectedTemplate?.id,
      channel: commChannel,
      language: commLang,
      variables: templateVariables,
      allowMissingVariables: allowMissingVars,
      providerConfigured: false,
    });
  };

  return (
    <div data-testid="customer-360-panel" className="space-y-4 select-text">
      {/* Header Identity & +213 Normalization */}
      <div
        data-sq="card"
        data-sq-border="none"
        className="card bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#22201E] p-4 space-y-3 border-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full t-small font-semibold bg-white dark:bg-[#2B2825] tabular-nums">
              {phoneNorm.valid && phoneNorm.e164
                ? `${phoneNorm.e164} · ${phoneNorm.operator}`
                : activeParty.phoneRaw || L('No phone', 'Sans téléphone', 'بدون هاتف')}
            </span>
            {activeParty.sharedPhoneGroup && (
              <span className="px-2.5 py-0.5 rounded-full t-small font-medium bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {L('Shared family line', 'Ligne familiale partagée', 'رقم عائلي مشترك')}
              </span>
            )}
            {summary.linkedVerticals.map((v) => (
              <span
                key={v}
                className="px-2 py-0.5 rounded-full t-cap font-medium bg-[var(--atr-hl,rgba(212,82,47,0.12))] text-[var(--atr-acc-text,#ab391a)] dark:text-[#FF8D7A]"
              >
                {v.replace('_', ' ')}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="t-small text-black/70 dark:text-white/70">
              {L('Shared phone', 'Tél. partagé', 'هاتف مشترك')}
            </span>
            <LiveSwitch
              checked={Boolean(activeParty.sharedPhoneGroup)}
              aria-label={L('Shared family phone', 'Téléphone familial partagé', 'رقم عائلي مشترك')}
              onCheckedChange={(checked) =>
                upsertCrmParty({
                  id: activeParty.id,
                  displayName: activeParty.displayName,
                  sharedPhoneGroup: checked,
                })
              }
            />
          </div>
        </div>

        {/* Consent & Opt-Out Matrix */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--atr-divider)]">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-black/20">
            <span className="t-small font-medium">SMS</span>
            <LiveSwitch
              checked={activeParty.consentSms && !activeParty.optOutAll}
              disabled={activeParty.optOutAll}
              aria-label="SMS consent"
              onCheckedChange={(v) =>
                upsertCrmParty({
                  id: activeParty.id,
                  displayName: activeParty.displayName,
                  consentSms: v,
                })
              }
            />
          </div>
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white/70 dark:bg-black/20">
            <span className="t-small font-medium">WhatsApp</span>
            <LiveSwitch
              checked={activeParty.consentWhatsapp && !activeParty.optOutAll}
              disabled={activeParty.optOutAll}
              aria-label="WhatsApp consent"
              onCheckedChange={(v) =>
                upsertCrmParty({
                  id: activeParty.id,
                  displayName: activeParty.displayName,
                  consentWhatsapp: v,
                })
              }
            />
          </div>
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white/70 dark:bg-black/20">
            <span className="t-small font-medium">Email</span>
            <LiveSwitch
              checked={activeParty.consentEmail && !activeParty.optOutAll}
              disabled={activeParty.optOutAll}
              aria-label="Email consent"
              onCheckedChange={(v) =>
                upsertCrmParty({
                  id: activeParty.id,
                  displayName: activeParty.displayName,
                  consentEmail: v,
                })
              }
            />
          </div>
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#FDE4DF]/70 dark:bg-[#3D1E1A]/70">
            <span className="t-small font-semibold text-[#c0283d] dark:text-[#FF8D7A]">
              {L('Opt-out', 'Opt-out', 'حظر الكل')}
            </span>
            <LiveSwitch
              checked={activeParty.optOutAll}
              aria-label={L('Opt-out all communications', 'Refuser toute communication', 'إيقاف جميع الرسائل')}
              onCheckedChange={(v) =>
                upsertCrmParty({
                  id: activeParty.id,
                  displayName: activeParty.displayName,
                  optOutAll: v,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Duplicate Detection Banner */}
      {duplicates.length > 0 && (
        <div
          data-testid="crm-duplicate-banner"
          className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/35 space-y-2"
        >
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold t-small">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {duplicates[0].isSharedFamilyPhone
                ? L(
                    'Shared phone number detected across profiles (kept separate by family policy).',
                    'Numéro partagé détecté sur d’autres fiches (séparé par défaut si famille).',
                    'تم رصد رقم هاتف مشترك مع ملف آخر.'
                  )
                : L(
                    'Potential duplicate CRM profile detected (same NIF, email, or phone).',
                    'Doublon potentiel détecté (même NIF, e-mail ou téléphone).',
                    'تم اكتشاف ملف مكرر محتمل (نفس NIF أو البريد أو الهاتف).'
                  )}
            </span>
          </div>
          <div className="space-y-1.5">
            {duplicates.slice(0, 3).map((dup) => (
              <div
                key={dup.party.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/80 dark:bg-black/25 t-small"
              >
                <div className="min-w-0">
                  <span className="font-semibold">{dup.party.displayName}</span>{' '}
                  <span className="text-black/60 dark:text-white/60 tabular-nums">
                    ({dup.reasons.join(', ')})
                  </span>
                </div>
                <Button
                  type="button"
                  tone="soft"
                  size={32}
                  leading={<GitMerge className="w-3.5 h-3.5" />}
                  onClick={() => setMergeTarget(dup.party)}
                >
                  {L('Merge', 'Fusionner', 'دمج')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 360 KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-3 rounded-2xl bg-[#F3EDE7] dark:bg-[#22201E]">
          <div className="t-cap text-black/65 dark:text-white/65">{L('Billed', 'Facturé', 'المفوتر')}</div>
          <div className="t-kpi-s font-bold tabular-nums">{summary.totalBilledDzd.toLocaleString('en-US')} DA</div>
        </div>
        <div className="p-3 rounded-2xl bg-[#F3EDE7] dark:bg-[#22201E]">
          <div className="t-cap text-black/65 dark:text-white/65">{L('Paid', 'Encaissé', 'المدفوع')}</div>
          <div className="t-kpi-s font-bold tabular-nums text-[#096b40] dark:text-[#5BE3A3]">
            {summary.totalPaidDzd.toLocaleString('en-US')} DA
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-[#F3EDE7] dark:bg-[#22201E]">
          <div className="t-cap text-black/65 dark:text-white/65">{L('Balance', 'Solde dû', 'الرصيد')}</div>
          <div className="t-kpi-s font-bold tabular-nums text-[var(--atr-acc,#d4522f)]">
            {summary.openBalanceDzd.toLocaleString('en-US')} DA
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-[#F3EDE7] dark:bg-[#22201E]">
          <div className="t-cap text-black/65 dark:text-white/65">{L('Open tasks', 'Relances', 'المهام')}</div>
          <div className="t-kpi-s font-bold tabular-nums">{summary.openTasksCount}</div>
        </div>
      </div>

      {/* Sub-navigation */}
      <LiveSegmentedControl
        size="sm"
        fullWidth
        value={subView}
        onValueChange={(val) => setSubView(val as CrmSubView)}
        aria-label={L('Customer 360 views', 'Vues CRM 360', 'أقسام CRM 360')}
        options={[
          {
            value: 'timeline',
            label: L('Timeline', 'Fil', 'السجل'),
            count: summary.timeline.length,
          },
          {
            value: 'tasks',
            label: L('Tasks', 'Relances', 'المهام'),
            count: partyTasks.length,
          },
          {
            value: 'comms',
            label: L('Messages', 'Messages', 'الرسائل'),
            count: partyComms.length,
          },
        ]}
      />

      {/* TAB 1: Timeline 360 */}
      {subView === 'timeline' && (
        <div
          data-sq="card"
          data-sq-border="none"
          className="card bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#22201E] px-4 py-2 border-0"
        >
          {summary.timeline.length === 0 ? (
            <p className="py-6 text-center t-small text-black/60 dark:text-white/60 m-0">
              {L(
                'No cross-vertical interactions recorded yet.',
                'Aucune interaction inter-modules enregistrée pour ce tiers.',
                'لا توجد تعاملات مسجلة بعد.'
              )}
            </p>
          ) : (
            summary.timeline.slice(0, 20).map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-start gap-2 py-2.5 border-b last:border-b-0 border-[var(--atr-divider)] t-body"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{item.title}</div>
                  {item.subtitle && (
                    <div className="t-small text-black/65 dark:text-white/65 truncate">{item.subtitle}</div>
                  )}
                  <small className="t-cap tabular-nums text-black/55 dark:text-white/55">
                    {item.date?.slice(0, 10) || '—'}
                    {item.vertical ? ` · ${item.vertical}` : ''}
                  </small>
                </div>
                <div className="text-end shrink-0">
                  {item.amountDzd !== undefined && (
                    <div className="font-semibold tabular-nums t-small">
                      {Math.round(item.amountDzd).toLocaleString('en-US')} DA
                    </div>
                  )}
                  {item.status && (
                    <span className="px-2 py-0.5 rounded-full t-cap bg-black/5 dark:bg-white/10">
                      {item.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: Notes & Follow-Up Tasks */}
      {subView === 'tasks' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-[#22201E] space-y-3">
            <h4 className="m-0 font-semibold t-label flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-[var(--atr-acc,#d4522f)]" />
              {L('Add Note / Call Log', 'Ajouter une note / compte-rendu', 'إضافة ملاحظة / مكالمة')}
            </h4>
            <LabelSelect
              field="crmNoteType"
              label={L('Type', 'Type', 'النوع')}
              value={noteType}
              onChange={(v) => setNoteType(v as CrmPartyNote['noteType'])}
              options={[
                { value: 'note', label: L('Note', 'Note interne', 'ملاحظة') },
                { value: 'call', label: L('Phone Call', 'Appel téléphonique', 'مكالمة') },
                { value: 'visit', label: L('Visit', 'Visite', 'زيارة') },
                { value: 'incident', label: L('Incident', 'Incident', 'مشكلة') },
              ]}
            />
            <LabelTextarea
              field="crmNoteBody"
              label={L('Details', 'Contenu', 'التفاصيل')}
              value={noteBody}
              onChange={setNoteBody}
              rows={2}
            />
            <Button
              type="button"
              tone="soft"
              size={36}
              disabled={!noteBody.trim()}
              onClick={() => {
                if (!noteBody.trim()) return;
                addCrmPartyNote({
                  partyId: activeParty.id,
                  noteType,
                  body: noteBody,
                  sourceVertical,
                });
                setNoteBody('');
              }}
            >
              {L('Save Note', 'Enregistrer la note', 'حفظ الملاحظة')}
            </Button>
          </div>

          <div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-[#22201E] space-y-3">
            <h4 className="m-0 font-semibold t-label flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--atr-acc,#d4522f)]" />
              {L('Schedule Follow-Up Task', 'Planifier une relance', 'جدولة مهمة متابعة')}
            </h4>
            <LabelInput
              field="crmTaskTitle"
              label={L('Follow-up title', 'Objet de la relance', 'عنوان المتابعة')}
              value={taskTitle}
              onChange={setTaskTitle}
            />
            <div className="grid grid-cols-2 gap-2">
              <LabelSelect
                field="crmTaskChannel"
                label={L('Channel', 'Canal', 'القناة')}
                value={taskChannel}
                onChange={(v) => setTaskChannel(v as CrmTaskChannel)}
                options={[
                  { value: 'call', label: L('Call', 'Appel', 'مكالمة') },
                  { value: 'whatsapp', label: 'WhatsApp' },
                  { value: 'sms', label: 'SMS' },
                  { value: 'email', label: 'Email' },
                  { value: 'in_app', label: L('In-App', 'Interne', 'تنبيه داخلي') },
                ]}
              />
              <LabelInput
                field="crmTaskDue"
                type="date"
                label={L('Due date', 'Échéance', 'تاريخ الاستحقاق')}
                value={taskDueAt}
                onChange={setTaskDueAt}
              />
            </div>
            <Button
              type="button"
              tone="accent"
              size={36}
              disabled={!taskTitle.trim()}
              onClick={() => {
                if (!taskTitle.trim()) return;
                upsertCrmFollowUpTask({
                  partyId: activeParty.id,
                  title: taskTitle,
                  channel: taskChannel,
                  dueAt: new Date(taskDueAt || Date.now()).toISOString(),
                });
                setTaskTitle('');
              }}
            >
              {L('Create Task', 'Créer la tâche', 'إنشاء المهمة')}
            </Button>

            {partyTasks.length > 0 && (
              <div className="pt-2 space-y-2 border-t border-[var(--atr-divider)]">
                {partyTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/80 dark:bg-black/20 t-small"
                  >
                    <div className="min-w-0">
                      <div className={task.status === 'done' ? 'line-through opacity-60 font-medium' : 'font-medium'}>
                        {task.title}
                      </div>
                      <div className="t-cap text-black/60 dark:text-white/60 tabular-nums">
                        {task.channel} · {task.dueAt.slice(0, 10)} · {task.status}
                      </div>
                    </div>
                    {task.status !== 'done' && (
                      <Button
                        type="button"
                        tone="soft"
                        size={28}
                        leading={<CheckCircle2 className="w-3.5 h-3.5" />}
                        onClick={() => completeCrmFollowUpTask(task.id, 'done')}
                      >
                        {L('Done', 'Fait', 'تم')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {partyNotes.length > 0 && (
              <div className="pt-2 space-y-1.5 border-t border-[var(--atr-divider)]">
                {partyNotes.slice(0, 6).map((n) => (
                  <div key={n.id} className="t-small px-3 py-2 rounded-xl bg-white/60 dark:bg-black/15">
                    <div className="t-cap font-semibold text-black/65 dark:text-white/65">
                      {n.noteType.toUpperCase()} · {n.authorName} · {n.createdAt.slice(0, 10)}
                    </div>
                    <div>{n.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Template Composer & Delivery Log */}
      {subView === 'comms' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-[#22201E] space-y-3">
            {activeParty.optOutAll && (
              <div
                data-testid="crm-optout-alert"
                className="flex items-center gap-2 p-3 rounded-xl bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#c0283d] dark:text-[#FF8D7A] t-small font-semibold"
              >
                <ShieldBan className="w-4 h-4 shrink-0" />
                <span>
                  {L(
                    'Contact opted out of all messages. Outbound dispatch is blocked.',
                    'Ce tiers a activé Opt-Out. Tout envoi est bloqué.',
                    'قام هذا العميل بإيقاف استقبال الرسائل. تم حظر الإرسال.'
                  )}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <LabelSelect
                  field="crmTemplate"
                  label={L('Template (FR/AR/EN)', 'Modèle (FR/AR/EN)', 'القالب (FR/AR/EN)')}
                  value={selectedTemplate?.id || ''}
                  onChange={(val) => {
                    setSelectedTplId(val);
                    const found = templates.find((t) => t.id === val);
                    if (found) setCommChannel(found.channel);
                  }}
                  options={templates.map((t) => ({
                    value: t.id,
                    label: `${t.name} (${t.channel.toUpperCase()})`,
                  }))}
                />
              </div>
              <LabelSelect
                field="crmCommLang"
                label={L('Language', 'Langue', 'اللغة')}
                value={commLang}
                onChange={(v) => setCommLang(v as 'en' | 'fr' | 'ar')}
                options={[
                  { value: 'fr', label: 'Français' },
                  { value: 'ar', label: 'العربية' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <LabelInput
                field="crmVarDoc"
                label="doc_number"
                value={varDocNumber}
                onChange={setVarDocNumber}
              />
              <LabelInput
                field="crmVarAmount"
                label="amount"
                value={varAmount}
                onChange={setVarAmount}
              />
              <LabelInput
                field="crmVarDue"
                type="date"
                label="due_date"
                value={varDueDate}
                onChange={setVarDueDate}
              />
            </div>

            <div className="p-3 rounded-xl bg-white/80 dark:bg-black/25 space-y-1.5">
              {previewRender.subject && (
                <div className="t-small font-semibold">{previewRender.subject}</div>
              )}
              <div className="t-small whitespace-pre-wrap" dir={commLang === 'ar' ? 'rtl' : 'ltr'}>
                {previewRender.body}
              </div>
              {previewRender.missingVariables.length > 0 && (
                <div
                  data-testid="crm-missing-vars-warning"
                  className="pt-2 flex flex-wrap items-center justify-between gap-2 text-amber-700 dark:text-amber-300 t-cap font-semibold"
                >
                  <span>
                    {L('Missing variables:', 'Variables manquantes :', 'متغيرات مفقودة:')}{' '}
                    {previewRender.missingVariables.join(', ')}
                  </span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowMissingVars}
                      onChange={(e) => setAllowMissingVars(e.target.checked)}
                    />
                    {L('Allow anyway', 'Forcer quand même', 'السماح على أي حال')}
                  </label>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {(['whatsapp', 'sms', 'email'] as CrmChannel[]).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setCommChannel(ch)}
                    className={`px-3 py-1.5 rounded-full t-small font-semibold cursor-pointer ${
                      commChannel === ch
                        ? 'bg-[var(--atr-acc,#d4522f)] text-white'
                        : 'bg-white/70 dark:bg-white/10 text-black/75 dark:text-white/75'
                    }`}
                  >
                    {ch.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {!activeParty.optOutAll && commChannel === 'email' && activeParty.email && (
                  <a
                    href={`mailto:${encodeURIComponent(activeParty.email)}?subject=${encodeURIComponent(previewRender.subject)}&body=${encodeURIComponent(previewRender.body)}`}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#2B2825] t-small font-semibold inline-flex items-center gap-1.5 text-black dark:text-white"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {L('Email app', 'Client mail', 'تطبيق البريد')}
                  </a>
                )}
                {!activeParty.optOutAll && commChannel === 'whatsapp' && phoneNorm.e164 && (
                  <a
                    href={`https://wa.me/${phoneNorm.e164.replace(/\+/g, '')}?text=${encodeURIComponent(previewRender.body)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-[#DDF5E8] dark:bg-[#143324] text-[#096b40] dark:text-[#5BE3A3] t-small font-semibold inline-flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp Web
                  </a>
                )}
                <Button
                  type="button"
                  tone="accent"
                  size={36}
                  data-testid="crm-send-comm-btn"
                  leading={<Send className="w-3.5 h-3.5" />}
                  onClick={handleSend}
                >
                  {L('Send via Gateway', 'Envoyer (passerelle)', 'إرسال عبر البوابة')}
                </Button>
              </div>
            </div>
          </div>

          {/* Delivery Log */}
          <div
            data-testid="crm-delivery-log"
            className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-[#22201E] space-y-2"
          >
            <h4 className="m-0 font-semibold t-label flex items-center gap-2">
              <Phone className="w-4 h-4 text-[var(--atr-acc,#d4522f)]" />
              {L('Delivery Log', 'Journal d’envoi', 'سجل الإرسال')}
            </h4>
            {partyComms.length === 0 ? (
              <p className="t-small text-black/60 dark:text-white/60 m-0 py-2">
                {L('No outbound messages logged yet.', 'Aucun envoi journalisé.', 'لا توجد رسائل مسجلة بعد.')}
              </p>
            ) : (
              partyComms.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-2 p-3 rounded-xl bg-white/80 dark:bg-black/20 t-small"
                >
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                      <span>{log.channel.toUpperCase()}</span>
                      <span className="tabular-nums text-black/65 dark:text-white/65">
                        → {log.recipientAddress || '—'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full t-cap font-semibold ${
                          log.status === 'sent'
                            ? 'bg-[#DDF5E8] text-[#096b40]'
                            : log.status === 'blocked_opt_out'
                            ? 'bg-[#FCEFD2] text-[#8A5A06]'
                            : 'bg-[#FDE4DF] text-[#c0283d]'
                        }`}
                      >
                        {log.status}
                      </span>
                      <span className="t-cap text-black/55 dark:text-white/55">
                        #{log.attempts}
                      </span>
                    </div>
                    {log.errorMessage && (
                      <div className="t-cap text-[#c0283d] dark:text-[#FF8D7A] mt-0.5">
                        {log.errorCode ? `[${log.errorCode}] ` : ''}
                        {log.errorMessage}
                      </div>
                    )}
                    <div className="t-cap text-black/70 dark:text-white/70 truncate mt-0.5">
                      {log.renderedBody}
                    </div>
                  </div>
                  {log.status === 'failed' && (
                    <Button
                      type="button"
                      tone="soft"
                      size={28}
                      leading={<RefreshCw className="w-3 h-3" />}
                      onClick={() => retryCrmCommunication(log.id)}
                    >
                      {L('Retry', 'Relancer', 'إعادة')}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <CrmPartyMergeModal
        isOpen={Boolean(mergeTarget)}
        onClose={() => setMergeTarget(null)}
        sourceParty={mergeTarget}
        targetParty={activeParty}
        onMerged={() => setMergeTarget(null)}
      />
    </div>
  );
};
