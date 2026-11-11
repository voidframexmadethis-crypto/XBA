'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tv, Trophy } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import LocationSelector from './LocationSelector';

const TEAMS = [
  { id: 'NYK', name: 'Neo-York Knights', color: '#1e40af', school: 'XBA Academy' },
  { id: 'TKT', name: 'Tokyo Titans', color: '#991b1b', school: 'Neon Institute' },
  { id: 'LL', name: 'London Lions', color: '#374151', school: 'Royal Hoop Academy' },
  { id: 'RR', name: 'Rio Raptors', color: '#166534', school: 'Amazonia High' },
  { id: 'CC', name: 'Cairo Cobras', color: '#854d0e', school: 'Pyramid State' },
];

export default function DraftDay({ uid, displayName }: { uid: string, displayName: string }) {
  const [stage, setStage] = useState<'location' | 'intro' | 'broadcast' | 'reveal'>('location');
  const [selectedTeam, setSelectedTeam] = useState<typeof TEAMS[0] | null>(null);
  const [location, setLocation] = useState<any>(null);

  const startDraft = () => {
    setStage('broadcast');
    setTimeout(() => {
      const team = TEAMS[Math.floor(Math.random() * TEAMS.length)];
      setSelectedTeam(team);
      setStage('reveal');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 4000);
  };

  const completeDraft = async () => {
    if (selectedTeam && location) {
      const athleteRef = doc(db, 'athletes', uid);
      await setDoc(athleteRef, {
        id: uid,
        userId: uid,
        name: displayName,
        location,
        position: 'PG',
        heightCm: 190,
        weightKg: 85,
        wingspanCm: 200,
        appearance: {
          skinTone: '#8b5e3c',
          hairStyle: 'short',
          hairColor: '#171717',
          jerseyNumber: Math.floor(Math.random() * 99)
        },
        ratings: {
          shooting: 75, finishing: 75, passing: 75, dribbling: 75,
          defense: 75, rebounding: 75, speed: 75, stamina: 75
        }
      });

      await updateDoc(doc(db, 'users', uid), {
        currentTeam: selectedTeam.id,
        location
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 text-white overflow-hidden">
      <AnimatePresence mode="wait">
        {stage === 'location' && (
          <motion.div key="location" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <LocationSelector onSelect={(loc) => { setLocation(loc); setStage('intro'); }} />
          </motion.div>
        )}
        {stage === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center p-8 max-w-md"
          >
            <div className="mb-6 flex justify-center">
              <Tv size={64} className="text-blue-500 animate-pulse" />
            </div>
            <h1 className="text-4xl font-bold mb-4">DRAFT DAY</h1>
            <p className="text-zinc-400 mb-8">
              The world is watching, {displayName}. It&apos;s time to see where your XBA journey begins.
            </p>
            <button
              onClick={startDraft}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold text-xl transition-transform hover:scale-105 active:scale-95"
            >
              Enter the Draft
            </button>
          </motion.div>
        )}

        {stage === 'broadcast' && (
          <motion.div
            key="broadcast"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full relative flex flex-col items-center justify-center"
          >
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_20%,black_100%)] z-10 opacity-50" />
            <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 z-10" />
            
            <div className="relative z-20 text-center">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 0.2, repeat: Infinity }}
                className="inline-block mb-4"
              >
                <div className="bg-red-600 px-4 py-1 rounded text-sm font-black italic">LIVE: XBA DRAFT</div>
              </motion.div>
              <h2 className="text-2xl font-mono text-blue-400 mb-2">SCANNING PROSPECTS...</h2>
              <div className="flex gap-2 justify-center mb-8">
                {TEAMS.map((t, i) => (
                  <motion.div
                    key={t.id}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -10, 0] }}
                    transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                    className="w-12 h-12 rounded-lg"
                    style={{ backgroundColor: t.color }}
                  />
                ))}
              </div>
              <div className="text-4xl font-black tracking-tighter uppercase">
                Searching for the next star...
              </div>
            </div>

            <div className="absolute bottom-0 w-full bg-blue-900/50 backdrop-blur-sm h-12 flex items-center overflow-hidden whitespace-nowrap border-t border-blue-500/30">
              <motion.div
                animate={{ x: [1000, -2000] }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                className="text-sm font-bold uppercase"
              >
                XBA ACADEMY REPORTS HIGH TURNOUT • SCOUTS SPOTTED IN LONDON • NEW YORK KNIGHTS LOOKING FOR A POINT GUARD • {displayName} IS THE TALK OF THE LEAGUE • DRAFT DAY IS HERE!
              </motion.div>
            </div>
          </motion.div>
        )}

        {stage === 'reveal' && selectedTeam && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-8 flex flex-col items-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 100, delay: 0.5 }}
              className="w-48 h-48 rounded-3xl mb-8 flex items-center justify-center shadow-2xl shadow-blue-500/20 border-4 border-white/10"
              style={{ backgroundColor: selectedTeam.color }}
            >
              <Trophy size={96} className="text-white" />
            </motion.div>
            
            <h3 className="text-zinc-400 uppercase tracking-widest mb-2 font-bold">With the 1st overall pick...</h3>
            <h1 className="text-5xl font-black mb-4 uppercase italic">
              {selectedTeam.name}
            </h1>
            <p className="text-xl text-zinc-300 mb-12">
              Select {displayName} from <span className="text-blue-400 font-bold">{selectedTeam.school}</span>!
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={completeDraft}
              className="bg-white text-black px-12 py-4 rounded-full font-black text-2xl uppercase tracking-tighter shadow-xl shadow-white/10"
            >
              Signing the Contract
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
