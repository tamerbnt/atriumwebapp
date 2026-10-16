import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Monitor,
  ShieldCheck,
  Plus,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Database,
  Cloud,
  CloudOff,
  RotateCw,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { Modal } from '../ui/Modal';
import { validateVoucherCode } from '../../utils/rules';

interface SettingsScreenProps {
  onOpenVoucherModal: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onOpenVoucherModal }) => {
  const {
    account,
    subscription,
    businesses,
    branches,
    devices,
    quotas,
    currentBusiness,
    addBranch,
    registerDevice,
    revokeDevice,
    openOnboarding,
    supabaseStatus,
    isSyncing,
    syncWithSupabase,
    isSupabaseConfigured,
    lastSyncedAt,
    syncErrorMessage,
  } = useAtriumStore();

  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchError, setBranchError] = useState<string | null>(null);

  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState('');
  const [deviceHwId, setDeviceHwId] = useState('');
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    setBranchError(null);
    try {
      addBranch(branchName, branchCode, branchAddress, branchPhone);
      setIsAddBranchOpen(false);
      setBranchName('');
      setBranchCode('');
      setBranchAddress('');
      setBranchPhone('');
    } catch (err: any) {
      setBranchError(err.message || 'Failed to create branch');
    }
  };

  const handleRegisterDevice = (e: React.FormEvent) => {
    e.preventDefault();
    setDeviceError(null);
    try {
      registerDevice(deviceLabel, deviceHwId);
      setIsAddDeviceOpen(false);
      setDeviceLabel('');
      setDeviceHwId('');
    } catch (err: any) {
      setDeviceError(err.message || 'Failed to register terminal');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Row 0: Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3.5">
          <div
            style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
          >
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              System Settings & Architecture
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Manage branches, POS devices, license vouchers, and multi-tenant security
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openOnboarding}
            className="h-10 px-4 rounded-xl bg-[#FDF4F0] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 text-[#C4785A] text-xs font-bold flex items-center gap-2 hover:bg-[#FBECE6] dark:hover:bg-neutral-700/80 transition-colors cursor-pointer"
          >
            <Sparkles size={14} />
            <span>New Business Setup Wizard</span>
          </button>
        </div>
      </div>

      {/* Row 1: License Status Banner */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Active License Entitlement
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  subscription.isLifetime
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                }`}
              >
                {subscription.isLifetime ? 'PERPETUAL LIFETIME' : '30-DAY TRIAL'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              Atrium {subscription.plan.name} Tier Rank #{subscription.plan.tierRank}
            </h2>
            <p className="text-xs text-[#52525B] dark:text-neutral-400">
              {subscription.isLifetime
                ? `Activated via voucher code ${subscription.activatedByVoucher || 'ATR-LIFE-VOUCHER'}. Perpetual updates and sync authorized.`
                : 'Free evaluation tier. Enter your lifetime prepaid cash voucher code to unlock full capacity.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenVoucherModal}
            style={{
              backgroundColor: 'var(--color-accent)',
            }}
            className="h-10 px-5 text-xs font-bold text-white flex items-center gap-2 shrink-0 rounded-full hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-xs"
          >
            <KeyRound size={15} />
            <span>Redeem Lifetime Voucher</span>
          </button>
        </div>

        {/* Quota gauges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400 block text-[11px]">Businesses Allowed</span>
            <span className="text-xl font-black text-neutral-900 dark:text-white tabular-nums mt-1 block">
              {businesses.length} / {subscription.plan.maxBusinesses}
            </span>
          </div>
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400 block text-[11px]">Branches Allowed</span>
            <span className="text-xl font-black text-neutral-900 dark:text-white tabular-nums mt-1 block">
              {branches.length} / {subscription.plan.maxBranches}
            </span>
          </div>
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400 block text-[11px]">POS Devices Allowed</span>
            <span className="text-xl font-black text-neutral-900 dark:text-white tabular-nums mt-1 block">
              {devices.length} / {subscription.plan.maxDevices}
            </span>
          </div>
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
            <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400 block text-[11px]">Cross-Branch Reports</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-2 block">
              {subscription.plan.crossBranchReports ? 'Enabled' : 'Pro Tier Only'}
            </span>
          </div>
        </div>
      </div>

      {/* Row 1.5: Supabase Cloud & PostgreSQL Database Integration */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                supabaseStatus === 'connected'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : supabaseStatus === 'connecting'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                  : supabaseStatus === 'offline'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Supabase Cloud Database & Realtime
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    supabaseStatus === 'connected'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : supabaseStatus === 'connecting'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      : supabaseStatus === 'offline'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {supabaseStatus === 'connected'
                    ? 'Cloud Connected'
                    : supabaseStatus === 'connecting'
                    ? 'Syncing'
                    : supabaseStatus === 'offline'
                    ? 'Offline Fallback'
                    : 'Hybrid / Local Engine'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Multi-tenant PostgreSQL backend with 17 relational tables, 14 stored RPCs, and Row-Level Security (RLS).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => syncWithSupabase()}
            disabled={isSyncing}
            className="h-9 px-4 text-xs font-bold rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-700/60 flex items-center gap-2 cursor-pointer transition-colors shadow-2xs disabled:opacity-60"
          >
            <RotateCw size={13} className={isSyncing ? 'animate-spin text-[#C4785A]' : ''} />
            <span>{isSyncing ? 'Syncing Tables...' : 'Sync Database Now'}</span>
          </button>
        </div>

        {/* Cloud Diagnostics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60">
            <span className="text-[11px] font-semibold text-neutral-400 block">Schema Architecture</span>
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mt-1 block">
              17 Tables + 14 Stored RPCs
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              Strict multi-tenant RLS isolation
            </span>
          </div>

          <div className="p-3.5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60">
            <span className="text-[11px] font-semibold text-neutral-400 block">Realtime WebSockets</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              Active Broadcast Listener
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              Live updates on check-ins & sales
            </span>
          </div>

          <div className="p-3.5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60">
            <span className="text-[11px] font-semibold text-neutral-400 block">Last Cloud Sync</span>
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mt-1 block">
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'Ready on command'}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              {isSupabaseConfigured ? 'Dual-mode live cloud active' : 'Offline local storage fallback'}
            </span>
          </div>
        </div>

        {syncErrorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{syncErrorMessage}</span>
          </div>
        )}
      </div>

      {/* Row 2: Branches Management */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Physical Branches & Facilities
            </h3>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              All physical locations under tenant business ({branches.length} registered)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddBranchOpen(true)}
            style={{
              backgroundColor: 'var(--color-accent)',
            }}
            className="h-9 px-4 text-xs font-bold text-white flex items-center gap-1.5 rounded-full cursor-pointer hover:opacity-90 transition-opacity shadow-xs"
          >
            <Plus size={14} />
            <span>Add Branch</span>
          </button>
        </div>

        <div className="space-y-2">
          {branches.map((b) => (
            <div key={b.id} className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-between shadow-2xs hover:border-[#D5DFE3] transition-all">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900 dark:text-white">
                    {b.name}
                  </span>
                  <span className="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-500 font-bold">
                    {b.code}
                  </span>
                  {b.isMainBranch && (
                    <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full">
                      Headquarters
                    </span>
                  )}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {b.address || 'Address not configured'} · {b.phone || 'No phone'}
                </div>
              </div>

              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Online
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Authorized Devices & Terminals */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Authorized POS Hardware Terminals
            </h3>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              C# .NET desktop terminals and web consoles permitted for RPC access
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddDeviceOpen(true)}
            style={{
              backgroundColor: 'var(--color-accent)',
            }}
            className="h-9 px-4 text-xs font-bold text-white flex items-center gap-1.5 rounded-full cursor-pointer hover:opacity-90 transition-opacity shadow-xs"
          >
            <Plus size={14} />
            <span>Register Device</span>
          </button>
        </div>

        <div className="space-y-2">
          {devices.map((dev) => (
            <div key={dev.id} className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-between shadow-2xs hover:border-[#D5DFE3] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F8F9FA] dark:bg-neutral-700/80 border border-[#EDF1F3] dark:border-neutral-600 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                  <Monitor size={17} />
                </div>
                <div>
                  <div className="text-sm font-bold text-neutral-900 dark:text-white">
                    {dev.label}
                  </div>
                  <div className="text-xs font-mono text-neutral-400">
                    ID: {dev.hardwareId} · Registered: {new Date(dev.registeredAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active Terminal
                </span>
                {devices.length > 1 && (
                  <button
                    type="button"
                    onClick={() => revokeDevice(dev.id)}
                    className="text-xs text-rose-500 hover:text-rose-700 cursor-pointer p-1.5 rounded-full hover:bg-rose-50 transition-colors"
                    title="Revoke authorization"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Branch Modal */}
      <Modal
        isOpen={isAddBranchOpen}
        onClose={() => setIsAddBranchOpen(false)}
        title="Add Business Branch"
        subtitle={`Expand ${currentBusiness.name} location network`}
      >
        <form onSubmit={handleCreateBranch} className="space-y-4">
          {branchError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 text-xs border border-rose-200">
              {branchError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Branch Name *
            </label>
            <input
              type="text"
              required
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="e.g. Apex West Sidi Yahia"
              style={{
                backgroundColor: 'var(--color-surface-bg)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-input)',
              }}
              className="w-full h-11 px-3 text-sm border focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Branch Code *
              </label>
              <input
                type="text"
                required
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                placeholder="e.g. APX-WEST"
                style={{
                  backgroundColor: 'var(--color-surface-bg)',
                  borderColor: 'var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                }}
                className="w-full h-11 px-3 text-sm border focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white uppercase font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Phone
              </label>
              <input
                type="tel"
                value={branchPhone}
                onChange={(e) => setBranchPhone(e.target.value)}
                placeholder="+213 21 00 00 00"
                style={{
                  backgroundColor: 'var(--color-surface-bg)',
                  borderColor: 'var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                }}
                className="w-full h-11 px-3 text-sm border focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Physical Address
            </label>
            <input
              type="text"
              value={branchAddress}
              onChange={(e) => setBranchAddress(e.target.value)}
              placeholder="Boulevard, City, Wilaya"
              style={{
                backgroundColor: 'var(--color-surface-bg)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-input)',
              }}
              className="w-full h-11 px-3 text-sm border focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddBranchOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--color-accent)',
                borderRadius: 'var(--radius-button)',
              }}
              className="h-10 px-5 text-xs font-semibold text-white cursor-pointer shadow-xs"
            >
              Create Branch
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Device Modal */}
      <Modal
        isOpen={isAddDeviceOpen}
        onClose={() => setIsAddDeviceOpen(false)}
        title="Authorize POS Hardware Terminal"
        subtitle="Register machine hardware ID for desktop or web kiosk"
      >
        <form onSubmit={handleRegisterDevice} className="space-y-4">
          {deviceError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {deviceError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Terminal Friendly Label *
            </label>
            <input
              type="text"
              required
              value={deviceLabel}
              onChange={(e) => setDeviceLabel(e.target.value)}
              placeholder="e.g. Reception Desk 2 (POS)"
              style={{
                backgroundColor: 'var(--color-surface-bg)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-input)',
              }}
              className="w-full h-11 px-3 text-sm border focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Hardware ID *
            </label>
            <input
              type="text"
              required
              value={deviceHwId}
              onChange={(e) => setDeviceHwId(e.target.value)}
              placeholder="e.g. HW-POS-ALGIERS-03"
              style={{
                backgroundColor: 'var(--color-surface-bg)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-input)',
              }}
              className="w-full h-11 px-3 text-sm border focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white font-mono uppercase"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddDeviceOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--color-accent)',
                borderRadius: 'var(--radius-button)',
              }}
              className="h-10 px-5 text-xs font-semibold text-white cursor-pointer shadow-xs"
            >
              Authorize Terminal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
