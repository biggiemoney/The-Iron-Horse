
import { WheelSegment, Puzzle } from './types';

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { value: 5000, color: '#FFD700' }, // Gold
  { value: 'BANKRUPT', color: '#000000' },
  { value: 600, color: '#B22222' }, // Rust red
  { value: 700, color: '#228B22' }, // Forest green
  { value: 'LOSE_A_TURN', color: '#FFFFFF' },
  { value: 800, color: '#4682B4' }, // Steel blue
  { value: 900, color: '#D2691E' }, // Copper
  { value: 2500, color: '#FF4500' }, // Orange Red
  { value: 600, color: '#FFD700' },
  { value: 700, color: '#B22222' },
  { value: 600, color: '#228B22' },
  { value: 500, color: '#4682B4' },
  { value: 'BANKRUPT', color: '#000000' },
  { value: 900, color: '#D2691E' },
  { value: 700, color: '#FFD700' },
  { value: 800, color: '#B22222' },
  { value: 550, color: '#228B22' },
  { value: 400, color: '#4682B4' },
  { value: 600, color: '#D2691E' },
  { value: 500, color: '#FFD700' },
  { value: 300, color: '#B22222' },
  { value: 500, color: '#228B22' },
  { value: 800, color: '#4682B4' },
  { value: 300, color: '#D2691E' },
];

export const PUZZLES: Puzzle[] = [
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
  { category: "PHRASE", phrase: "FULL STEAM AHEAD" }
];

export const VOWELS = ['A', 'E', 'I', 'O', 'U'];
export const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');
