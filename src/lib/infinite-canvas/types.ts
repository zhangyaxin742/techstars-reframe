export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasRect extends CanvasPoint, CanvasSize {}

export type CanvasNodeKind = "image" | "note" | "frame";

export interface CanvasNode {
  id: string;
  kind: CanvasNodeKind;
  title: string;
  body?: string;
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

export interface NodeMoveUpdate {
  nodeId: string;
  position: CanvasPoint;
}
