
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Modality } from "@google/genai";

// --- TYPES & CONSTANTS ---

enum GameStatus {
  IDLE = 'IDLE',
  SPINNING = 'SPINNING',
  LANDED = 'LANDED',
  PICKING_LETTER = 'PICKING_LETTER',
  SOLVING = 'SOLVING',
  GAMEOVER = 'GAMEOVER'
}

interface WheelSegment {
  value: number | 'BANKRUPT' | 'LOSE_A_TURN' | 'MILLION';
  color: string;
  labelColor?: string;
}

interface Player {
  id: number;
  name: string;
  score: number;
  bank: number;
}

const WHEEL_SEGMENTS: WheelSegment[] = [
  { value: 5000, color: '#D4AF37', labelColor: '#000' }, 
  { value: 'BANKRUPT', color: '#000000', labelColor: '#FFF' },
  { value: 600, color: '#8B0000' },
  { value: 700, color: '#006400' },
  { value: 'LOSE_A_TURN', color: '#FFFFFF', labelColor: '#000' },
  { value: 800, color: '#4682B4' },
  { value: 900, color: '#CD7F32' },
  { value: 2500, color: '#FF4500' },
  { value: 600, color: '#D4AF37', labelColor: '#000' },
  { value: 700, color: '#8B0000' },
  { value: 'MILLION', color: '#00FF7F', labelColor: '#000' },
  { value: 500, color: '#4682B4' },
  { value: 'BANKRUPT', color: '#000000', labelColor: '#FFF' },
  { value: 900, color: '#CD7F32' },
  { value: 700, color: '#D4AF37', labelColor: '#000' },
  { value: 800, color: '#8B0000' },
  { value: 550, color: '#006400' },
  { value: 400, color: '#4682B4' },
  { value: 600, color: '#CD7F32' },
  { value: 500, color: '#D4AF37', labelColor: '#000' },
  { value: 300, color: '#8B0000' },
  { value: 500, color: '#006400' },
  { value: 800, color: '#4682B4' },
  { value: 300, color: '#CD7F32' },
];

const PUZZLES = [
  { category: "RAILROAD TERM", phrase: "LOCOMOTIVE ENGINE" },
  { category: "PHRASE", phrase: "ALL ABOARD" },
  { category: "STATION", phrase: "GRAND CENTRAL TERMINAL" },
  { category: "RAILROAD TERM", phrase: "CABOOSE" },
  { category: "RAILROAD TERM", phrase: "CROSSING GUARD" },
  { category: "RAILROAD TERM", phrase: "STEAM WHISTLE" },
  { category: "PHRASE", phrase: "END OF THE LINE" },
  { category: "TRAIN PART", phrase: "COAL TENDER" },
  { category: "OCCUPATION", phrase: "TRAIN CONDUCTOR" },
  { category: "HISTORY", phrase: "TRANSCONTINENTAL RAILROAD" },
  { category: "RAILROAD TERM", phrase: "NARROW GAUGE" },
  { category: "PHRASE", phrase: "FULL STEAM AHEAD" },
  { category: "STATION", phrase: "UNION STATION" },
  { category: "TRAIN", phrase: "THE ORIENT EXPRESS" },
  { category: "RAILROAD TERM", phrase: "ROUNDHOUSE" }
];

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ'.split('').filter(l => !VOWELS.includes(l));

// --- UTILS ---

function shadeColor(color: string, percent: number) {
  let R = parseInt(color.substring(1,3),16);
  let G = parseInt(color.substring(3,5),16);
  let B = parseInt(color.substring(5,7),16);
  R = Math.floor(R * (100 + percent) / 100);
  G = Math.floor(G * (100 + percent) / 100);
  B = Math.floor(B * (100 + percent) / 100);
  R = (R<255)?R:255;  G = (G<255)?G:255;  B = (B<255)?B:255;
  const RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
  const GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
  const BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));
  return "#"+RR+GG+BB;
}

