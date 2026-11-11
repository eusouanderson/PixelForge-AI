export interface LogicalDimensions {
  width: number;
  height: number;
}

export interface OutputDimensions {
  width: number;
  height: number;
}

export type UpscalingAlgorithm =
  | 'nearest-neighbor'
  | 'scale2x'
  | 'scale3x'
  | 'intelligent';

export interface DetailEnhancementOptions {
  readonly enabled: boolean;
  readonly shadingStrength?: number;
  readonly outlinePreservation?: boolean;
}

export interface UpscaleRenderOptions {
  readonly scale?: number;
  readonly algorithm?: UpscalingAlgorithm;
  readonly detailEnhancement?: DetailEnhancementOptions;
  readonly targetWidth?: number;
  readonly targetHeight?: number;
}

export type ColorPalette = Record<string, string>;

export interface RectOperation {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface StrokeRectOperation {
  type: 'stroke_rect';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface LineOperation {
  type: 'line';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
}

export interface CircleOperation {
  type: 'circle';
  cx: number;
  cy: number;
  radius: number;
  color: string;
  fill?: boolean;
}

export interface PointsOperation {
  type: 'points';
  color: string;
  coordinates: [number, number][];
}

export interface PixelOperation {
  type: 'pixel';
  x: number;
  y: number;
  color: string;
}

export interface FillOperation {
  type: 'fill';
  color: string;
}

export interface SymmetryHorizontalOperation {
  type: 'symmetry_h';
  axisX?: number;
  operations: PixelArtOperation[];
}

export type PixelArtOperation =
  | RectOperation
  | StrokeRectOperation
  | LineOperation
  | CircleOperation
  | PointsOperation
  | PixelOperation
  | FillOperation
  | SymmetryHorizontalOperation;

export interface PixelArtLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
  operations: PixelArtOperation[];
}

export type LifeStage = 'ovo' | 'baby' | 'pre-adolescente' | 'adolescente' | 'adulto';

export interface PixelArtMetadata {
  author?: string;
  createdAt?: string;
  tags?: string[];
  creatureName?: string;
  lifeStage?: LifeStage | string;
  animation?: string;
  frame?: number;
}

export interface DeclarativePixelArt {
  $schema?: string;
  version: string;
  name: string;
  description: string;
  logicalDimensions: LogicalDimensions;
  palette: ColorPalette;
  layers: PixelArtLayer[];
  metadata?: PixelArtMetadata;
}
