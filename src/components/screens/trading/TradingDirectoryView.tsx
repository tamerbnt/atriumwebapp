import React, { useState, useMemo } from 'react';
import {
  Users,
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Edit,
  Trash2,
  X,
  ExternalLink,
  DollarSign,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { B2bClient, B2bSupplier } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { B2bEntityModal } from './B2bEntityModal';
import { CommercialDocComposerModal } from './CommercialDocComposerModal';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useTranslation } from '../../../utils/useTranslation';

type DirectoryMode = 'clients' | 'suppliers';

export const TradingDirectoryView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const {
    b2bClients,
    b2bSuppliers,
    commercialDocs,
    deleteB2bClient,
    deleteB2bSupplier,
  } = useAtriumStore();

  const [mode, setMode] = useState<DirectoryMode>('clients');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<B2bClient | B2bSupplier | null>(null);

  // Modals
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<B2bClient | B2bSupplier | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<B2bClient | B2bSupplier | null>(null);

  // Filtered lists
  const filteredClients = useMemo(() => {
    return b2bClients.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.companyName.toLowerCase().includes(q);
        const matchesContact = (c.contactName || '').toLowerCase().includes(q);
        const matchesNif = (c.nif || '').toLowerCase().includes(q);
        const matchesCity = (c.city || '').toLowerCase().includes(q);
        if (!matchesName && !matchesContact && !matchesNif && !matchesCity) return false;
      }
      return true;
    });
  }, [b2bClients, searchQuery]);

  const filteredSuppliers = useMemo(() => {
    return b2bSuppliers.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.supplierName.toLowerCase().includes(q);
        const matchesContact = (s.contactName || '').toLowerCase().includes(q);
        const matchesNif = (s.nif || '').toLowerCase().includes(q);
        const matchesCity = (s.city || '').toLowerCase().includes(q);
        if (!matchesName && !matchesContact && !matchesNif && !matchesCity) return false;
      }
      return true;
    });
  }, [b2bSuppliers, searchQuery]);

  // Client Columns
  const clientColumns: ColumnDefinition<B2bClient>[] = [
    {
      key: 'company',
      header: 'Raison Sociale & Secteur',
      minWidth: '220px',
      renderCell: (c) => (
        <div className="text-xs">
          <span className="font-bold text-stone-900 dark:text-stone-100 block">
            {c.companyName}
          </span>
          <span className="text-[10px] text-stone-500">{c.sector || 'Entreprise B2B'}</span>
        </div>
      ),
    },
    {
      key: 'legal',
      header: 'N.I.F. / R.C.',
      width: '180px',
      renderCell: (c) => (
        <div className="text-xs font-mono">
          <span className="block font-medium text-stone-800 dark:text-stone-200">
            NIF: {c.nif || 'N/A'}
          </span>
          <span className="text-[10px] text-stone-400">RC: {c.rc || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Interlocuteur',
      width: '180px',
      renderCell: (c) => (
        <div className="text-xs">
          <span className="font-semibold text-stone-800 dark:text-stone-200 block">
            {c.contactName || 'N/A'}
          </span>
          <span className="text-[10px] text-stone-500 font-mono">{c.phone || c.contactPhone}</span>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'Wilaya',
      width: '100px',
      renderCell: (c) => <span className="text-xs text-stone-600 dark:text-stone-400">{c.city}</span>,
    },
    {
      key: 'balance',
      header: 'Encours / Crédit',
      width: '150px',
      renderCell: (c) => (
        <div className="text-xs font-mono tabular-nums">
          <span className="font-bold text-rose-600 block">
            {formatMoney(c.outstandingBalance || 0)}
          </span>
          <span className="text-[10px] text-stone-400">
            Plafond: {formatMoney(c.creditLimit || 0)}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '90px',
      renderCell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingEntity(c);
              setEntityModalOpen(true);
            }}
            title="Modifier"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(c);
            }}
            title="Supprimer"
            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // Supplier Columns
  const supplierColumns: ColumnDefinition<B2bSupplier>[] = [
    {
      key: 'name',
      header: 'Fournisseur Référencé',
      minWidth: '220px',
      renderCell: (s) => (
        <div className="text-xs">
          <span className="font-bold text-stone-900 dark:text-stone-100 block">
            {s.supplierName}
          </span>
          <span className="text-[10px] text-stone-500">{s.sector || 'Fournisseur'}</span>
        </div>
      ),
    },
    {
      key: 'legal',
      header: 'N.I.F. / R.C.',
      width: '180px',
      renderCell: (s) => (
        <div className="text-xs font-mono">
          <span className="block font-medium text-stone-800 dark:text-stone-200">
            NIF: {s.nif || 'N/A'}
          </span>
          <span className="text-[10px] text-stone-400">RC: {s.rc || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact & Tél',
      width: '180px',
      renderCell: (s) => (
        <div className="text-xs">
          <span className="font-semibold text-stone-800 dark:text-stone-200 block">
            {s.contactName || 'Standard'}
          </span>
          <span className="text-[10px] text-stone-500 font-mono">{s.phone}</span>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'Ville',
      width: '110px',
      renderCell: (s) => <span className="text-xs text-stone-600">{s.city}</span>,
    },
    {
      key: 'payable',
      header: 'Dette Fournisseur',
      width: '140px',
      renderCell: (s) => (
        <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100 tabular-nums">
          {formatMoney(s.outstandingPayable || 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '90px',
      renderCell: (s) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingEntity(s);
              setEntityModalOpen(true);
            }}
            title="Modifier"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(s);
            }}
            title="Supprimer"
            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // Client Document history for inspector
  const entityHistory = useMemo(() => {
    if (!selectedEntity || mode !== 'clients') return [];
    return commercialDocs.filter((d) => d.clientId === selectedEntity.id);
  }, [selectedEntity, mode, commercialDocs]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {t('trading_directory_title', 'Répertoire des Partenaires B2B')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C4785A]/15 text-[#C4785A]">
              {b2bClients.length} {language === 'ar' ? 'عميل' : 'Clients'} • {b2bSuppliers.length} {language === 'ar' ? 'مورد' : 'Fournisseurs'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('trading_directory_subtitle', 'Fiches légales certifiées, suivi des encours, limites de crédit et historique complet')}
          </p>
        </div>

        <AtriumButton
          variant="primary"
          onClick={() => {
            setEditingEntity(null);
            setEntityModalOpen(true);
          }}
          icon={<Plus size={15} />}
        >
          {mode === 'clients'
            ? language === 'ar'
              ? 'عميل تجاري جديد'
              : 'Nouveau Client B2B'
            : language === 'ar'
            ? 'مورد جديد'
            : 'Nouveau Fournisseur'}
        </AtriumButton>
      </div>

      {/* Directory Mode Toggle & Search */}
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setMode('clients');
              setSelectedEntity(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              mode === 'clients'
                ? 'bg-[#C4785A]/10 text-[#C4785A] font-bold border border-[#C4785A]/30'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            {t('trading_directory_tab_clients', 'Clients B2B')} ({b2bClients.length})
          </button>

          <button
            onClick={() => {
              setMode('suppliers');
              setSelectedEntity(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              mode === 'suppliers'
                ? 'bg-[#C4785A]/10 text-[#C4785A] font-bold border border-[#C4785A]/30'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            {t('trading_directory_tab_suppliers', 'Fournisseurs Référencés')} ({b2bSuppliers.length})
          </button>
        </div>

        <div>
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث باسم الشركة، المسؤول، الرقم الجبائي...' : 'Rechercher nom, contact, NIF...'}
          />
        </div>
      </div>

      {/* Main Content Area (Table + Slide-Over Drawer if Selected) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Table Container */}
        <div
          className={`bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden ${
            selectedEntity ? 'lg:col-span-2' : 'lg:col-span-3'
          }`}
        >
          {mode === 'clients' ? (
            <UniversalDataCollection
              items={filteredClients}
              keyExtractor={(c) => c.id}
              columns={clientColumns}
              onItemClick={(c) => setSelectedEntity(c)}
              renderCard={(c) => (
                <div className="p-4 border rounded-xl space-y-1">
                  <span className="font-bold text-xs">{c.companyName}</span>
                  <span className="text-[10px] text-stone-400 block">NIF: {c.nif}</span>
                </div>
              )}
              emptyTitle="Aucun client B2B trouvé"
            />
          ) : (
            <UniversalDataCollection
              items={filteredSuppliers}
              keyExtractor={(s) => s.id}
              columns={supplierColumns}
              onItemClick={(s) => setSelectedEntity(s)}
              renderCard={(s) => (
                <div className="p-4 border rounded-xl space-y-1">
                  <span className="font-bold text-xs">{s.supplierName}</span>
                </div>
              )}
              emptyTitle="Aucun fournisseur trouvé"
            />
          )}
        </div>

        {/* 360° Partner Inspector Slide-Over Panel */}
        {selectedEntity && (
          <div className="p-5 border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 shadow-sm space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C4785A]/15 text-[#C4785A] font-bold uppercase">
                  {mode === 'clients' ? 'Client B2B' : 'Fournisseur'}
                </span>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mt-1">
                  {'companyName' in selectedEntity
                    ? selectedEntity.companyName
                    : (selectedEntity as B2bSupplier).supplierName}
                </h3>
                <p className="text-xs text-stone-500">{selectedEntity.sector}</p>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {/* Legal Algerian Identifiers Box */}
            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/30 text-xs font-mono space-y-1.5">
              <span className="font-bold font-sans text-[11px] text-stone-600 dark:text-stone-400 block uppercase">
                Identifiants Fiscaux
              </span>
              <div className="flex justify-between">
                <span className="text-stone-500">N.I.F. (15 ch) :</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {selectedEntity.nif || 'Non renseigné'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">R.C. N° :</span>
                <span className="text-stone-800 dark:text-stone-200">
                  {selectedEntity.rc || 'Non renseigné'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Art. Imposition :</span>
                <span className="text-stone-800 dark:text-stone-200">
                  {selectedEntity.ai || 'Non renseigné'}
                </span>
              </div>
            </div>

            {/* Primary Contact Person */}
            <div className="space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-stone-500 text-[10px] block">
                Contact Direct
              </span>
              <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200">
                <span className="font-semibold">{selectedEntity.contactName || 'Standard'}</span>
                {selectedEntity && 'contactRole' in selectedEntity && (
                  <span className="text-stone-400">({(selectedEntity as B2bClient).contactRole})</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400 font-mono text-[11px]">
                <Phone size={13} className="text-[#C4785A]" />
                <span>{selectedEntity.phone || 'Non renseigné'}</span>
              </div>
            </div>

            {/* Financial Terms */}
            {mode === 'clients' && (
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2 text-xs font-mono">
                <span className="font-bold font-sans text-[11px] text-stone-600 dark:text-stone-400 block uppercase">
                  Encours & Conditions
                </span>
                <div className="flex justify-between">
                  <span className="text-stone-500">Encours Actuel :</span>
                  <span className="font-bold text-rose-600">
                    {formatMoney((selectedEntity as B2bClient).outstandingBalance || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Plafond Autorisé :</span>
                  <span className="text-stone-800 dark:text-stone-200">
                    {formatMoney((selectedEntity as B2bClient).creditLimit || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Délai Règlement :</span>
                  <span className="text-stone-800 dark:text-stone-200">
                    {(selectedEntity as B2bClient).paymentTermsDays} jours
                  </span>
                </div>
              </div>
            )}

            {/* Recent Documents History */}
            {mode === 'clients' && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-stone-500 text-[10px]">
                    Historique Pièces ({entityHistory.length})
                  </span>
                  <button
                    onClick={() => {
                      setComposerOpen(true);
                    }}
                    className="text-[11px] font-semibold text-[#C4785A] hover:underline"
                  >
                    + Créer document
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {entityHistory.map((d) => (
                    <div
                      key={d.id}
                      className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px]"
                    >
                      <span className="font-mono font-bold">{d.docNumber}</span>
                      <span className="font-mono">{formatMoney(d.netToPay)}</span>
                    </div>
                  ))}
                  {entityHistory.length === 0 && (
                    <p className="text-stone-400 text-[11px] italic">Aucune transaction pour ce client.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <B2bEntityModal
        isOpen={entityModalOpen}
        onClose={() => setEntityModalOpen(false)}
        entityType={mode === 'clients' ? 'client' : 'supplier'}
        editingEntity={editingEntity}
      />

      <CommercialDocComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            if (mode === 'clients') {
              deleteB2bClient(deleteTarget.id);
            } else {
              deleteB2bSupplier(deleteTarget.id);
            }
            setDeleteTarget(null);
            setSelectedEntity(null);
          }
        }}
        title="Supprimer la fiche partenaire ?"
        description={`Êtes-vous certain de vouloir supprimer cette fiche ? Cette action retirera les coordonnées associées.`}
        confirmLabel="Supprimer définitivement"
        variant="danger"
      />
    </div>
  );
};
