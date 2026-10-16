import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Play,
  FileText,
  DollarSign,
  Briefcase,
  Clock,
  ChevronRight,
  X,
  Mail,
  Phone,
  Globe,
  Edit2,
  CheckCircle,
  Building,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatCurrencyAmount, formatDuration } from '../../../utils/rules';
import { FreelanceClient, FreelanceClientStatus, CurrencyCode } from '../../../types/index';

export const FreelanceClientsView: React.FC = () => {
  const {
    freelanceClients,
    freelanceProjects,
    timeLogs,
    freelanceInvoices,
    addFreelanceClient,
    updateFreelanceClient,
    startTimer,
    billUnbilledHours,
    setScreen,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<FreelanceClient | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<FreelanceClient | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    country: 'Algeria',
    currency: 'DZD' as CurrencyCode,
    hourlyRate: 3500,
    status: 'ProjectBased' as FreelanceClientStatus,
    monthlyRetainerHours: 0,
    monthlyRetainerAmount: 0,
    notes: '',
  });

  const filteredClients = useMemo(() => {
    return freelanceClients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.company && client.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        selectedStatus === 'all' ? true : client.status.toLowerCase() === selectedStatus.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [freelanceClients, searchQuery, selectedStatus]);

  // Aggregate metrics
  const totalClientsCount = freelanceClients.length;
  const activeRetainersCount = freelanceClients.filter((c) => c.status === 'ActiveRetainer').length;
  const totalBilledEquiv = freelanceInvoices
    .filter((inv) => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const getClientUnbilledTime = (clientId: string) => {
    const unbilledLogs = timeLogs.filter(
      (log) => log.clientId === clientId && log.isBillable && !log.isInvoiced
    );
    const totalSeconds = unbilledLogs.reduce((acc, log) => acc + log.durationSeconds, 0);
    const unbilledAmount = unbilledLogs.reduce(
      (acc, log) => acc + (log.durationSeconds / 3600) * log.rateAtMoment,
      0
    );
    return {
      hours: Number((totalSeconds / 3600).toFixed(1)),
      seconds: totalSeconds,
      amount: Math.round(unbilledAmount),
      count: unbilledLogs.length,
    };
  };

  const handleOpenAddModal = () => {
    setClientToEdit(null);
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      country: 'Algeria',
      currency: 'DZD',
      hourlyRate: 3500,
      status: 'ProjectBased',
      monthlyRetainerHours: 0,
      monthlyRetainerAmount: 0,
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (client: FreelanceClient) => {
    setClientToEdit(client);
    setFormData({
      name: client.name,
      company: client.company || '',
      email: client.email,
      phone: client.phone || '',
      country: client.country || 'Algeria',
      currency: client.currency,
      hourlyRate: client.hourlyRate,
      status: client.status,
      monthlyRetainerHours: client.monthlyRetainerHours || 0,
      monthlyRetainerAmount: client.monthlyRetainerAmount || 0,
      notes: client.notes || '',
    });
    setIsAddModalOpen(true);
  };

  const handleSubmitClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    if (clientToEdit) {
      updateFreelanceClient(clientToEdit.id, {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        currency: formData.currency,
        hourlyRate: Number(formData.hourlyRate),
        status: formData.status,
        monthlyRetainerHours: Number(formData.monthlyRetainerHours),
        monthlyRetainerAmount: Number(formData.monthlyRetainerAmount),
        notes: formData.notes,
      });
      if (selectedClient?.id === clientToEdit.id) {
        setSelectedClient({
          ...selectedClient,
          ...formData,
        });
      }
    } else {
      const created = addFreelanceClient({
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        currency: formData.currency,
        hourlyRate: Number(formData.hourlyRate),
        status: formData.status,
        monthlyRetainerHours: Number(formData.monthlyRetainerHours),
        monthlyRetainerAmount: Number(formData.monthlyRetainerAmount),
        notes: formData.notes,
      });
      setSelectedClient(created);
    }

    setIsAddModalOpen(false);
  };

  const handleQuickStartTimer = (client: FreelanceClient) => {
    const clientProjects = freelanceProjects.filter((p) => p.clientId === client.id);
    const activeProject = clientProjects[0];
    startTimer(
      client.id,
      client.name,
      activeProject ? activeProject.id : 'proj_general',
      activeProject ? activeProject.title : 'Sprint & Advisory',
      `Focus work for ${client.name}`,
      activeProject?.deliverables[0]?.id,
      activeProject?.deliverables[0]?.title,
      true,
      false
    );
  };

  const handleQuickBill = (client: FreelanceClient) => {
    try {
      billUnbilledHours(client.id, 0, `Invoice for unbilled hours - ${client.name}`);
      setScreen('shop');
    } catch (err: any) {
      console.error('Unable to bill unbilled hours:', err?.message || err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Clients & Retainers CRM
            </h1>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {totalClientsCount} accounts · {activeRetainersCount} monthly retainers
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Manage contract rates, billable unbilled balance, client currencies, and engagement history
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Add New Client</span>
        </button>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Total Client Network
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {totalClientsCount}
            </span>
            <span className="text-xs text-neutral-500">
              {activeRetainersCount} active retainers
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Active Retainers Volume
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {activeRetainersCount}
            </span>
            <span className="text-xs text-neutral-500">
              recurring contracts
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Global Settled Volume
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#C4785A] tabular-nums">
              {totalBilledEquiv.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-500">
              across all currencies
            </span>
          </div>
        </div>
      </div>

      {/* Search & Segmented Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search clients by name, company, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
          />
        </div>

        {/* Segmented Filter Control */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl self-start sm:self-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Clients' },
            { id: 'activeretainer', label: 'Retainers' },
            { id: 'projectbased', label: 'Project-Based' },
            { id: 'prospect', label: 'Prospects' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedStatus === tab.id
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Data Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => {
          const unbilled = getClientUnbilledTime(client.id);
          const clientProjects = freelanceProjects.filter((p) => p.clientId === client.id);

          return (
            <div
              key={client.id}
              onClick={() => setSelectedClient(client)}
              className="p-5 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 hover:border-[#C4785A]/40 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
            >
              <div>
                {/* Client Header Info */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-sm shrink-0 border border-neutral-200 dark:border-neutral-700">
                      {client.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate group-hover:text-[#C4785A] transition-colors">
                        {client.name}
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {client.company || 'Private Client'}
                      </p>
                    </div>
                  </div>

                  {/* Clean unboxed status metadata */}
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 shrink-0">
                    {client.status === 'ActiveRetainer'
                      ? 'Retainer'
                      : client.status === 'ProjectBased'
                      ? 'Project'
                      : client.status}
                  </span>
                </div>

                {/* Rates & Retainer Details */}
                <div className="py-2.5 my-2 border-y border-neutral-100 dark:border-neutral-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                    <span>Rate & Currency:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                      {formatCurrencyAmount(client.hourlyRate, client.currency)}/hr
                    </span>
                  </div>

                  {client.monthlyRetainerHours && client.monthlyRetainerHours > 0 ? (
                    <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Monthly Quota:</span>
                      <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                        {client.monthlyRetainerHours}h ({formatCurrencyAmount(client.monthlyRetainerAmount || 0, client.currency)})
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                    <span>Active Projects:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                      {clientProjects.length}
                    </span>
                  </div>
                </div>

                {/* Unbilled Alert Strip if any */}
                {unbilled.amount > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 mb-3 flex items-center justify-between text-xs">
                    <div className="text-amber-800 dark:text-amber-300">
                      <span className="font-semibold tabular-nums">{unbilled.hours} hrs</span> unbilled
                    </div>
                    <span className="font-bold text-amber-900 dark:text-amber-200 tabular-nums">
                      {formatCurrencyAmount(unbilled.amount, client.currency)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickStartTimer(client);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-[#C4785A] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Start live timer for this client"
                >
                  <Play size={12} />
                  <span>Start Timer</span>
                </button>

                {unbilled.count > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickBill(client);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="1-Click Bill unbilled hours"
                  >
                    <FileText size={12} />
                    <span>Bill ({unbilled.hours}h)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditModal(client);
                  }}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-auto cursor-pointer"
                  title="Edit client"
                >
                  <Edit2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            No clients match your filter criteria
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Try adjusting your search query or add your first client.
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="mt-4 px-4 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Add Client</span>
          </button>
        </div>
      )}

      {/* 360° Client Inspector Slide-over Drawer */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#18181B] h-full shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#C4785A] uppercase tracking-wider block">
                  Client 360° Profile
                </span>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {selectedClient.name}
                </h2>
                <p className="text-xs text-neutral-500">{selectedClient.company || 'Private Client'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
              {/* Contact Information */}
              <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-neutral-900/60 border border-[#EDF1F3] dark:border-neutral-800 space-y-2.5">
                <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                  <Mail size={13} className="text-neutral-400 shrink-0" />
                  <span className="truncate">{selectedClient.email}</span>
                </div>
                {selectedClient.phone && (
                  <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                    <Phone size={13} className="text-neutral-400 shrink-0" />
                    <span>{selectedClient.phone}</span>
                  </div>
                )}
                {selectedClient.country && (
                  <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                    <Globe size={13} className="text-neutral-400 shrink-0" />
                    <span>{selectedClient.country} · Billing in {selectedClient.currency}</span>
                  </div>
                )}
              </div>

              {/* Retainer & Rate Parameters */}
              <div className="space-y-2">
                <span className="font-semibold text-neutral-900 dark:text-white block">
                  Contract Terms
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                      Hourly Rate
                    </span>
                    <span className="text-base font-bold text-neutral-900 dark:text-white tabular-nums">
                      {formatCurrencyAmount(selectedClient.hourlyRate, selectedClient.currency)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                      Monthly Retainer
                    </span>
                    <span className="text-base font-bold text-neutral-900 dark:text-white tabular-nums">
                      {selectedClient.monthlyRetainerHours || 0} hrs
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Projects & Deliverables */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    Projects ({freelanceProjects.filter((p) => p.clientId === selectedClient.id).length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setScreen('scheduler');
                    }}
                    className="text-[#C4785A] hover:underline font-semibold cursor-pointer"
                  >
                    Manage Deliverables →
                  </button>
                </div>

                <div className="space-y-2">
                  {freelanceProjects
                    .filter((p) => p.clientId === selectedClient.id)
                    .map((project) => (
                      <div
                        key={project.id}
                        className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {project.title}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {project.stage}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-neutral-500 mt-1 text-[11px]">
                          <span>
                            Logged: <strong className="text-neutral-700 dark:text-neutral-300 tabular-nums">{project.loggedHours}h</strong> / {project.estimatedHours}h
                          </span>
                          <span>·</span>
                          <span>Budget: {formatCurrencyAmount(project.budget, project.currency)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Unbilled Time Logs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    Unbilled Work Logs
                  </span>
                  {getClientUnbilledTime(selectedClient.id).count > 0 && (
                    <button
                      type="button"
                      onClick={() => handleQuickBill(selectedClient)}
                      className="text-[#C4785A] hover:underline font-semibold cursor-pointer"
                    >
                      Generate Invoice →
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {timeLogs
                    .filter((t) => t.clientId === selectedClient.id && !t.isInvoiced)
                    .slice(0, 5)
                    .map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 text-[11px] flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white truncate max-w-[200px]">
                            {log.taskDescription}
                          </p>
                          <span className="text-neutral-400">{log.date}</span>
                        </div>
                        <span className="font-bold tabular-nums text-neutral-900 dark:text-white">
                          {formatDuration(log.durationSeconds)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Notes */}
              {selectedClient.notes && (
                <div className="space-y-1">
                  <span className="font-semibold text-neutral-900 dark:text-white block">
                    Engagement Notes
                  </span>
                  <p className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs">
                    {selectedClient.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickStartTimer(selectedClient)}
                className="flex-1 py-2.5 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <Play size={13} />
                <span>Start Live Focus Timer</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenEditModal(selectedClient)}
                className="px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {clientToEdit ? 'Edit Client Profile' : 'Add New Client'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitClient} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Karim Mansouri"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Company / Brand
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. TechNova SAS"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="client@company.com"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+213 550 00 00 00"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as CurrencyCode })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                  >
                    <option value="DZD">DZD (DA)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Hourly Rate
                  </label>
                  <input
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as FreelanceClientStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                  >
                    <option value="ActiveRetainer">Active Retainer</option>
                    <option value="ProjectBased">Project-Based</option>
                    <option value="Prospect">Prospect</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              {formData.status === 'ActiveRetainer' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                  <div>
                    <label className="font-semibold text-amber-900 dark:text-amber-200 block mb-1">
                      Monthly Retainer Hours
                    </label>
                    <input
                      type="number"
                      value={formData.monthlyRetainerHours}
                      onChange={(e) => setFormData({ ...formData, monthlyRetainerHours: Number(e.target.value) })}
                      placeholder="e.g. 20"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-amber-900 dark:text-amber-200 block mb-1">
                      Monthly Flat Fee
                    </label>
                    <input
                      type="number"
                      value={formData.monthlyRetainerAmount}
                      onChange={(e) => setFormData({ ...formData, monthlyRetainerAmount: Number(e.target.value) })}
                      placeholder="e.g. 1500"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Private Notes & Scope Guidelines
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Key contacts, payment terms, VAT rules, repository links..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {clientToEdit ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
