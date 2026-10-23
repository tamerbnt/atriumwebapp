import React, { useState, useMemo } from 'react';
import {
  History,
  Activity,
  CheckCircle2,
  Search,
  Filter,
  Calendar,
  User,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Seek } from '../../ui/Seek';
import { useTranslation } from '../../../utils/useTranslation';

export const MembershipHistoryView: React.FC = () => {
  const { language } = useTranslation();
  const { members, currentBranch } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');

  // Generate realistic turnstile scan history based on active members
  const turnstileLogs = useMemo(() => {
    const list: Array<{
      id: string;
      memberName: string;
      cardId: string;
      planName: string;
      timestamp: string;
      door: string;
      status: 'granted' | 'denied';
    }> = [];

    const now = Date.now();
    members.forEach((m, idx) => {
      const timeOffset = idx * 18 * 60 * 1000;
      list.push({
        id: `log_${m.id}_${idx}`,
        memberName: m.fullName,
        cardId: m.cardId || `RFID-${1000 + idx}`,
        planName: m.membershipPlanName || 'Pass Standard',
        timestamp: new Date(now - timeOffset).toLocaleTimeString(),
        door: idx % 2 === 0 ? 'Tourniquet Principal A' : 'Tourniquet B (Musculation)',
        status: m.status === 'Active' ? 'granted' : 'denied',
      });
    });

    return list;
  }, [members]);

  const filteredLogs = useMemo(() => {
    return turnstileLogs.filter(
      (l) =>
        l.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.cardId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [turnstileLogs, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
              <History size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-neutral-900 dark:text-white">
                {language === 'ar' ? 'سجل بوابات الدخول RFID' : language === 'fr' ? 'Historique des Passages Tourniquets RFID' : 'Turnstile RFID Access History'}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {currentBranch.name} · {language === 'ar' ? 'سجل حي لعمليات الدخول والخروج' : language === 'fr' ? 'Journal en direct des accès et pointages' : 'Live scan log of member turnstile entries'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالاسم أو RFID...' : 'Filtrer par nom ou RFID...'}
              openWidth={260}
              shutSize={36}
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 font-bold border-b border-neutral-100 dark:border-neutral-800">
              <tr>
                <th className="p-3.5 pl-6">{language === 'ar' ? 'المشترك' : 'Adhérent'}</th>
                <th className="p-3.5">{language === 'ar' ? 'بطاقة RFID' : 'Badge RFID'}</th>
                <th className="p-3.5">{language === 'ar' ? 'البوابة' : 'Point d\'accès'}</th>
                <th className="p-3.5">{language === 'ar' ? 'الوقت' : 'Heure'}</th>
                <th className="p-3.5 pr-6 text-right">{language === 'ar' ? 'النتيجة' : 'Résultat'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                  <td className="p-3.5 pl-6 font-bold text-neutral-900 dark:text-white">
                    {log.memberName}
                    <span className="text-[11px] text-neutral-400 font-normal block">{log.planName}</span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                    {log.cardId}
                  </td>
                  <td className="p-3.5 text-neutral-500">
                    {log.door}
                  </td>
                  <td className="p-3.5 font-mono text-neutral-600 dark:text-neutral-300 tabular-nums">
                    {log.timestamp}
                  </td>
                  <td className="p-3.5 pr-6 text-right">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        log.status === 'granted'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      }`}
                    >
                      {log.status === 'granted' ? 'Accès Autorisé' : 'Accès Refusé (Expiré)'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
