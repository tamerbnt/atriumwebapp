import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  Phone,
  Mail,
  UserCheck,
  Building2,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { RegistrationLead } from '../../../types/index';
import { Seek } from '../../ui/Seek';
import { useTranslation } from '../../../utils/useTranslation';

interface MembershipRegistrationsViewProps {
  onAddLead?: () => void;
}

export const MembershipRegistrationsView: React.FC<MembershipRegistrationsViewProps> = ({
  onAddLead,
}) => {
  const { language } = useTranslation();
  const { leads, updateLeadStatus, convertLeadToMember, plans, currentBranch } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Declined'>('All');

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        l.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.phoneNumber.includes(searchQuery) ||
        (l.email && l.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = statusFilter === 'All' || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  const stages: Array<{ id: 'Pending' | 'Approved' | 'Declined'; label: string; count: number; color: string }> = [
    {
      id: 'Pending',
      label: language === 'ar' ? 'قيد الانتظار' : language === 'fr' ? 'En Attente' : 'Pending',
      count: leads.filter((l) => l.status === 'Pending').length,
      color: 'bg-amber-500',
    },
    {
      id: 'Approved',
      label: language === 'ar' ? 'تم القبول / الاشتراك' : language === 'fr' ? 'Convertis' : 'Approved',
      count: leads.filter((l) => l.status === 'Approved').length,
      color: 'bg-emerald-500',
    },
    {
      id: 'Declined',
      label: language === 'ar' ? 'ملغى / مرفوض' : language === 'fr' ? 'Refusés' : 'Declined',
      count: leads.filter((l) => l.status === 'Declined').length,
      color: 'bg-rose-500',
    },
  ];

  const handleConvert = (lead: RegistrationLead) => {
    const defaultPlan = plans[0] || { id: 'p_std', name: 'Pass Standard Mensuel', durationDays: 30 };
    convertLeadToMember(lead.id, defaultPlan.id, defaultPlan.name, defaultPlan.durationDays || 30);
    showToast({
      type: 'success',
      title: 'Adhésion Confirmée',
      message: `${lead.fullName} converti(e) avec succès avec le forfait ${defaultPlan.name}`,
    });
  };

  const handleDecline = (leadId: string) => {
    updateLeadStatus(leadId, 'Declined');
    showToast({
      type: 'info',
      title: 'Prospect archivé',
      message: 'Demande marquée comme refusée',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-neutral-900 dark:text-white">
              {language === 'ar' ? 'طلبات التسجيل والجلسات التجريبية' : language === 'fr' ? 'Inscriptions & Prospects Club' : 'Member Registrations & Trials'}
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {currentBranch.name} · {leads.length} {language === 'ar' ? 'مهتمين ومسجلين محتملين' : language === 'fr' ? 'prospects dans le tunnel de conversion' : 'prospects in membership funnel'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {onAddLead && (
              <button
                type="button"
                onClick={onAddLead}
                className="h-10 px-4 rounded-full bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={15} />
                <span>{language === 'ar' ? 'تسجيل مهتم جديد' : language === 'fr' ? 'Nouveau Prospect' : 'New Prospect'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Funnel Progress Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800">
          {stages.map((st) => (
            <div
              key={st.id}
              onClick={() => setStatusFilter(statusFilter === st.id ? 'All' : st.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-[#FDF4F0] border-[#C4785A]'
                  : 'bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${st.color}`} />
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  {st.label}
                </span>
              </div>
              <div className="mt-2 text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                {st.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leads List */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث بالاسم أو الهاتف...' : 'Rechercher par nom ou tél...'}
            shutSize={36}
            openWidth={280}
          />
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
          {filteredLeads.map((l) => (
            <div key={l.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-700 dark:text-neutral-300">
                  {l.fullName.charAt(0)}
                </div>
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white block text-sm">
                    {l.fullName}
                  </span>
                  <div className="flex items-center gap-3 text-neutral-400 mt-0.5 text-[11px]">
                    <span className="flex items-center gap-1"><Phone size={12} /> {l.phoneNumber}</span>
                    {l.email && <span className="flex items-center gap-1"><Mail size={12} /> {l.email}</span>}
                    <span>Source: {l.source || 'Walk-in'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    l.status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : l.status === 'Declined'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                  }`}
                >
                  {l.status}
                </span>

                {l.status === 'Pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleConvert(l)}
                      className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs cursor-pointer flex items-center gap-1"
                    >
                      <UserCheck size={13} />
                      <span>{language === 'ar' ? 'تحويل لمشترك' : 'Convertir en adhérent'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecline(l.id)}
                      className="p-1.5 rounded-full text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="Refuser"
                    >
                      <XCircle size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {filteredLeads.length === 0 && (
            <div className="py-12 text-center text-xs text-neutral-400">
              Aucun prospect dans cette étape.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
