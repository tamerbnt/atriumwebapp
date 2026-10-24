import React, { useState } from 'react';
import { Lock, FileText, Plus, ShieldCheck, Printer } from 'lucide-react';
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
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Lock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
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
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-4 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث في وثائق الخزينة...' : 'Recherche pièce, contrat, code...'}
          />
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3">Réf. Pièce</th>
                <th className="px-4 py-3">Titre du Document</th>
                <th className="px-4 py-3">Dossier Lié</th>
                <th className="px-4 py-3">Date Dépôt</th>
                <th className="px-4 py-3 text-center">Niveau Sécurité</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#C4785A]">
                    {item.code}
                  </td>
                  <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">
                    {item.title}
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-500">
                    {item.matterReference}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 font-mono">
                    {item.depositDate}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AtriumButton
                      size="xs"
                      variant="secondary"
                      onClick={() => {
                        showToast('Consultation de la pièce sécurisée...', 'info');
                      }}
                      icon={<FileText size={12} />}
                    >
                      {language === 'ar' ? 'معاينة' : 'Consulter'}
                    </AtriumButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
