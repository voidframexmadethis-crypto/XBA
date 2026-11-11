'use client';

import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Globe, Lock, Play } from 'lucide-react';

const LOCATIONS = [
  { id: 'USA_40S', name: 'Knights Arena', country: 'New York (1940s)', creditsReq: 0, img: 'https://picsum.photos/seed/vintagehoops/800/600', era: 'vintage', team: 'NY Knights', color: '#1d4ed8', logo: '🏛️' },
  { id: 'UK_70S', name: 'Titans Court', country: 'London (1970s)', creditsReq: 500, img: 'https://picsum.photos/seed/retrohoops/800/600', era: 'retro', team: 'London Titans', color: '#dc2626', logo: '🛡️' },
  { id: 'JPN_MOD', name: 'Shibuya Dome', country: 'Tokyo (Modern)', creditsReq: 1500, img: 'https://picsum.photos/seed/modernhoops/800/600', era: 'modern', team: 'Tokyo Ronin', color: '#10b981', logo: '⚔️' },
  { id: 'BRA_FUTURE', name: 'Rio Skycourt', country: 'Rio (Future)', creditsReq: 3000, img: 'https://picsum.photos/seed/futuristic/800/600', era: 'futuristic', team: 'Rio Raptors', color: '#f59e0b', logo: '🦖' },
  { id: 'EGY_XBA', name: 'Cairo Citadel', country: 'Cairo (Elite)', creditsReq: 5000, img: 'https://picsum.photos/seed/elitehoops/800/600', era: 'elite', team: 'Cairo Pharaohs', color: '#8b5cf6', logo: '👑' },
  { id: 'AUS_MOD', name: 'Outback Arena', country: 'Sydney (Modern)', creditsReq: 8000, img: 'https://picsum.photos/seed/australia/800/600', era: 'modern', team: 'Sydney Sharks', color: '#06b6d4', logo: '🦈' },
];

interface WorldTourProps {
  currentCredits: number;
  onSelect: (location: any) => void;
  onClose: () => void;
}

export default function WorldTour({ currentCredits, onSelect, onClose }: WorldTourProps) {
  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col p-6 md:p-12 overflow-y-auto selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
               <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                  <Globe size={24} className="text-white" />
               </div>
               <span className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px]">XBA Global Operations</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter leading-none">Choose Your Tour</h1>
            <p className="text-zinc-500 font-medium mt-4 max-w-xl">From the historic arenas of the 1940s to the elite skycourts of the future. Build your legacy globally.</p>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-3xl flex flex-col items-center">
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Available Credits</div>
                <div className="text-3xl font-mono font-black text-blue-400">{currentCredits.toLocaleString()}</div>
             </div>
             <button 
               onClick={onClose}
               className="p-6 bg-white/5 text-white rounded-3xl font-black uppercase italic tracking-widest hover:bg-white/10 transition-all border border-white/10"
             >
               Return
             </button>
          </div>
        </div>

        {/* Visual Map Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
          
          {LOCATIONS.map((loc, idx) => {
            const isLocked = currentCredits < loc.creditsReq;
            return (
              <motion.div
                key={loc.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1, type: 'spring', damping: 20 }}
                className={`group relative h-[450px] rounded-[40px] overflow-hidden border-2 transition-all duration-500 ${isLocked ? 'border-white/5 opacity-40' : 'border-white/10 hover:border-blue-500/50 cursor-pointer hover:shadow-[0_0_50px_rgba(59,130,246,0.2)]'}`}
                onClick={() => !isLocked && onSelect(loc)}
              >
                <img src={loc.img} alt={loc.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                
                {/* Status Badge */}
                <div className="absolute top-8 left-8">
                   <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${isLocked ? 'bg-black/50 border-white/10 text-zinc-500' : 'bg-blue-600/80 border-white/20 text-white'}`}>
                      {isLocked ? 'Locked' : 'Unlocked'}
                   </div>
                </div>

                <div className="absolute bottom-0 left-0 p-10 w-full">
                  <div className="flex items-center gap-2 text-blue-400 mb-2 font-black text-xs uppercase tracking-widest italic">
                    <MapPin size={14} /> {loc.country}
                  </div>
                  <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none mb-6">{loc.name}</h3>
                  
                  {isLocked ? (
                    <div className="flex flex-col gap-4">
                       <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600" style={{ width: `${(currentCredits / loc.creditsReq) * 100}%` }} />
                       </div>
                       <div className="flex items-center gap-2 text-zinc-400 font-black uppercase text-[10px] tracking-widest">
                          <Lock size={14} />
                          <span>Needs {loc.creditsReq.toLocaleString()} Credits</span>
                       </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                       <div className="bg-white text-black px-8 py-3 rounded-2xl font-black uppercase italic tracking-widest text-xs flex items-center gap-2 group-hover:bg-blue-500 group-hover:text-white transition-all">
                          Enter Court <Play size={14} className="fill-current" />
                       </div>
                       <div className="text-zinc-500 font-black uppercase text-[10px] tracking-[0.2em]">{loc.era} Era</div>
                    </div>
                  )}
                </div>

                {/* Animated Selection Effect */}
                {!isLocked && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <div className="w-20 h-24 border-2 border-white/20 rounded-full animate-ping" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
