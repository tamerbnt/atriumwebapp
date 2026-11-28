import React, { useMemo, useRef, useState } from 'react';
import { FileSignature, UploadCloud, ShieldCheck, X, Eraser, Check } from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { showToast } from '../../../services/store';
import {
  computeSha256Hex,
  interpolateLegalTemplate,
  validateSignatureSvg,
  validateVaultUploadFile,
} from '../../../utils/legalDepth';
import { legalService } from '../../../lib/supabase';
import { t } from '../../../utils/i18n';
import type {
  SupportedLanguage as Language,
  LegalConfidentialityLevel,
  LegalDocTemplate,
  LegalMatter,
  LegalSignedDocument,
} from '../../../types';

interface LegalTemplatesAndSignModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  activeRoleScope: 'avocat' | 'notaire' | 'comptable' | 'secretaire';
  matters: LegalMatter[];
  templates: LegalDocTemplate[];
  onSealVaultDocument: (doc: LegalSignedDocument) => void;
}

export const LegalTemplatesAndSignModal: React.FC<LegalTemplatesAndSignModalProps> = ({
  isOpen,
  onClose,
  language,
  accountId,
  businessId,
  branchId,
  staffId,
  activeRoleScope,
  matters,
  templates,
  onSealVaultDocument,
}) => {
  const [mode, setMode] = useState<'template' | 'upload'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [selectedMatterId, setSelectedMatterId] = useState<string>(matters[0]?.id || '');
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [docTitle, setDocTitle] = useState('');
  const [confidentiality, setConfidentiality] = useState<LegalConfidentialityLevel>('Internal');
  const [signedByName, setSignedByName] = useState('Maître Titulaire');
  const [portalShared, setPortalShared] = useState(false);

  // SVG Pointer Signature Pad
  const [paths, setPaths] = useState<string[]>([]);
  const currentPathRef = useRef<string>('');
  const drawingRef = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Upload tab state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadShaPreview, setUploadShaPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((tpl) => tpl.id === selectedTemplateId) || templates[0],
    [templates, selectedTemplateId]
  );

  const selectedMatter = useMemo(
    () => matters.find((m) => m.id === selectedMatterId),
    [matters, selectedMatterId]
  );

  const mergedVars = useMemo(() => {
    return {
      cabinet_name: 'Atrium Legal & Conseil',
      matter_number: selectedMatter?.matterNumber || 'DOS-2026',
      client_name: selectedMatter?.clientName || 'Mandant',
      adverse_party: selectedMatter?.adversePartyName || 'Partie Adverse',
      court_name: selectedMatter?.courtJurisdiction || 'Tribunal de Sidi M’hamed',
      chamber: selectedMatter?.chamber || 'Chambre Commerciale',
      amount_dzd: String(selectedMatter?.retainerAmountDzd || 150000),
      due_days: '8',
      ...varValues,
    };
  }, [selectedMatter, varValues]);

  const renderedPreview = useMemo(() => {
    if (!selectedTemplate) return { rendered: '', unresolvedTokens: [] };
    return interpolateLegalTemplate(selectedTemplate.bodyTemplate, mergedVars);
  }, [selectedTemplate, mergedVars]);

  if (!isOpen) return null;

  const getLocalPoint = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    drawingRef.current = true;
    const pt = getLocalPoint(e);
    currentPathRef.current = `M ${pt.x} ${pt.y}`;
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingRef.current) return;
    const pt = getLocalPoint(e);
    currentPathRef.current += ` L ${pt.x} ${pt.y}`;
    setPaths((prev) => [...prev.slice(0, -1), currentPathRef.current]);
    if (paths.length === 0) {
      setPaths([currentPathRef.current]);
    }
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (currentPathRef.current) {
      setPaths((prev) => {
        const last = prev[prev.length - 1];
        if (last === currentPathRef.current) return prev;
        return [...prev, currentPathRef.current];
      });
      currentPathRef.current = '';
    }
  };

  const buildSvgMarkup = () => {
    const pathTags = paths
      .map((d) => `<path d="${d}" fill="none" stroke="#065f46" stroke-width="2.2" stroke-linecap="round" />`)
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 120">${pathTags}</svg>`;
  };

  const handleSealTemplateDocument = () => {
    const svgMarkup = buildSvgMarkup();
    const sigCheck = validateSignatureSvg(svgMarkup);
    if (!sigCheck.valid) {
      showToast(sigCheck.reason || t('legal_depth_signature_required', language), 'error');
      return;
    }

    const title = docTitle.trim() || selectedTemplate?.title || 'Acte Signé';
    const fullContent = `${title}\n\n${renderedPreview.rendered}\n\nSignedBy:${signedByName}\n${svgMarkup}`;
    const sha256Hash = computeSha256Hex(fullContent);
    const nowIso = new Date().toISOString();

    onSealVaultDocument({
      id: `vlt_${Date.now().toString(36)}`,
      accountId,
      businessId,
      branchId,
      staffId,
      matterId: selectedMatter?.id,
      matterReference: selectedMatter?.matterNumber || 'DOSSIER-CABINET',
      vaultCode: `VLT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      title,
      docCategory: 'ActeSigné',
      roleScope: activeRoleScope,
      vaultStatus:
        confidentiality === 'SecretDefense' || confidentiality === 'Restricted'
          ? 'Confidential'
          : confidentiality === 'NotarialMinute'
          ? 'MinuteOfficielle'
          : 'OriginalScanned',
      confidentialityLevel: confidentiality,
      sha256Hash,
      mimeType: 'text/plain',
      fileSizeBytes: new TextEncoder().encode(fullContent).length,
      templateId: selectedTemplate?.id,
      renderedBody: renderedPreview.rendered,
      signatureSvg: svgMarkup,
      signedByName: signedByName.trim() || 'Maître',
      signedAt: nowIso,
      isPortalShared: portalShared,
      depositDate: nowIso.split('T')[0],
      createdAt: nowIso,
    });

    showToast(t('legal_depth_doc_sealed_ok', language), 'success');
    onClose();
  };

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadError(null);
    setUploadShaPreview('');
    if (!file) {
      setUploadFile(null);
      return;
    }
    const validation = validateVaultUploadFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!validation.ok) {
      setUploadFile(null);
      setUploadError(validation.reason || 'Fichier non valide');
      return;
    }
    setUploadFile(file);
    if (!docTitle.trim()) setDocTitle(file.name);
    const buf = new Uint8Array(await file.arrayBuffer());
    setUploadShaPreview(computeSha256Hex(buf));
  };

  const handleUploadAndSeal = async () => {
    if (!uploadFile) {
      showToast(t('legal_depth_select_file_first', language), 'error');
      return;
    }
    setUploading(true);
    try {
      const res = await legalService.uploadVaultDocumentFile({
        branchId,
        file: uploadFile,
      });
      if (!res.ok || !res.sha256Hash) {
        setUploadError(res.reason || 'Échec du contrôle du fichier');
        return;
      }
      const nowIso = new Date().toISOString();
      onSealVaultDocument({
        id: `vlt_${Date.now().toString(36)}`,
        accountId,
        businessId,
        branchId,
        staffId,
        matterId: selectedMatter?.id,
        matterReference: selectedMatter?.matterNumber || 'DOSSIER-CABINET',
        vaultCode: `VLT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        title: docTitle.trim() || uploadFile.name,
        docCategory: 'PièceNumérisée',
        roleScope: activeRoleScope,
        vaultStatus:
          confidentiality === 'SecretDefense' || confidentiality === 'Restricted'
            ? 'Confidential'
            : 'OriginalScanned',
        confidentialityLevel: confidentiality,
        storageBucket: 'legal-vault',
        storagePath: res.storagePath,
        fileUrl: res.fileUrl,
        sha256Hash: res.sha256Hash,
        fileSizeBytes: uploadFile.size,
        mimeType: uploadFile.type,
        isPortalShared: portalShared,
        depositDate: nowIso.split('T')[0],
        createdAt: nowIso,
      });
      showToast(t('legal_depth_upload_sealed_ok', language), 'success');
      onClose();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      data-testid="legal-templates-sign-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-emerald-700 dark:text-emerald-400" />
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              {t('legal_depth_vault_studio_title', language)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="close-vault-studio"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-stone-100 dark:bg-stone-800 w-fit">
          <button
            type="button"
            onClick={() => setMode('template')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
              mode === 'template'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <FileSignature size={13} />
              {t('legal_depth_tab_template_sign', language)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
              mode === 'upload'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <UploadCloud size={13} />
              {t('legal_depth_tab_file_upload', language)}
            </span>
          </button>
        </div>

        {/* Shared Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
              {t('legal_depth_matter_label', language)}
            </label>
            <select
              value={selectedMatterId}
              onChange={(e) => setSelectedMatterId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              {matters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.matterNumber} — {m.clientName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
              {t('legal_depth_confidentiality_label', language)}
            </label>
            <select
              value={confidentiality}
              onChange={(e) => setConfidentiality(e.target.value as LegalConfidentialityLevel)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              <option value="PublicClient">PublicClient (Portail Client)</option>
              <option value="Internal">Internal (Cabinet)</option>
              <option value="Restricted">Restricted (Restreint)</option>
              <option value="SecretDefense">SecretDefense (Secret Défense)</option>
              <option value="NotarialMinute">NotarialMinute (Minute Notariale)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
              {t('legal_depth_doc_title_label', language)}
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder={selectedTemplate?.title || 'Intitulé du document'}
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300 cursor-pointer">
          <input
            type="checkbox"
            checked={portalShared}
            onChange={(e) => setPortalShared(e.target.checked)}
            className="rounded border-stone-300 text-emerald-700"
          />
          <span>{t('legal_depth_share_client_portal', language)}</span>
        </label>

        {mode === 'template' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                  {t('legal_depth_choose_template', language)}
                </label>
                <select
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.code} — {tpl.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                  {t('legal_depth_signatory_name', language)}
                </label>
                <input
                  type="text"
                  value={signedByName}
                  onChange={(e) => setSignedByName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>

            {selectedTemplate && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {selectedTemplate.variables.map((v) => (
                  <div key={v}>
                    <label className="block text-[11px] text-stone-500 mb-0.5">{v}</label>
                    <input
                      type="text"
                      value={varValues[v] ?? (mergedVars as Record<string, string>)[v] ?? ''}
                      onChange={(e) => setVarValues((p) => ({ ...p, [v]: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                ))}
              </div>
            )}

            <pre className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs text-stone-800 dark:text-stone-200 whitespace-pre-wrap font-sans max-h-40 overflow-y-auto">
              {renderedPreview.rendered}
            </pre>

            {/* Signature Pad */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  {t('legal_depth_signature_pad_label', language)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPaths(['M 24 72 Q 80 30 140 68 T 245 58'])
                    }
                    className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0"
                  >
                    {t('legal_depth_signature_paraph_quick', language)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaths([])}
                    className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 whitespace-nowrap shrink-0"
                  >
                    <Eraser size={12} />
                    {t('legal_depth_clear_sig', language)}
                  </button>
                </div>
              </div>
              <svg
                ref={svgRef}
                data-testid="legal-signature-pad"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                viewBox="0 0 420 120"
                className="w-full h-28 rounded-lg border border-dashed border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 touch-none cursor-crosshair"
              >
                {paths.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke="#065f46"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                ))}
              </svg>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <AtriumButton variant="outline" onClick={onClose}>
                {t('cancel', language)}
              </AtriumButton>
              <AtriumButton
                variant="primary"
                onClick={handleSealTemplateDocument}
                icon={<Check size={14} />}
              >
                {t('legal_depth_seal_into_vault', language)}
              </AtriumButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block border border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-600 transition-colors">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt"
                onChange={handlePickFile}
                className="hidden"
              />
              <UploadCloud size={24} className="mx-auto mb-2 text-emerald-700 dark:text-emerald-400" />
              <div className="text-xs font-medium text-stone-800 dark:text-stone-200">
                {uploadFile
                  ? `${uploadFile.name} (${(uploadFile.size / 1024).toFixed(1)} Ko)`
                  : t('legal_depth_upload_drop_hint', language)}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                PDF, PNG, JPEG, WEBP, DOCX, TXT · Max 15 Mo
              </div>
            </label>

            {uploadError && (
              <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                {uploadError}
              </div>
            )}

            {uploadShaPreview && (
              <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs">
                <div className="text-stone-500 mb-1">Empreinte SHA-256 calculée :</div>
                <div className="font-mono break-all text-emerald-700 dark:text-emerald-400">
                  {uploadShaPreview}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <AtriumButton variant="outline" onClick={onClose}>
                {t('cancel', language)}
              </AtriumButton>
              <AtriumButton
                variant="primary"
                disabled={!uploadFile || uploading}
                onClick={handleUploadAndSeal}
                icon={<ShieldCheck size={14} />}
              >
                {t('legal_depth_upload_seal_btn', language)}
              </AtriumButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
