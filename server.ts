import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import * as admin from 'firebase-admin';
import { BasketballCore } from './lib/basketball-core';
import { db } from './lib/firebase';
import { collection, doc, setDoc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  const matches = new Map<string, any>();

  const createBot = (id: string, team: 'A' | 'B', color: string) => ({
    id,
    uid: `bot_${id}`,
    displayName: `Bot ${id.split('_')[1]}`,
    color,
    team,
    x: team === 'A' ? 400 + Math.random() * 200 : 2600 + Math.random() * 200,
    y: 300 + Math.random() * 300,
    z: 0,
    vx: 0, vy: 0, vz: 0,
    stamina: 100,
    joystick: { x: 0, y: 0 },
    isBot: true,
    lastAction: 0
  });

  admin.initializeApp();
  const dbAdmin = (admin as any).firestore();

  const saveMatchResults = async (match: any) => {
    try {
      const players = Array.from(match.players.values()) as any[];
      const humanPlayers = players.filter(p => !p.isBot);
      if (humanPlayers.length === 0) return;

      const timestamp = new Date().toISOString();
      const matchId = match.id;

      for (const player of humanPlayers) {
        const isTeamA = player.team === 'A';
        const win = isTeamA ? match.scoreA > match.scoreB : match.scoreB > match.scoreA;
        const opponent = humanPlayers.find(p => p.team !== player.team) || { displayName: 'XBA Opponent' };

        // Save individual match result
        const resultId = `${player.uid}_${matchId}`;
        await dbAdmin.collection('results').doc(resultId).set({
          id: resultId,
          userId: player.uid,
          opponentName: opponent.displayName,
          myScore: isTeamA ? match.scoreA : match.scoreB,
          opponentScore: isTeamA ? match.scoreB : match.scoreA,
          win,
          locationId: match.locationId || 'default',
          timestamp
        });

        // Update User stats and Leaderboard
        const userRef = dbAdmin.collection('users').doc(player.uid);
        const leaderboardRef = dbAdmin.collection('leaderboard').doc(player.uid);

        const batch = dbAdmin.batch();
        batch.update(userRef, {
          "stats.gamesPlayed": admin.firestore.FieldValue.increment(1),
          "stats.wins": admin.firestore.FieldValue.increment(win ? 1 : 0),
          "stats.losses": admin.firestore.FieldValue.increment(win ? 0 : 1),
          "stats.points": admin.firestore.FieldValue.increment(isTeamA ? match.scoreA : match.scoreB),
          "credits": admin.firestore.FieldValue.increment(win ? 500 : 100),
          updatedAt: timestamp
        });

        // Fetch current stats for win percentage calculation
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          const stats = userDoc.data().stats;
          const winPct = (stats.wins / (stats.gamesPlayed || 1)) * 100;

          batch.set(leaderboardRef, {
            uid: player.uid,
            displayName: player.displayName,
            avatarUrl: player.avatarUrl || null,
            team: player.currentTeam || 'NYK',
            points: stats.points,
            wins: stats.wins,
            losses: stats.losses,
            winPercentage: winPct,
            matchesPlayed: stats.gamesPlayed,
            updatedAt: timestamp
          }, { merge: true });
        }
        await batch.commit();
      }
    } catch (error) {
      console.error('Error saving match results:', error);
    }
  };

  io.on('connection', (socket) => {
    socket.on('match:join', ({ matchId, athleteId, displayName, teamColor, locationId, avatarUrl, currentTeam }) => {
      socket.join(matchId);
      if (!matches.has(matchId)) {
        matches.set(matchId, {
          id: matchId,
          players: new Map(),
          ball: { 
            position: { x: 1600, y: 450, z: 0 }, 
            velocity: { x: 0, y: 0, z: 0 },
            holder: null,
            lastTouch: null
          },
          scoreA: 0,
          scoreB: 0,
          timeLeft: 90,
          status: 'playing',
          locationId
        });
      }
      const match = matches.get(matchId);
      if (match.status === 'finished') return;

      const team = match.players.size % 2 === 0 ? 'A' : 'B';
      const player = {
        id: socket.id, 
        uid: athleteId,
        displayName, 
        avatarUrl,
        currentTeam,
        color: teamColor,
        team,
        x: team === 'A' ? 400 : 2800, y: 450, z: 0,
        vx: 0, vy: 0, vz: 0, stamina: 100,
        joystick: { x: 0, y: 0 },
        isBot: false
      };
      match.players.set(socket.id, player);

      // Fill with bots if needed to ensure 3v3
      const teamAPlayers = Array.from(match.players.values()).filter((p: any) => p.team === 'A');
      const teamBPlayers = Array.from(match.players.values()).filter((p: any) => p.team === 'B');

      while (teamAPlayers.length < 3) {
        const botId = `bot_A_${Math.random().toString(36).substr(2, 5)}`;
        const bot = createBot(botId, 'A', teamColor);
        match.players.set(botId, bot);
        teamAPlayers.push(bot);
      }
      while (teamBPlayers.length < 3) {
        const botId = `bot_B_${Math.random().toString(36).substr(2, 5)}`;
        const bot = createBot(botId, 'B', '#ef4444'); // Opponent bot red by default
        match.players.set(botId, bot);
        teamBPlayers.push(bot);
      }

      io.to(matchId).emit('match:update', {
        players: Array.from(match.players.values()), ball: match.ball,
        scoreA: match.scoreA, scoreB: match.scoreB, timeLeft: match.timeLeft, status: match.status
      });
    });

    socket.on('player:maneuver', ({ matchId, maneuverType }) => {
      const match = matches.get(matchId);
      if (!match || match.status === 'finished') return;
      const player = match.players.get(socket.id);
      if (!player) return;

      const success = BasketballCore.executeManeuver(player, maneuverType, { match, players: match.players });
      if (success) {
        io.to(matchId).emit('sfx', { type: 'maneuver', playerId: socket.id, maneuverType });
      }
    });

    socket.on('player:move', ({ matchId, joystick }) => {
      const match = matches.get(matchId);
      if (!match || match.status === 'finished') return;
      const player = match.players.get(socket.id);
      if (!player) return;
      player.joystick = joystick;
    });

    socket.on('player:pass', ({ matchId }) => {
      const match = matches.get(matchId);
      if (!match || match.ball.holder !== socket.id) return;
      
      const players = Array.from(match.players.values()) as any[];
      const me = match.players.get(socket.id);
      
      const teammate = players.find(p => p.team === me.team && p.id !== socket.id);
      if (teammate) {
        const dx = teammate.x - me.x;
        const dy = teammate.y - me.y;
        const dist = Math.hypot(dx, dy);
        
        match.ball.holder = null;
        match.ball.position = { x: me.x, y: me.y, z: 40 };
        match.ball.velocity = { 
          x: (dx / dist) * 45, 
          y: (dy / dist) * 45, 
          z: 5 
        };
        io.to(matchId).emit('sfx', { type: 'pass' });
      }
    });

    socket.on('player:steal', ({ matchId }) => {
      const match = matches.get(matchId);
      if (!match || match.ball.holder === null || match.ball.holder === socket.id) return;
      
      const me = match.players.get(socket.id);
      const holder = match.players.get(match.ball.holder);
      
      if (me && holder && me.team !== holder.team) {
        me.isDefending = true;
        setTimeout(() => { if (me) me.isDefending = false; }, 500);

        const dist = Math.hypot(me.x - holder.x, me.y - holder.y);
        if (dist < 80) { 
          match.ball.holder = socket.id;
          io.to(matchId).emit('sfx', { type: 'steal', stealerId: socket.id });
        }
      }
    });

    socket.on('ball:shoot', ({ matchId, shotPower }) => {
      const match = matches.get(matchId);
      if (!match || match.status === 'finished') return;
      const player = match.players.get(socket.id);
      if (!player) return;
      if (match.ball.holder !== null && match.ball.holder !== socket.id) return;

      match.ball.holder = null;
      match.ball.lastShooter = socket.id;
      const hoop = player.team === 'A' ? { x: 3100, y: 450, z: 150 } : { x: 100, y: 450, z: 150 };
      const distance = Math.hypot(hoop.x - player.x, hoop.y - player.y) / 100;
      
      let defenderPressure = 0;
      match.players.forEach((other: any) => {
        if (other.team !== player.team) {
          const contest = BasketballCore.calculateContest({
            shooterPosition: { x: player.x, y: player.y, z: player.z },
            defenderPosition: { x: other.x, y: other.y, z: other.z },
            contestStrength: 85
          });
          defenderPressure = Math.max(defenderPressure, contest);
        }
      });

      const shotResult = BasketballCore.calculateShot({ 
        releaseTiming: shotPower / 100, 
        shootingRating: 85, 
        distance, 
        stamina: player.stamina,
        defenderPressure
      });
      
      const target = { 
        x: hoop.x + (shotResult.made ? 0 : (Math.random() - 0.5) * 80), 
        y: hoop.y + (shotResult.made ? 0 : (Math.random() - 0.5) * 80), 
        z: hoop.z 
      };
      
      const flight = BasketballCore.launchBall({ 
        start: { x: player.x, y: player.y, z: player.z + 60 }, 
        target, 
        flightTime: 1.0 + (distance / 20), 
        arcBoost: 2.0 
      });
      
      match.ball.position = flight.position; 
      match.ball.velocity = flight.velocity;
      player.stamina = Math.max(0, player.stamina - 15);
      
      io.to(matchId).emit('ball:shot', { playerId: socket.id, result: shotResult });
    });

    socket.on('disconnect', () => {
      matches.forEach((match, mId) => {
        if (match.players.has(socket.id)) {
          match.players.delete(socket.id);
          if (Array.from(match.players.values()).every((p: any) => p.isBot)) {
             matches.delete(mId);
          } else {
             io.to(mId).emit('match:update', { players: Array.from(match.players.values()) });
          }
        }
      });
    });
  });

  setInterval(() => {
    const dt = 1/30;
    matches.forEach(async (match, matchId) => {
      if (match.status === 'finished') return;

      const players = Array.from(match.players.values()) as any[];

      // AI Logic: Role Assignment System
      players.forEach(p => {
        if (p.isBot) {
          const now = Date.now();
          const hoop = p.team === 'A' ? { x: 3100, y: 450 } : { x: 100, y: 450 };
          
          if (match.ball.holder === p.id) {
            // Offensive AI
            const distToHoop = Math.hypot(hoop.x - p.x, hoop.y - p.y);
            if (distToHoop < 400 && now - p.lastAction > 1500) {
              p.joystick = { x: 0, y: 0 }; p.lastAction = now;
              const shotResult = BasketballCore.calculateShot({ releaseTiming: 0.5, shootingRating: 75, distance: distToHoop / 100 });
              match.ball.holder = null;
              const target = { x: hoop.x + (shotResult.made ? 0 : 50), y: hoop.y, z: 150 };
              const flight = BasketballCore.launchBall({ start: { x: p.x, y: p.y, z: 60 }, target, flightTime: 1.2 });
              match.ball.position = flight.position; match.ball.velocity = flight.velocity;
              io.to(matchId).emit('ball:shot', { playerId: p.id, result: shotResult });
            } else {
              const dx = hoop.x - p.x; const dy = hoop.y - p.y;
              const dist = Math.hypot(dx, dy);
              p.joystick = { x: dx / dist, y: dy / dist };
            }
          } else {
            // Defensive AI: Coordinated roles
            const ballHolder = players.find(pl => pl.id === match.ball.holder);
            if (ballHolder && ballHolder.team !== p.team) {
              const closestDefender = players.filter(pl => pl.team === p.team && pl.isBot).reduce((closest, current) => {
                 const dC = Math.hypot(ballHolder.x - current.x, ballHolder.y - current.y);
                 const dCl = Math.hypot(ballHolder.x - closest.x, ballHolder.y - closest.y);
                 return dC < dCl ? current : closest;
              }, players.find(pl => pl.team === p.team && pl.isBot));

              if (p.id === closestDefender?.id) {
                p.joystick = { x: (ballHolder.x - p.x) / Math.hypot(ballHolder.x - p.x, ballHolder.y - p.y), y: (ballHolder.y - p.y) / Math.hypot(ballHolder.x - p.x, ballHolder.y - p.y) };
                p.isDefending = true;
              } else if (Math.hypot(hoop.x - p.x, hoop.y - p.y) < 300) {
                p.joystick = { x: (hoop.x - p.x) / Math.hypot(hoop.x - p.x, hoop.y - p.y), y: (hoop.y - p.y) / Math.hypot(hoop.x - p.x, hoop.y - p.y) };
                p.isDefending = true;
              } else {
                const assignment = players.find(pl => pl.team !== p.team && !players.some(def => def.assignment === pl.id));
                if (assignment) {
                  p.joystick = { x: (assignment.x - p.x) / Math.hypot(assignment.x-p.x, assignment.y-p.y), y: (assignment.y - p.y) / Math.hypot(assignment.x-p.x, assignment.y-p.y) };
                }
              }
            } else {
              const ballPos = match.ball.position;
              const dx = ballPos.x - p.x; const dy = ballPos.y - p.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 10) p.joystick = { x: dx / dist, y: dy / dist };
              else p.joystick = { x: 0, y: 0 };
            }
          }
        }
      });

      // Update All Players (Humans and Bots)
      players.forEach((player: any) => {
        const accel = 0.8; const friction = 0.9;
        player.vx = (player.vx + player.joystick.x * accel) * friction;
        player.vy = (player.vy + player.joystick.y * accel) * friction;
        
        // Realistic "human" speed multiplier (was 6, now 3.5)
        player.x = Math.max(20, Math.min(3200 - 20, player.x + player.vx * 3.5));
        player.y = Math.max(150, Math.min(900 - 150, player.y + player.vy * 3.5));
        
        if (player.z > 0 || player.vz > 0) {
          player.z += player.vz; player.vz -= 0.6;
          if (player.z < 0) { player.z = 0; player.vz = 0; }
        }

        player.stamina = Math.max(0, Math.min(100, player.stamina + 0.1 - (Math.abs(player.vx) + Math.abs(player.vy)) * 0.05));
      });

      if (match.ball.holder) {
        const holder = match.players.get(match.ball.holder);
        if (holder) {
          match.ball.position = { x: holder.x, y: holder.y, z: holder.z + 40 };
          match.ball.velocity = { x: 0, y: 0, z: 0 };
        } else {
          match.ball.holder = null;
        }
      } else {
        BasketballCore.stepBall(match.ball, dt);
        players.forEach((player: any) => {
          const dist = Math.hypot(match.ball.position.x - player.x, match.ball.position.y - player.y);
          if (dist < 50 && match.ball.position.z < 100) {
            match.ball.holder = player.id;
          }
        });
      }

      const hoops = [{ x: 100, y: 450, z: 150, team: 'B' }, { x: 3100, y: 450, z: 150, team: 'A' }];
      hoops.forEach(h => {
        const dist = Math.hypot(match.ball.position.x - h.x, match.ball.position.y - h.y, match.ball.position.z - h.z);
        if (dist < 45 && match.ball.velocity.z < 0 && !match.ball.holder) {
          const shooter = match.ball.lastShooter ? match.players.get(match.ball.lastShooter) : null;
          const isHalfCourt = shooter && (
            (shooter.x < 1600 && h.team === 'A') || (shooter.x > 1600 && h.team === 'B')
          );
          const points = isHalfCourt ? 6 : 2;
          
          if (h.team === 'A') match.scoreA += points; else match.scoreB += points;
          
          match.ball.position = { x: 1600, y: 450, z: 0 }; 
          match.ball.velocity = { x: 0, y: 0, z: 0 };
          match.ball.holder = null;
          io.to(matchId).emit('goal', { team: h.team, points });
        }
      });

      match.timeLeft = Math.max(0, match.timeLeft - dt);
      
      if (match.timeLeft <= 0 && match.status !== 'finished') {
        match.status = 'finished';
        io.to(matchId).emit('match:finished', { scoreA: match.scoreA, scoreB: match.scoreB });
        saveMatchResults(match);
      }

      io.to(matchId).emit('match:update', { 
        players: Array.from(match.players.values()), 
        ball: match.ball, 
        scoreA: match.scoreA, 
        scoreB: match.scoreB, 
        timeLeft: match.timeLeft,
        status: match.status
      });
    });
  }, 1000/30);

  app.all(/.*/, (req, res) => {
    return handle(req, res);
  });

  httpServer.listen(3000, () => {
    console.log('XBA authoritative server listening on port 3000');
  });
});

