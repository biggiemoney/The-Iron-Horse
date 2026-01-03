
import React from 'react';

interface BoardProps {
  phrase: string;
  guessedLetters: string[];
  category: string;
}

const Board: React.FC<BoardProps> = ({ phrase, guessedLetters, category }) => {
  const words = phrase.split(' ');

  return (
    <div className="w-full max-w-2xl p-2 bg-zinc-900/60 border-2 border-zinc-800 rounded shadow-2xl flex flex-col items-center">
      <div className="mb-2 bg-zinc-950 px-3 py-0.5 border border-zinc-800 rounded">
        <span className="vintage-font text-yellow-700 text-[10px] uppercase tracking-widest">{category}</span>
      </div>
      
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-2">
        {words.map((word, wordIdx) => (
          <div key={wordIdx} className="flex gap-1">
            {word.split('').map((char, charIdx) => {
              const isGuessed = guessedLetters.includes(char.toUpperCase());
              const isPunctuation = !/[a-zA-Z]/.test(char);
              
              return (
                <div
                  key={charIdx}
                  className={`w-6 h-8 md:w-8 md:h-11 flex items-center justify-center border rounded-sm transition-all duration-300
                    ${isGuessed || isPunctuation ? 'bg-zinc-100 border-zinc-300' : 'bg-green-950/40 border-green-900 shadow-inner'}`}
                >
                  <span className={`text-lg md:text-xl railroad-font font-bold
                    ${isGuessed || isPunctuation ? 'text-zinc-950' : 'opacity-0'}`}>
                    {char}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Board;
