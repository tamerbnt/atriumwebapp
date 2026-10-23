import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  Scissors,
  Eye,
  History,
  X,
  Clock,
  Heart,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { Member } from '../../../types/index';
import { Seek } from '../../ui/Seek';
import { AppointmentModal } from '../../modals/AppointmentModal';
import { useTranslation } from '../../../utils/useTranslation';

interface AppointmentClientsViewProps {
  onAddMember?: () => void;
  onEditMember?: (member: Member) => void;
}

export const AppointmentClientsView: React.FC<AppointmentClientsViewProps> = ({
  onAddMember,
  onEditMember,
}) => {
  const { language } = useTranslation();
  const { members, appointments, currentBusiness, currentBranch } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Member | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  const filteredClients = useMemo(() => {
    return members.filter((m) => {
      return (
        m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phoneNumber.includes(searchQuery) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [members, searchQuery]);

  const clientAppointments = useMemo(() => {
    if (!selectedClient) return [];
    return appointments.filter((a) => a.clientId === selectedClient.id || a.clientName === selectedClient.fullName);
  }, [appointments, selectedClient]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-neutral-900 dark:text-white">
                {language === 'ar' ? 'سجل عملاء الصالون' : language === 'fr' ? 'Fichier Clients & Historique Soins' : 'Salon Client CRM'}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {members.length} {language === 'ar' ? 'عملاء مسجلين، سجل الصيغ والتفضيلات' : language === 'fr' ? 'fiches clients avec historique des coiffures, soins et formules' : 'client profiles with formulas and visit logs'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالاسم أو الهاتف...' : 'Rechercher client...'}
              openWidth={260}
              shutSize={36}
            />

            {onAddMember && (
              <button
                type="button"
                onClick={onAddMember}
                className="h-10 px-4 rounded-full bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={15} />
                <span>Nouveau Client</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Client Cards + Client History Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${selectedClient ? 'lg:col-span-2' : 'lg:col-span-3'} grid grid-cols-1 sm:grid-cols-2 gap-4`}>
          {filteredClients.map((client) => {
            const isSelected = selectedClient?.id === client.id;
            const pastCount = appointments.filter((a) => a.clientName === client.fullName).length;
            return (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={`bg-white dark:bg-[#18181B] rounded-[22px] p-5 border transition-all cursor-pointer shadow-2xs hover:border-[#C4785A]/40 flex flex-col justify-between ${
                  isSelected ? 'border-[#C4785A] ring-1 ring-[#C4785A]' : 'border-[#E9EEF0] dark:border-neutral-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] font-bold text-sm flex items-center justify-center">
                      {client.fullName.charAt(0)}
                    </div>
                    <span className="text-[11px] font-semibold text-neutral-400">
                      {pastCount} {language === 'ar' ? 'زيارات' : 'visites'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    {client.fullName}
                  </h3>
                  <div className="text-xs text-neutral-500 mt-1 space-y-0.5">
                    <p className="flex items-center gap-1.5"><Phone size={12} /> {client.phoneNumber}</p>
                    {client.email && <p className="flex items-center gap-1.5"><Mail size={12} /> {client.email}</p>}
                  </div>

                  {client.notes && (
                    <div className="mt-3 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 text-[11px] text-neutral-600 dark:text-neutral-300">
                      <strong className="block text-neutral-400 uppercase text-[9px]">Notes & Formule:</strong>
                      {client.notes}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#C4785A]">
                    Fiche VIP Salon
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAppointmentModalOpen(true);
                    }}
                    className="text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-[#C4785A]"
                  >
                    + Réserver
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Client History Drawer */}
        {selectedClient && (
          <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs space-y-4 animate-in slide-in-from-right-2 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400">Dossier Beauté</span>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                  {selectedClient.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center hover:text-neutral-900 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-neutral-500 block mb-2">Historique des Rendez-vous ({clientAppointments.length})</span>
                <div className="space-y-2 max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                  {clientAppointments.map((a) => (
                    <div key={a.id} className="pt-2">
                      <div className="flex justify-between font-bold text-neutral-900 dark:text-white">
                        <span>{a.serviceName}</span>
                        <span>{a.price} DZD</span>
                      </div>
                      <div className="flex justify-between text-neutral-400 text-[11px] mt-0.5">
                        <span>{a.date} · {a.startTime}</span>
                        <span>Styliste: {a.staffName || 'Staff'}</span>
                      </div>
                    </div>
                  ))}

                  {clientAppointments.length === 0 && (
                    <div className="py-6 text-center text-neutral-400">
                      Aucun historique de rendez-vous pour ce client.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAppointmentModalOpen(true)}
                  className="w-full py-2.5 rounded-full bg-[#C4785A] text-white font-bold text-xs"
                >
                  Prendre un nouveau rendez-vous
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
      />
    </div>
  );
};
