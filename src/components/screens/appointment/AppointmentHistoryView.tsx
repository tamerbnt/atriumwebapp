import React, { useState, useMemo } from 'react';
import {
  History,
  Scissors,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Search,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney, localizeStatus } from '../../../utils/rules';
import { Seek } from '../../ui/Seek';
import { useTranslation } from '../../../utils/useTranslation';

export const AppointmentHistoryView: React.FC = () => {
  const { language } = useTranslation();
  const { appointments, currentBranch } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredAppointments = useMemo(() => {
    return appointments.filter(
      (a) =>
        a.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.staffName && a.staffName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [appointments, searchQuery]);

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
                {language === 'ar' ? 'أرشيف وسجل المواعيد' : language === 'fr' ? 'Historique des Rendez-vous Salon' : 'Appointment Archive & History'}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {currentBranch.name} · {appointments.length} {language === 'ar' ? 'سجلات مواعيد وخدمات منجزة' : language === 'fr' ? 'rendez-vous enregistrés dans l\'historique' : 'completed and archived appointments'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث في السجل...' : 'Rechercher historique...'}
              openWidth={260}
              shutSize={36}
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 font-bold border-b border-neutral-100 dark:border-neutral-800">
              <tr>
                <th className="p-3.5 pl-6">{language === 'ar' ? 'العميل' : 'Client'}</th>
                <th className="p-3.5">{language === 'ar' ? 'الخدمة' : 'Prestation'}</th>
                <th className="p-3.5">{language === 'ar' ? 'المصفف' : 'Styliste'}</th>
                <th className="p-3.5">{language === 'ar' ? 'التاريخ والوقت' : 'Date & Heure'}</th>
                <th className="p-3.5">{language === 'ar' ? 'السعر' : 'Prix'}</th>
                <th className="p-3.5 pr-6 text-right">{language === 'ar' ? 'الحالة' : 'Statut'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
              {filteredAppointments.map((a) => (
                <tr key={a.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                  <td className="p-3.5 pl-6 font-bold text-neutral-900 dark:text-white">
                    {a.clientName}
                    <span className="text-[11px] text-neutral-400 font-mono block">{a.clientPhone}</span>
                  </td>
                  <td className="p-3.5 font-medium">
                    {a.serviceName}
                  </td>
                  <td className="p-3.5 text-neutral-500">
                    {a.staffName || 'Staff'}
                  </td>
                  <td className="p-3.5 font-mono text-neutral-600 dark:text-neutral-300">
                    {a.date} · {a.startTime}
                  </td>
                  <td className="p-3.5 font-black text-neutral-900 dark:text-white tabular-nums">
                    {formatMoney(a.price, language)}
                  </td>
                  <td className="p-3.5 pr-6 text-right">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        a.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : a.status === 'InChair'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                      }`}
                    >
                      {a.status}
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
