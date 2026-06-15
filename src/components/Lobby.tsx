import logo from '../../assets/logo.png';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';

interface LobbyProps {
  roomName: string;
  participantCount: number;
  onEnter: () => void;
}

export function Lobby({ roomName, participantCount, onEnter }: LobbyProps) {
  const [quality, setQuality] = useState<'Excellent' | 'Good' | 'Fair'>('Excellent');

  useEffect(() => {
    const interval = setInterval(() => {
      const rand = Math.random();
      if (rand > 0.8) setQuality('Fair');
      else if (rand > 0.5) setQuality('Good');
      else setQuality('Excellent');
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const getQualityColor = () => {
    switch (quality) {
      case 'Fair': return 'bg-amber-500';
      case 'Good': return 'bg-lime-500';
      default: return 'bg-emerald-500';
    }
  };

  const getQualityPing = () => {
    switch (quality) {
      case 'Fair': return 'bg-amber-400';
      case 'Good': return 'bg-lime-400';
      default: return 'bg-emerald-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gradient-to-br from-rose-500/95 via-red-600/95 to-rose-800/95 backdrop-blur-md p-10 rounded-[2rem] shadow-2xl shadow-rose-500/40 w-full max-w-sm border border-rose-400/50 text-center relative text-white"
    >
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <span className="text-[10px] font-bold text-rose-100 uppercase tracking-wider">{quality}</span>
        <span className="relative flex h-2.5 w-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${getQualityPing()} opacity-75`}></span>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${getQualityColor()}`}></span>
        </span>
      </div>

      <div className="bg-white/20 p-3 rounded-2xl inline-block mb-6 shadow-sm border border-white/20">
        <img src={logo} alt="SIRIKWA" className="h-16 mx-auto animate-dance origin-bottom drop-shadow-md filter brightness-0 invert" />
      </div>
      <h2 className="text-2xl font-bold mb-2 tracking-tight text-white">{roomName}</h2>
      <p className="text-rose-100 mb-8 font-medium">{participantCount} participants currently active</p>
      
      <button
        onClick={onEnter}
        className="w-full text-sm font-semibold text-rose-900 bg-white px-5 py-4 rounded-full hover:bg-rose-50 transition shadow-lg shadow-white/20"
      >
        Enter Lobby
      </button>
    </motion.div>
  );
}
