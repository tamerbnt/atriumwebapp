import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Check,
  X,
  UserCheck,
  Search,
  Download,
  LayoutGrid,
  List,
  Maximize2,
  Home,
  ChevronDown,
  Building2,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { RegistrationLead } from '../../types/index';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';

interface RegistrationsScreenProps {
  onAddLead: () => void;
}

export const RegistrationsScreen: React.FC<RegistrationsScreenProps> = ({ onAddLead }) => {
  const {
    leads,
    plans,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    terminology,
    updateLeadStatus,
    convertLeadToMember,
  } = useAtriumStore();

  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Declined'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [planFilter, setPlanFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<RegistrationLead | null>(null);
  const [conversionLead, setConversionLead] = useState<RegistrationLead | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter !== 'All' && lead.status !== statusFilter) return false;
      if (planFilter !== 'All') {
        if (lead.preferredPlanId !== planFilter && lead.preferredPlanName !== planFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.fullName.toLowerCase().includes(q);
        const matchesPhone = lead.phoneNumber.includes(q);
        const matchesEmail = lead.email.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail) return false;
      }
      return true;
    });
  }, [leads, statusFilter, planFilter, searchQuery]);

  const pendingCount = useMemo(() => leads.filter((l) => l.status === 'Pending').length, [leads]);
  const approvedCount = useMemo(() => leads.filter((l) => l.status === 'Approved').length, [leads]);

  const handleStartConversion = (lead: RegistrationLead) => {
    setConversionLead(lead);
    setSelectedPlanId(lead.preferredPlanId || plans[0]?.id || 'plan_a1');
  };

  const handleConfirmConversion = () => {
    if (!conversionLead) return;
    const plan = plans.find((p) => p.id === selectedPlanId) || plans[0];
    convertLeadToMember(
      conversionLead.id,
      plan ? plan.id : 'plan_a1',
      plan ? plan.name : 'Plan A1',
      plan ? plan.durationDays : 365
    );
    setConversionLead(null);
    if (selectedLead?.id === conversionLead.id) {
      setSelectedLead(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Full Name', 'Phone', 'Email', 'Preferred Plan', 'Source', 'Status', 'Submitted Date'];
    const rows = filteredLeads.map((l) => [
      `"${l.fullName}"`,
      `"${l.phoneNumber}"`,
      `"${l.email}"`,
      `"${l.preferredPlanName || 'Plan A1'}"`,
      `"${l.source}"`,
      `"${l.status}"`,
      `"${new Date(l.createdAt).toLocaleDateString()}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `atrium-leads-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      {/* Row 0: Top Header matching Desktop App */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {terminology.registration} Pipeline
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Review self-service intake requests, qualify prospects, and onboard new members into {currentBranch?.name || 'Atrium 1'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          {/* Facility Pill: Atrium 1 ▾ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-full bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Home size={15} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || 'Atrium 1'}
              </span>
              <ChevronDown
                size={14}
                className={`text-neutral-500 transition-transform ${
                  isFacilityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isFacilityDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Switch Facility
                </div>
                {businesses.map((biz) => {
                  const isCurrent = biz.id === currentBusinessId;
                  const matchingBranch = branches.find((b) => b.businessId === biz.id);
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        switchBusiness(biz.id);
                        if (matchingBranch) switchBranch(matchingBranch.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                        <span className="truncate">{biz.name}</span>
                      </div>
                      {isCurrent && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Registration Primary Action Button */}
          <button
            type="button"
            onClick={onAddLead}
            style={{
              backgroundColor: 'var(--color-accent)',
            }}
            className="h-10 px-5 rounded-full text-xs font-bold text-white flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-98 transition-all shadow-xs"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Quick Registration</span>
          </button>
        </div>
      </div>

      {/* Row 1: Pipeline Velocity & Intake Health Banner Card */}
      <div
        style={{
          backgroundColor: 'var(--color-card-bg)',
          border: '1px solid var(--color-card-border)',
          borderRadius: 'var(--radius-stage)',
        }}
        className="p-6 space-y-4 shadow-xs"
      >
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            Pipeline Velocity & Conversion Health
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Self-service intake requests, qualified prospects, and enrollment conversion rates
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tile 1: Pending Leads Pipeline */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 flex flex-col justify-between h-[120px]">
            <div>
              <span className="text-xs font-medium text-neutral-500">
                Active Intake Pipeline
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                  ↗ {pendingCount} En Attente
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {pendingCount}
            </div>
          </div>

          {/* Tile 2: Converted Enrollments */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 flex flex-col justify-between h-[120px]">
            <div>
              <span className="text-xs font-medium text-neutral-500">
                Converted Members
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  Conversion Réussie
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {approvedCount}
            </div>
          </div>

          {/* Tile 3: Dark Obsidian Card */}
          <div
            style={{
              backgroundColor: 'var(--color-card-dark)',
            }}
            className="p-4 rounded-2xl text-white flex flex-col justify-between h-[120px] shadow-sm"
          >
            <div>
              <span className="text-xs font-medium text-neutral-400">
                Intake Response SLA
              </span>
              <div className="text-[11px] text-[#C4785A] font-semibold mt-0.5">
                Self-service Kiosk & Mobile Web
              </div>
            </div>
            <div className="text-2xl font-black text-white tabular-nums">
              &lt; 15 min{' '}
              <span className="text-xs font-normal text-neutral-400">
                délai moyen
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Registrations Master Table Card */}
      <div
        style={{
          backgroundColor: 'var(--color-card-bg)',
          border: '1px solid var(--color-card-border)',
          borderRadius: 'var(--radius-stage)',
        }}
        className="p-6 space-y-4 shadow-xs"
      >
        {/* Table Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Icon + Title + Count */}
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {terminology.registration} Requests
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
              {filteredLeads.length}
            </span>
          </div>

          {/* Right Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {/* Circular Search Button */}
            <div className="relative flex items-center">
              {isSearchActive ? (
                <div className="flex items-center animate-in fade-in duration-150">
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search applicant name, phone, email..."
                    className="h-9 px-3 text-xs rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:border-[#C4785A] w-52 text-neutral-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchActive(false);
                      setSearchQuery('');
                    }}
                    className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 ml-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSearchActive(true)}
                  className="w-9 h-9 rounded-full bg-[#FAF9F6] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer transition-colors"
                  title="Search registrations"
                >
                  <Search size={14} />
                </button>
              )}
            </div>

            {/* Status Filter Capsules */}
            <div className="flex items-center p-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800/80 gap-0.5 text-xs font-semibold">
              {(['All', 'Pending', 'Approved', 'Declined'] as const).map((filter) => {
                const isActive = statusFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    style={{
                      backgroundColor: isActive ? '#FCEEE8' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : '#71717A',
                    }}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      isActive ? 'font-bold shadow-2xs' : 'hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>

            {/* Plan Filter Dropdown */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="h-9 px-3 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 border-none font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer focus:outline-none"
            >
              <option value="All">All Plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Export Data Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-3.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors shadow-2xs"
              title="Download CSV export"
            >
              <Download size={13} />
              <span>Export Data</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                  viewMode === 'grid'
                    ? 'text-[#C4785A] bg-[#C4785A]/10 font-bold'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
                title="Grid view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                  viewMode === 'list'
                    ? 'text-[#C4785A] bg-[#C4785A]/10 font-bold'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
                title="List view"
              >
                <List size={15} />
              </button>
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer"
              title="Toggle Fullscreen"
            >
              <Maximize2 size={15} />
            </button>
          </div>
        </div>

        {/* List / Grid Display */}
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-200/60 dark:border-neutral-800/80 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider h-11">
                  <th className="px-5">Applicant</th>
                  <th className="px-4">Acquisition Source</th>
                  <th className="px-4">Preferred {terminology.plan}</th>
                  <th className="px-4">Submission Date</th>
                  <th className="px-4">Status</th>
                  <th className="px-4 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/40 dark:divide-neutral-800/60">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-xs text-neutral-400">
                      No registration requests matching the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`h-16 transition-colors cursor-pointer ${
                        selectedLead?.id === lead.id
                          ? 'bg-[#FCEEE8]/60 dark:bg-neutral-800'
                          : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50'
                      }`}
                    >
                      {/* Lead Info */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={lead.fullName} size={38} />
                          <div>
                            <div className="text-sm font-bold text-neutral-900 dark:text-white">
                              {lead.fullName}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {lead.phoneNumber} · {lead.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Acquisition Source */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          {lead.source}
                        </span>
                        {lead.notes && (
                          <span className="block text-[11px] text-neutral-400 truncate max-w-xs">
                            {lead.notes}
                          </span>
                        )}
                      </td>

                      {/* Preferred Plan */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-[#C4785A]">
                          {lead.preferredPlanName || 'Plan A1'}
                        </span>
                        {lead.preferredStartDate && (
                          <span className="block text-[11px] text-neutral-400">
                            Start: {lead.preferredStartDate}
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            lead.status === 'Approved'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                              : lead.status === 'Declined'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              lead.status === 'Approved'
                                ? 'bg-emerald-500'
                                : lead.status === 'Declined'
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          {lead.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {lead.status === 'Pending' ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartConversion(lead)}
                              style={{
                                backgroundColor: 'var(--color-accent)',
                              }}
                              className="h-8 px-3 text-xs font-bold text-white rounded-full flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                            >
                              <UserCheck size={14} />
                              <span>Convert</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateLeadStatus(lead.id, 'Declined')}
                              className="h-8 px-2 text-xs font-semibold text-neutral-400 hover:text-rose-600 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                              title="Decline Lead"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">
                            Processed {new Date(lead.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View matching desktop cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedLead?.id === lead.id
                    ? 'border-[#C4785A] bg-[#FAF9F6] dark:bg-neutral-800/80 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      lead.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700'
                        : lead.status === 'Declined'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {lead.status}
                  </span>
                  <span className="text-[11px] text-neutral-400 tabular-nums">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={lead.fullName} size={40} />
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {lead.fullName}
                    </h3>
                    <p className="text-xs text-neutral-500">{lead.phoneNumber}</p>
                  </div>
                </div>

                <div className="text-xs space-y-1 mb-4 text-neutral-600 dark:text-neutral-400">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Plan:</span>
                    <span className="font-bold text-[#C4785A]">
                      {lead.preferredPlanName || 'Plan A1'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Source:</span>
                    <span>{lead.source}</span>
                  </div>
                </div>

                {lead.status === 'Pending' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartConversion(lead);
                    }}
                    style={{ backgroundColor: 'var(--color-accent)' }}
                    className="w-full h-8 rounded-full text-xs font-bold text-white flex items-center justify-center gap-1.5 hover:opacity-90 cursor-pointer shadow-xs"
                  >
                    <UserCheck size={14} />
                    <span>Approve & Convert</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Slide-out Inspector Drawer for Registration Lead */}
      {selectedLead && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList size={17} className="text-[#C4785A]" />
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                Prospect Dossier Inspector
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLead(null)}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* Lead Card Profile */}
            <div className="p-5 rounded-2xl bg-[#FAF9F6] dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center gap-4">
              <Avatar name={selectedLead.fullName} size={50} />
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {selectedLead.fullName}
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                    selectedLead.status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : selectedLead.status === 'Declined'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {selectedLead.status}
                </span>
              </div>
            </div>

            {/* Contact details */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Contact & Details
              </span>
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <Phone size={14} className="text-[#C4785A]" />
                  <span className="text-neutral-800 dark:text-neutral-200 font-semibold">
                    {selectedLead.phoneNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail size={14} className="text-[#C4785A]" />
                  <span className="text-neutral-800 dark:text-neutral-200 font-semibold">
                    {selectedLead.email}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar size={14} className="text-[#C4785A]" />
                  <span className="text-neutral-800 dark:text-neutral-200">
                    Requested start:{' '}
                    <strong className="text-neutral-900 dark:text-white">
                      {selectedLead.preferredStartDate || 'Immediate'}
                    </strong>
                  </span>
                </div>
                {selectedLead.notes && (
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 text-neutral-500">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">Notes:</span>{' '}
                    {selectedLead.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Preferred Plan */}
            <div className="p-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#E8DFD8] dark:border-neutral-700 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-[#C4785A]">Preferred Plan</span>
                <div className="text-sm font-black text-neutral-900 dark:text-white mt-0.5">
                  {selectedLead.preferredPlanName || 'Plan A1 (30 sessions)'}
                </div>
              </div>
              <span className="text-base font-black text-[#C4785A] tabular-nums">
                1,500 DA
              </span>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              {selectedLead.status === 'Pending' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleStartConversion(selectedLead)}
                    style={{ backgroundColor: 'var(--color-accent)' }}
                    className="w-full h-10 rounded-full text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 shadow-xs"
                  >
                    <UserCheck size={16} />
                    <span>Approve & Convert to Member</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateLeadStatus(selectedLead.id, 'Declined');
                      setSelectedLead(null);
                    }}
                    className="w-full h-10 rounded-full border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-colors"
                  >
                    Decline Registration
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  style={{ backgroundColor: 'var(--color-accent)' }}
                  className="w-full h-10 rounded-full text-xs font-bold text-white flex items-center justify-center cursor-pointer hover:opacity-90 shadow-xs"
                >
                  Close Dossier
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Convert Lead to Member Modal */}
      <Modal
        isOpen={conversionLead !== null}
        onClose={() => setConversionLead(null)}
        title="Convert Lead to Active Member"
        subtitle={`Promote ${conversionLead?.fullName} to official member status in ${currentBranch?.name || 'Atrium 1'}`}
      >
        {conversionLead && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 text-xs space-y-1">
              <div>
                <strong className="text-neutral-900 dark:text-white">Applicant:</strong>{' '}
                {conversionLead.fullName}
              </div>
              <div>
                <strong className="text-neutral-900 dark:text-white">Phone:</strong>{' '}
                {conversionLead.phoneNumber} · {conversionLead.email}
              </div>
              <div>
                <strong className="text-neutral-900 dark:text-white">Source:</strong>{' '}
                {conversionLead.source}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Select Membership Plan
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.durationDays} days · {p.price.amount} {p.price.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-2xl bg-[#C4785A]/10 border border-[#C4785A]/20 text-xs text-[#C4785A]">
              Upon confirmation, a unique RFID card credential will be generated automatically, the lead will be marked Approved, and the member will be enrolled immediately.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setConversionLead(null)}
                className="h-10 px-4 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConversion}
                style={{
                  backgroundColor: 'var(--color-accent)',
                }}
                className="h-10 px-5 text-xs font-bold text-white rounded-full flex items-center gap-2 hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-xs"
              >
                <Check size={15} />
                <span>Confirm & Create Member</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
