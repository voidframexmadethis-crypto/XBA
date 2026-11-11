'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, User, Crown, Percent, Target, Zap, Hash, History, Star } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';

interface LeaderboardEntry {
  uid: string;
  displayName: string;
  avatarUrl?: string | null;
  team?: string;
  points: number;
  wins: number;
  losses: number;
  winPercentage: number;
  matchesPlayed: number;
  updatedAt?: string;
}

const TEAMS: Record<string, { name: string, color: string, logo: string }> = {
  'NYK': { name: 'NY Knights', color: '#1e40af', logo: '🏛️' },
  'TKT': { name: 'Tokyo Titans', color: '#991b1b', logo: '🛡️' },
  'LL': { name: 'London Lions', color: '#374151', logo: '🦁' },
  'RR': { name: 'Rio Raptors', color: '#166534', logo: '🦖' },
  'CC': { name: 'Cairo Cobras', color: '#854d0e', logo: '👑' },
};

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

type TabType = 'overall' | 'wins' | 'scoring' | 'recent';

export default function Leaderboard({ fullScreen = false }: { fullScreen?: boolean }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [recentMatches, setRecentMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overall');
  const [locationFilter, setLocationFilter] = useState<string>('Global');

  const handleTabChange = (tab: TabType) => {
    setLoading(true);
    setActiveTab(tab);
  };

  useEffect(() => {
    let q;
    
    if (activeTab === 'recent') {
      q = query(collection(db, 'results'), orderBy('timestamp', 'desc'), limit(20));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchResult));
        setRecentMatches(data);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      const sortField = activeTab === 'wins' ? 'wins' : 'points';
      
      // Apply location filter if not 'Global'
      if (locationFilter !== 'Global') {
         q = query(collection(db, 'leaderboard'), where('location.country', '==', locationFilter), orderBy(sortField, 'desc'), limit(25));
      } else {
         q = query(collection(db, 'leaderboard'), orderBy(sortField, 'desc'), limit(25));
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as LeaderboardEntry);
        setEntries(data);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [activeTab, locationFilter]);

  const tabs: { id: TabType, label: string, icon: any }[] = [
    { id: 'overall', label: 'Overall', icon: Trophy },
    { id: 'wins', label: 'Most Wins', icon: Zap },
    { id: 'scoring', label: 'Scoring', icon: Target },
    { id: 'recent', label: 'Recent', icon: History },
  ];

  return (
    <div className={`bg-slate-950/80 backdrop-blur-2xl rounded-[32px] border border-white/10 overflow-hidden shadow-2xl flex flex-col ${fullScreen ? 'h-full' : 'max-h-[800px]'}`}>
      {/* Header */}
      <div className="p-8 border-b border-white/5 bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
            <Trophy className="text-yellow-500" size={32} /> XBA Global Rankings
          </h2>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1 ml-11">Season 1: Origin of Legends</p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase italic tracking-wider transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <tab.icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
          
          {/* Location Filter Placeholder */}
          <div className="bg-black/40 p-1.5 rounded-2xl border border-white/5 flex items-center px-4 text-zinc-500 text-xs font-black uppercase tracking-widest italic">
            Global
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-zinc-500 font-black uppercase italic tracking-widest text-xs animate-pulse">Syncing League Archive...</div>
          </div>
        ) : (
          <div className="p-4">
            {activeTab === 'recent' ? (
              <div className="space-y-3">
                {recentMatches.length === 0 ? (
                  <div className="py-20 text-center text-zinc-600 font-bold uppercase italic">No records in the vault.</div>
                ) : (
                  recentMatches.map((match, idx) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="grid grid-cols-12 items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                    >
                      <div className="col-span-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <History size={12} /> {new Date(match.timestamp).toLocaleDateString()}
                      </div>
                      <div className="col-span-6 flex items-center justify-center gap-4">
                        <div className="text-right flex-1">
                          <div className="text-[9px] text-zinc-500 font-bold uppercase">Player</div>
                          <div className="text-sm font-black text-white">YOU</div>
                        </div>
                        <div className="bg-black/40 px-4 py-1.5 rounded-lg border border-white/10 flex items-center gap-3">
                           <span className={`text-xl font-mono font-black ${match.myScore > match.opponentScore ? 'text-green-500' : 'text-white'}`}>{match.myScore}</span>
                           <span className="text-zinc-700 font-black italic">VS</span>
                           <span className={`text-xl font-mono font-black ${match.opponentScore > match.myScore ? 'text-green-500' : 'text-white'}`}>{match.opponentScore}</span>
                        </div>
                        <div className="text-left flex-1">
                          <div className="text-[9px] text-zinc-500 font-bold uppercase truncate max-w-[80px]">Opponent</div>
                          <div className="text-sm font-black text-white truncate max-w-[80px]">{match.opponentName}</div>
                        </div>
                      </div>
                      <div className="col-span-3 text-right">
                        <div className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${match.win ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {match.win ? 'Victory' : 'Defeat'}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 border-b border-white/5">
                  <div className="col-span-1 text-center">RK</div>
                  <div className="col-span-4 ml-4">Athlete</div>
                  <div className="col-span-1 text-center">GP</div>
                  <div className="col-span-2 text-center">W-L</div>
                  <div className="col-span-2 text-center">WIN%</div>
                  <div className="col-span-2 text-right">PTS</div>
                </div>

                {entries.length === 0 ? (
                   <div className="py-20 text-center text-zinc-600 font-bold uppercase italic">Scouts are still looking for talent.</div>
                ) : (
                  entries.map((entry, idx) => {
                    const teamInfo = TEAMS[entry.team || 'NYK'] || TEAMS['NYK'];
                    return (
                      <motion.div
                        key={entry.uid}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`grid grid-cols-12 items-center gap-4 px-6 py-4 rounded-2xl border transition-all ${idx === 0 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                      >
                        <div className="col-span-1 text-center">
                          {idx === 0 ? (
                            <div className="flex flex-col items-center">
                              <Crown className="text-yellow-500" size={18} />
                              <span className="text-[10px] font-black text-yellow-500">1ST</span>
                            </div>
                          ) : (
                            <span className="text-lg font-black italic text-zinc-600">#{idx + 1}</span>
                          )}
                        </div>
                        
                        <div className="col-span-4 flex items-center gap-4">
                          <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-white/10 overflow-hidden flex items-center justify-center">
                              {entry.avatarUrl ? (
                                <img src={entry.avatarUrl} className="w-full h-full object-cover" alt={entry.displayName} />
                              ) : (
                                <User className="text-zinc-600" size={24} />
                              )}
                            </div>
                            <div 
                              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] shadow-lg"
                              style={{ backgroundColor: teamInfo.color }}
                              title={teamInfo.name}
                            >
                               {teamInfo.logo}
                            </div>
                          </div>
                          <div className="truncate">
                            <div className="text-white font-black text-base tracking-tight uppercase italic truncate">{entry.displayName}</div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: teamInfo.color }}>{teamInfo.name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-1 text-center font-mono text-sm font-bold text-zinc-400">
                          {entry.matchesPlayed || 0}
                        </div>

                        <div className="col-span-2 text-center">
                           <div className="font-mono text-sm font-black text-white">{entry.wins || 0}-{entry.losses || 0}</div>
                        </div>

                        <div className="col-span-2 text-center">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono text-xs font-black">
                            <Percent size={10} /> {(entry.winPercentage || 0).toFixed(1)}
                          </div>
                        </div>

                        <div className="col-span-2 text-right">
                          <div className="text-lg font-mono font-black text-white tracking-tighter">{(entry.points || 0).toLocaleString()}</div>
                          <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Career Points</div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-6 bg-slate-900/60 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center"><Crown size={16} className="text-yellow-500" /></div>
             <div>
                <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Top Player</div>
                <div className="text-xs font-black text-white italic">{entries[0]?.displayName || '---'}</div>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><Hash size={16} className="text-blue-500" /></div>
             <div>
                <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Total Athletes</div>
                <div className="text-xs font-black text-white italic">{entries.length}</div>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
          <Star className="text-yellow-500 fill-yellow-500" size={14} />
          <span className="text-[10px] font-black text-white uppercase italic tracking-widest">Official XBA Pro License Active</span>
        </div>
      </div>
    </div>
  );
}

