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
  Edit2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatCurrencyAmount } from '../../../utils/rules';
import { FreelanceProposal, PricingModel, CurrencyCode } from '../../../types/index';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Seek } from '../../ui/Seek';

export const FreelanceProposalsView: React.FC = () => {
  const {
    freelanceProposals,
    createFreelanceProposal,
    updateFreelanceProposal,
    deleteFreelanceProposal,
    convertProposalToProject,
    setScreen,
  } = useAtriumStore();

  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [proposalToEdit, setProposalToEdit] = useState<FreelanceProposal | null>(null);
  const [proposalToDelete, setProposalToDelete] = useState<FreelanceProposal | null>(null);
  const [editFormData, setEditFormData] = useState({
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    title: '',
    overview: '',
    scopeItems: [] as string[],
    pricingModel: 'Fixed' as PricingModel,
    proposedBudget: 0,
    currency: 'DZD' as CurrencyCode,
    estimatedTimelineWeeks: 4,
    validUntil: '',
  });

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

  const [searchQuery, setSearchQuery] = useState('');

  const filteredProposals = React.useMemo(() => {
    if (!searchQuery.trim()) return freelanceProposals;
    const q = searchQuery.toLowerCase();
    return freelanceProposals.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.clientCompany?.toLowerCase().includes(q) ||
        p.overview.toLowerCase().includes(q)
    );
  }, [freelanceProposals, searchQuery]);

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
      status: 'Pending',
    });

    setIsDraftModalOpen(false);
  };

  const handleOpenEditModal = (prop: FreelanceProposal) => {
    setProposalToEdit(prop);
    setEditFormData({
      clientName: prop.clientName,
      clientCompany: prop.clientCompany || '',
      clientEmail: prop.clientEmail,
      title: prop.title,
      overview: prop.overview,
      scopeItems: [...prop.scopeItems],
      pricingModel: prop.pricingModel,
      proposedBudget: prop.proposedBudget,
      currency: prop.currency,
      estimatedTimelineWeeks: prop.estimatedTimelineWeeks,
      validUntil: prop.validUntil,
    });
  };

  const handleEditProposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalToEdit || !editFormData.clientName.trim() || !editFormData.title.trim()) return;

    updateFreelanceProposal(proposalToEdit.id, {
      clientName: editFormData.clientName,
      clientCompany: editFormData.clientCompany,
      clientEmail: editFormData.clientEmail,
      title: editFormData.title,
      overview: editFormData.overview,
      scopeItems: editFormData.scopeItems.filter((s) => s.trim().length > 0),
      pricingModel: editFormData.pricingModel,
      proposedBudget: Number(editFormData.proposedBudget),
      currency: editFormData.currency,
      estimatedTimelineWeeks: Number(editFormData.estimatedTimelineWeeks),
      validUntil: editFormData.validUntil,
    });

    setProposalToEdit(null);
  };

  const handleConvert = (proposalId: string) => {
    try {
      convertProposalToProject(proposalId);
      setScreen('scheduler');
    } catch (err: any) {
      console.error('Error converting proposal:', err?.message || err);
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

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search proposals by title, client..."
          />
          <button
            type="button"
            onClick={() => setIsDraftModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs shrink-0"
          >
            <Plus size={14} />
            <span>Draft Proposal</span>
          </button>
        </div>
      </div>

      {/* Proposals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredProposals.map((proposal) => (
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

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(proposal)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Edit proposal"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setProposalToDelete(proposal)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Delete proposal"
                  >
                    <Trash2 size={13} />
                  </button>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      proposal.status === 'Accepted'
                        ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : proposal.status === 'Declined'
                        ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400'
                        : 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400'
                    }`}
                  >
                    {proposal.status === 'Accepted'
                      ? 'Signed & Active'
                      : proposal.status === 'Pending'
                      ? 'Awaiting Review'
                      : proposal.status}
                  </span>
                </div>
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

      {freelanceProposals.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900/40 space-y-3">
          <FileText size={32} className="mx-auto text-neutral-300 dark:text-neutral-600" />
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">No Project Proposals Yet</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Draft a client proposal with itemized scope and budget. Once approved, convert it into an active project and deliverables in one click.
          </p>
          <button
            type="button"
            onClick={() => setIsDraftModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} />
            <span>Draft First Proposal</span>
          </button>
        </div>
      )}

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
                <LabelInput
                  id="draft-client-name"
                  label="Client Contact"
                  required
                  placeholder="e.g. Dr. Sofiane Cherbal"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
                <LabelInput
                  id="draft-client-company"
                  label="Company Name"
                  placeholder="e.g. BioHealth Labs"
                  value={formData.clientCompany}
                  onChange={(e) => setFormData({ ...formData, clientCompany: e.target.value })}
                />
              </div>

              <LabelInput
                id="draft-client-email"
                label="Client Email"
                type="email"
                required
                placeholder="contact@company.com"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
              />

              <LabelInput
                id="draft-proposal-title"
                label="Engagement Title"
                required
                placeholder="e.g. Laboratory Sample Tracking Portal & UI Architecture"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />

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
                      <div className="flex-1">
                        <LabelInput
                          field={`ScopeItem-${idx}`}
                          label={`Deliverable Item ${idx + 1}`}
                          value={item}
                          onChange={(v) => handleScopeItemChange(idx, String(v?.target?.value || v || ''))}
                          width="100%"
                          height={44}
                          corner={12}
                        />
                      </div>
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
                <LabelSelect
                  label="Currency"
                  value={formData.currency}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      currency: (val?.target?.value ?? String(val)) as CurrencyCode,
                    })
                  }
                  options={['DZD', 'EUR', 'USD']}
                />
                <div>
                  <LabelInput
                    id="draft-budget"
                    label="Budget"
                    type="number"
                    value={formData.proposedBudget}
                    onChange={(e) => setFormData({ ...formData, proposedBudget: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <LabelInput
                    id="draft-weeks"
                    label="Est. Weeks"
                    type="number"
                    value={formData.estimatedTimelineWeeks}
                    onChange={(e) => setFormData({ ...formData, estimatedTimelineWeeks: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <LabelInput
                  id="draft-valid-until"
                  label="Valid Until Date"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
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

      {/* Edit Proposal Modal */}
      {proposalToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Edit Proposal Scope & Terms
              </h3>
              <button
                type="button"
                onClick={() => setProposalToEdit(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditProposalSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  id="edit-client-name"
                  label="Client Name"
                  required
                  value={editFormData.clientName}
                  onChange={(e) => setEditFormData({ ...editFormData, clientName: e.target.value })}
                />
                <LabelInput
                  id="edit-client-company"
                  label="Client Company"
                  value={editFormData.clientCompany}
                  onChange={(e) => setEditFormData({ ...editFormData, clientCompany: e.target.value })}
                />
              </div>

              <LabelInput
                id="edit-proposal-title"
                label="Proposal Title"
                required
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              />

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Executive Overview
                </label>
                <textarea
                  rows={2}
                  value={editFormData.overview}
                  onChange={(e) => setEditFormData({ ...editFormData, overview: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              {/* Scope Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Scope Deliverables & Work Streams
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditFormData({
                        ...editFormData,
                        scopeItems: [...editFormData.scopeItems, ''],
                      })
                    }
                    className="text-[11px] font-semibold text-[#C4785A] hover:underline cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>
                {editFormData.scopeItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <LabelInput
                        field={`EditScopeItem-${idx}`}
                        label={`Deliverable Item ${idx + 1}`}
                        value={item}
                        onChange={(v) => {
                          const updated = [...editFormData.scopeItems];
                          updated[idx] = String(v?.target?.value || v || '');
                          setEditFormData({ ...editFormData, scopeItems: updated });
                        }}
                        width="100%"
                        height={44}
                        corner={12}
                      />
                    </div>
                    {editFormData.scopeItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditFormData({
                            ...editFormData,
                            scopeItems: editFormData.scopeItems.filter((_, i) => i !== idx),
                          })
                        }
                        className="text-neutral-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <LabelSelect
                  label="Currency"
                  value={editFormData.currency}
                  onChange={(val) =>
                    setEditFormData({
                      ...editFormData,
                      currency: (val?.target?.value ?? String(val)) as CurrencyCode,
                    })
                  }
                  options={['DZD', 'EUR', 'USD']}
                />
                <div>
                  <LabelInput
                    id="edit-budget"
                    label="Budget"
                    type="number"
                    value={editFormData.proposedBudget}
                    onChange={(e) => setEditFormData({ ...editFormData, proposedBudget: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <LabelInput
                    id="edit-weeks"
                    label="Est. Weeks"
                    type="number"
                    value={editFormData.estimatedTimelineWeeks}
                    onChange={(e) => setEditFormData({ ...editFormData, estimatedTimelineWeeks: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <LabelInput
                  id="edit-valid-until"
                  label="Valid Until Date"
                  type="date"
                  value={editFormData.validUntil}
                  onChange={(e) => setEditFormData({ ...editFormData, validUntil: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setProposalToEdit(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Proposal Confirmation Modal */}
      {proposalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Delete Proposal</h3>
                <p className="text-xs text-neutral-500">{proposalToDelete.clientName}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to delete proposal <strong className="text-neutral-900 dark:text-white font-semibold">"{proposalToDelete.title}"</strong>? This will remove the proposal draft from your pipeline.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setProposalToDelete(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteFreelanceProposal(proposalToDelete.id);
                  setProposalToDelete(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                Delete Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
