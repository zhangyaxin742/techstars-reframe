import type { CanvasConnection, CanvasNode } from "@/src/components/infinite-canvas";

const previewOne =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23e2e8f0'/%3E%3Ccircle cx='180' cy='140' r='88' fill='%230e7490' opacity='.82'/%3E%3Crect x='300' y='72' width='210' height='210' rx='28' fill='%23334155' opacity='.9'/%3E%3Cpath d='M0 300 C150 240 250 350 420 285 C520 247 575 260 640 220 L640 360 L0 360 Z' fill='%23f8fafc'/%3E%3C/svg%3E";

const previewTwo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23f1f5f9'/%3E%3Crect x='78' y='64' width='190' height='232' rx='22' fill='%230f766e' opacity='.86'/%3E%3Crect x='306' y='104' width='246' height='60' rx='14' fill='%231e293b' opacity='.86'/%3E%3Crect x='306' y='192' width='172' height='72' rx='14' fill='%230369a1' opacity='.8'/%3E%3C/svg%3E";

export const initialDemoNodes: CanvasNode[] = [
  {
    id: "brief",
    kind: "note",
    title: "Brief",
    body: "Define the user, core job, and first workflow before expanding the surface.",
    position: { x: 0, y: 40 },
    size: { width: 240, height: 150 },
  },
  {
    id: "concept",
    kind: "image",
    title: "Concept",
    body: "A visual direction that can become production UI without hidden dependencies.",
    imageUrl: previewOne,
    position: { x: 360, y: -20 },
    size: { width: 280, height: 230 },
  },
  {
    id: "prototype",
    kind: "image",
    title: "Prototype",
    body: "Interactive slices prove the shell, state, and canvas gestures are reusable.",
    imageUrl: previewTwo,
    position: { x: 720, y: 70 },
    size: { width: 280, height: 230 },
  },
  {
    id: "handoff",
    kind: "frame",
    title: "Handoff",
    body: "Document the public component API and keep app-specific behavior outside the kit.",
    position: { x: 1080, y: 0 },
    size: { width: 260, height: 170 },
  },
];

export const initialDemoConnections: CanvasConnection[] = [
  { id: "brief-concept", sourceNodeId: "brief", targetNodeId: "concept" },
  { id: "concept-prototype", sourceNodeId: "concept", targetNodeId: "prototype" },
  { id: "prototype-handoff", sourceNodeId: "prototype", targetNodeId: "handoff" },
];

export const demoPromptSourceImageUrl = previewTwo;
