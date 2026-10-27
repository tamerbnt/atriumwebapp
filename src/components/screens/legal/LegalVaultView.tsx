import React, { useState } from 'react';
import { Lock, FileText, Plus, ShieldCheck, Printer, CheckCircle2, Key } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

interface VaultItem {
  id: string;
  code: string;
  title: string;
  matterReference: string;
  category: string;
  depositDate: string;
  status: 'OriginalScanned' | 'Confidential';
}

const INITIAL_VAULT: VaultItem[] = [
  { id: 'v_01', code: 'DOC-2026-081', title: 'Contrat Commercial Original & Avenants', matterReference: 'DOS-2026-0091', category: 'Contrats', depositDate: '2026-05-02', status: 'OriginalScanned' },
  { id: 'v_02', code: 'DOC-2026-082', title: 'Acte Notarié de Propriété Foncière (El Biar)', matterReference: 'DOS-2026-0092', category: 'Actes Notariés', depositDate: '2026-05-05', status: 'Confidential' },
  { id: 'v_03', code: 'DOC-2026-083', title: 'Procès-Verbal de Constat d\'Huissier de Justice', matterReference: 'DOS-2026-0091', category: 'Huissier & Significations', depositDate: '2026-05-08', status: 'OriginalScanned' },
];

export const LegalVaultView: React.FC = () => {
  const { language } = useAtriumStore();
  const [vaultItems] = useState<VaultItem[]>(INITIAL_VAULT);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = vaultItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.matterReference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Lock size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'الخزينة والمستندات السرية' : 'Coffre-fort Numérique & Pièces à Conviction'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                AES-256 Chiffré
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'أرشفة الوثائق الأصلية، مذكرات الدفاع، العقود الموثقة وسندات التبليغ'
                : 'Pièces de procédure numérisées, bordereaux de communication & secret professionnel'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => showToast(language === 'ar' ? 'إيداع وثيقة جديدة بالخزينة' : 'Dépôt de pièce sécurisée disponible', 'info')}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'إيداع وثيقة' : 'Déposer une Pièce'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'أمان الوثائق وسندات الدعوى' : 'Intégrité du Coffre & Conservation des Pièces'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة الوثائق المودعة، سرية البيانات وحماية الملفات الحساسة' : 'Documents scellés, empreintes numériques et protection du secret d\'instruction'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Pièces Scellées */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'الوثائق المودعة بالخزينة' : 'Pièces Déposées au Coffre'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {vaultItems.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {language === 'ar' ? 'أصول أصلية ومسحوبة رقمياً' : 'Copies certifiées conformes'}
              </p>
            </div>
          </div>

          {/* Card 2: Actes Authentiques */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'محاضر موثقة ومحاضر محضر قضائي' : 'Actes Notariés & Huissier'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {vaultItems.filter((v) => v.category !== 'Contrats').length}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {language === 'ar' ? 'قوة إثبات قانونية قاطعة' : 'Force probante exécutoire'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'درجة التشفير والحماية' : 'Niveau de Sécurité Chiffré'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                AES-256 Bit
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                100%
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filtered.length} {language === 'ar' ? 'مستند محفوظ' : 'documents sécurisés'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Integrated Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'أرشيف الخزينة المشفر' : 'Registre du Coffre Numérique'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث برمز المستند، العنوان، القضية...' : 'Recherche pièce, code, dossier...'}
            />
          </div>
        </div>

        {/* Vault Table Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-[#E9EEF0] dark:border-neutral-700/60">
                <tr>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'رمز الوثيقة' : 'Code Pièce'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'عنوان المستند' : 'Intitulé de la Pièce'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'القضية المرتبطة' : 'Dossier Lié'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'التصنيف' : 'Catégorie'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'تاريخ الإيداع' : 'Date Dépôt'}</th>
                  <th className="px-4 py-3.5 text-center">{language === 'ar' ? 'مستوى الحماية' : 'Sécurité'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-[#C4785A]">
                      {item.code}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                      {item.title}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-neutral-600 dark:text-neutral-400">
                      {item.matterReference}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-300">
                      {item.category}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-neutral-500 text-[11px]">
                      {item.depositDate}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === 'Confidential'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
