import logo from '../../assets/logo.png';
import { motion } from 'motion/react';

interface LobbyProps {
  roomName: string;
  participantCount: number;
  onEnter: () => void;
}

export function Lobby({ roomName, participantCount, onEnter }: LobbyProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white p-10 rounded-[2rem] shadow-2xl shadow-[#c7c1b8]/30 w-full max-w-sm border border-[#E5E1DA] text-center"
    >
      <img src={logo} alt="SIRIKWA" className="h-16 mx-auto mb-6" />
      <h2 className="text-2xl font-bold mb-2 tracking-tight">{roomName}</h2>
      <p className="text-[#8B7E74] mb-8">{participantCount} participants currently active</p>
      
      <button
        onClick={onEnter}
        className="w-full text-sm font-semibold text-white bg-[#1D4ED8] px-5 py-4 rounded-full hover:bg-[#1e40af] transition shadow-lg shadow-[#1D4ED8]/20"
      >
        Enter Lobby
      </button>
    </motion.div>
  );
}
