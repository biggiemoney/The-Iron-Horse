
import React from 'react';
import { CONSONANTS, VOWELS } from '../constants';
import { GameStatus } from '../types';

interface ControlsProps {
  // Fix: Use GameStatus enum instead of string union to match App state
  status: GameStatus;
  guessedLetters: string[];
  onPickLetter: (letter: string) => void;
  canBuyVowel: boolean;
  onSolve: () => void;
  currentWheelValue: any;
}

const Controls: React.FC<ControlsProps> = ({ 
  status, 
  guessedLetters, 
  onPickLetter, 
  canBuyVowel, 
  onSolve,
}) => {
  const isGuessing = status === GameStatus.PICKING_LETTER;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px] gap-4 items-end">
      {/* Consonants */}
      <div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {CONSONANTS.map(l => (
            <button
              key={l}
              disabled={!isGuessing || guessedLetters.includes(l)}
              onClick={() => onPickLetter(l)}
              className={`w-8 h-8 rounded text-sm font-bold transition-all
                ${guessedLetters.includes(l) 
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-40' 
                  : isGuessing 
                    ? 'bg-zinc-300 text-zinc-900 hover:bg-yellow-500 hover:scale-110 shadow active:translate-y-0.5' 
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Vowels */}
      <div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {VOWELS.map(l => (
            <button
              key={l}
              disabled={!canBuyVowel || guessedLetters.includes(l)}
              onClick={() => onPickLetter(l)}
              className={`w-8 h-8 rounded text-sm font-bold transition-all
                ${guessedLetters.includes(l) 
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-40' 
                  : canBuyVowel 
                    ? 'bg-blue-300 text-blue-900 hover:bg-blue-400 hover:scale-110 shadow active:translate-y-0.5' 
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="text-center mt-1">
           <span className="vintage-font text-[9px] text-zinc-500 uppercase tracking-tighter">Vowels $250</span>
        </div>
      </div>

      {/* Action */}
      <div className="flex flex-col gap-2">
         <button
           onClick={onSolve}
           // Fix: Use GameStatus enum for comparisons
           disabled={status !== GameStatus.IDLE && status !== GameStatus.PICKING_LETTER}
           className={`w-full py-3 railroad-font text-lg rounded border-b-2 transition-all
             ${status === GameStatus.IDLE || status === GameStatus.PICKING_LETTER
               ? 'bg-green-700 border-green-900 text-white hover:bg-green-600 active:translate-y-0.5'
               : 'bg-zinc-800 border-zinc-900 text-zinc-600 cursor-not-allowed'}`}
         >
           SOLVE
         </button>
      </div>
    </div>
  );
};

export default Controls;
