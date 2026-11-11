'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, Check, X, Wand2, Shirt } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

interface OutfitCustomizerProps {
  uid: string;
  credits: number;
  onClose: () => void;
}

export default function OutfitCustomizer({ uid, credits, onClose }: OutfitCustomizerProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cost = 50;

  const handleGenerate = async () => {
    if (credits < cost) {
      setError("Not enough credits! Play more games to earn XBA Credits.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setGeneratedImage(data.imageUrl);
    } catch (err: any) {
      setError(err.message || "Something went wrong during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveOutfit = async () => {
    if (!generatedImage) return;

    try {
      await updateDoc(doc(db, 'users', uid), {
        outfitImageUrl: generatedImage,
        outfitPrompt: prompt,
        credits: increment(-cost)
      });
      onClose();
    } catch (err) {
      setError("Failed to save outfit.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 w-full max-w-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-950/50">
          <div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
              <Sparkles className="text-blue-400" /> AI Outfit Lab
            </h2>
            <p className="text-zinc-400 text-sm">Design your custom gear using AI prompts.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="text-white" />
          </button>
        </div>

        <div className="p-8 grid md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Outfit Vision</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Neon cyber-punk jersey with dragon scales and golden trim..."
                className="w-full h-32 bg-slate-800 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none border border-white/5 transition-all"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2">
                <Shirt className="text-blue-400" size={20} />
                <span className="text-sm font-bold text-white">Cost: {cost} Credits</span>
              </div>
              <div className="text-xs text-zinc-500">Bal: {credits} Credits</div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-blue-600 disabled:bg-blue-900/50 disabled:text-zinc-500 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 size={20} />}
              {isGenerating ? 'Generating...' : 'Synthesize Gear'}
            </button>

            {error && (
              <p className="text-red-400 text-sm font-medium bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                {error}
              </p>
            )}
          </div>

          <div className="bg-slate-950 rounded-3xl border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden aspect-square">
            <AnimatePresence mode="wait">
              {generatedImage ? (
                <motion.div
                  key="image"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full group"
                >
                  <img src={generatedImage} alt="AI Generated Outfit" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <button
                        onClick={saveOutfit}
                        className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl"
                      >
                        <Check size={20} /> Equip Gear
                      </button>
                  </div>
                </motion.div>
              ) : (
                <div key="placeholder" className="text-center p-6">
                  <Shirt size={64} className="text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-600 font-bold uppercase text-xs tracking-widest">Awaiting Synthesis</p>
                </div>
              )}
            </AnimatePresence>
            
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <Loader2 className="animate-spin mb-4" size={48} />
                <p className="text-sm font-black uppercase italic animate-pulse">Forging Epic Gear...</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
