
export enum GameStatus {
  IDLE = 'IDLE',
  SPINNING = 'SPINNING',
  PICKING_LETTER = 'PICKING_LETTER',
  SOLVING = 'SOLVING',
  GAMEOVER = 'GAMEOVER'
}

export interface Player {
  id: number;
  name: string;
  score: number;
  bank: number;
}

export interface WheelSegment {
  value: number | 'BANKRUPT' | 'LOSE_A_TURN';
  color: string;
}

export interface Puzzle {
  category: string;
  phrase: string;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  puzzle: Puzzle;
  guessedLetters: string[];
  status: GameStatus;
  wheelValue: WheelSegment | null;
  message: string;
}
