import React, { useState } from 'react';
import {
  FileText,
  Plus,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Calendar,
  X,
  Mail,
  Building,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatCurrencyAmount } from '../../../utils/rules';
import { FreelanceProposal, PricingModel, CurrencyCode } from '../../../types/index';

export const FreelanceProposalsView: React.FC = () => {
  const {
    freelanceProposals,
    createFreelanceProposal,
    convertProposalToProject,
    setScreen,
  } = useAtriumStore();

  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<FreelanceProposal | null>(null);

  // Proposal form state
  const [formData, setFormData] = useState({
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    title: '',
    overview: '',
    scopeItems: ['Discovery & user journey architecture', 'High-fidelity Figma UI design', 'Full-stack engineering & unit tests'],
    pricingModel: 'Fixed' as PricingModel,
    proposedBudget: 250000,
    currency: 'DZD' as CurrencyCode,
    estimatedTimelineWeeks: 4,
    validUntil: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const handleScopeItemChange = (index: number, val: string) => {
    const next = [...formData.scopeItems];
    next[index] = val;
    setFormData({ ...formData, scopeItems: next });
  };

  const handleAddScopeItem = () => {
    setFormData({ ...formData, scopeItems: [...formData.scopeItems, ''] });
  };

  const handleRemoveScopeItem = (index: number) => {
    setFormData({
      ...formData,
      scopeItems: formData.scopeItems.filter((_, i) => i !== index),
    });
  };

  const handleSubmitProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName.trim() || !formData.title.trim()) return;

    createFreelanceProposal({
      clientName: formData.clientName,
      clientCompany: formData.clientCompany,
      clientEmail: formData.clientEmail,
      title: formData.title,
      overview: formData.overview,
      scopeItems: formData.scopeItems.filter((s) => s.trim().length > 0),
      pricingModel: formData.pricingModel,
      proposedBudget: Number(formData.proposedBudget),
      currency: formData.currency,
      estimatedTimelineWeeks: Number(formData.estimatedTimelineWeeks),
      validUntil: formData.validUntil,
    });

    setIsDraftModalOpen(false);
  };

  const handleConvert = (proposalId: string) => {
    try {
      convertProposalToProject(proposalId);
      setScreen('scheduler');
    } catch (err: any) {
      alert(err.message || 'Error converting proposal');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Inquiries & Proposals Pipeline
            </h1>
            <span className="text-xs text-neutral-500">
              Intake briefs, scope definition & 1-click project onboarding
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Turn qualified incoming leads into signed engagements and actionable Kanban milestones
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsDraftModalOpen(true)}
          className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Draft Proposal</span>
        </button>
      </div>

      {/* Proposals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {freelanceProposals.map((proposal) => (
          <div
            key={proposal.id}
            className="p-6 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-4 hover:border-[#C4785A]/40 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header Client & Status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                    {proposal.clientCompany || proposal.clientName}
                  </span>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                    {proposal.title}
                  </h3>
                </div>

                <span
                  className={`text-[11px] font-semibold shrink-0 ${
                    proposal.status === 'Accepted'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : proposal.status === 'Declined'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {proposal.status === 'Accepted'
                    ? 'Signed & Active'
                    : proposal.status === 'Pending'
                    ? 'Awaiting Review'
                    : proposal.status}
                </span>
              </div>

              {/* Overview Summary */}
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2 line-clamp-3 leading-relaxed">
                {proposal.overview}
              </p>

              {/* Deliverable Scope Bullets */}
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1.5 text-xs">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  Scope Deliverables ({proposal.scopeItems.length})
                </span>
                {proposal.scopeItems.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-neutral-700 dark:text-neutral-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C4785A] mt-1.5 shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial terms & conversion action */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                  Proposed Value
                </span>
                <span className="text-lg font-black text-[#C4785A] tabular-nums block">
                  {formatCurrencyAmount(proposal.proposedBudget, proposal.currency)}
                </span>
                <span className="text-[11px] text-neutral-500">
                  {proposal.estimatedTimelineWeeks} weeks · Valid to {proposal.validUntil}
                </span>
              </div>

              {proposal.status === 'Pending' ? (
                <button
                  type="button"
                  onClick={() => handleConvert(proposal.id)}
                  className="h-9 px-4 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                  title="Client accepted: spawn project deliverables and deposit invoice"
                >
                  <CheckCircle size={13} />
                  <span>Convert to Project</span>
                </button>
              ) : (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle size={13} />
                  <span>Active in Workspace</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Draft Proposal Modal */}
      {isDraftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Draft Project Proposal
              </h3>
              <button
                type="button"
                onClick={() => setIsDraftModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitProposal} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Client Contact *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Sofiane Cherbal"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BioHealth Labs"
                    value={formData.clientCompany}
                    onChange={(e) => setFormData({ ...formData, clientCompany: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Client Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="contact@company.com"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Engagement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laboratory Sample Tracking Portal & UI Architecture"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Project Executive Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe context, objectives, methodology and deliverables..."
                  value={formData.overview}
                  onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              {/* Scope Deliverables */}
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    Deliverable Scope Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddScopeItem}
                    className="text-[#C4785A] hover:underline font-semibold cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.scopeItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => handleScopeItemChange(idx, e.target.value)}
                        placeholder="Deliverable item..."
                        className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      />
                      {formData.scopeItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveScopeItem(idx)}
                          className="p-1.5 text-neutral-400 hover:text-rose-500 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
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
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  >
                    <option value="DZD">DZD</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Budget
                  </label>
                  <input
                    type="number"
                    value={formData.proposedBudget}
                    onChange={(e) => setFormData({ ...formData, proposedBudget: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Est. Weeks
                  </label>
                  <input
                    type="number"
                    value={formData.estimatedTimelineWeeks}
                    onChange={(e) => setFormData({ ...formData, estimatedTimelineWeeks: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Valid Until Date
                </label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsDraftModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Save Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
