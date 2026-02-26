
export type ShapeType = 
  | 'GALAXY' 
  | 'CUBE' 
  | 'WAVE';

export interface HandData {
  landmarks: any[];
  gesture: string;
  isFist: boolean;
  isOpen: boolean;
  isPinching: boolean;
  rotation: number;
  center: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  fingerCount: number;
}

export interface AppState {
  particleCount: number;
  currentShape: ShapeType;
  animationSpeed: number;
  colorPalette: string;
  physicsEnabled: boolean;
  particleSize: number;
  glowIntensity: number;
  isCameraMirrored: boolean;
  showSkeleton: boolean;
  isGestureActive: boolean;
}

export const PALETTES: Record<string, string[]> = {
  Rainbow: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#8b00ff'],
  Fire: ['#ff0000', '#ff4500', '#ff8c00', '#ffd700', '#fffacd'],
  Ocean: ['#000080', '#0000ff', '#00bfff', '#87ceeb', '#f0f8ff'],
  Cosmic: ['#000033', '#4b0082', '#9400d3', '#ff00ff', '#ff1493'],
  Forest: ['#006400', '#228b22', '#32cd32', '#90ee90', '#f0fff0'],
  Neon: ['#39ff14', '#fe019a', '#04d9ff', '#bc13fe', '#ff073a'],
  Gold: ['#ffd700', '#daa520', '#b8860b', '#cfb53b', '#8b4513'],
  Monochrome: ['#ffffff', '#cccccc', '#999999', '#666666', '#333333'],
};
