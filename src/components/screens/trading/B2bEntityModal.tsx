import React, { useState } from 'react';
import {
  X,
  Building2,
  User,
  Phone,
  Mail,
  CreditCard,
  FileText,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { B2bClient, B2bSupplier } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { useTranslation } from '../../../utils/useTranslation';

interface B2bEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType?: 'client' | 'supplier';
  editingEntity?: B2bClient | B2bSupplier | null;
  onSaved?: (entity: B2bClient | B2bSupplier) => void;
}

export const B2bEntityModal: React.FC<B2bEntityModalProps> = ({
  isOpen,
  onClose,
  entityType = 'client',
  editingEntity,
  onSaved,
}) => {
  const { t, isRtl, language } = useTranslation();
  const {
    createB2bClient,
    updateB2bClient,
    createB2bSupplier,
    updateB2bSupplier,
  } = useAtriumStore();

  const isEdit = !!editingEntity;
  const isSupplier = entityType === 'supplier';

  // State
  const [companyName, setCompanyName] = useState<string>(
    editingEntity
      ? 'companyName' in editingEntity
        ? editingEntity.companyName
        : (editingEntity as B2bSupplier).supplierName
      : ''
  );
  const [sector, setSector] = useState<string>(editingEntity?.sector || 'BTPH & Gros Œuvre');
  const [email, setEmail] = useState<string>(editingEntity?.email || '');
  const [phone, setPhone] = useState<string>(editingEntity?.phone || '');
  const [fax, setFax] = useState<string>(editingEntity?.fax || '');
  const [address, setAddress] = useState<string>(editingEntity?.address || '');
  const [city, setCity] = useState<string>(editingEntity?.city || 'Alger');
  const [country, setCountry] = useState<string>(editingEntity?.country || 'Algérie');

  // Algerian Fiscal & Legal Prerequisite Fields
  const [rc, setRc] = useState<string>(editingEntity?.rc || '');
  const [nif, setNif] = useState<string>(editingEntity?.nif || '');
  const [nis, setNis] = useState<string>(editingEntity?.nis || '');
  const [ai, setAi] = useState<string>(editingEntity?.ai || '');
  const [ribCcp, setRibCcp] = useState<string>(editingEntity?.ribCcp || '');

  // Contact person
  const [contactName, setContactName] = useState<string>(editingEntity?.contactName || '');
  const [contactRole, setContactRole] = useState<string>(
    editingEntity && 'contactRole' in editingEntity ? (editingEntity as B2bClient).contactRole || '' : ''
  );
  const [contactEmail, setContactEmail] = useState<string>(editingEntity?.contactEmail || '');
  const [contactPhone, setContactPhone] = useState<string>(editingEntity?.contactPhone || '');

  // Financial terms
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(
    editingEntity?.paymentTermsDays || 30
  );
  const [creditLimit, setCreditLimit] = useState<number>(
    editingEntity && 'creditLimit' in editingEntity ? (editingEntity as B2bClient).creditLimit : 1000000
  );
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<string>(
    editingEntity && 'defaultPaymentMethod' in editingEntity
      ? (editingEntity as B2bClient).defaultPaymentMethod || 'Virement bancaire'
      : 'Virement bancaire'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      alert('Veuillez spécifier la raison sociale.');
      return;
    }

    if (isSupplier) {
      const payload: Omit<B2bSupplier, 'id' | 'createdAt' | 'updatedAt'> = {
        tenantId: 'acc_01',
        facilityId: 'branch_trading_main',
        supplierName: companyName.trim(),
        sector,
        email,
        phone,
        fax: fax || undefined,
        address,
        city,
        country,
        rc: rc || undefined,
        nif: nif || undefined,
        nis: nis || undefined,
        ai: ai || undefined,
        ribCcp: ribCcp || undefined,
        contactName: contactName || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        paymentTermsDays,
        outstandingPayable: editingEntity && 'outstandingPayable' in editingEntity ? editingEntity.outstandingPayable : 0,
      };

      if (isEdit && editingEntity) {
        updateB2bSupplier(editingEntity.id, payload);
        if (onSaved) onSaved({ ...editingEntity, ...payload, updatedAt: new Date().toISOString() });
      } else {
        const created = createB2bSupplier(payload);
        if (onSaved) onSaved(created);
      }
    } else {
      const payload: Omit<B2bClient, 'id' | 'createdAt' | 'updatedAt'> = {
        tenantId: 'acc_01',
        facilityId: 'branch_trading_main',
        companyName: companyName.trim(),
        sector,
        email,
        phone,
        fax: fax || undefined,
        address,
        city,
        country,
        rc,
        nif,
        nis,
        ai,
        ribCcp: ribCcp || undefined,
        contactName,
        contactRole: contactRole || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        creditLimit,
        outstandingBalance: editingEntity && 'outstandingBalance' in editingEntity ? editingEntity.outstandingBalance : 0,
        paymentTermsDays,
        defaultPaymentMethod,
      };

      if (isEdit && editingEntity) {
        updateB2bClient(editingEntity.id, payload);
        if (onSaved) onSaved({ ...editingEntity, ...payload, updatedAt: new Date().toISOString() });
      } else {
        const created = createB2bClient(payload);
        if (onSaved) onSaved(created);
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl my-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/10 text-[#C4785A] flex items-center justify-center font-bold">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                {isEdit
                  ? `Modifier ${isSupplier ? 'le fournisseur' : 'le client B2B'}`
                  : `Nouveau ${isSupplier ? 'Fournisseur' : 'Client Entreprise (B2B)'}`}
              </h2>
              <p className="text-xs text-stone-500">
                Fiche légale conforme aux déclarations fiscales algériennes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Identity & Contact */}
          <div>
            <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 size={14} className="text-[#C4785A]" />
              <span>Identité de l'Établissement</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabelInput
                label="Raison Sociale / Nom de l'Entreprise *"
                placeholder="Ex: SARL Maghreb Travaux & Distribution"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />

              <LabelSelect
                label="Secteur d'Activité"
                value={sector}
                onChange={(val) => setSector(typeof val === 'string' ? val : val?.target?.value || val)}
                options={[
                  "BTPH & Gros Œuvre",
                  "Second Œuvre & Rénovation",
                  "Distribution & Quincaillerie",
                  "Électricité & Fluides",
                  "Industrie & Sidérurgie",
                  "Agroalimentaire & FMCG",
                  "Autre"
                ]}
              />

              <LabelInput
                type="email"
                label="Email Professionnel"
                placeholder="direction@entreprise.dz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <LabelInput
                type="tel"
                label="Téléphone Standard / Fixe"
                placeholder="+213 21 00 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <LabelInput
                    label="Adresse du Siège Social"
                    placeholder="Rue, Zone Industrielle, Lot N°..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div>
                  <LabelInput
                    label="Ville / Wilaya"
                    placeholder="Alger, Oran..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Legal & Fiscal Algerian Prerequisite Fields */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/20 space-y-4">
            <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText size={14} className="text-[#C4785A]" />
                <span>Identifiants Fiscaux & Réglementaires Algériens</span>
              </span>
              <span className="text-[10px] text-stone-400 font-normal">
                Indispensable pour l'impression des Factures et BL conformes
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <LabelInput
                  label="Registre Comm. (RC)"
                  placeholder="Ex: 16/00-0982341B20"
                  value={rc}
                  onChange={(e) => setRc(e.target.value)}
                />
              </div>

              <div>
                <LabelInput
                  label="N.I.F. (15 Chiffres)"
                  placeholder="Ex: 002016098234185"
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                />
              </div>

              <div>
                <LabelInput
                  label="N.I.S. (Statistique)"
                  placeholder="Ex: 0020160900142"
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                />
              </div>

              <div>
                <LabelInput
                  label="Art. d'Imposition (AI)"
                  placeholder="Ex: 16041289045"
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}
                />
              </div>
            </div>

            <div>
              <LabelInput
                label="RIB Bancaire ou CCP (20 chiffres + clé)"
                placeholder="Ex: 00100 00123 0000123456 42 (Banque Nationale d'Algérie)"
                value={ribCcp}
                onChange={(e) => setRibCcp(e.target.value)}
              />
            </div>
          </div>

          {/* Primary Contact Person */}
          <div>
            <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <User size={14} className="text-[#C4785A]" />
              <span>Interlocuteur Principal (Directeur Achats / Gérant)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <LabelInput
                  label="Nom & Prénom"
                  placeholder="Ex: Mourad Hadj-Said"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div>
                <LabelInput
                  label="Fonction / Poste"
                  placeholder="Ex: Responsable des Achats"
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                />
              </div>

              <div>
                <LabelInput
                  type="tel"
                  label="Mobile Direct"
                  placeholder="+213 550 00 00 00"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>

              <div>
                <LabelInput
                  type="email"
                  label="Email Direct"
                  placeholder="m.hadjsaid@entreprise.dz"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Commercial & Financial Conditions */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
            <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider flex items-center gap-2">
              <CreditCard size={14} className="text-[#C4785A]" />
              <span>Conditions Commerciales & Plafond d'Encours</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <LabelSelect
                  label="Délai de Paiement Accordé"
                  value={paymentTermsDays}
                  onChange={(val) => setPaymentTermsDays(Number(typeof val === 'object' && val?.target ? val.target.value : val))}
                  options={[
                    { value: 0, label: "Comptant à la livraison (0 jour)" },
                    { value: 15, label: "15 jours net" },
                    { value: 30, label: "30 jours fin de mois" },
                    { value: 45, label: "45 jours" },
                    { value: 60, label: "60 jours" },
                    { value: 90, label: "90 jours" }
                  ]}
                />
              </div>

              {!isSupplier && (
                <>
                  <div>
                    <LabelInput
                      type="number"
                      label="Plafond de Crédit Autorisé (DA)"
                      value={creditLimit}
                      step={50000}
                      onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <LabelSelect
                      label="Mode de Règlement Privilégié"
                      value={defaultPaymentMethod}
                      onChange={(val) => setDefaultPaymentMethod(typeof val === 'string' ? val : val?.target?.value || val)}
                      options={[
                        { value: "Virement bancaire", label: "Virement bancaire" },
                        { value: "Chèque barré", label: "Chèque barré" },
                        { value: "Chèque certifié", label: "Chèque certifié" },
                        { value: "Espèces (Timbré)", label: "Espèces (Timbré)" },
                        { value: "Traite", label: "Traite / Effet" }
                      ]}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#C4785A] hover:bg-[#b06749] text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle size={15} />
              <span>{isEdit ? 'Enregistrer les Modifications' : 'Créer la Fiche'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
