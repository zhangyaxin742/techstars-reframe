export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasRect extends CanvasPoint, CanvasSize {}

export type CanvasNodeKind =
  | "image"
  | "note"
  | "frame"
  | "prompt"
  | "brand-context"
  | "trend-recipe"
  | "timeline"
  | "media"
  | "preview";

export interface CanvasPromptBoxData {
  value?: string;
  placeholder?: string;
  actionLabel?: string;
  busyLabel?: string;
  badges?: string[];
  sourceImageUrl?: string;
  sourceAlt?: string;
  count?: number;
  mode?: "editing" | "collapsed";
  disabled?: boolean;
  busy?: boolean;
}

export interface CanvasNode {
  id: string;
  kind: CanvasNodeKind;
  title: string;
  body?: string;
  prompt?: CanvasPromptBoxData;
  imageUrl?: string;
  position: CanvasPoint;
  size: CanvasSize;
  createdAt?: number;
}

export interface CanvasConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
}

export interface CanvasViewportState {
  offset: CanvasPoint;
  zoom: number;
}

export interface CanvasViewportFocus {
  id: string;
  nodeIds: string[];
  padding?: number;
  minZoom?: number;
  maxZoom?: number;
  delayMs?: number;
  durationMs?: number;
}

export interface NodeMoveUpdate {
  nodeId: string;
  position: CanvasPoint;
}
