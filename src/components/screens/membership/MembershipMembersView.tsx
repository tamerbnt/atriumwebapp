import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Download,
  Check,
  Eye,
  X,
  Phone,
  Mail,
  Calendar,
  Lock,
  Unlock,
  RotateCcw,
  Trash2,
  Edit,
  AlertCircle,
  Building2,
  Sparkles,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { Member, MemberStatus } from '../../../types/index';
import { calculateDaysRemaining, formatMoney, localizeStatus } from '../../../utils/rules';
import { Seek } from '../../ui/Seek';
import { ActionNode } from '../../ui/ActionNode';
import { LabelSelect } from '../../ui/LabelSelect';
import { useTranslation } from '../../../utils/useTranslation';

interface MembershipMembersViewProps {
  onAddMember: () => void;
  onEditMember: (member: Member) => void;
}

export const MembershipMembersView: React.FC<MembershipMembersViewProps> = ({
  onAddMember,
  onEditMember,
}) => {
  const { t, language, isRtl } = useTranslation();
  const {
    members,
    plans,
    currentBusiness,
    currentBranch,
    selectedMember,
    isDetailOpen,
    selectMember,
    closeDetail,
    updateMember,
    deleteMember,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | MemberStatus>('All');
  const [planFilter, setPlanFilter] = useState<string>('All');

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.phoneNumber.includes(searchQuery) ||
        (member.cardId && member.cardId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'All' || member.status === statusFilter;
      const matchesPlan = planFilter === 'All' || member.membershipPlanId === planFilter;

      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [members, searchQuery, statusFilter, planFilter]);

  const activeMemberObj = selectedMember;

  const handleToggleFreeze = (member: Member) => {
    const newStatus: MemberStatus = member.status === 'Frozen' ? 'Active' : 'Frozen';
    updateMember(member.id, { status: newStatus });
    showToast({
      type: 'info',
      title: newStatus === 'Frozen' ? 'Abonnement gelé' : 'Abonnement réactivé',
      message: `${member.fullName} · ${newStatus}`,
    });
  };

  const handleSimulateCheckin = (member: Member) => {
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم تسجيل الدخول' : language === 'fr' ? 'Accès autorisé' : 'Access Granted',
      message: `${member.fullName} · RFID: ${member.cardId || 'TAG-OK'}`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-neutral-900 dark:text-white">
              {language === 'ar' ? 'دليل المشتركين والأعضاء' : language === 'fr' ? 'Répertoire des Adhérents' : 'Members Directory'}
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {members.length} {language === 'ar' ? 'مشترك مسجل في هذا الفرع' : language === 'fr' ? 'adhérents enregistrés dans cet établissement' : 'members registered in this branch'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onAddMember}
              className="h-10 px-4 rounded-full bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>{language === 'ar' ? 'إضافة مشترك' : language === 'fr' ? 'Nouvel Adhérent' : 'Add Member'}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={
              language === 'ar'
                ? 'البحث بالاسم، الهاتف أو كود RFID...'
                : language === 'fr'
                ? 'Recherche par nom, tél ou RFID...'
                : 'Search by name, phone or RFID...'
            }
            openWidth={300}
            shutSize={38}
          />

          <LabelSelect
            field="Status"
            label={language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status'}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
            options={[
              { value: 'All', label: language === 'ar' ? 'جميع الحالات' : language === 'fr' ? 'Tous les statuts' : 'All Statuses' },
              { value: 'Active', label: language === 'ar' ? 'نشط' : language === 'fr' ? 'Actif' : 'Active' },
              { value: 'Expired', label: language === 'ar' ? 'منتهي' : language === 'fr' ? 'Expiré' : 'Expired' },
              { value: 'Frozen', label: language === 'ar' ? 'مجمد' : language === 'fr' ? 'Gelé' : 'Frozen' },
              { value: 'Pending', label: language === 'ar' ? 'معلق' : language === 'fr' ? 'En attente' : 'Pending' },
            ]}
          />

          <LabelSelect
            field="Plan"
            label={language === 'ar' ? 'خطة الاشتراك' : language === 'fr' ? 'Forfait' : 'Membership Plan'}
            value={planFilter}
            onChange={setPlanFilter}
            options={[
              { value: 'All', label: language === 'ar' ? 'جميع الخطط' : language === 'fr' ? 'Tous les forfaits' : 'All Plans' },
              ...plans.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </div>
      </div>

      {/* Main Members Table & Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${isDetailOpen ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white dark:bg-[#18181B] rounded-[26px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 font-bold border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  <th className="p-3.5 pl-6">{language === 'ar' ? 'المشترك' : language === 'fr' ? 'Adhérent' : 'Member'}</th>
                  <th className="p-3.5">{language === 'ar' ? 'الخطة' : language === 'fr' ? 'Formule' : 'Plan'}</th>
                  <th className="p-3.5">{language === 'ar' ? 'بطاقة RFID' : language === 'fr' ? 'Badge RFID' : 'RFID Tag'}</th>
                  <th className="p-3.5">{language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status'}</th>
                  <th className="p-3.5">{language === 'ar' ? 'الصلاحية' : language === 'fr' ? 'Échéance' : 'Expires'}</th>
                  <th className="p-3.5 pr-6 text-right">{language === 'ar' ? 'الإجراءات' : language === 'fr' ? 'Actions' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
                {filteredMembers.map((m) => {
                  const days = calculateDaysRemaining(false, m.expirationDate);
                  const isSelected = selectedMember?.id === m.id;
                  return (
                    <tr
                      key={m.id}
                      onClick={() => selectMember(m.id)}
                      className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#FDF4F0] dark:bg-neutral-800/70 font-semibold' : ''
                      }`}
                    >
                      <td className="p-3.5 pl-6">
                        <span className="font-bold text-neutral-900 dark:text-white block">
                          {m.fullName}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {m.phoneNumber}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                          {m.membershipPlanName || 'Plan'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-300">
                          {m.cardId || 'NO-TAG'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : m.status === 'Frozen'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}
                        >
                          {localizeStatus(m.status, language)}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="tabular-nums">
                          {m.expirationDate}
                        </span>
                        <span className="text-[10px] text-neutral-400 block">
                          ({days > 0 ? `${days} j` : 'Expiré'})
                        </span>
                      </td>
                      <td className="p-3.5 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleSimulateCheckin(m)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold"
                            title="Check-in RFID"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditMember(m)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Inspection Drawer */}
        {isDetailOpen && activeMemberObj && (
          <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs space-y-5 animate-in slide-in-from-right-2 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <span className="text-xs font-semibold text-neutral-400 block">
                  {language === 'ar' ? 'ملف المشترك' : language === 'fr' ? 'Dossier Adhérent' : 'Member Profile'}
                </span>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                  {activeMemberObj.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center hover:text-neutral-900 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#C4785A] block">
                    {activeMemberObj.membershipPlanName || 'Plan'}
                  </span>
                  <span className="text-sm font-black text-neutral-900 dark:text-white">
                    {activeMemberObj.remainingSessions} {language === 'ar' ? 'حصص متبقية' : language === 'fr' ? 'séances restantes' : 'sessions left'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleFreeze(activeMemberObj)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 hover:bg-neutral-100 cursor-pointer"
                >
                  {activeMemberObj.status === 'Frozen' ? 'Débloquer' : 'Geler pass'}
                </button>
              </div>

              <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Email:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{activeMemberObj.email}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Téléphone:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{activeMemberObj.phoneNumber}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Badge RFID:</span>
                  <span className="font-mono text-neutral-900 dark:text-white">{activeMemberObj.cardId || 'Non assigné'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Date début:</span>
                  <span>{activeMemberObj.startDate}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Date expiration:</span>
                  <span className="font-bold text-[#C4785A]">{activeMemberObj.expirationDate}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => onEditMember(activeMemberObj)}
                  className="flex-1 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold text-xs"
                >
                  Modifier profil
                </button>
                <button
                  type="button"
                  onClick={() => deleteMember(activeMemberObj.id)}
                  className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
