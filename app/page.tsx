'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/components/game/AuthContext';
import { auth, db, signInWithGoogle } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Trophy, Globe, Sparkles, User, Play, LogOut, Loader2, Star, Target, Tv, History, ArrowLeft } from 'lucide-react';

import DraftDay from '@/components/game/DraftDay';
import BasketballGame from '@/components/game/BasketballGame';
import MatchHistory from '@/components/game/MatchHistory';
import OutfitCustomizer from '@/components/game/OutfitCustomizer';
import WorldTour from '@/components/game/WorldTour';
import Leaderboard from '@/components/game/Leaderboard';
import Tutorial from '@/components/game/Tutorial';
import Matchmaking from '@/components/game/Matchmaking';

const TEAMS: Record<string, { name: string, color: string }> = {
  'NYK': { name: 'Neo-York Knights', color: '#1e40af' },
  'TKT': { name: 'Tokyo Titans', color: '#991b1b' },
  'LL': { name: 'London Lions', color: '#374151' },
  'RR': { name: 'Rio Raptors', color: '#166534' },
  'CC': { name: 'Cairo Cobras', color: '#854d0e' },
};

export default function XBAHome() {
  const { user, userData, loading } = useAuth();
  const [view, setView] = useState<'menu' | 'game' | 'shop' | 'map' | 'leaderboard' | 'history'>('menu');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [matchInfo, setMatchInfo] = useState<{ id: string, isHost: boolean } | null>(null);
  const [showMatchmaking, setShowMatchmaking] = useState(false);

  useEffect(() => {
    if (userData?.stats.gamesPlayed === 0 && !userData?.tutorialCompleted && !showTutorial) {
      const timer = setTimeout(() => setShowTutorial(true), 100);
      return () => clearTimeout(timer);
    }
  }, [userData?.stats.gamesPlayed, userData?.tutorialCompleted, showTutorial]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-6">
        <Loader2 className="text-blue-500 animate-spin" size={64} />
        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter animate-pulse">Initializing XBA...</h1>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/basketball/1920/1080')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/20" />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center max-w-2xl"
        >
          <div className="inline-block bg-blue-600 px-4 py-1 rounded mb-6 text-sm font-black italic text-white uppercase tracking-widest">Global League</div>
          <h1 className="text-8xl font-black text-white italic uppercase tracking-tighter mb-6 leading-none">
            XBA<span className="text-blue-500 text-4xl align-top">®</span>
          </h1>
          <p className="text-xl text-zinc-400 mb-12 font-medium leading-relaxed">
            The world&apos;s most elite basketball association. Customize your gear with AI, compete globally, and become a street legend.
          </p>
          <button
            onClick={signInWithGoogle}
            className="group relative bg-white text-black px-12 py-5 rounded-2xl font-black text-2xl uppercase tracking-tighter flex items-center gap-4 mx-auto hover:bg-zinc-200 transition-all shadow-2xl shadow-white/5"
          >
            <User size={28} className="text-blue-600" />
            Sign in to play
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
               <Play size={24} className="fill-black" />
            </motion.div>
          </button>
        </motion.div>
      </div>
    );
  }

  if (userData && !userData.currentTeam) {
    return <DraftDay uid={user.uid} displayName={user.displayName || 'Rookie'} />;
  }

  if (view === 'game' && selectedLocation && matchInfo) {
    return (
      <BasketballGame
        uid={user.uid}
        displayName={userData?.displayName || 'Player'}
        matchId={matchInfo.id}
        isHost={matchInfo.isHost}
        location={selectedLocation.name}
        locationId={selectedLocation.id}
        teamColor={selectedLocation.color || TEAMS[userData?.currentTeam || 'NYK']?.color || '#1e40af'}
        teamLogo={selectedLocation.logo}
        avatarUrl={userData?.outfitImageUrl}
        currentTeam={userData?.currentTeam || undefined}
        onExit={() => { setView('menu'); setMatchInfo(null); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <AnimatePresence>
        {showTutorial && <Tutorial onClose={async () => {
          if (user) {
             await updateDoc(doc(db, 'users', user.uid), { tutorialCompleted: true });
          }
          setShowTutorial(false);
        }} />}
        {showMatchmaking && selectedLocation && (
          <Matchmaking
            uid={user.uid}
            displayName={userData?.displayName || 'Player'}
            location={selectedLocation}
            onJoin={(id, isHost) => { setMatchInfo({ id, isHost }); setView('game'); setShowMatchmaking(false); }}
            onClose={() => setShowMatchmaking(false)}
          />
        )}
      </AnimatePresence>

      {/* Navigation Header */}
      <nav className="p-6 md:p-8 flex justify-between items-center border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <button onClick={() => setView('menu')} className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase hover:text-blue-500 transition-colors">XBA</button>
          <div className="hidden sm:flex gap-4">
            <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
              <Star className="text-yellow-500" size={16} />
              <span className="font-mono font-bold text-sm">{userData?.credits.toLocaleString()} <span className="text-[10px] text-zinc-500 uppercase">Credits</span></span>
            </div>
            <div className="bg-blue-600/10 px-4 py-2 rounded-xl border border-blue-500/20 flex items-center gap-2">
              <Trophy className="text-blue-400" size={16} />
              <span className="font-mono font-bold text-sm text-blue-400">{userData?.coins.toLocaleString()} <span className="text-[10px] text-blue-400/50 uppercase">Coins</span></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden lg:flex gap-4">
            <button onClick={() => setView('leaderboard')} className={`text-xs font-black uppercase italic tracking-widest px-4 py-2 rounded-xl transition-all ${view === 'leaderboard' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>Leaderboard</button>
            <button onClick={() => setView('history')} className={`text-xs font-black uppercase italic tracking-widest px-4 py-2 rounded-xl transition-all ${view === 'history' ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>Archive</button>
          </div>
          
          <div className="text-right hidden md:block">
            <div className="font-black italic uppercase text-sm">{userData?.displayName}</div>
            <div className="text-xs text-blue-400 font-bold uppercase tracking-widest">{TEAMS[userData?.currentTeam || 'NYK']?.name}</div>
          </div>
          <button 
            onClick={() => setView('shop')}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center hover:bg-slate-700 transition-colors overflow-hidden shrink-0"
          >
             {userData?.outfitImageUrl ? (
               <img src={userData.outfitImageUrl} className="w-full h-full object-cover" alt="Profile" />
             ) : (
               <User size={20} className="text-zinc-500" />
             )}
          </button>
        </div>
      </nav>

      <main className="p-6 md:p-8 max-w-7xl mx-auto grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {view === 'menu' ? (
            <>
              <section className="relative h-[300px] md:h-[450px] rounded-[40px] overflow-hidden group border-4 border-white/5 shadow-2xl">
                <img src="https://picsum.photos/seed/court/1200/800" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Play" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                
                <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 right-6 md:right-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <div className="bg-blue-600 px-3 py-1 rounded inline-block text-[9px] font-black uppercase tracking-widest mb-4">Touring: Worldwide</div>
                    <h2 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-2">Continue Tour</h2>
                    <p className="text-zinc-400 font-medium text-sm md:text-base">Dominate courts from Tokyo to Cairo and rise the ranks.</p>
                  </div>
                  <button
                    onClick={() => setView('map')}
                    className="bg-white text-black px-8 md:px-12 py-4 md:py-5 rounded-3xl font-black text-xl md:text-2xl uppercase tracking-tighter flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                  >
                    <Play size={24} className="fill-black" /> Play Now
                  </button>
                </div>
              </section>

              <div className="grid md:grid-cols-2 gap-8">
                <motion.div 
                  whileHover={{ y: -5 }}
                  onClick={() => setView('shop')}
                  className="bg-slate-900 rounded-[32px] p-8 border border-white/5 hover:border-blue-500/30 cursor-pointer transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-600/10 transition-colors" />
                  <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600/20 transition-colors">
                    <Sparkles className="text-blue-500" size={32} />
                  </div>
                  <h3 className="text-2xl font-black uppercase italic mb-2">AI Outfit Lab</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed mb-6">Synthesize professional gear with the power of AI.</p>
                  <div className="text-blue-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                    Open Lab <Play size={12} className="fill-blue-400" />
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ y: -5 }}
                  onClick={() => setView('history')}
                  className="bg-slate-900 rounded-[32px] p-8 border border-white/5 hover:border-purple-500/30 cursor-pointer transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-purple-600/10 transition-colors" />
                  <div className="w-14 h-14 bg-purple-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600/20 transition-colors">
                    <History className="text-purple-500" size={32} />
                  </div>
                  <h3 className="text-2xl font-black uppercase italic mb-2">Match Archive</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed mb-6">Review past performances and analyze your game statistics.</p>
                  <div className="text-purple-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                    View Logs <Play size={12} className="fill-purple-400" />
                  </div>
                </motion.div>
              </div>
            </>
          ) : view === 'history' ? (
            <div className="space-y-6">
              <button onClick={() => setView('menu')} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-black uppercase italic tracking-widest text-xs">
                 <ArrowLeft size={16} /> Back to Dashboard
              </button>
              <MatchHistory uid={user.uid} />
            </div>
          ) : view === 'leaderboard' ? (
            <div className="space-y-6">
              <button onClick={() => setView('menu')} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-black uppercase italic tracking-widest text-xs">
                 <ArrowLeft size={16} /> Back to Dashboard
              </button>
              <Leaderboard fullScreen />
            </div>
          ) : null}
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900/40 rounded-[40px] p-2 border border-white/5">
             <div className="p-6 pb-0 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 italic">League Leaders</h3>
                <button onClick={() => setView('leaderboard')} className="text-[10px] font-black uppercase text-blue-500 hover:underline">Full Standings</button>
             </div>
             <Leaderboard />
          </div>
          
          <div className="bg-blue-600 rounded-[40px] p-8 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors" />
            <Tv className="mb-4 text-white/50" size={32} />
            <h3 className="text-2xl font-black uppercase italic mb-2">XBA TV</h3>
            <p className="text-blue-100 text-sm font-medium mb-6 leading-relaxed">Your professional draft announcement is trending. Stay at the top of your game!</p>
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
               <div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Status</div>
                  <div className="font-bold">Rising Superstar</div>
               </div>
               <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <Star className="text-white fill-white" size={20} />
               </div>
            </div>
          </div>
          
          <button 
            onClick={() => auth.signOut()}
            className="w-full py-5 rounded-[32px] border border-red-500/20 text-red-500 font-black uppercase italic hover:bg-red-500/5 transition-all flex items-center justify-center gap-2 text-sm tracking-widest"
          >
            <LogOut size={20} /> Retire from League
          </button>
        </div>
      </main>

      <AnimatePresence>
        {view === 'shop' && (
          <OutfitCustomizer 
            uid={user.uid} 
            credits={userData?.credits || 0} 
            onClose={() => setView('menu')} 
          />
        )}
        {view === 'map' && (
          <WorldTour 
            currentCredits={userData?.credits || 0} 
            onSelect={(loc) => { setSelectedLocation(loc); setShowMatchmaking(true); }} 
            onClose={() => setView('menu')} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
