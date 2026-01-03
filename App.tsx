
import React, { useState, useCallback } from 'react';
import Wheel from './components/Wheel';
import Board from './components/Board';
import Controls from './components/Controls';
import { PUZZLES, VOWELS } from './constants';
import { GameStatus, GameState, WheelSegment } from './types';
import { narrator } from './services/gemini';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    players: [
      { id: 1, name: "CONDUCTOR 1", score: 0, bank: 0 },
      { id: 2, name: "ENGINEER 2", score: 0, bank: 0 }
    ],
    currentPlayerIndex: 0,
    puzzle: PUZZLES[Math.floor(Math.random() * PUZZLES.length)],
    guessedLetters: [],
    status: GameStatus.IDLE,
    wheelValue: null,
    message: "Player 1, spin the hub!"
  });

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  const handleSpinStart = useCallback(() => {
    setGameState(prev => ({ 
      ...prev, 
      status: GameStatus.SPINNING,
      message: `${currentPlayer.name} is spinning...`
    }));
  }, [currentPlayer.name]);

  const handleSpinEnd = useCallback((segment: WheelSegment) => {
    if (segment.value === 'BANKRUPT') {
      narrator.narrate("Bankrupt! Off the tracks!");
      setGameState(prev => {
        const newPlayers = [...prev.players];
        newPlayers[prev.currentPlayerIndex].bank = 0;
        return {
          ...prev,
          players: newPlayers,
          status: GameStatus.IDLE,
          wheelValue: null,
          currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length,
          message: "BANKRUPT! Next turn."
        };
      });
    } else if (segment.value === 'LOSE_A_TURN') {
      narrator.narrate("Stalled at the station!");
      setGameState(prev => ({
        ...prev,
        status: GameStatus.IDLE,
        wheelValue: null,
        currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length,
        message: "LOSE A TURN!"
      }));
    } else {
      narrator.narrate(`Spun for ${segment.value}!`);
      setGameState(prev => ({
        ...prev,
        status: GameStatus.PICKING_LETTER,
        wheelValue: segment,
        message: `Spun ${segment.value}! Pick a consonant.`
      }));
    }
  }, []);

  const handlePickLetter = useCallback((letter: string) => {
    const isVowel = VOWELS.includes(letter);
    const puzzleUpper = gameState.puzzle.phrase.toUpperCase();
    const count = puzzleUpper.split('').filter(char => char === letter).length;

    if (isVowel && currentPlayer.bank < 250) {
      setGameState(prev => ({ ...prev, message: "Need $250 for a vowel!" }));
      return;
    }

    setGameState(prev => {
      const newGuessed = [...prev.guessedLetters, letter];
      const newPlayers = [...prev.players];
      let nextStatus = GameStatus.IDLE;
      let nextPlayerIndex = prev.currentPlayerIndex;
      let newMessage = "";

      if (count > 0) {
        if (isVowel) {
          newPlayers[prev.currentPlayerIndex].bank -= 250;
        } else if (prev.wheelValue && typeof prev.wheelValue.value === 'number') {
          newPlayers[prev.currentPlayerIndex].bank += prev.wheelValue.value * count;
        }
        
        narrator.narrate(`${count} ${letter}'s found!`);
        newMessage = `Correct! ${count} ${letter}'s. Spin or solve.`;
        nextPlayerIndex = prev.currentPlayerIndex;
      } else {
        if (isVowel) newPlayers[prev.currentPlayerIndex].bank -= 250;
        narrator.narrate(`No ${letter}'s. Switching tracks.`);
        newMessage = `No ${letter}'s. Next player.`;
        nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
      }

      const uniqueLettersInPuzzle = Array.from(new Set(puzzleUpper.replace(/\s/g, '')));
      const allFound = uniqueLettersInPuzzle.every(l => newGuessed.includes(l));

      if (allFound) {
        nextStatus = GameStatus.GAMEOVER;
        newPlayers[prev.currentPlayerIndex].score += newPlayers[prev.currentPlayerIndex].bank;
        newMessage = `Solved! ${newPlayers[prev.currentPlayerIndex].name} wins!`;
        narrator.narrate("All aboard! Puzzle solved!");
      }

      return {
        ...prev,
        players: newPlayers,
        guessedLetters: newGuessed,
        status: nextStatus,
        currentPlayerIndex: nextPlayerIndex,
        wheelValue: null,
        message: newMessage
      };
    });
  }, [gameState.puzzle.phrase, gameState.guessedLetters, gameState.wheelValue, gameState.players, gameState.currentPlayerIndex, currentPlayer.bank]);

  const handleSolve = useCallback(() => {
    const solution = prompt("Solve the puzzle:");
    if (!solution) return;

    if (solution.toUpperCase() === gameState.puzzle.phrase.toUpperCase()) {
      narrator.narrate("Full steam ahead! Correct!");
      setGameState(prev => {
        const newPlayers = [...prev.players];
        newPlayers[prev.currentPlayerIndex].score += newPlayers[prev.currentPlayerIndex].bank;
        return {
          ...prev,
          status: GameStatus.GAMEOVER,
          message: `CORRECT! ${newPlayers[prev.currentPlayerIndex].name} wins!`
        };
      });
    } else {
      narrator.narrate("Wrong track!");
      setGameState(prev => ({
        ...prev,
        currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length,
        message: "Wrong! Next player."
      }));
    }
  }, [gameState.puzzle.phrase]);

  const restartGame = () => {
    setGameState({
      players: [
        { id: 1, name: "CONDUCTOR 1", score: 0, bank: 0 },
        { id: 2, name: "ENGINEER 2", score: 0, bank: 0 }
      ],
      currentPlayerIndex: 0,
      puzzle: PUZZLES[Math.floor(Math.random() * PUZZLES.length)],
      guessedLetters: [],
      status: GameStatus.IDLE,
      wheelValue: null,
      message: "New round! Player 1, spin!"
    });
  };

  return (
    <div className="h-screen bg-[#070707] text-zinc-100 flex flex-col overflow-hidden">
      {/* Header - Very Slim */}
      <header className="px-4 py-1.5 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚂</span>
          <div>
            <h1 className="railroad-font text-2xl text-red-700 tracking-tighter leading-none">THE IRON HORSE</h1>
          </div>
        </div>

        {/* Floating Message Area */}
        <div className="hidden md:flex flex-1 justify-center px-4">
           <div className="bg-black/40 px-6 py-1 rounded-full border border-zinc-800">
              <p className="serif-font text-xs italic text-yellow-500/90 leading-none">"{gameState.message}"</p>
           </div>
        </div>
        
        <div className="flex gap-2">
           {gameState.players.map((player, idx) => (
             <div 
               key={player.id}
               className={`px-3 py-1 rounded border-b transition-all flex items-center gap-3
                 ${gameState.currentPlayerIndex === idx 
                   ? 'bg-zinc-800 border-yellow-500 scale-105 shadow shadow-yellow-900/30' 
                   : 'bg-zinc-900/30 border-zinc-800 opacity-40'}`}
             >
               <div className="flex flex-col">
                 <span className="railroad-font text-[10px] text-zinc-300">{player.name}</span>
                 <span className="vintage-font text-[8px] text-green-700 font-bold">${player.score}</span>
               </div>
               <div className="railroad-font text-lg text-yellow-500">${player.bank}</div>
             </div>
           ))}
        </div>
      </header>

      {/* Main Play Area */}
      <main className="flex-1 p-2 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 max-h-full overflow-hidden">
        
        {/* Left: Board & Keyboard */}
        <div className="flex flex-col gap-2 overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-2">
            <Board 
              phrase={gameState.puzzle.phrase} 
              guessedLetters={gameState.guessedLetters} 
              category={gameState.puzzle.category} 
            />
          </div>
          
          <div className="bg-zinc-900/30 p-2 rounded border border-zinc-800/40">
             <div className="md:hidden flex items-center justify-center mb-2">
                <p className="serif-font text-[10px] italic text-yellow-600/80">"{gameState.message}"</p>
             </div>
             <Controls 
               status={gameState.status}
               guessedLetters={gameState.guessedLetters}
               onPickLetter={handlePickLetter}
               canBuyVowel={gameState.status === GameStatus.IDLE || gameState.status === GameStatus.PICKING_LETTER}
               onSolve={handleSolve}
               currentWheelValue={gameState.wheelValue}
             />
          </div>
        </div>

        {/* Right: Wheel & Game Over */}
        <div className="flex flex-col items-center justify-center gap-4 border-l border-zinc-800/20 pl-2">
          {gameState.status === GameStatus.GAMEOVER ? (
            <div className="bg-zinc-900 p-6 rounded-xl border border-yellow-700 text-center shadow-2xl">
              <h2 className="railroad-font text-3xl text-yellow-500 mb-4">ROUND OVER!</h2>
              <button 
                onClick={restartGame}
                className="w-full py-3 bg-red-800 hover:bg-red-700 text-white railroad-font text-2xl rounded-lg transition-all shadow-xl active:translate-y-0.5"
              >
                NEXT TRAIN
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Wheel 
                isSpinning={gameState.status === GameStatus.SPINNING}
                onSpinStart={handleSpinStart}
                onSpinEnd={handleSpinEnd}
                disabled={gameState.status !== GameStatus.IDLE}
              />
              <span className="railroad-font text-zinc-600 text-[10px] tracking-widest">
                {gameState.status === GameStatus.SPINNING ? 'TRAIN RUMBLING...' : 'CLICK HUB TO SPIN'}
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
