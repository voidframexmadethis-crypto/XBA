'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, User, History, CheckCircle2, XCircle, MapPin } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface MatchResult {
  id: string;
  userId: string;
  opponentName: string;
  myScore: number;
  opponentScore: number;
  win: boolean;
  locationId: string;
  timestamp: string;
}

export default function MatchHistory({ uid }: { uid: string }) {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Filter by current user
    const q = query(
      collection(db, 'results'),
      where('userId', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchResult));
      setResults(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [uid]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Recent';
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl h-full flex flex-col">
      <div className="p-6 border-b border-white/5 bg-slate-950/50 flex items-center justify-between">
        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
          <History className="text-blue-500" size={24} /> Match History
        </h2>
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recent Performance</div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="py-20 text-center text-zinc-600 font-bold uppercase animate-pulse">Accessing Archive...</div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl p-8">
            <History size={48} className="text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-600 font-bold uppercase text-sm">No match history found.</p>
            <p className="text-zinc-700 text-[10px] mt-2 font-black uppercase tracking-widest leading-relaxed">
              Step onto the court and complete a match to start your professional record.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {results.map((result, idx) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`p-5 rounded-2xl border ${result.win ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'} transition-all`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <Calendar size={12} className="text-zinc-600" /> {formatDate(result.timestamp)}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <MapPin size={12} className="text-zinc-600" /> {result.locationId?.split('_')[0] || 'Unknown'}
                  </div>
                  {result.win ? (
                    <div className="flex items-center gap-1.5 text-green-400 font-black text-[10px] uppercase tracking-widest">
                      <CheckCircle2 size={14} /> Victory
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-400 font-black text-[10px] uppercase tracking-widest">
                      <XCircle size={14} /> Defeat
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="text-center flex-1">
                    <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">YOU</div>
                    <div className="text-2xl font-mono font-black text-white">{result.myScore}</div>
                  </div>
                  
                  <div className="px-4 text-zinc-700 font-black italic">VS</div>

                  <div className="text-center flex-1">
                    <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 truncate max-w-[80px] mx-auto">
                      {result.opponentName || 'OPPONENT'}
                    </div>
                    <div className="text-2xl font-mono font-black text-white">{result.opponentScore}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
