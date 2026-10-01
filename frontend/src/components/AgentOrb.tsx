// AgentOrb.tsx — Large animated AI Agent Orb with status & micro-actions
import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, Check, Sparkles } from 'lucide-react';

interface AgentOrbProps {
  onCheckNow: () => Promise<void>;
  lastCheckedTime?: string;
  isChecking?: boolean;
  activeCount: number;
}

export default function AgentOrb({
  onCheckNow,
  lastCheckedTime,
  isChecking: externalChecking = false,
  activeCount,
}: AgentOrbProps) {
  const [checking, setChecking] = useState(false);
  const [justChecked, setJustChecked] = useState(false);
  const [secondsUntilNext, setSecondsUntilNext] = useState(42);

  // Simulated scan countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilNext((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheck = async () => {
    if (checking || externalChecking) return;
    setChecking(true);
    try {
      await onCheckNow();
      setJustChecked(true);
      setSecondsUntilNext(60);
      setTimeout(() => setJustChecked(false), 3000);
    } finally {
      setChecking(false);
    }
  };

  const isBusy = checking || externalChecking;
  const formattedCountdown = `00:${secondsUntilNext.toString().padStart(2, '0')}`;

  return (
    <div className="relative flex flex-col items-center justify-center p-6 panel overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Animated Orb Structure */}
      <div className="relative w-36 h-36 flex items-center justify-center mb-4">
        {/* Outer glowing ring 1 */}
        <div
          className={`absolute inset-0 rounded-full border border-purple-500/20 transition-all duration-1000 ${
            isBusy ? 'animate-spin scale-110 border-purple-500/50' : 'animate-pulse'
          }`}
          style={{ animationDuration: isBusy ? '2s' : '4s' }}
        />

        {/* Outer counter-rotating ring 2 */}
        <div
          className="absolute inset-2 rounded-full border border-dashed border-cyan-500/20 animate-spin"
          style={{ animationDuration: '16s' }}
        />

        {/* Core Glowing Orb */}
        <div
          className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-500 ${
            isBusy
              ? 'bg-gradient-to-tr from-purple-700 via-indigo-600 to-cyan-500 shadow-[0_0_40px_rgba(124,58,237,0.7)] scale-105'
              : 'bg-gradient-to-tr from-[#16122C] via-[#1F193D] to-[#121B2A] border border-purple-500/30 shadow-[0_0_30px_rgba(124,58,237,0.35)]'
          }`}
        >
          {/* Inner spark icon or pulsing dot */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="live-dot" />
            <span className="text-[10px] font-bold tracking-widest text-emerald-300 uppercase">
              {isBusy ? 'SYNCING' : 'ACTIVE'}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-white tracking-wider">
            AGENT
          </span>
          <span className="text-[9px] text-purple-300/80 font-mono mt-0.5">
            ONLINE
          </span>
        </div>
      </div>

      {/* Status & Next Scan Countdown */}
      <div className="text-center mb-3">
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <span>Next scan in</span>
          <span className="font-mono text-cyan-400 font-semibold">{formattedCountdown}</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {activeCount} {activeCount === 1 ? 'task' : 'tasks'} scheduled autonomously
        </p>
      </div>

      {/* Interactive [ CHECK NOW ] micro-action button */}
      <button
        onClick={handleCheck}
        disabled={isBusy}
        className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
          justChecked
            ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300'
            : isBusy
            ? 'bg-purple-900/40 border border-purple-500/30 text-purple-300 cursor-wait'
            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/25 border border-purple-400/30'
        }`}
      >
        {isBusy ? (
          <>
            <RefreshCw size={13} className="animate-spin text-purple-300" />
            <span>Agent Inspecting Price...</span>
          </>
        ) : justChecked ? (
          <>
            <Check size={14} className="text-emerald-400" />
            <span>Verified Just Now</span>
          </>
        ) : (
          <>
            <Sparkles size={13} className="text-purple-200" />
            <span>CHECK NOW</span>
          </>
        )}
      </button>
    </div>
  );
}
