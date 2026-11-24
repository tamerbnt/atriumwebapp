import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Activity,
  ArrowRight,
  Clock,
  Building2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { MedicalConsultation, MedicalPractitioner } from '../../../types';
import { useMedicalData } from './medicalData';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion, KineticModalShell } from '../../ui/kinetic';

interface MedicalWaitingRoomTvModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultations: MedicalConsultation[];
  practitioners: MedicalPractitioner[];
}

export const MedicalWaitingRoomTvModal: React.FC<MedicalWaitingRoomTvModalProps> = ({
  isOpen,
  onClose,
  consultations,
  practitioners,
}) => {
  const { isEmergencyAlarmActive, toggleEmergencyAlarm } = useMedicalData();
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastCalledTicket, setLastCalledTicket] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Filter consultations in waiting and in consultation
  const activeInRoom = consultations.filter((c) => c.status === 'InConsultation');
  const waitingQueue = consultations.filter((c) => c.status === 'InWaitingQueue');

  // Currently called patient (most recently moved to InConsultation or first in list)
  const currentCall = activeInRoom[0] || null;

  // Clock interval
  useEffect(() => {
    if (!isOpen) return;
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Web Audio API Synthetic Chime: Two-tone pleasant hospital chime (D5: 587.33Hz -> A5: 880Hz)
  const playChimeTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Tone 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Tone 2: 880 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.25);
      gain2.gain.setValueAtTime(0.001, now + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.35, now + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.25);
      osc2.stop(now + 1.2);
    } catch {
      // Audio autoplay gracefully blocked
    }
  };

  // Trigger chime & flash on ticket call update
  useEffect(() => {
    if (!isOpen) return;
    if (currentCall && currentCall.ticketNumber && currentCall.ticketNumber !== lastCalledTicket) {
      setLastCalledTicket(currentCall.ticketNumber);
      setIsFlashing(true);
      if (audioEnabled) {
        playChimeTone();
      }
      const flashTimer = setTimeout(() => setIsFlashing(false), 4000);
      return () => clearTimeout(flashTimer);
    }
  }, [isOpen, currentCall?.ticketNumber, audioEnabled, lastCalledTicket]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleEnableAudio = () => {
    setAudioEnabled(true);
    playChimeTone();
  };

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      fullscreen
      dataTheme="dark"
      scrimClassName="bg-[#0C0C0E]"
      ariaLabel="Écran Salle d'Attente"
    >
      <div
        ref={containerRef}
        data-theme="dark"
        className="w-full h-full bg-[#0C0C0E] text-white flex flex-col font-sans select-none overflow-hidden"
      >
      {/* Top TV Header Bar */}
      <div className="h-20 bg-[#141416] border-b border-white/10 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div
            data-sq="tile-lg"
            data-sq-border="solid"
            style={{ '--sq-stroke': 'rgba(13, 148, 136, 0.35)' } as React.CSSProperties}
            className="w-12 h-12 bg-[#0D9488]/20 flex items-center justify-center text-[#14B8A6]"
          >
            <Activity size={26} className="animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="t-dialog font-semibold tracking-wide text-white">
              Centre Médical El-Chifa
            </span>
            <span className="px-2.5 py-1 rounded-full t-small font-semibold bg-[#0D9488]/20 text-[#14B8A6]">
              Écran Salle d'Attente
            </span>
          </div>
        </div>

        {/* Center Live Clock */}
        <div
          data-sq="card"
          data-sq-border="solid"
          style={{ '--sq-stroke': 'rgba(255, 255, 255, 0.12)' } as React.CSSProperties}
          className="flex items-center gap-3 px-5 py-2 bg-white/5"
        >
          <Clock size={20} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
          <div className="t-kpi-m uppercase tabular-nums text-white">
            {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <span className="t-cap text-white/50 pl-2 border-l border-white/10">
            {currentTime.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>

        {/* Right TV Controls */}
        <div className="flex items-center gap-3">
          {!audioEnabled ? (
            <button
              data-no-liquid="true"
              data-sq="ctl"
              data-sq-border="solid"
              style={{ '--sq-stroke': 'rgba(245, 158, 11, 0.45)' } as React.CSSProperties}
              onClick={handleEnableAudio}
              className="px-4 py-2 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 t-small font-semibold flex items-center gap-2 transition-all cursor-pointer animate-bounce"
            >
              <VolumeX size={16} />
              <span>Activer le Son du Carillon</span>
            </button>
          ) : (
            <button
              data-no-liquid="true"
              data-sq="ctl"
              data-sq-border="solid"
              style={{ '--sq-stroke': 'rgba(255, 255, 255, 0.12)' } as React.CSSProperties}
              onClick={() => {
                playChimeTone();
              }}
              className="px-3 py-2 bg-white/5 text-emerald-400 hover:bg-white/10 t-small font-medium flex items-center gap-2 cursor-pointer transition-colors"
              title="Tester le carillon"
            >
              <Volume2 size={16} />
              <span>Son Actif</span>
            </button>
          )}

          <button
            data-no-liquid="true"
            data-sq="ctl"
            data-sq-border="solid"
            style={
              {
                '--sq-stroke': isEmergencyAlarmActive
                  ? 'rgba(251, 113, 133, 0.9)'
                  : 'rgba(255, 255, 255, 0.12)',
              } as React.CSSProperties
            }
            onClick={() => toggleEmergencyAlarm()}
            className={`px-4 py-2 t-small font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              isEmergencyAlarmActive
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
            title="Déclencher / Arrêter l'alerte d'urgence médicale"
          >
            <AlertCircle size={16} className={isEmergencyAlarmActive ? 'animate-spin' : ''} />
            <span>{isEmergencyAlarmActive ? 'URGENCE EN COURS' : 'Alerte Urgence'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Plein Écran"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>

          <button
            onClick={onClose}
            className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
            title="Quitter le mode TV"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Emergency Flash Banner */}
      {isEmergencyAlarmActive && (
        <div className="bg-rose-600 text-white px-8 py-4 text-center font-semibold t-label flex items-center justify-center gap-3 animate-pulse border-b-2 border-white/40 shrink-0 select-none shadow-xl">
          <AlertCircle size={22} className="animate-spin shrink-0" />
          <span className="tracking-wide">
            🚨 URGENCE MÉDICALE EN COURS — ACCÈS SALLE DE DÉCHOCAGE ET SOINS PRIORITAIRES
          </span>
          <AlertCircle size={22} className="animate-spin shrink-0" />
        </div>
      )}

      {/* Main Dual Stage TV Layout */}
      <div className="flex-1 grid grid-cols-12 gap-8 p-8 overflow-hidden">
        {/* Left 7 Columns: Currently Called Ticket & Cabinet */}
        <div className="col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 t-small text-[#14B8A6] font-semibold mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6] animate-ping" />
              <span>Patient Actuellement Appelé</span>
            </div>

            {currentCall ? (
              <div className="sq-elev-pop">
                <div
                  data-sq="panel"
                  data-sq-border="solid"
                  data-sq-stroke-w={isFlashing ? 2 : 1}
                  style={
                    {
                      '--sq-stroke': isFlashing ? '#14B8A6' : 'rgba(255, 255, 255, 0.12)',
                    } as React.CSSProperties
                  }
                  className={`p-8 transition-all duration-500 flex flex-col justify-between min-h-[380px] relative overflow-hidden ${
                    isFlashing
                      ? 'bg-gradient-to-br from-[#0D9488]/30 via-[#141416] to-[#d4522f]/20 scale-[1.01]'
                      : 'bg-[#18181B]'
                  }`}
                >
                {/* Background ambient watermark */}
                <div className="absolute right-[-20px] bottom-[-20px] opacity-5 pointer-events-none text-white">
                  <Activity size={260} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="t-cap px-4 py-2 rounded-full bg-white/10 text-white/70 tabular-nums">
                      Numéro d'Ordre d'Arrivée
                    </span>
                    <span className="px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold t-small flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Consultation en cours
                    </span>
                  </div>

                  {/* Gigantic Ticket ID */}
                  <div className="text-7xl tabular-nums font-semibold text-white mb-4">
                    {currentCall.ticketNumber || 'T-101'}
                  </div>

                  {/* Patient Initials / Name Display */}
                  <div className="t-kpi-m uppercase text-white/90 tabular-nums">
                    {currentCall.patientName}
                  </div>
                  <p className="t-body text-white/50 mt-1">
                    Âge: {currentCall.patientAge || '—'} ans · Code Acte: {currentCall.ngapCode || 'CS'}
                  </p>
                </div>

                {/* Cabinet & Doctor Destination Banner */}
                <div
                  data-sq="card"
                  data-sq-border="solid"
                  style={{ '--sq-stroke': 'rgba(255, 255, 255, 0.12)' } as React.CSSProperties}
                  className="mt-8 p-6 bg-white/5 flex items-center justify-between backdrop-blur-md"
                >
                  <div>
                    <span className="t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold block mb-1">
                      Veuillez vous présenter au
                    </span>
                    <div className="t-kpi-m uppercase text-white tracking-wide tabular-nums">
                      {currentCall.cabinetRoom || 'Cabinet 1'}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <ArrowRight size={32} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] animate-pulse" />
                    <div>
                      <span className="t-cap text-white/60 block">Médecin Praticien</span>
                      <div className="t-dialog font-semibold text-white">
                        {currentCall.doctorName || 'Dr. Amine Benali'}
                      </div>
                      <span className="t-small text-[#14B8A6] font-medium">
                        {currentCall.doctorSpecialty || 'Médecine Spécialisée'}
                      </span>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            ) : (
              <div
                data-theme="dark"
                data-sq="panel"
                data-sq-border="solid"
                style={{ '--sq-stroke': 'rgba(255, 255, 255, 0.12)' } as React.CSSProperties}
                className="p-6 bg-[#18181B] min-h-[380px] flex flex-col justify-center"
              >
                <KineticEmptyStateMotion motionKey="tv-calm">
                  <EmptyState
                    variant="compact"
                    tone="positive"
                    icon={<Clock size={20} />}
                    title="Salle d'attente calme"
                    description="Aucun patient en cours d'examen. Les prochains numéros seront appelés dès disponibilité des cabinets."
                  />
                </KineticEmptyStateMotion>
              </div>
            )}
          </div>

          {/* Cabinets Status Strip */}
          <div className="mt-6">
            <span className="t-small text-white/60 font-semibold block mb-3">
              État d'Occupation des Cabinets Médicaux
            </span>
            <div className="grid grid-cols-4 gap-3">
              {practitioners.slice(0, 4).map((doc) => {
                const isDocActive = activeInRoom.some((c) => c.staffId === doc.id);
                return (
                  <div
                    key={doc.id}
                    data-sq="card"
                    data-sq-border="solid"
                    style={{ '--sq-stroke': 'rgba(255, 255, 255, 0.12)' } as React.CSSProperties}
                    className="p-4 bg-white/5 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="t-small tabular-nums font-semibold text-white/80">{doc.roomNumber}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isDocActive ? 'bg-amber-400 animate-ping' : doc.isAvailable ? 'bg-emerald-400' : 'bg-neutral-600'
                        }`}
                      />
                    </div>
                    <div className="t-small font-semibold text-white truncate">{doc.fullName}</div>
                    <span className="t-cap text-white/60 truncate">{doc.specialty}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Next Tickets Queue */}
        <div
          data-sq="panel"
          data-sq-border="solid"
          style={{ '--sq-stroke': 'rgba(255, 255, 255, 0.12)' } as React.CSSProperties}
          className="col-span-5 flex flex-col justify-between bg-[#141416] p-6"
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <div
                  data-sq="ctl-sm"
                  data-sq-border="none"
                  className="w-8 h-8 bg-[#d4522f]/20 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold"
                >
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="t-card font-semibold text-white">Prochains sur la Liste</h3>
                  <span className="t-cap text-white/60">Ordre d'Appel Estimé</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full t-small tabular-nums font-semibold bg-white/10 text-white">
                {waitingQueue.length} en attente
              </span>
            </div>

            {/* Waiting List Cards */}
            <div className="space-y-3">
              {waitingQueue.slice(0, 5).map((patient, idx) => (
                <div
                  key={patient.id}
                  data-sq="card"
                  data-sq-border="solid"
                  style={{ '--sq-stroke': 'rgba(255, 255, 255, 0.12)' } as React.CSSProperties}
                  className="p-4 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div
                      data-sq="tile"
                      data-sq-border="none"
                      className="w-10 h-10 bg-white/10 flex items-center justify-center tabular-nums font-semibold text-white t-label"
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="t-card tabular-nums font-semibold text-white">
                          {patient.ticketNumber || `T-${105 + idx}`}
                        </span>
                        {patient.urgencyLevel === 'Urgence' && (
                          <span className="px-2 py-1 rounded-full t-small font-semibold bg-red-500/20 text-red-400">
                            Urgence
                          </span>
                        )}
                      </div>
                      <div className="t-small text-white/70 font-medium">{patient.patientName}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="t-small font-semibold text-[#14B8A6] block">
                      {patient.doctorSpecialty || 'Médecine Générale'}
                    </span>
                    <span className="t-cap text-white/60 tabular-nums">
                      {patient.cabinetRoom || 'En attente tri'}
                    </span>
                  </div>
                </div>
              ))}

              {waitingQueue.length === 0 && (
                <div data-theme="dark">
                  <KineticEmptyStateMotion motionKey="tv-queue-empty">
                    <EmptyState
                      variant="compact"
                      tone="neutral"
                      icon={<Clock size={20} />}
                      title="File d'attente vide"
                      description="Aucun patient en file d'attente immédiate."
                    />
                  </KineticEmptyStateMotion>
                </div>
              )}
            </div>
          </div>

          {/* Clinic Guidelines & Protocol Banner */}
          <div
            data-sq="card"
            data-sq-border="solid"
            style={{ '--sq-stroke': 'rgba(59, 130, 246, 0.25)' } as React.CSSProperties}
            className="p-4 bg-blue-500/10 text-blue-200 t-cap flex items-start gap-3 mt-4"
          >
            <AlertCircle size={18} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Consignes aux Patients</span>
              <p className="t-cap text-blue-300/80 leading-relaxed">
                Prière de préparer votre <strong>carte Chifa</strong> et vos ordonnances antérieures avant d'entrer en cabinet.
                Les enfants en bas âge et urgences prioritaires bénéficient d'un accès accéléré.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Ticker Marquee */}
      <div className="h-10 bg-[#0D9488]/15 border-t border-[#0D9488]/30 px-8 flex items-center justify-between t-small text-[#14B8A6] font-medium shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#14B8A6]" />
          <span>Informations Polyclinique:</span>
        </div>
        <div className="truncate text-white/80 t-cap tabular-nums px-4">
          Permanence médicale assurée 7j/7 · Laboratoire d'analyses et Imagerie ouverts jusqu'à 18h00 · Télétransmission Chifa instantanée · Conventionné CNAS & CASNOS
        </div>
        <div className="text-white/60 t-cap tabular-nums shrink-0">
          Urgences Médicales: 023 45 67 00
        </div>
      </div>
      </div>
    </KineticModalShell>
  );
};
