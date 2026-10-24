import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Printer,
  Edit,
  Trash2,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  DollarSign,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { CommercialDocument, CommercialDocType } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { CommercialDocComposerModal } from './CommercialDocComposerModal';
import { CommercialDocPrintModal } from './CommercialDocPrintModal';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useTranslation } from '../../../utils/useTranslation';

type TabKey = 'all' | 'devis' | 'commande' | 'bl' | 'facture' | 'avoir';

export const TradingSalesView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const {
    commercialDocs,
    deleteCommercialDoc,
    convertCommercialDoc,
    warehouses,
  } = useAtriumStore();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<CommercialDocType>('devis');
  const [editingDoc, setEditingDoc] = useState<CommercialDocument | null>(null);
  const [printDoc, setPrintDoc] = useState<CommercialDocument | null>(null);

  // Deletion confirm
  const [deleteTarget, setDeleteTarget] = useState<CommercialDocument | null>(null);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return commercialDocs.filter((doc) => {
      // Tab filter
      if (activeTab !== 'all' && doc.type !== activeTab) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = doc.docNumber.toLowerCase().includes(q);
        const matchesClient = doc.clientName.toLowerCase().includes(q);
        const matchesNif = (doc.clientNif || '').toLowerCase().includes(q);
        if (!matchesNum && !matchesClient && !matchesNif) return false;
      }
      return true;
    });
  }, [commercialDocs, activeTab, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: commercialDocs.length,
      devis: commercialDocs.filter((d) => d.type === 'devis').length,
      commande: commercialDocs.filter((d) => d.type === 'commande').length,
      bl: commercialDocs.filter((d) => d.type === 'bl').length,
      facture: commercialDocs.filter((d) => d.type === 'facture').length,
      avoir: commercialDocs.filter((d) => d.type === 'avoir').length,
    };
  }, [commercialDocs]);

  const handleCreateNew = (type: CommercialDocType) => {
    setEditingDoc(null);
    setComposerType(type);
    setComposerOpen(true);
  };

  const handleEdit = (doc: CommercialDocument) => {
    setEditingDoc(doc);
    setComposerType(doc.type);
    setComposerOpen(true);
  };

  const handleConvert = (doc: CommercialDocument) => {
    if (doc.type === 'devis') {
      convertCommercialDoc(doc.id, 'bl');
    } else if (doc.type === 'bl') {
      convertCommercialDoc(doc.id, 'facture');
    }
  };

  // Columns for UniversalDataCollection
  const columns: ColumnDefinition<CommercialDocument>[] = [
    {
      key: 'docNumber',
      header: t('trading_sales_col_doc_num', 'N° Document'),
      width: '180px',
      renderCell: (doc) => {
        const typeBadge =
          doc.type === 'facture'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
            : doc.type === 'bl'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
            : doc.type === 'devis'
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
            : doc.type === 'commande'
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400'
            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400';

        return (
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${typeBadge}`}>
              {doc.type.slice(0, 3)}
            </span>
            <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100">
              {doc.docNumber}
            </span>
          </div>
        );
      },
    },
    {
      key: 'date',
      header: t('trading_sales_col_date_due', 'Date & Échéance'),
      width: '130px',
      renderCell: (doc) => (
        <div className="text-xs font-mono">
          <div className="text-stone-800 dark:text-stone-200">{doc.date}</div>
          {doc.dueDate && (
            <div className="text-[10px] text-stone-400">Éch: {doc.dueDate}</div>
          )}
        </div>
      ),
    },
    {
      key: 'client',
      header: t('trading_sales_col_client', 'Client Destinataire'),
      minWidth: '220px',
      renderCell: (doc) => (
        <div className="text-xs">
          <span className="font-bold text-stone-900 dark:text-stone-100 block">
            {doc.clientName}
          </span>
          <div className="text-[10px] font-mono text-stone-400 flex items-center gap-2">
            {doc.clientNif && <span>NIF: {doc.clientNif}</span>}
            {doc.clientRc && <span>RC: {doc.clientRc}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'depot',
      header: t('trading_sales_col_depot', 'Dépôt'),
      width: '140px',
      renderCell: (doc) => (
        <span className="text-xs text-stone-600 dark:text-stone-400 font-mono">
          {doc.depotName || 'Dépôt Central'}
        </span>
      ),
    },
    {
      key: 'totalHt',
      header: t('trading_sales_col_ht_net', 'Total HT Net'),
      width: '120px',
      renderCell: (doc) => (
        <span className="font-mono text-xs text-stone-700 dark:text-stone-300 tabular-nums">
          {formatMoney(doc.totalHtFinal)}
        </span>
      ),
    },
    {
      key: 'netToPay',
      header: t('trading_sales_col_net_to_pay', 'Net à Payer (TTC)'),
      width: '140px',
      renderCell: (doc) => (
        <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100 tabular-nums">
          {formatMoney(doc.netToPay)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('trading_sales_col_status', 'Statut'),
      width: '110px',
      renderCell: (doc) => {
        const isPaid = doc.status === 'Paid';
        const isDelivered = doc.status === 'Delivered';
        const isValidated = doc.status === 'Validated';
        return (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block ${
              isPaid
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                : isDelivered
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                : isValidated
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
            }`}
          >
            {doc.status}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '130px',
      renderCell: (doc) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPrintDoc(doc);
            }}
            title={t('action_print', 'Imprimer')}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <Printer size={14} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(doc);
            }}
            title={t('action_edit', 'Modifier')}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <Edit size={14} />
          </button>

          {doc.type === 'devis' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConvert(doc);
              }}
              title={t('trading_sales_convert_to_bl', 'Convertir en Bon de Livraison')}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              BL &rarr;
            </button>
          )}

          {doc.type === 'bl' && doc.status === 'Delivered' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConvert(doc);
              }}
              title={t('trading_sales_convert_to_invoice', 'Facturer ce bon de livraison')}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              {language === 'ar' ? 'فوترة ←' : 'Facturer →'}
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(doc);
            }}
            title={t('action_delete', 'Supprimer')}
            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {t('trading_sales_title', 'Cycle des Ventes & Facturation B2B')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C4785A]/15 text-[#C4785A]">
              {commercialDocs.length} {language === 'ar' ? 'معاملة' : 'pièces'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('trading_sales_subtitle', 'Gestion du flux complet : Devis → Bon de Commande → Bon de Livraison → Facture Fiscale → Avoir')}
          </p>
        </div>

        {/* Primary Creation Action Button */}
        <div className="flex items-center gap-2">
          <AtriumButton
            variant="outline"
            size="sm"
            onClick={() => handleCreateNew('devis')}
            icon={<Plus size={14} className="text-[#C4785A]" />}
          >
            {t('trading_sales_new_devis', 'Nouveau Devis')}
          </AtriumButton>

          <AtriumButton
            variant="outline"
            size="sm"
            onClick={() => handleCreateNew('bl')}
            icon={<Truck size={14} className="text-[#C4785A]" />}
          >
            {t('trading_sales_new_bl', 'Nouveau BL')}
          </AtriumButton>

          <AtriumButton
            variant="primary"
            size="sm"
            onClick={() => handleCreateNew('facture')}
            icon={<Plus size={15} />}
          >
            {t('trading_sales_new_invoice', 'Nouvelle Facture')}
          </AtriumButton>
        </div>
      </div>

      {/* Unified Tab Bar (Single screen architecture, zero menu bloat) */}
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {(
            [
              { key: 'all', label: t('trading_doc_all', 'Toutes les Pièces'), count: tabCounts.all },
              { key: 'devis', label: t('trading_doc_devis', 'Devis & Proformas'), count: tabCounts.devis },
              { key: 'commande', label: t('trading_doc_commande', 'Bons de Commande'), count: tabCounts.commande },
              { key: 'bl', label: t('trading_doc_bl', 'Bons de Livraison (BL)'), count: tabCounts.bl },
              { key: 'facture', label: t('trading_doc_facture', 'Factures Fiscales'), count: tabCounts.facture },
              { key: 'avoir', label: t('trading_doc_avoir', 'Avoirs & Retours'), count: tabCounts.avoir },
            ] as const
          ).map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#C4785A]/10 text-[#C4785A] font-bold border border-[#C4785A]/30'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected
                      ? 'bg-[#C4785A] text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="flex items-center">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('trading_sales_search_placeholder', 'Filtrer N° doc, client, NIF...')}
          />
        </div>
      </div>

      {/* UniversalDataCollection Container */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden">
        <UniversalDataCollection
          items={filteredDocs}
          keyExtractor={(d) => d.id}
          columns={columns}
          renderCard={(doc) => (
            <div className="p-4 border border-stone-200 dark:border-stone-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100">
                  {doc.docNumber}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  {doc.type.toUpperCase()}
                </span>
              </div>
              <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                {doc.clientName}
              </p>
              <div className="flex justify-between text-xs font-mono pt-2 border-t border-stone-100 dark:border-stone-800">
                <span className="text-stone-500">{t('trading_sales_col_net_to_pay', 'Net')} :</span>
                <span className="font-bold">{formatMoney(doc.netToPay)}</span>
              </div>
            </div>
          )}
          emptyTitle={language === 'ar' ? 'لا توجد معاملات مسجلة' : 'Aucun document trouvé'}
          emptyDescription={
            language === 'ar'
              ? 'أنشئ أول عرض أسعار، وصل تسليم أو فاتورة تجارية بالنقر على الأزرار أعلاه.'
              : 'Créez votre premier devis, bon de livraison ou facture fiscale en cliquant ci-dessus.'
          }
        />
      </div>

      {/* Modals */}
      <CommercialDocComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        initialType={composerType}
        editingDoc={editingDoc}
      />

      <CommercialDocPrintModal
        isOpen={!!printDoc}
        onClose={() => setPrintDoc(null)}
        document={printDoc}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteCommercialDoc(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title={t('trading_sales_delete_title', 'Supprimer la pièce commerciale ?')}
        description={
          language === 'ar'
            ? `هل أنت متأكد من حذف المستند ${deleteTarget?.docNumber} (${deleteTarget?.clientName})؟ هذا الإجراء لا يمكن التراجع عنه.`
            : `Êtes-vous certain de vouloir supprimer le document ${deleteTarget?.docNumber} (${deleteTarget?.clientName}) ? Cette opération est irréversible.`
        }
        confirmLabel={t('action_delete', 'Supprimer définitivement')}
        variant="danger"
      />
    </div>
  );
};
