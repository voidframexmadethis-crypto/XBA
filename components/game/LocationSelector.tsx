'use client';
import React, { useState } from 'react';
import { REGIONS } from '@/lib/locations';

interface LocationSelectorProps {
  onSelect: (location: { region: string, country: string, state: string, city: string }) => void;
}

export default function LocationSelector({ onSelect }: LocationSelectorProps) {
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');

  const handleComplete = () => {
    if (region && country && state && city) {
        onSelect({ region, country, state, city });
    }
  };

  return (
    <div className="bg-slate-900 p-8 rounded-3xl border border-white/10 w-full max-w-lg shadow-2xl">
      <h2 className="text-2xl font-black uppercase italic mb-6">Set Your Hometown</h2>
      
      <div className="space-y-4">
        <select className="w-full bg-black p-4 rounded-xl border border-white/10" onChange={(e) => setRegion(e.target.value)}>
          <option value="">Select Region</option>
          {Object.keys(REGIONS).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        
        {region && (
          <select className="w-full bg-black p-4 rounded-xl border border-white/10" onChange={(e) => setCountry(e.target.value)}>
            <option value="">Select Country</option>
            {Object.keys(REGIONS[region as keyof typeof REGIONS]).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        {country && (
          <select className="w-full bg-black p-4 rounded-xl border border-white/10" onChange={(e) => setState(e.target.value)}>
            <option value="">Select State/Province</option>
            {(REGIONS[region as keyof typeof REGIONS] as any)[country].map((s: string) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <input 
          type="text" 
          placeholder="City/Town" 
          className="w-full bg-black p-4 rounded-xl border border-white/10"
          onChange={(e) => setCity(e.target.value)} 
        />

        <button onClick={handleComplete} className="w-full bg-blue-600 p-4 rounded-xl font-black uppercase italic">Confirm Location</button>
      </div>
    </div>
  );
}
