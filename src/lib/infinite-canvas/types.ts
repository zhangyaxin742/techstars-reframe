export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasRect extends CanvasPoint, CanvasSize {}

export interface CanvasViewportPadding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export type CanvasNodeKind =
  | "image"
  | "note"
  | "frame"
  | "prompt"
  | "brand-context"
  | "trend-recipe"
  | "timeline"
  | "media"
  | "video"
  | "preview";

export interface CanvasVideoData {
  src: string;
  label?: "trend" | "explore" | "media";
  meta?: string;
}

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
  video?: CanvasVideoData;
  position: CanvasPoint;
  size: CanvasSize;
  createdAt?: number;
}

export function isTrendSourceNode(node: CanvasNode) {
  return node.kind === "trend-recipe" || (node.kind === "video" && node.video?.label === "trend");
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
  padding?: number | CanvasViewportPadding;
  minZoom?: number;
  maxZoom?: number;
  delayMs?: number;
  durationMs?: number;
}

export interface NodeMoveUpdate {
  nodeId: string;
  position: CanvasPoint;
}
