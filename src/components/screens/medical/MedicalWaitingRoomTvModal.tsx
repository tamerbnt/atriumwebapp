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
import { AtriumButton } from '../../ui/AtriumButton';

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
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    if (currentCall && currentCall.ticketNumber && currentCall.ticketNumber !== lastCalledTicket) {
      setLastCalledTicket(currentCall.ticketNumber);
      setIsFlashing(true);
      if (audioEnabled) {
        playChimeTone();
      }
      const flashTimer = setTimeout(() => setIsFlashing(false), 4000);
      return () => clearTimeout(flashTimer);
    }
  }, [currentCall?.ticketNumber, audioEnabled, lastCalledTicket]);

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

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#0C0C0E] text-white flex flex-col font-sans select-none overflow-hidden animate-in fade-in duration-300"
    >
      {/* Top TV Header Bar */}
      <div className="h-20 bg-[#141416] border-b border-white/10 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/20 border border-[#0D9488]/30 flex items-center justify-center text-[#14B8A6]">
            <Activity size={26} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-wide uppercase text-white">
                Centre Médical El-Chifa
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#0D9488]/20 text-[#14B8A6] border border-[#0D9488]/40">
                Écran Salle d'Attente
              </span>
            </div>
            <p className="text-xs text-white/50 tracking-wider">
              Système Numérique d'Appel des Patients · Polyclinique & Soins Ambulatoires
            </p>
          </div>
        </div>

        {/* Center Live Clock */}
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10">
          <Clock size={20} className="text-[#C4785A]" />
          <div className="text-2xl font-mono font-bold tracking-wider tabular-nums text-white">
            {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <span className="text-xs text-white/50 uppercase tracking-widest pl-2 border-l border-white/10">
            {currentTime.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>

        {/* Right TV Controls */}
        <div className="flex items-center gap-3">
          {!audioEnabled ? (
            <button
              onClick={handleEnableAudio}
              className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm animate-bounce"
            >
              <VolumeX size={16} />
              <span>Activer le Son du Carillon</span>
            </button>
          ) : (
            <button
              onClick={() => {
                playChimeTone();
              }}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-emerald-400 hover:bg-white/10 text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors"
              title="Tester le carillon"
            >
              <Volume2 size={16} />
              <span>Son Actif</span>
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Plein Écran"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
            title="Quitter le mode TV"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Dual Stage TV Layout */}
      <div className="flex-1 grid grid-cols-12 gap-8 p-8 overflow-hidden">
        {/* Left 7 Columns: Currently Called Ticket & Cabinet */}
        <div className="col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#14B8A6] font-semibold mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6] animate-ping" />
              <span>Patient Actuellement Appelé</span>
            </div>

            {currentCall ? (
              <div
                className={`rounded-[32px] p-8 border transition-all duration-500 flex flex-col justify-between min-h-[380px] shadow-2xl relative overflow-hidden ${
                  isFlashing
                    ? 'bg-gradient-to-br from-[#0D9488]/30 via-[#141416] to-[#C4785A]/20 border-[#14B8A6] ring-4 ring-[#14B8A6]/40 scale-[1.01]'
                    : 'bg-[#18181B] border-white/10'
                }`}
              >
                {/* Background ambient watermark */}
                <div className="absolute right-[-20px] bottom-[-20px] opacity-5 pointer-events-none text-white">
                  <Activity size={260} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-white/10 text-white/70 font-mono">
                      Numéro d'Ordre d'Arrivée
                    </span>
                    <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Consultation en cours
                    </span>
                  </div>

                  {/* Gigantic Ticket ID */}
                  <div className="text-7xl font-mono font-extrabold tracking-tight text-white mb-4">
                    {currentCall.ticketNumber || 'T-101'}
                  </div>

                  {/* Patient Initials / Name Display */}
                  <div className="text-3xl font-bold text-white/90 tracking-tight">
                    {currentCall.patientName}
                  </div>
                  <p className="text-sm text-white/50 mt-1">
                    Âge: {currentCall.patientAge || '—'} ans · Code Acte: {currentCall.ngapCode || 'CS'}
                  </p>
                </div>

                {/* Cabinet & Doctor Destination Banner */}
                <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between backdrop-blur-md">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-[#C4785A] font-semibold block mb-1">
                      Veuillez vous présenter au
                    </span>
                    <div className="text-3xl font-black text-white tracking-wide">
                      {currentCall.cabinetRoom || 'Cabinet 1'}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <ArrowRight size={32} className="text-[#C4785A] animate-pulse" />
                    <div>
                      <span className="text-xs text-white/40 uppercase tracking-wider block">Médecin Praticien</span>
                      <div className="text-xl font-bold text-white">
                        {currentCall.doctorName || 'Dr. Amine Benali'}
                      </div>
                      <span className="text-xs text-[#14B8A6] font-medium">
                        {currentCall.doctorSpecialty || 'Médecine Spécialisée'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[32px] p-12 bg-[#18181B] border border-white/10 min-h-[380px] flex flex-col items-center justify-center text-center">
                <Clock size={48} className="text-white/20 mb-4 animate-spin" />
                <h3 className="text-xl font-semibold text-white/70">Salle d'attente calme</h3>
                <p className="text-sm text-white/40 mt-1 max-w-md">
                  Aucun patient en cours d'examen. Les prochains numéros seront appelés dès disponibilité des cabinets.
                </p>
              </div>
            )}
          </div>

          {/* Cabinets Status Strip */}
          <div className="mt-6">
            <span className="text-xs uppercase tracking-widest text-white/40 font-semibold block mb-3">
              État d'Occupation des Cabinets Médicaux
            </span>
            <div className="grid grid-cols-4 gap-3">
              {practitioners.slice(0, 4).map((doc) => {
                const isDocActive = activeInRoom.some((c) => c.staffId === doc.id);
                return (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-white/80">{doc.roomNumber}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isDocActive ? 'bg-amber-400 animate-ping' : doc.isAvailable ? 'bg-emerald-400' : 'bg-neutral-600'
                        }`}
                      />
                    </div>
                    <div className="text-xs font-bold text-white truncate">{doc.fullName}</div>
                    <span className="text-[10px] text-white/40 truncate">{doc.specialty}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Next Tickets Queue */}
        <div className="col-span-5 flex flex-col justify-between bg-[#141416] rounded-[32px] p-6 border border-white/10">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C4785A]/20 text-[#C4785A] flex items-center justify-center font-bold">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Prochains sur la Liste</h3>
                  <span className="text-xs text-white/40">Ordre d'Appel Estimé</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-white">
                {waitingQueue.length} en attente
              </span>
            </div>

            {/* Waiting List Cards */}
            <div className="space-y-3">
              {waitingQueue.slice(0, 5).map((patient, idx) => (
                <div
                  key={patient.id}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-mono font-bold text-white text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-mono font-bold text-white">
                          {patient.ticketNumber || `T-${105 + idx}`}
                        </span>
                        {patient.urgencyLevel === 'Urgence' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                            Urgence
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/70 font-medium">{patient.patientName}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold text-[#14B8A6] block">
                      {patient.doctorSpecialty || 'Médecine Générale'}
                    </span>
                    <span className="text-[11px] text-white/40 font-mono">
                      {patient.cabinetRoom || 'En attente tri'}
                    </span>
                  </div>
                </div>
              ))}

              {waitingQueue.length === 0 && (
                <div className="py-12 text-center text-white/30 text-xs">
                  Aucun patient en file d'attente immédiate.
                </div>
              )}
            </div>
          </div>

          {/* Clinic Guidelines & Protocol Banner */}
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs flex items-start gap-3 mt-4">
            <AlertCircle size={18} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Consignes aux Patients</span>
              <p className="text-[11px] text-blue-300/80 leading-relaxed">
                Prière de préparer votre <strong>carte Chifa</strong> et vos ordonnances antérieures avant d'entrer en cabinet.
                Les enfants en bas âge et urgences prioritaires bénéficient d'un accès accéléré.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Ticker Marquee */}
      <div className="h-10 bg-[#0D9488]/15 border-t border-[#0D9488]/30 px-8 flex items-center justify-between text-xs text-[#14B8A6] font-medium shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#14B8A6]" />
          <span>Informations Polyclinique:</span>
        </div>
        <div className="truncate text-white/80 text-[11px] font-mono px-4">
          Permanence médicale assurée 7j/7 · Laboratoire d'analyses et Imagerie ouverts jusqu'à 18h00 · Télétransmission Chifa instantanée · Conventionné CNAS & CASNOS
        </div>
        <div className="text-white/40 text-[11px] font-mono shrink-0">
          Urgences Médicales: 023 45 67 00
        </div>
      </div>
    </div>
  );
};
