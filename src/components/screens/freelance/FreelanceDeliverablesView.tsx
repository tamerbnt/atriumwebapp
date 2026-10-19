import React, { useState, useMemo } from 'react';
import {
  Kanban,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  ChevronRight,
  Filter,
  Layers,
  X,
  FileCheck,
  User,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatCurrencyAmount } from '../../../utils/rules';
import {
  FreelanceProject,
  FreelanceDeliverable,
  DeliverableStage,
  PricingModel,
  CurrencyCode,
} from '../../../types/index';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { Seek } from '../../ui/Seek';

const STAGES: { id: DeliverableStage; label: string; countColor: string }[] = [
  { id: 'Briefing', label: 'Briefing & Spec', countColor: 'text-neutral-500' },
  { id: 'InProgress', label: 'In Progress', countColor: 'text-amber-500' },
  { id: 'ClientReview', label: 'Client Review', countColor: 'text-blue-500' },
  { id: 'Approved', label: 'Approved', countColor: 'text-emerald-500' },
  { id: 'Billed', label: 'Billed & Archived', countColor: 'text-neutral-400' },
];

export const FreelanceDeliverablesView: React.FC = () => {
  const {
    freelanceProjects,
    freelanceClients,
    updateDeliverableStage,
    addDeliverable,
    updateDeliverable,
    deleteDeliverable,
    addFreelanceProject,
    deleteFreelanceProject,
    startTimer,
    setScreen,
  } = useAtriumStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDeliverableModalOpen, setIsAddDeliverableModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [deliverableToEdit, setDeliverableToEdit] = useState<{
    project: FreelanceProject;
    deliverable: FreelanceDeliverable;
  } | null>(null);
  const [editDeliverableForm, setEditDeliverableForm] = useState({
    title: '',
    description: '',
    estimatedHours: 10,
    dueDate: '',
  });
  const [deliverableToDelete, setDeliverableToDelete] = useState<{
    projectId: string;
    deliverableId: string;
    title: string;
  } | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<FreelanceProject | null>(null);

  // New Deliverable Form
  const [targetProjectId, setTargetProjectId] = useState<string>(
    freelanceProjects[0]?.id || ''
  );
  const [deliverableTitle, setDeliverableTitle] = useState('');
  const [deliverableDescription, setDeliverableDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(10);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // New Project Form
  const [newProjectData, setNewProjectData] = useState({
    clientId: freelanceClients[0]?.id || '',
    title: '',
    description: '',
    pricingModel: 'Fixed' as PricingModel,
    currency: 'DZD' as CurrencyCode,
    budget: 150000,
    estimatedHours: 40,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const activeProjects = useMemo(() => {
    if (selectedProjectId === 'all') return freelanceProjects;
    return freelanceProjects.filter((p) => p.id === selectedProjectId);
  }, [freelanceProjects, selectedProjectId]);

  // Aggregate all deliverables across selected projects
  const flattenedDeliverables = useMemo(() => {
    const list: Array<{
      deliverable: FreelanceDeliverable;
      project: FreelanceProject;
    }> = [];

    activeProjects.forEach((project) => {
      project.deliverables.forEach((deliv) => {
        if (
          !searchQuery.trim() ||
          deliv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          deliv.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.clientName.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          list.push({ deliverable: deliv, project });
        }
      });
    });

    return list;
  }, [activeProjects, searchQuery]);

  const handleCreateDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverableTitle.trim() || !targetProjectId) return;

    addDeliverable(
      targetProjectId,
      deliverableTitle,
      Number(estimatedHours),
      dueDate,
      deliverableDescription
    );

    setDeliverableTitle('');
    setDeliverableDescription('');
    setIsAddDeliverableModalOpen(false);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectData.title.trim() || !newProjectData.clientId) return;

    const client = freelanceClients.find((c) => c.id === newProjectData.clientId);

    addFreelanceProject({
      clientId: newProjectData.clientId,
      clientName: client?.name || 'Client',
      title: newProjectData.title,
      description: newProjectData.description,
      pricingModel: newProjectData.pricingModel,
      currency: newProjectData.currency,
      budget: Number(newProjectData.budget),
      estimatedHours: Number(newProjectData.estimatedHours),
      stage: 'InProgress',
      startDate: new Date().toISOString().split('T')[0],
      deadline: newProjectData.deadline,
      deliverables: [],
    });

    setIsAddProjectModalOpen(false);
  };

  const handleStartTimerForDeliverable = (
    project: FreelanceProject,
    deliv: FreelanceDeliverable
  ) => {
    startTimer(
      project.clientId,
      project.clientName,
      project.id,
      project.title,
      `${deliv.title} - Working sprint`,
      deliv.id,
      deliv.title,
      true,
      false
    );
  };

  // Scope Creep calculation
  const totalScopeCreepItems = flattenedDeliverables.filter(
    (item) => item.deliverable.loggedHours > item.deliverable.estimatedHours
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Deliverables & Milestone Board
            </h1>
            {totalScopeCreepItems > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                <AlertTriangle size={12} />
                <span>{totalScopeCreepItems} Scope Creep Alert</span>
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Kanban workflow from initial briefing to final client sign-off and 1-click billing
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsAddProjectModalOpen(true)}
            className="h-9 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus size={13} />
            <span>New Project</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddDeliverableModalOpen(true)}
            className="h-9 px-3.5 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Plus size={13} />
            <span>Add Deliverable</span>
          </button>
        </div>
      </div>

      {/* Filter by Project Bar & Seek Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <span className="text-xs text-neutral-400 font-medium shrink-0 flex items-center gap-1">
            <Filter size={12} />
            Filter Project:
          </span>
          <button
            type="button"
            onClick={() => setSelectedProjectId('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              selectedProjectId === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            All Projects ({freelanceProjects.length})
          </button>

          {freelanceProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => setSelectedProjectId(project.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                selectedProjectId === project.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              {project.title} · <span className="opacity-75">{project.clientName}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search deliverables, tasks, briefs..."
          />
          {selectedProjectId !== 'all' && (
            <button
              type="button"
              onClick={() => {
                const targetProj = freelanceProjects.find((p) => p.id === selectedProjectId);
                if (targetProj) setProjectToDelete(targetProj);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shrink-0"
              title="Delete this project"
            >
              <Trash2 size={12} />
              <span>Delete Project</span>
            </button>
          )}
        </div>
      </div>

      {freelanceProjects.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900/40 space-y-3">
          <Kanban size={36} className="mx-auto text-neutral-300 dark:text-neutral-600" />
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">No Projects Available</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            You don't have any projects registered yet. Create a project to start planning deliverables and tracking billable sprints.
          </p>
          <button
            type="button"
            onClick={() => setIsAddProjectModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
      /* 5-Column Kanban Board */
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
        {STAGES.map((stage) => {
          const itemsInStage = flattenedDeliverables.filter(
            (item) => item.deliverable.stage === stage.id
          );

          return (
            <div
              key={stage.id}
              className="rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800 p-3 min-h-[500px] flex flex-col"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200/60 dark:border-neutral-800">
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  {stage.label}
                </span>
                <span className={`text-xs font-extrabold tabular-nums ${stage.countColor}`}>
                  {itemsInStage.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {itemsInStage.map(({ deliverable, project }) => {
                  const isCreep = deliverable.loggedHours > deliverable.estimatedHours;
                  const ratioPercent = Math.round(
                    (deliverable.loggedHours / (deliverable.estimatedHours || 1)) * 100
                  );

                  return (
                    <div
                      key={deliverable.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs hover:border-[#C4785A]/40 transition-all flex flex-col justify-between gap-2.5 group"
                    >
                      <div>
                        {/* Project / Client Breadcrumb */}
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                          <span className="truncate max-w-[130px] font-medium text-neutral-500 dark:text-neutral-400">
                            {project.title}
                          </span>
                          <span className="shrink-0">{project.clientName}</span>
                        </div>

                        {/* Deliverable Title */}
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white leading-snug">
                          {deliverable.title}
                        </h4>

                        {deliverable.description && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                            {deliverable.description}
                          </p>
                        )}
                      </div>

                      {/* Scope & Hours Metrics */}
                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500 flex items-center gap-1">
                            <Clock size={11} />
                            Hours:
                          </span>
                          <span
                            className={`font-semibold tabular-nums ${
                              isCreep
                                ? 'text-rose-600 dark:text-rose-400 font-bold'
                                : 'text-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            {deliverable.loggedHours}h / {deliverable.estimatedHours}h ({ratioPercent}%)
                          </span>
                        </div>

                        {isCreep && (
                          <div className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-semibold flex items-center gap-1">
                            <AlertTriangle size={10} />
                            <span>Over estimate (+{(deliverable.loggedHours - deliverable.estimatedHours).toFixed(1)}h)</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-neutral-400">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            Due:
                          </span>
                          <span>{deliverable.dueDate}</span>
                        </div>
                      </div>

                      {/* Card Action Controls */}
                      <div className="flex items-center justify-between gap-1 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartTimerForDeliverable(project, deliverable)}
                            className="h-7 px-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-[#C4785A] hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Track time on this task"
                          >
                            <Play size={10} />
                            <span>Track</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeliverableToEdit({ project, deliverable });
                              setEditDeliverableForm({
                                title: deliverable.title,
                                description: deliverable.description || '',
                                estimatedHours: deliverable.estimatedHours,
                                dueDate: deliverable.dueDate,
                              });
                            }}
                            className="h-7 w-7 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit deliverable"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeliverableToDelete({
                                projectId: project.id,
                                deliverableId: deliverable.id,
                                title: deliverable.title,
                              })
                            }
                            className="h-7 w-7 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete deliverable"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Move Stage Selector */}
                        <FilterSelect
                          value={deliverable.stage}
                          onChange={(val) =>
                            updateDeliverableStage(
                              project.id,
                              deliverable.id,
                              (val?.target?.value ?? String(val)) as DeliverableStage
                            )
                          }
                          options={STAGES.map((s) => ({ value: s.id, label: `Move → ${s.label}` }))}
                          placeholder="Move Stage..."
                        />
                      </div>
                    </div>
                  );
                })}

                {itemsInStage.length === 0 && (
                  <div className="py-8 text-center text-neutral-400 text-xs italic">
                    No deliverables in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Add Deliverable Modal */}
      {isAddDeliverableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Add Deliverable Milestone
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDeliverableModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateDeliverable} className="space-y-3.5 text-xs">
              <LabelSelect
                label="Target Project *"
                value={targetProjectId}
                onChange={(val) => setTargetProjectId(val?.target?.value ?? String(val))}
                options={freelanceProjects.map((p) => ({
                  value: p.id,
                  label: `${p.title} (${p.clientName})`,
                }))}
                placeholder="Select Target Project..."
              />

              <LabelInput
                id="deliverable-title"
                label="Deliverable Title"
                required
                placeholder="e.g. Design System Tokens & Color Guidelines"
                value={deliverableTitle}
                onChange={(e) => setDeliverableTitle(e.target.value)}
              />

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Deliverable Scope & Brief
                </label>
                <textarea
                  rows={2}
                  placeholder="Key acceptance criteria, Figma links, required formats..."
                  value={deliverableDescription}
                  onChange={(e) => setDeliverableDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  id="deliverable-estimated-hours"
                  label="Estimated Hours"
                  type="number"
                  min="1"
                  required
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(Number(e.target.value))}
                />
                <LabelInput
                  id="deliverable-due-date"
                  label="Due Date"
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddDeliverableModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Create Deliverable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {isAddProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Launch New Client Project
              </h3>
              <button
                type="button"
                onClick={() => setIsAddProjectModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  label="Client *"
                  value={newProjectData.clientId}
                  onChange={(val) =>
                    setNewProjectData({
                      ...newProjectData,
                      clientId: val?.target?.value ?? String(val),
                    })
                  }
                  options={freelanceClients.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.company || 'Private'})`,
                  }))}
                  placeholder="Select Client..."
                />
                <LabelSelect
                  label="Pricing Model"
                  value={newProjectData.pricingModel}
                  onChange={(val) =>
                    setNewProjectData({
                      ...newProjectData,
                      pricingModel: (val?.target?.value ?? String(val)) as PricingModel,
                    })
                  }
                  options={[
                    { value: 'Fixed', label: 'Fixed Milestone' },
                    { value: 'Hourly', label: 'Hourly Time & Materials' },
                    { value: 'Retainer', label: 'Monthly Retainer' },
                  ]}
                />
              </div>

              <LabelInput
                id="new-project-title"
                label="Project Title"
                required
                placeholder="e.g. Mobile Banking App UX Audit & Redesign"
                value={newProjectData.title}
                onChange={(e) => setNewProjectData({ ...newProjectData, title: e.target.value })}
              />

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Project Scope & Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Key milestones, tech stack requirements, deliverables..."
                  value={newProjectData.description}
                  onChange={(e) =>
                    setNewProjectData({ ...newProjectData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <LabelSelect
                  label="Currency"
                  value={newProjectData.currency}
                  onChange={(val) =>
                    setNewProjectData({
                      ...newProjectData,
                      currency: (val?.target?.value ?? String(val)) as CurrencyCode,
                    })
                  }
                  options={['DZD', 'EUR', 'USD']}
                />
                <div>
                  <LabelInput
                    id="new-project-budget"
                    label="Total Budget"
                    type="number"
                    value={newProjectData.budget}
                    onChange={(e) =>
                      setNewProjectData({ ...newProjectData, budget: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <LabelInput
                    id="new-project-hours"
                    label="Est. Hours"
                    type="number"
                    value={newProjectData.estimatedHours}
                    onChange={(e) =>
                      setNewProjectData({
                        ...newProjectData,
                        estimatedHours: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <LabelInput
                  id="new-project-deadline"
                  label="Target Deadline"
                  type="date"
                  value={newProjectData.deadline}
                  onChange={(e) =>
                    setNewProjectData({ ...newProjectData, deadline: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Launch Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