// --- SOUND ENGINE ---

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  toggleMute() { this.muted = !this.muted; return this.muted; }
  isMuted() { return this.muted; }

  playTick() {
    if (this.muted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  playSuccess() {
    if (this.muted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  playSteam() {
    if (this.muted) return;
    const ctx = this.getCtx();
    const bufferSize = 2 * ctx.sampleRate,
        noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate),
        output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    whiteNoise.start();
    whiteNoise.stop(ctx.currentTime + 1);
  }
}

const soundEngine = new SoundEngine();

// --- GEMINI NARRATOR ---

class GeminiNarrator {
  private audioContext: AudioContext | null = null;
  private isNarrating = false;

  private async getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (this.audioContext.state === 'suspended') await this.audioContext.resume();
    return this.audioContext;
  }

  async narrate(text: string, muted: boolean) {
    if (muted || this.isNarrating || !process.env.API_KEY) return;
    this.isNarrating = true;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: `You are a theatrical 19th-century train conductor on the Iron Horse Express. Narrate this briefly (max 10 words) with enthusiasm: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (typeof base64Audio === 'string') {
        const ctx = await this.getAudioContext();
        const buffer = await this.decodeAudioData(this.decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
      }
    } catch (e) { console.debug("Conductor signal lost."); } finally { this.isNarrating = false; }
  }

  private decode(b64: string) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext, rate: number, chans: number) {
    const int16 = new Int16Array(data.buffer);
    const count = int16.length / chans;
    const buffer = ctx.createBuffer(chans, count, rate);
    for (let c = 0; c < chans; c++) {
      const d = buffer.getChannelData(c);
      for (let i = 0; i < count; i++) d[i] = int16[i * chans + c] / 32768.0;
    }
    return buffer;
  }
}

const narrator = new GeminiNarrator();

// --- COMPONENTS ---

const Wheel: React.FC<{ 
  isSpinning: boolean, 
  onSpinEnd: (s: WheelSegment) => void, 
  disabled: boolean, 
  onSpinStart: () => void 
}> = ({ isSpinning, onSpinEnd, disabled, onSpinStart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const segmentAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const radius = canvas.width / 2;
    const centerX = radius;
    const centerY = radius;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Shadow
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 5, 0, Math.PI * 2);
    ctx.shadowBlur = 30;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.restore();

    // Wheel Base
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationRef.current);

    WHEEL_SEGMENTS.forEach((s, i) => {
      const start = i * segmentAngle;
      const end = start + segmentAngle;
      
      // Wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 20, start, end);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius - 20);
      grad.addColorStop(0, s.color);
      grad.addColorStop(1, s.color === '#000000' ? '#111' : shadeColor(s.color, -15));
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.rotate(start + segmentAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = s.labelColor || '#fff';
      ctx.font = 'bold 16px "Staatliches", sans-serif';
      const val = s.value === 'MILLION' ? '$1,000,000' : s.value === 'LOSE_A_TURN' ? 'LOSE TURN' : s.value.toString();
      ctx.fillText(val, radius - 50, 6);
      ctx.restore();

      // Pegs
      ctx.save();
      ctx.rotate(start);
      ctx.beginPath();
      ctx.arc(radius - 12, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#BBB';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#000';
      ctx.fill();
      ctx.restore();
    });

    // Hub
    ctx.restore();
    ctx.save();
    ctx.translate(centerX, centerY);
    const hubGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 70);
    hubGrad.addColorStop(0, '#888');
    hubGrad.addColorStop(0.5, '#222');
    hubGrad.addColorStop(1, '#000');
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 14px "Staatliches"';
    ctx.textAlign = 'center';
    ctx.fillText('IRON HORSE', 0, -12);
    ctx.font = 'bold 28px "Staatliches"';
    ctx.fillText('SPIN', 0, 20);
    ctx.restore();

    // Indicator
    ctx.beginPath();
    ctx.moveTo(centerX - 15, 0);
    ctx.lineTo(centerX + 15, 0);
    ctx.lineTo(centerX, 45);
    ctx.closePath();
    ctx.fillStyle = '#C00';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#000';
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [segmentAngle]);

  const animate = useCallback(() => {
    if (velocityRef.current > 0) {
      rotationRef.current += velocityRef.current;
      velocityRef.current *= 0.96; 

      const currentSegment = Math.floor((rotationRef.current % (2 * Math.PI)) / (segmentAngle));
      if (currentSegment !== lastTickRef.current) {
        soundEngine.playTick();
        lastTickRef.current = currentSegment;
      }

      if (velocityRef.current < 0.0015) {
        velocityRef.current = 0;
        const finalRot = rotationRef.current % (2 * Math.PI);
        const indicatorPos = (1.5 * Math.PI - finalRot + 4 * Math.PI) % (2 * Math.PI);
        onSpinEnd(WHEEL_SEGMENTS[Math.floor(indicatorPos / segmentAngle)]);
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
      draw();
    }
  }, [onSpinEnd, segmentAngle, draw]);

  const spin = () => {
    if (disabled || isSpinning) return;
    onSpinStart();
    velocityRef.current = 0.5 + Math.random() * 0.5;
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => { draw(); }, [draw]);

  return (
    <div onClick={spin} className={`relative select-none ${disabled ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-300'}`}>
      <canvas ref={canvasRef} width={500} height={500} className="rounded-full max-w-[90vw] h-auto" />
    </div>
  );
};

const Board: React.FC<{ phrase: string, guessed: string[], category: string }> = ({ phrase, guessed, category }) => (
  <div className="w-full max-w-7xl p-6 md:p-12 bg-zinc-900 border-[8px] border-zinc-800 rounded-[3rem] shadow-2xl flex flex-col items-center perspective-1000">
    <div className="mb-8 uppercase text-xs md:text-xl text-yellow-600 font-bold tracking-[0.4em] vintage-font px-10 py-2 bg-zinc-950 border border-zinc-800 rounded-full shadow-inner">
      {category}
    </div>
    <div className="flex flex-wrap justify-center gap-x-2 gap-y-3 md:gap-x-4 md:gap-y-6">
      {phrase.split(' ').map((word, wi) => (
        <div key={wi} className="flex gap-1 md:gap-2">
          {word.split('').map((c, ci) => {
            const isLetter = /[a-zA-Z]/.test(c);
            const revealed = !isLetter || guessed.includes(c.toUpperCase());
            return (
              <div key={`${wi}-${ci}`} className={`w-8 h-12 md:w-16 md:h-24 flex items-center justify-center border-2 md:border-4 rounded-lg shadow-inner transition-all duration-700 transform ${revealed ? 'bg-white border-zinc-300 rotate-0' : 'bg-green-900 border-green-800 rotate-y-180'}`}>
                <span className={`text-2xl md:text-6xl railroad-font font-bold leading-none ${revealed ? 'text-zinc-900' : 'opacity-0'}`}>
                  {c}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  </div>
);

// --- MAIN APP ---

const App: React.FC = () => {
  const [gameState, setGameState] = useState<{
    players: Player[];
    currentIndex: number;
    puzzle: { category: string, phrase: string };
    guessed: string[];
    status: GameStatus;
    wheelValue: WheelSegment | null;
    message: string;
    solveInput: string;
    isMuted: boolean;
  }>({
    players: [
      { id: 1, name: "CONDUCTOR", score: 0, bank: 0 }, 
      { id: 2, name: "ENGINEER", score: 0, bank: 0 }
    ],
    currentIndex: 0,
    puzzle: PUZZLES[Math.floor(Math.random() * PUZZLES.length)],
    guessed: [],
    status: GameStatus.IDLE,
    wheelValue: null,
    message: "Player 1, start the journey!",
    solveInput: "",
    isMuted: false
  });

  const cp = gameState.players[gameState.currentIndex];

  const handleMute = () => {
    const m = soundEngine.toggleMute();
    setGameState(s => ({ ...s, isMuted: m }));
  };

  const nextTurn = useCallback((msg: string, resetBank: boolean = false) => {
    setGameState(s => {
      const np = [...s.players];
      if (resetBank) np[s.currentIndex].bank = 0;
      return {
        ...s,
        players: np,
        status: GameStatus.IDLE,
        currentIndex: (s.currentIndex + 1) % s.players.length,
        message: msg
      };
    });
  }, []);

  const handleSpinEnd = (seg: WheelSegment) => {
    soundEngine.playSteam();
    setGameState(s => ({ ...s, status: GameStatus.LANDED, wheelValue: seg }));
    
    setTimeout(() => {
      if (seg.value === 'BANKRUPT') {
        narrator.narrate("Bankrupt! Off the rails!", gameState.isMuted);
        nextTurn("BANKRUPT! Wiped clean.", true);
      } else if (seg.value === 'LOSE_A_TURN') {
        narrator.narrate("Lose a turn! Stalled!", gameState.isMuted);
        nextTurn("LOSE A TURN! Next station.");
      } else {
        const val = seg.value === 'MILLION' ? "One Million Dollars" : `$${seg.value}`;
        narrator.narrate(`Spun ${val}! Pick a consonant.`, gameState.isMuted);
        setGameState(s => ({ 
          ...s, 
          status: GameStatus.PICKING_LETTER, 
          wheelValue: seg, 
          message: `Spun ${val}! Pick a letter.` 
        }));
      }
    }, 2000);
  };

  const handlePick = (l: string) => {
    const isV = VOWELS.includes(l);
    const count = gameState.puzzle.phrase.toUpperCase().split(l).length - 1;
    
    if (isV && cp.bank < 250) return;

    setGameState(s => {
      const ng = [...s.guessed, l];
      const np = [...s.players];
      let ni = s.currentIndex;
      let ns = GameStatus.PICKING_LETTER;
      let msg = "";

      if (count > 0) {
        soundEngine.playSuccess();
        if (isV) np[s.currentIndex].bank -= 250;
        else if (s.wheelValue) {
          const val = s.wheelValue.value === 'MILLION' ? 10000 : s.wheelValue.value as number;
          np[s.currentIndex].bank += val * count;
        }
        narrator.narrate(`Found ${count} ${l}'s!`, s.isMuted);
        msg = `Nice! Found ${count} ${l}'s. Spin again or solve!`;
        ns = GameStatus.PICKING_LETTER;
      } else {
        if (isV) np[s.currentIndex].bank -= 250;
        narrator.narrate(`No ${l}'s found.`, s.isMuted);
        msg = `No ${l}'s. Switching turns.`;
        ni = (s.currentIndex + 1) % s.players.length;
        ns = GameStatus.IDLE;
      }

      const pChars = Array.from(new Set(s.puzzle.phrase.toUpperCase().replace(/[^A-Z]/g, '')));
      if (pChars.every(c => ng.includes(c))) {
        ns = GameStatus.GAMEOVER;
        np[s.currentIndex].score += np[s.currentIndex].bank;
        narrator.narrate("All aboard! Puzzle solved!", s.isMuted);
        msg = `VICTORY! ${np[s.currentIndex].name} SOLVED IT!`;
      }

      return { ...s, players: np, guessed: ng, status: ns, currentIndex: ni, message: msg, wheelValue: (count > 0 ? s.wheelValue : null) };
    });
  };

  const submitSolve = () => {
    const guess = gameState.solveInput.toUpperCase().trim();
    const actual = gameState.puzzle.phrase.toUpperCase().trim();
    if (guess === actual) {
      narrator.narrate("Full steam ahead! Correct!", gameState.isMuted);
      setGameState(s => {
        const np = [...s.players];
        np[s.currentIndex].score += np[s.currentIndex].bank;
        return { ...s, status: GameStatus.GAMEOVER, players: np, message: `CORRECT! ${cp.name} WINS!` };
      });
    } else {
      narrator.narrate("Wrong track! Next player!", gameState.isMuted);
      nextTurn("Incorrect solution! Turn passed.");
      setGameState(s => ({ ...s, solveInput: "" }));
    }
  };

  const showWheel = gameState.status === GameStatus.IDLE || gameState.status === GameStatus.SPINNING || gameState.status === GameStatus.LANDED;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans select-none overflow-hidden">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-[100] bg-zinc-950/95 backdrop-blur-md border-b-2 border-zinc-800 p-4 md:p-6 flex justify-between items-center h-28 md:h-36">
        <div className="flex flex-col">
          <h1 className="railroad-font text-3xl md:text-5xl text-red-700 tracking-tighter leading-none">THE IRON HORSE</h1>
          <p className="vintage-font text-[8px] md:text-[10px] text-zinc-500 uppercase tracking-[0.4em] mt-1">Industrial Word Tycoon</p>
        </div>

        <div className="hidden lg:flex flex-1 justify-center px-10">
          <div className="bg-black/80 border-2 border-zinc-800 px-8 py-3 rounded-full shadow-inner">
             <p className="vintage-font text-yellow-500 text-lg italic tracking-widest uppercase truncate max-w-md">"{gameState.message}"</p>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          {gameState.players.map((p, i) => (
            <div key={p.id} className={`p-2 md:p-4 border-b-4 rounded-xl flex items-center gap-2 md:gap-6 transition-all duration-300 ${gameState.currentIndex === i ? 'bg-zinc-800 border-yellow-500 scale-105 shadow-lg shadow-yellow-500/20' : 'opacity-30 grayscale'}`}>
              <div className="flex flex-col">
                <span className="text-[10px] md:text-xs railroad-font uppercase text-zinc-400">{p.name}</span>
                <span className="text-[12px] md:text-sm font-bold text-green-600">${p.score}</span>
              </div>
              <div className="text-xl md:text-4xl text-yellow-500 railroad-font tabular-nums">${p.bank}</div>
            </div>
          ))}
          <button onClick={handleMute} className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors text-xl">
            {gameState.isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      {/* MOBILE MSG */}
      <div className="lg:hidden mt-32 p-4 bg-zinc-900/50 text-center border-b border-zinc-800">
         <p className="vintage-font text-yellow-500 text-sm italic">"{gameState.message}"</p>
      </div>

      {/* MAIN GAME BOARD AREA */}
      <main className="flex-1 mt-4 md:mt-40 p-4 md:p-8 flex flex-col items-center justify-center gap-8">
        <Board phrase={gameState.puzzle.phrase} guessed={gameState.guessed} category={gameState.puzzle.category} />

        <div className="w-full max-w-6xl bg-zinc-900/40 p-8 rounded-[3rem] border-2 border-zinc-800 backdrop-blur-sm grid grid-cols-1 xl:grid-cols-[1fr_1fr_200px] gap-8">
          <div className="flex flex-wrap justify-center gap-3">
            {CONSONANTS.map(l => (
              <button 
                key={l} 
                disabled={gameState.status !== GameStatus.PICKING_LETTER || gameState.guessed.includes(l)} 
                onClick={() => handlePick(l)}
                className={`w-12 h-12 md:w-16 md:h-16 rounded-xl text-xl md:text-3xl font-bold transition-all transform active:scale-90 ${gameState.guessed.includes(l) ? 'bg-zinc-800 text-zinc-600 opacity-40' : gameState.status === GameStatus.PICKING_LETTER ? 'bg-zinc-200 text-black hover:bg-yellow-500 hover:-translate-y-1' : 'bg-zinc-800/20 text-zinc-700 opacity-20'}`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-6 justify-center">
            <div className="flex flex-wrap justify-center gap-3">
              {VOWELS.map(l => (
                <button 
                  key={l} 
                  disabled={gameState.status !== GameStatus.PICKING_LETTER || gameState.guessed.includes(l) || cp.bank < 250} 
                  onClick={() => handlePick(l)}
                  className={`w-12 h-12 md:w-16 md:h-16 rounded-xl text-xl md:text-3xl font-bold transition-all transform active:scale-90 ${gameState.guessed.includes(l) ? 'bg-zinc-800 text-zinc-600 opacity-40' : gameState.status === GameStatus.PICKING_LETTER && cp.bank >= 250 ? 'bg-blue-400 text-blue-950 hover:bg-blue-300 hover:-translate-y-1' : 'bg-zinc-800/20 text-zinc-700 opacity-20'}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="text-center">
              <span className="vintage-font text-xs text-blue-500 font-bold uppercase tracking-widest">Buy Vowel $250</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={() => setGameState(s => ({ ...s, status: GameStatus.IDLE }))} 
              disabled={gameState.status !== GameStatus.PICKING_LETTER}
              className="py-6 bg-yellow-600 hover:bg-yellow-500 text-black railroad-font text-4xl rounded-2xl border-b-8 border-yellow-800 disabled:opacity-20"
            >
              SPIN
            </button>
            <button 
              onClick={() => setGameState(s => ({ ...s, status: GameStatus.SOLVING }))} 
              disabled={gameState.status !== GameStatus.PICKING_LETTER}
              className="py-6 bg-red-700 hover:bg-red-600 text-white railroad-font text-4xl rounded-2xl border-b-8 border-red-900 disabled:opacity-20"
            >
              SOLVE
            </button>
          </div>
        </div>
      </main>

      {/* WHEEL OVERLAY */}
      {showWheel && (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl transition-opacity duration-500 ${gameState.status === GameStatus.LANDED ? 'bg-black/40' : ''}`}>
          <div className={`flex flex-col items-center gap-12 transition-all duration-700 transform ${gameState.status === GameStatus.LANDED ? 'scale-[2] rotate-12 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}>
            <h2 className="railroad-font text-5xl md:text-7xl text-yellow-500 animate-pulse tracking-widest uppercase">
              {gameState.status === GameStatus.SPINNING ? 'Rolling the Rails...' : 'Spin the Wheel'}
            </h2>
            <Wheel 
              isSpinning={gameState.status === GameStatus.SPINNING} 
              onSpinStart={() => setGameState(s => ({ ...s, status: GameStatus.SPINNING }))} 
              onSpinEnd={handleSpinEnd} 
              disabled={gameState.status !== GameStatus.IDLE} 
            />
            <div className="railroad-font text-zinc-400 text-xl tracking-[0.5em] uppercase">
               Click to Dispatch Train
            </div>
          </div>

          {/* CLOSE-UP WEDGE */}
          {gameState.status === GameStatus.LANDED && gameState.wheelValue && (
            <div className="absolute inset-0 z-[300] flex items-center justify-center animate-in zoom-in-150 duration-500">
               <div className="flex flex-col items-center gap-8 transform rotate-[-5deg]">
                 <div 
                   className="w-[80vw] max-w-2xl aspect-[2/1] rounded-[2rem] border-[12px] border-white/20 shadow-[0_0_100px_rgba(255,255,255,0.2)] flex flex-col items-center justify-center transition-all duration-300"
                   style={{ backgroundColor: gameState.wheelValue.color }}
                 >
                   <span className="vintage-font text-white/40 text-2xl uppercase tracking-[1em] mb-4">LANDED ON</span>
                   <span className="railroad-font text-8xl md:text-[12rem] text-white drop-shadow-2xl">
                     {gameState.wheelValue.value === 'MILLION' ? '$1,000,000' : gameState.wheelValue.value === 'BANKRUPT' ? 'BANKRUPT' : gameState.wheelValue.value === 'LOSE_A_TURN' ? 'LOSE' : `$${gameState.wheelValue.value}`}
                   </span>
                   {gameState.wheelValue.value === 'LOSE_A_TURN' && <span className="railroad-font text-4xl text-white">A TURN</span>}
                 </div>
                 <div className="h-1 w-[100vw] bg-yellow-500 shadow-[0_0_50px_#EAB308]"></div>
               </div>
            </div>
          )}
        </div>
      )}

      {/* SOLVE MODAL */}
      {gameState.status === GameStatus.SOLVING && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/95 p-6 backdrop-blur-2xl">
          <div className="bg-zinc-900 border-[10px] border-yellow-700 p-10 md:p-20 rounded-[4rem] shadow-2xl w-full max-w-5xl flex flex-col items-center gap-12">
            <h2 className="railroad-font text-6xl md:text-8xl text-yellow-500 uppercase tracking-tighter text-center">Wire Telegram</h2>
            <p className="vintage-font text-zinc-400 text-xl text-center">Dispatch the full phrase to claim victory!</p>
            <input 
              autoFocus 
              className="w-full bg-black border-4 border-zinc-700 p-8 md:p-12 rounded-[2rem] text-4xl md:text-7xl railroad-font text-white text-center focus:border-yellow-500 focus:outline-none tracking-[0.2em] uppercase" 
              placeholder="..." 
              value={gameState.solveInput} 
              onChange={e => setGameState(s => ({ ...s, solveInput: e.target.value }))} 
              onKeyDown={(e) => e.key === 'Enter' && submitSolve()} 
            />
            <div className="flex gap-8 w-full flex-col md:flex-row">
              <button onClick={() => setGameState(s => ({ ...s, status: GameStatus.PICKING_LETTER, solveInput: "" }))} className="flex-1 py-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 railroad-font text-3xl rounded-2xl border-b-4 border-zinc-950">CANCEL</button>
              <button onClick={submitSolve} className="flex-[2] py-8 bg-yellow-600 hover:bg-yellow-500 text-black railroad-font text-6xl rounded-2xl shadow-2xl border-b-8 border-yellow-800 transition-transform active:translate-y-1">SUBMIT</button>
            </div>
          </div>
        </div>
      )}

      {/* GAMEOVER MODAL */}
      {gameState.status === GameStatus.GAMEOVER && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6">
          <div className="text-center flex flex-col items-center gap-12 animate-in zoom-in duration-700">
            <div className="bg-yellow-600 text-black px-12 py-4 railroad-font text-4xl rounded-full animate-bounce">VICTORY REACHED!</div>
            <h2 className="railroad-font text-8xl md:text-[12rem] text-white leading-tight">ALL ABOARD!</h2>
            <p className="vintage-font text-yellow-500 text-4xl">{cp.name} WINS THE ROUND</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-24 py-12 bg-red-700 hover:bg-red-600 text-white railroad-font text-6xl rounded-[4rem] shadow-2xl border-b-[16px] border-red-900 active:translate-y-2 active:border-b-0 transition-all"
            >
              NEXT DEPOT
            </button>
          </div>
        </div>
      )}

      <footer className="p-10 text-center text-zinc-800 text-[10px] uppercase tracking-[1em] opacity-40">
        Iron Horse Word Engine • Established 1894
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
