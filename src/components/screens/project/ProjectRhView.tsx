import React, { useState } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMTalent } from '../../../types/index';
import { ALGERIAN_WILAYAS, validateCcpAccount } from '../../../utils/algerianPtt';
import { MobilePhoneSimulator } from './MobilePhoneSimulator';
import {
  Users,
  Search,
  Filter,
  Star,
  CheckCircle,
  Car,
  FileText,
  CreditCard,
  Eye,
  Plus,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  X,
  ExternalLink,
  Download,
  GraduationCap,
  DoorOpen,
  Camera,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface ProjectRhViewProps {
  initialTab?: 'talents' | 'dossier' | 'portal' | 'walkin';
}

export const ProjectRhView: React.FC<ProjectRhViewProps> = ({ initialTab }) => {
  const {
    pmTalents,
    addPmTalent,
    updatePmTalentStatus,
    activePmSubScreen,
    setActivePmSubScreen,
  } = useAtriumStore();

  const activeTab: 'talents' | 'dossier' | 'portal' | 'walkin' =
    activePmSubScreen === 'dossier' || initialTab === 'dossier'
      ? 'dossier'
      : activePmSubScreen === 'portal' || initialTab === 'portal'
      ? 'portal'
      : activePmSubScreen === 'walkin' || initialTab === 'walkin'
      ? 'walkin'
      : 'talents';

  const setActiveTab = (tab: 'talents' | 'dossier' | 'portal' | 'walkin') => {
    setActivePmSubScreen(tab);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWilaya, setSelectedWilaya] = useState('all');
  const [selectedTalent, setSelectedTalent] = useState<PMTalent | null>(pmTalents[0] || null);

  // Form State for Portal & Walk-in
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  const [age, setAge] = useState('22');
  const [phone, setPhone] = useState('+213 ');
  const [email, setEmail] = useState('');
  const [wilayaCode, setWilayaCode] = useState('16');
  const [commune, setCommune] = useState('Bab Ezzouar');
  const [hasDriverLicense, setHasDriverLicense] = useState(true);
  const [isVehicleOwner, setIsVehicleOwner] = useState(false);
  const [ccpNumber, setCcpNumber] = useState('0012345678');
  const [ccpKey, setCcpKey] = useState('45');
  const [desiredRoles, setDesiredRoles] = useState(['Animator']);
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80');
  const [formSubmittedSuccess, setFormSubmittedSuccess] = useState(false);

  // Filtered Talents
  const filteredTalents = pmTalents.filter((t) => {
    const matchesSearch =
      t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm) ||
      t.ccpNumber.includes(searchTerm);
    const matchesWilaya = selectedWilaya === 'all' || t.wilayaCode === selectedWilaya;
    return matchesSearch && matchesWilaya;
  });

  const handleCreateTalent = (e: React.FormEvent, source: 'portal' | 'walkin') => {
    e.preventDefault();
    const wilayaObj = ALGERIAN_WILAYAS.find((w) => w.code === wilayaCode);
    const ccpCheck = validateCcpAccount(ccpNumber, ccpKey);

    if (!ccpCheck.isValid) {
      alert(`Erreur CCP : ${ccpCheck.error}`);
      return;
    }

    addPmTalent({
      tenantId: 'acc_01',
      facilityId: 'branch_agency_main',
      fullName,
      gender,
      birthDate: '2002-01-01',
      age: Number(age) || 22,
      phone,
      email: email || undefined,
      wilayaCode,
      wilayaName: wilayaObj?.nameFr || 'Alger',
      commune,
      hasDriverLicense,
      isVehicleOwner,
      desiredRoles,
      languages: ['Arabic', 'French'],
      portraitPhotoUrl: photoUrl,
      ccpNumber,
      ccpKey,
      initialHrScore: 4.5,
      averageMissionRating: 4.8,
      completedMissionsCount: 0,
      absencesCount: 0,
      isHrVerified: source === 'walkin',
      status: 'active',
      hrNotes: source === 'walkin' ? 'Candidat reçu directement à l\'agence.' : 'Pré-inscription portail en ligne.',
    });

    setFormSubmittedSuccess(true);
    setTimeout(() => {
      setFormSubmittedSuccess(false);
      setFullName('');
      setActiveTab('talents');
    }, 1800);
  };

  const handleExportTalents = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Nom,Wilaya,Commune,Téléphone,N° CCP,Clé,Note Globale,Statut',
        ...filteredTalents.map(
          (t) => `"${t.fullName}",${t.wilayaName},${t.commune},${t.phone},${t.ccpNumber},${t.ccpKey},${t.consolidatedScore},${t.status}`
        ),
      ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vivier_talents_nch_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
              Rôle 5 · Ressources Humaines & Casting
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">Vivier 58 Wilayas & Comptes CCP</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {activeTab === 'talents'
              ? 'Vivier National des Talents'
              : activeTab === 'dossier'
              ? `Dossier Candidat · ${selectedTalent?.fullName || 'Sélection'}`
              : activeTab === 'portal'
              ? 'Portail Candidat Public (/cvs/create)'
              : 'Saisie Express Candidat Agence'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('walkin')}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nouveau Candidat
          </button>
          <button
            onClick={handleExportTalents}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter Vivier (Excel)
          </button>
        </div>
      </div>

      {/* Screen Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('talents')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'talents'
              ? 'bg-[#C4785A] text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Users className="w-4 h-4" />
          5.1 Vivier National ({pmTalents.length})
        </button>

        <button
          onClick={() => setActiveTab('dossier')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'dossier'
              ? 'bg-[#C4785A] text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          5.2 Dossier Talent 360°
        </button>

        <button
          onClick={() => setActiveTab('portal')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'portal'
              ? 'bg-[#C4785A] text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          5.3A Portail Public (/cvs/create)
        </button>

        <button
          onClick={() => setActiveTab('walkin')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'walkin'
              ? 'bg-[#C4785A] text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <DoorOpen className="w-4 h-4" />
          5.3B Saisie Express Agence
        </button>
      </div>

      {/* SCREEN 5.1: TALENT POOL DIRECTORY */}
      {activeTab === 'talents' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs flex-1 max-w-xl">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, téléphone, numéro CCP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                />
              </div>

              <select
                value={selectedWilaya}
                onChange={(e) => setSelectedWilaya(e.target.value)}
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold"
              >
                <option value="all">58 Wilayas (Toutes)</option>
                <option value="16">16 - Alger</option>
                <option value="31">31 - Oran</option>
                <option value="25">25 - Constantine</option>
                <option value="19">19 - Sétif</option>
                <option value="09">09 - Blida</option>
              </select>
            </div>

            <div className="text-xs font-semibold text-zinc-500">
              {filteredTalents.length} profils trouvés
            </div>
          </div>

          {/* Talents Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">
                <tr>
                  <th className="py-3 px-4">Talent</th>
                  <th className="py-3 px-4">Wilaya & Commune</th>
                  <th className="py-3 px-4">Coordonnées CCP</th>
                  <th className="py-3 px-4 text-center">Score Consolidé</th>
                  <th className="py-3 px-4">Mobilité</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredTalents.map((talent) => (
                  <tr key={talent.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={talent.portraitPhotoUrl}
                          alt={talent.fullName}
                          className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                        />
                        <div>
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">{talent.fullName}</div>
                          <span className="text-[11px] text-zinc-500">{talent.phone}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">{talent.wilayaName}</div>
                      <span className="text-[11px] text-zinc-500">{talent.commune}</span>
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                      <div>{talent.ccpNumber}</div>
                      <span className="text-[10px] text-zinc-400">Clé: {talent.ccpKey}</span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 font-bold text-amber-500 font-mono">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{talent.consolidatedScore}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 block font-normal">
                        {talent.completedMissionsCount} missions · 0 abs.
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {talent.hasDriverLicense && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 mr-1">
                            Permis B
                          </span>
                        )}
                        {talent.isVehicleOwner && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                            Véhiculé
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedTalent(talent);
                          setActiveTab('dossier');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-[#C4785A] hover:bg-[#C4785A]/10 rounded-lg transition-colors cursor-pointer"
                      >
                        Inspecter Dossier ➔
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCREEN 5.2: COMPREHENSIVE TALENT DOSSIER 360° */}
      {activeTab === 'dossier' && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs max-w-4xl mx-auto space-y-6">
          {selectedTalent ? (
            <div className="space-y-6">
              {/* Dossier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedTalent.portraitPhotoUrl}
                    alt={selectedTalent.fullName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[#C4785A]"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                        {selectedTalent.fullName}
                      </h2>
                      {selectedTalent.isHrVerified && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Vérifié par RH
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {selectedTalent.age} ans · Wilaya de {selectedTalent.wilayaName} ({selectedTalent.commune}) · {selectedTalent.phone}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-zinc-400 block">Note Globale Consolidée</span>
                  <div className="flex items-center gap-1.5 text-xl font-bold font-mono text-amber-500 justify-end">
                    <Star className="w-5 h-5 fill-amber-400" />
                    <span>{selectedTalent.consolidatedScore} / 5.0</span>
                  </div>
                </div>
              </div>

              {/* 4 Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pillar 1: Informations Générales */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#C4785A]" />
                    Compétences & Disponibilités
                  </h3>
                  <div className="text-xs space-y-1 text-zinc-600 dark:text-zinc-400">
                    <p><strong>Rôles souhaités :</strong> {selectedTalent.desiredRoles.join(', ')}</p>
                    <p><strong>Langues :</strong> {selectedTalent.languages?.join(', ') || 'Arabe, Français'}</p>
                    <p><strong>Mobilité :</strong> {selectedTalent.hasDriverLicense ? 'Permis B Oui' : 'Non'} · {selectedTalent.isVehicleOwner ? 'Véhiculé Oui' : 'Non véhicule'}</p>
                  </div>
                </div>

                {/* Pillar 2: Banking & CCP Credentials */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    Coordonnées Postales (Algérie Poste)
                  </h3>
                  <div className="text-xs space-y-1 font-mono text-zinc-800 dark:text-zinc-200">
                    <p><strong>N° Compte CCP :</strong> {selectedTalent.ccpNumber}</p>
                    <p><strong>Clé Algérie Poste :</strong> {selectedTalent.ccpKey}</p>
                    <p className="text-[11px] text-emerald-600 font-sans font-medium">✓ Validé conforme à l'algorithme d'Algérie Poste</p>
                  </div>
                </div>

                {/* Pillar 3: Verified Document Vault */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Coffre-Fort des Pièces Justificatives
                  </h3>
                  <div className="text-xs space-y-2">
                    <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <span>Carte Nationale d'Identité (CNI)</span>
                      <span className="text-emerald-600 font-bold text-[10px]">Vérifiée</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <span>Permis de Conduire Catégorie B</span>
                      <span className="text-emerald-600 font-bold text-[10px]">Conforme</span>
                    </div>
                  </div>
                </div>

                {/* Pillar 4: Mission History & Ratings */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500" />
                    Historique Missions & Fiabilité
                  </h3>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                    <p><strong>Missions Complétées :</strong> {selectedTalent.completedMissionsCount}</p>
                    <p><strong>Absences Non Justifiées :</strong> 0 absence (100% fiabilité)</p>
                    <p><strong>Avis RH :</strong> {selectedTalent.hrNotes || 'Profil sérieux et ponctuel.'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setActiveTab('talents')}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-100 cursor-pointer"
                >
                  Retour au Vivier
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 text-center py-8">Aucun talent sélectionné.</p>
          )}
        </div>
      )}

      {/* SCREEN 5.3A: PUBLIC CANDIDATE SELF-REGISTRATION (SIMULATOR) */}
      {activeTab === 'portal' && (
        <MobilePhoneSimulator
          title="Portail Candidat Public (/cvs/create)"
          subtitle="Formulaire de pré-inscription pour animateurs et hôtesses"
          defaultMode="mobile"
        >
          <div className="space-y-4">
            <div className="text-center pb-2 border-b border-zinc-200 dark:border-zinc-700">
              <span className="text-[10px] font-bold text-[#C4785A] uppercase tracking-wide">
                Rejoignez le Réseau NCH
              </span>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Formulaire d'Inscription Talent
              </h3>
              <p className="text-[11px] text-zinc-500">
                Gagnez jusqu'à 4 500 DA / jour sur les événements de grandes marques.
              </p>
            </div>

            {formSubmittedSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs font-semibold text-center">
                ✓ Candidature envoyée avec succès ! Notre équipe RH vous contactera sous 48h.
              </div>
            )}

            <form onSubmit={(e) => handleCreateTalent(e, 'portal')} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Nom et Prénom *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Yasmine Belkacem"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Numéro de Téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+213 661 ..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Âge
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Wilaya de Résidence *
                  </label>
                  <select
                    value={wilayaCode}
                    onChange={(e) => setWilayaCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  >
                    {ALGERIAN_WILAYAS.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.code} - {w.nameFr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Commune
                  </label>
                  <input
                    type="text"
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>

              {/* CCP Info */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 block">
                  Coordonnées CCP (Pour le paiement des cachets)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[10px] text-zinc-500 block mb-0.5">N° Compte CCP</label>
                    <input
                      type="text"
                      required
                      placeholder="0012345678"
                      value={ccpNumber}
                      onChange={(e) => setCcpNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-0.5">Clé (2 chiffres)</label>
                    <input
                      type="text"
                      required
                      placeholder="45"
                      value={ccpKey}
                      onChange={(e) => setCcpKey(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>
              </div>

              {/* Selfie / Portrait Upload */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Photo Portrait / Casting Selfie (Lien image)
                </label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#C4785A] hover:bg-[#b3684a] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                Envoyer ma Candidature ➔
              </button>
            </form>
          </div>
        </MobilePhoneSimulator>
      )}

      {/* SCREEN 5.3B: AGENCY DIRECT WALK-IN INTAKE */}
      {activeTab === 'walkin' && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs max-w-2xl mx-auto space-y-6">
          <div>
            <span className="text-xs font-semibold text-[#C4785A] uppercase tracking-wide">
              Écran 5.3B · Saisie Express Agence
            </span>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              Enregistrement Direct d'un Candidat Présent en Agence
            </h2>
            <p className="text-xs text-zinc-500">
              Formulaire express avec validation automatique des pièces d'identité et du compte postal CCP.
            </p>
          </div>

          <form onSubmit={(e) => handleCreateTalent(e, 'walkin')} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Nom et Prénom du Candidat *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Karim Bensalem"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Téléphone Mobile *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+213 550 ..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Wilaya de Résidence
                </label>
                <select
                  value={wilayaCode}
                  onChange={(e) => setWilayaCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  {ALGERIAN_WILAYAS.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.code} - {w.nameFr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  N° Compte CCP (10 chiffres)
                </label>
                <input
                  type="text"
                  required
                  value={ccpNumber}
                  onChange={(e) => setCcpNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Clé Algérie Poste (2 chiffres)
                </label>
                <input
                  type="text"
                  required
                  value={ccpKey}
                  onChange={(e) => setCcpKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#C4785A] hover:bg-[#b3684a] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              Enregistrer & Valider dans le Vivier RH
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
