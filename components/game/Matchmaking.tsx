'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Play, Loader2, Globe, Plus, LogIn } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface Match {
  id: string;
  status: string;
  locationId: string;
  players: Record<string, any>;
  createdAt: string;
}

interface MatchmakingProps {
  uid: string;
  displayName: string;
  location: any;
  onJoin: (matchId: string, isHost: boolean) => void;
  onClose: () => void;
}

export default function Matchmaking({ uid, displayName, location, onJoin, onClose }: MatchmakingProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'matches'), where('status', '==', 'playing'), where('locationId', '==', location.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [location.id]);

  const createMatch = async () => {
    setIsCreating(true);
    try {
      const matchData = {
        status: 'playing',
        locationId: location.id,
        scoreA: 0,
        scoreB: 0,
        timeLeft: 5400,
        ball: { x: 1200, y: 400, z: 0, vx: 0, vy: 0, vz: 0 },
        players: {
          [uid]: { x: 400, y: 400, z: 0, displayName, team: 'A' }
        },
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'matches'), matchData);
      onJoin(docRef.id, true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const joinMatch = async (matchId: string) => {
    onJoin(matchId, false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[60] flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-white/10 rounded-[40px] max-w-2xl w-full overflow-hidden shadow-2xl"
      >
        <div className="p-10 border-b border-white/5 bg-slate-950/50 flex justify-between items-center">
          <div>
            <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
              <Globe className="text-blue-500" /> Matchmaking
            </h2>
            <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest mt-1">{location.name} • {location.country}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">Close</button>
        </div>

        <div className="p-10">
          <div className="flex gap-4 mb-10">
             <button
              onClick={createMatch}
              disabled={isCreating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-3xl font-black text-xl uppercase tracking-tighter flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="animate-spin" /> : <Plus size={24} />}
              Create New Match
            </button>
          </div>

          <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="text-xs font-black text-zinc-600 uppercase tracking-widest mb-4">Live Arenas</h3>
            {loading ? (
              <div className="py-10 text-center animate-pulse text-zinc-700 font-bold uppercase">Scanning global courts...</div>
            ) : matches.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl">
                <Users size={48} className="text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-600 font-bold">No active matches in this location.</p>
                <p className="text-zinc-700 text-xs mt-1 uppercase font-black">Be the first to start a game!</p>
              </div>
            ) : (
              matches.map((match) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                      <Users className="text-blue-400" size={24} />
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg uppercase italic">{Object.keys(match.players).length} Players Active</div>
                      <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Host: {Object.values(match.players)[0]?.displayName || 'Elite Athlete'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => joinMatch(match.id)}
                    className="bg-white text-black px-8 py-3 rounded-2xl font-black uppercase italic tracking-tighter hover:bg-zinc-200 transition-all flex items-center gap-2"
                  >
                    Join Court <LogIn size={18} />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
