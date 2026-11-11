'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MousePointer2, Move, Target, Zap, CircleDot } from 'lucide-react';

export default function Tutorial({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-10 text-center shadow-2xl"
      >
        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-8">How to Play XBA</h2>
        
        <div className="grid grid-cols-2 gap-8 mb-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
              <Move className="text-blue-400" size={32} />
            </div>
            <div>
              <div className="text-white font-bold uppercase text-xs tracking-widest mb-1">Move</div>
              <p className="text-zinc-500 text-xs">Use WASD keys or the Virtual Joystick</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-orange-600/20 rounded-2xl flex items-center justify-center border border-orange-500/30">
              <Target className="text-orange-400" size={32} />
            </div>
            <div>
              <div className="text-white font-bold uppercase text-xs tracking-widest mb-1">Shoot</div>
              <p className="text-zinc-500 text-xs">Hold the Shoot button to charge power</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
              <Zap className="text-purple-400" size={32} />
            </div>
            <div>
              <div className="text-white font-bold uppercase text-xs tracking-widest mb-1">Dunk</div>
              <p className="text-zinc-500 text-xs">Jump high to slam it through the rim</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-green-600/20 rounded-2xl flex items-center justify-center border border-green-500/30">
              <CircleDot className="text-green-400" size={32} />
            </div>
            <div>
              <div className="text-white font-bold uppercase text-xs tracking-widest mb-1">Score</div>
              <p className="text-zinc-500 text-xs">Earn Credits and Coins for every hoop</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-white text-black py-5 rounded-2xl font-black text-xl uppercase tracking-tighter hover:bg-zinc-200 transition-all shadow-xl shadow-white/5"
        >
          I&apos;m Ready to Ball
        </button>
      </motion.div>
    </div>
  );
}
