'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, ArrowLeft, Target, Zap, CircleDot, Timer, CloudRain, Sun, Moon, Loader2, Play, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { io, Socket } from 'socket.io-client';
import { BasketballCore, Vec3 } from '@/lib/basketball-core';
import Leaderboard from '@/components/game/Leaderboard';

interface GameProps {
  uid: string;
  displayName: string;
  matchId: string;
  isHost: boolean;
  onExit: () => void;
  location: string;
  locationId: string;
  teamColor: string;
  teamLogo?: string;
  avatarUrl?: string | null;
  currentTeam?: string;
}

interface GameObject {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  color: string;
  team: 'A' | 'B';
  displayName?: string;
  isPlayer?: boolean;
  stamina?: number;
  isDefending?: boolean;
}

export default function BasketballGame({ uid, displayName, matchId, onExit, location, locationId, teamColor, teamLogo, avatarUrl, currentTeam }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90); 
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState<{ a: number, b: number } | null>(null);
  const [joystick, setJoystick] = useState({ x: 0, y: 0 });
  const [isShooting, setIsShooting] = useState(false);
  const [shotPower, setShotPower] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [hasBall, setHasBall] = useState(false);
  const [isDefending, setIsDefending] = useState(false);

  const shootIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [joystickTouch, setJoystickTouch] = useState<{ active: boolean, startX: number, startY: number, moveX: number, moveY: number }>({
    active: false, startX: 0, startY: 0, moveX: 0, moveY: 0
  });

  const COURT_WIDTH = 3200;
  const COURT_HEIGHT = 900;
  const VIEW_WIDTH = 1000;
  const VIEW_HEIGHT = 600;

  const ERA_THEMES: Record<string, any> = {
    vintage: { court: '#451a03', lines: 'rgba(255,255,255,0.1)', crowd: '#1c1917', sky: ['#0c0a09', '#1c1917'], logo: '🏛️' },
    retro: { court: '#1e3a8a', lines: 'rgba(255,255,255,0.2)', crowd: '#0f172a', sky: ['#1e1b4b', '#312e81'], logo: '🏀' },
    modern: { court: '#111827', lines: '#3b82f6', crowd: '#020617', sky: ['#000000', '#0f172a'], logo: '⚡' },
    futuristic: { court: '#000000', lines: '#06b6d4', crowd: '#083344', sky: ['#083344', '#155e75'], logo: '🌐' },
    elite: { court: '#1e293b', lines: '#f59e0b', crowd: '#020617', sky: ['#0f172a', '#1e293b'], logo: '⭐' }
  };

  const [weather] = useState<'clear' | 'rain'>(() => Math.random() > 0.7 ? 'rain' : 'clear');
  const [timeOfDay] = useState<'day' | 'sunset' | 'night'>(() => {
    const times: ('day' | 'sunset' | 'night')[] = ['sunset', 'night', 'day'];
    return times[Math.floor(Math.random() * times.length)];
  });

  const theme = ERA_THEMES[locationId.split('_')[1]?.toLowerCase() || 'vintage'] || ERA_THEMES.vintage;

  const cameraRef = useRef({ x: 0, y: 0 });
  const ballRef = useRef<{position: Vec3, velocity: Vec3, radius: number, color: string, holder: string | null}>({
    position: { x: 1600, y: 450, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    radius: 12,
    color: '#f97316',
    holder: null
  });
  const playersRef = useRef<Record<string, GameObject>>({});

  const jump = useCallback(() => {
    const p = playersRef.current[socketRef.current?.id || ''];
    if (p && p.z === 0) {
      p.vz = 14;
    }
  }, []);

  const shoot = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('ball:shoot', { matchId, shotPower });
    }
    setIsShooting(false);
    setShotPower(0);
  }, [matchId, shotPower]);

  const pass = useCallback(() => {
    if (socketRef.current && hasBall) {
      socketRef.current.emit('player:pass', { matchId });
    }
  }, [matchId, hasBall]);

  const steal = useCallback(() => {
    if (socketRef.current && !hasBall) {
      setIsDefending(true);
      socketRef.current.emit('player:steal', { matchId });
      setTimeout(() => setIsDefending(false), 500); 
    }
  }, [matchId, hasBall]);

  useEffect(() => {
    socketRef.current = io();
    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('match:join', { matchId, athleteId: uid, displayName, teamColor, locationId, avatarUrl, currentTeam });
    });

    socket.on('match:update', (data) => {
      setScoreA(data.scoreA);
      setScoreB(data.scoreB);
      setTimeLeft(data.timeLeft);
      
      if (data.status === 'finished') {
        setIsGameOver(true);
        setFinalScore({ a: data.scoreA, b: data.scoreB });
      }

      ballRef.current.position = data.ball.position;
      ballRef.current.velocity = data.ball.velocity;
      ballRef.current.holder = data.ball.holder;
      setHasBall(data.ball.holder === socket.id);

      const newPlayers: Record<string, GameObject> = {};
      data.players.forEach((p: any) => {
        newPlayers[p.id] = { ...p, radius: 22, isPlayer: p.id === socket.id };
      });
      playersRef.current = newPlayers;
    });

    socket.on('match:finished', (data) => {
      setIsGameOver(true);
      setFinalScore({ a: data.scoreA, b: data.scoreB });
      confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
    });

    socket.on('goal', ({ team, points }) => {
      confetti({ particleCount: points * 50, origin: { x: 0.5, y: 0.5 } });
      if (points === 6) {
        // Show announcement (using an alert or toast-like state)
        alert('SIX-POINT HALF-COURT SHOT!');
      }
    });

    socket.on('sfx', ({ type }) => {
      if (type === 'steal') {
         // Visual feedback could be added here
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [matchId, uid, displayName, teamColor, locationId, avatarUrl, currentTeam]);

  // Game Loop (Client Rendering)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId: number;

    const update = () => {
      const myId = socketRef.current?.id;
      const player = myId ? playersRef.current[myId] : null;

      // Authoritative movement send
      if (socketRef.current && isConnected && !isGameOver) {
         socketRef.current.emit('player:move', { matchId, joystick });
      }

      if (player) {
        const targetCamX = Math.max(0, Math.min(COURT_WIDTH - VIEW_WIDTH, player.x - VIEW_WIDTH / 2));
        cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.15; // Smoother camera
      }

      draw();
      animationFrameId = requestAnimationFrame(update);
    };

    const drawPlayer = (p: GameObject) => {
      const pScale = 1 + p.z / 1500;
      const x = p.x - cameraRef.current.x;
      const y = p.y - p.z;
      const time = Date.now() / 150;
      const isMoving = Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1;
      const isMyPlayer = p.id === socketRef.current?.id;
      
      const holderId = ballRef.current.holder;
      const holder = holderId ? playersRef.current[holderId] : null;
      
      // Hands up logic: If defending a holder, or explicitly isDefending
      const handsRaised = p.isDefending || (holder && holder.team !== p.team && Math.hypot(p.x - holder.x, p.y - holder.y) < 150);
      
      const shadowAlpha = timeOfDay === 'night' ? 0.2 : 0.4;
      ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
      ctx.beginPath(); ctx.ellipse(x + (timeOfDay === 'sunset' ? 20 : 0), p.y, p.radius, p.radius/2, 0, 0, Math.PI*2); ctx.fill();
      
      // Skin tone based on team for variety if not my player
      ctx.fillStyle = p.team === 'A' ? '#5a341a' : '#8b5e3c';
      const armSwing = isMoving ? Math.sin(time) * 20 : 0;
      
      if (handsRaised) {
        ctx.fillRect(x - 24 * pScale, y - 100 * pScale, 12 * pScale, 50 * pScale);
        ctx.fillRect(x + 12 * pScale, y - 100 * pScale, 12 * pScale, 50 * pScale);
      } else {
        ctx.fillRect(x - 24 * pScale, y - 70 * pScale + armSwing, 12 * pScale, 40 * pScale);
        ctx.fillRect(x + 12 * pScale, y - 70 * pScale - armSwing, 12 * pScale, 40 * pScale);
      }

      // Jersey
      ctx.fillStyle = p.color;
      ctx.fillRect(x - 20 * pScale, y - 75 * pScale, 40 * pScale, 60 * pScale);
      
      // Logo & Number
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `black ${16 * pScale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(isMyPlayer && teamLogo ? teamLogo : theme.logo, x, y - 45 * pScale);
      ctx.font = `bold ${10 * pScale}px sans-serif`;
      ctx.fillText(isMyPlayer ? '23' : '10', x, y - 25 * pScale);

      // Head & Body
      const legSwing = isMoving ? Math.cos(time) * 15 : 0;
      ctx.fillStyle = p.team === 'A' ? '#5a341a' : '#8b5e3c';
      ctx.fillRect(x - 20 * pScale, y - 15 * pScale + legSwing, 16 * pScale, 25 * pScale);
      ctx.fillRect(x + 4 * pScale, y - 15 * pScale - legSwing, 16 * pScale, 25 * pScale);
      ctx.beginPath(); ctx.arc(x, y - 90 * pScale, 16 * pScale, 0, Math.PI * 2); ctx.fill();
      
      // Highlight my player
      if (isMyPlayer) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, p.y, p.radius + 10, 0, Math.PI * 2); ctx.stroke();
      }

      // Name & Stamina
      ctx.fillStyle = '#fff'; ctx.font = `bold ${13 * pScale}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(p.displayName?.substring(0, 12) || '', x, y - 115 * pScale);
      
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 25, y + 15, 50, 6);
      ctx.fillStyle = (p.stamina || 100) > 30 ? '#22c55e' : '#ef4444';
      ctx.fillRect(x - 25, y + 15, 50 * ((p.stamina || 100) / 100), 6);
    };

    const draw = () => {
      const camX = cameraRef.current.x;
      ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      
      // Dynamic Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 300);
      skyGrad.addColorStop(0, theme.sky[0]); skyGrad.addColorStop(1, theme.sky[1]);
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      
      // Crowd
      ctx.fillStyle = theme.crowd; ctx.fillRect(0, 120, VIEW_WIDTH, 130);
      
      ctx.save(); ctx.translate(-camX, 0);
      
      // Court
      ctx.fillStyle = theme.court; ctx.fillRect(0, 200, COURT_WIDTH, COURT_HEIGHT - 400);
      ctx.strokeStyle = theme.lines; ctx.lineWidth = 4; ctx.strokeRect(0, 200, COURT_WIDTH, COURT_HEIGHT - 400);
      
      // Center Circle
      ctx.beginPath(); ctx.arc(COURT_WIDTH/2, 450, 150, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(COURT_WIDTH/2, 200); ctx.lineTo(COURT_WIDTH/2, 700); ctx.stroke();
      
      // Hoops & Keys
      [100, 3100].forEach(hx => {
         ctx.beginPath(); ctx.arc(hx, 450, 450, -Math.PI/2, Math.PI/2, hx > 1600); ctx.stroke();
         ctx.strokeRect(hx === 100 ? 0 : 2700, 320, 400, 260);
         
         // Backboard & Hoop
         ctx.fillStyle = '#fff'; ctx.fillRect(hx === 100 ? 50 : 3130, 400, 20, 100);
         ctx.strokeStyle = '#f97316'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(hx === 100 ? 90 : 3110, 450, 25, 0, Math.PI*2); ctx.stroke();
      });

      // Players & Ball
      Object.values(playersRef.current).forEach(drawPlayer);
      
      const ball = ballRef.current;
      ctx.fillStyle = ball.color;
      ctx.beginPath(); ctx.arc(ball.position.x, ball.position.y - ball.position.z, ball.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke(); 
      
      if (ball.holder) {
        const h = playersRef.current[ball.holder];
        if (h) {
           ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
           ctx.lineWidth = 3;
           ctx.setLineDash([8, 4]);
           ctx.beginPath(); ctx.arc(h.x, h.y, 45, 0, Math.PI * 2); ctx.stroke();
           ctx.setLineDash([]);
        }
      }
      ctx.restore();
    };
    update();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isGameOver, theme, timeOfDay, joystick, matchId, isConnected, isDefending, teamLogo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') setJoystick(j => ({ ...j, y: -1 }));
      if (key === 's') setJoystick(j => ({ ...j, y: 1 }));
      if (key === 'a') setJoystick(j => ({ ...j, x: -1 }));
      if (key === 'd') setJoystick(j => ({ ...j, x: 1 }));
      if (key === ' ') jump();
      if (key === 'e') pass();
      if (key === 'q') steal();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 's'].includes(key)) setJoystick(j => ({ ...j, y: 0 }));
      if (['a', 'd'].includes(key)) setJoystick(j => ({ ...j, x: 0 }));
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [jump, pass, steal]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    setJoystickTouch({ active: true, startX: touch.clientX, startY: touch.clientY, moveX: 0, moveY: 0 });
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!joystickTouch.active) return;
    const touch = e.touches[0];
    const dx = touch.clientX - joystickTouch.startX; const dy = touch.clientY - joystickTouch.startY;
    const dist = Math.sqrt(dx * dx + dy * dy); const maxDist = 60;
    const limitedX = (dx / (dist || 1)) * Math.min(dist, maxDist); const limitedY = (dy / (dist || 1)) * Math.min(dist, maxDist);
    setJoystickTouch(prev => ({ ...prev, moveX: limitedX, moveY: limitedY }));
    setJoystick({ x: limitedX / maxDist, y: limitedY / maxDist });
  };
  const handleTouchEnd = () => {
    setJoystickTouch({ active: false, startX: 0, startY: 0, moveX: 0, moveY: 0 });
    setJoystick({ x: 0, y: 0 });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
  };

  if (!isConnected) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-6">
        <Loader2 className="text-blue-500 animate-spin" size={64} />
        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Syncing with Court...</h1>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center select-none overflow-hidden font-sans">
      <div className="absolute top-8 w-full px-12 flex justify-between items-start z-30 pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
           <button onClick={onExit} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
            <ArrowLeft className="text-white" />
          </button>
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4 text-white">
             <div className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">{weather.toUpperCase()} / {timeOfDay.toUpperCase()}</div>
          </div>
        </div>
        <div className="bg-black/90 border-2 border-white/10 rounded-[32px] overflow-hidden flex shadow-2xl pointer-events-auto">
          <div className="px-8 py-4 border-r border-white/5 flex flex-col items-center justify-center bg-blue-600/10">
             <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">TEAM A</div>
             <div className="text-5xl font-mono text-white tabular-nums font-black">{scoreA}</div>
          </div>
          <div className="bg-white/5 px-6 py-4 flex flex-col items-center justify-center min-w-[120px]">
             <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">TIMER</div>
             <div className="text-2xl font-mono text-white tracking-tighter">{formatTime(timeLeft)}</div>
          </div>
          <div className="px-8 py-4 border-l border-white/5 flex flex-col items-center justify-center bg-red-600/10">
             <div className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">TEAM B</div>
             <div className="text-5xl font-mono text-white tabular-nums font-black">{scoreB}</div>
          </div>
        </div>
        <div className="bg-blue-600 px-8 py-4 rounded-3xl font-black text-white shadow-2xl uppercase italic tracking-tighter text-2xl border-4 border-white/10 pointer-events-auto">{location}</div>
      </div>
      <div className="relative w-full h-[600px] bg-slate-950 overflow-hidden shadow-2xl">
        <canvas ref={canvasRef} width={VIEW_WIDTH} height={VIEW_HEIGHT} className="w-full h-full object-contain" />
        {isShooting && (
          <div className="absolute top-1/2 left-20 -translate-y-1/2 w-6 h-80 bg-white/5 rounded-full overflow-hidden flex flex-col-reverse border-2 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <motion.div initial={{ height: 0 }} animate={{ height: `${shotPower}%` }} className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 shadow-[0_0_30px_#22d3ee]" />
          </div>
        )}
        
        <AnimatePresence>
          {isGameOver && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center z-50 p-8 overflow-y-auto"
            >
               <div className="max-w-4xl w-full">
                  <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(234,179,8,0.4)]">
                      <Trophy size={48} className="text-black" />
                    </div>
                    <h2 className="text-7xl font-black italic uppercase tracking-tighter text-white mb-2">Game Over</h2>
                    <div className="text-cyan-400 font-black uppercase tracking-[0.3em] text-sm">League Data Synchronized</div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-8 items-center mb-12">
                     <div className="bg-white/5 p-10 rounded-[48px] border-2 border-blue-500/30 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors" />
                        <div className="relative z-10">
                          <div className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">TEAM A</div>
                          <div className="text-9xl font-mono font-black text-white leading-none">{finalScore?.a}</div>
                        </div>
                     </div>
                     
                     <div className="flex flex-col items-center gap-6">
                        <div className="w-40 h-40 rounded-full bg-slate-900 border-4 border-white/10 p-1 relative shadow-2xl">
                           <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-800 to-black flex items-center justify-center text-6xl">🏀</div>
                           <div className="absolute -bottom-2 bg-white text-black px-4 py-1 rounded-full font-black text-sm uppercase italic">Final</div>
                        </div>
                     </div>

                     <div className="bg-white/5 p-10 rounded-[48px] border-2 border-red-500/30 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-red-600/5 group-hover:bg-red-600/10 transition-colors" />
                        <div className="relative z-10">
                          <div className="text-xs font-black text-red-400 uppercase tracking-widest mb-4">TEAM B</div>
                          <div className="text-9xl font-mono font-black text-white leading-none">{finalScore?.b}</div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-slate-900/80 rounded-[48px] border border-white/10 overflow-hidden mb-12 shadow-2xl">
                     <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <div className="flex items-center gap-3">
                           <Play size={20} className="text-cyan-400" />
                           <h3 className="text-xl font-black uppercase tracking-tighter text-white italic">Global Leaderboard</h3>
                        </div>
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Real-time Rankings</div>
                     </div>
                     <div className="max-h-[300px] overflow-y-auto">
                        <Leaderboard />
                     </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 justify-center">
                    <button 
                      onClick={onExit}
                      className="bg-white text-black px-12 py-6 rounded-[32px] font-black text-2xl uppercase tracking-tighter hover:bg-zinc-200 transition-all shadow-2xl flex items-center gap-3 justify-center min-w-[280px]"
                    >
                      <ArrowLeft size={28} /> Dashboard
                    </button>
                    <button 
                      onClick={onExit} 
                      className="bg-cyan-500 text-black px-12 py-6 rounded-[32px] font-black text-2xl uppercase tracking-tighter hover:bg-cyan-400 transition-all shadow-2xl shadow-cyan-500/20 flex items-center gap-3 justify-center min-w-[280px]"
                    >
                      Next Match <Play size={28} className="fill-black" />
                    </button>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="absolute bottom-0 w-full p-12 flex justify-between items-end z-40 pointer-events-none">
        <div className="pointer-events-auto w-48 h-48 flex items-center justify-center touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <div className="w-32 h-32 bg-slate-900/90 rounded-full border-4 border-white/10 flex items-center justify-center relative shadow-2xl">
             <motion.div 
               animate={{ x: joystickTouch.moveX, y: joystickTouch.moveY }} 
               transition={{ type: 'spring', damping: 20, stiffness: 400 }} 
               className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center shadow-xl border-2 border-white/40"
             >
               <CircleDot className="text-white/60" size={32} />
             </motion.div>
             <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none" />
          </div>
        </div>
        <div className="flex gap-4 pointer-events-auto items-end">
          <div className="flex flex-col gap-4">
            <button 
            onClick={() => {
               // Determine maneuver type based on game context (simplified for now)
               const maneuverType = hasBall ? 'crossover' : 'shotContest';
               socketRef.current?.emit('player:maneuver', { matchId, maneuverType });
            }}
            className="w-24 h-24 bg-purple-600 hover:bg-purple-500 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 border-white/20 transition-all active:scale-95"
          >
            <Sparkles className="text-white" size={32} />
            <span className="text-[10px] font-black text-white uppercase italic mt-1 tracking-tighter">Move</span>
          </button>
          {hasBall ? (
              <button
                onClick={pass}
                className="w-24 h-24 bg-blue-600 hover:bg-blue-500 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 border-white/20 transition-all active:scale-95 active:shadow-inner"
              >
                <Zap className="text-white rotate-90" size={36} />
                <span className="text-[10px] font-black text-white uppercase italic mt-1 tracking-tighter">Pass</span>
              </button>
            ) : (
              <button
                onClick={steal}
                className="w-24 h-24 bg-red-600 hover:bg-red-500 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 border-white/20 transition-all active:scale-95 active:shadow-inner"
              >
                <Target className="text-white" size={36} />
                <span className="text-[10px] font-black text-white uppercase italic mt-1 tracking-tighter">Steal</span>
              </button>
            )}
          </div>
          <button
            onMouseDown={() => { if(isGameOver) return; setIsShooting(true); shootIntervalRef.current = setInterval(() => setShotPower(p => Math.min(p + 5, 100)), 50); }}
            onMouseUp={() => { if(shootIntervalRef.current) clearInterval(shootIntervalRef.current); if(!isGameOver) shoot(); }}
            onTouchStart={(e) => { e.preventDefault(); if(isGameOver) return; setIsShooting(true); shootIntervalRef.current = setInterval(() => setShotPower(p => Math.min(p + 5, 100)), 50); }}
            onTouchEnd={(e) => { e.preventDefault(); if(shootIntervalRef.current) clearInterval(shootIntervalRef.current); if(!isGameOver) shoot(); }}
            className="w-36 h-36 bg-orange-600 hover:bg-orange-500 rounded-full flex flex-col items-center justify-center shadow-2xl border-8 border-white/10 transition-all active:scale-90 disabled:opacity-50"
            disabled={isGameOver}
          >
            <Target className="text-white" size={56} />
            <span className="text-sm font-black text-white uppercase italic mt-1">Shoot</span>
          </button>
          <button 
            onClick={() => { if(!isGameOver) jump(); }} 
            className="w-32 h-32 bg-blue-500 hover:bg-blue-400 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 border-white/20 transition-all active:scale-90 disabled:opacity-50"
            disabled={isGameOver}
          >
            <Zap className="text-white" size={48} />
            <span className="text-xs font-black text-white uppercase italic mt-1">Jump</span>
          </button>
        </div>
      </div>
    </div>
  );
}
