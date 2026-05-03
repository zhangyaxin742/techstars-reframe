"use client";

import React from "react";
import type { SimulatedToolCall } from "../../data/reframe-demo";
import { Tool } from "./tool";

interface SimulatedToolCallProps {
  toolCall: SimulatedToolCall;
  className?: string;
}

export function SimulatedToolCall({ toolCall, className }: SimulatedToolCallProps) {
  return (
    <Tool
      toolPart={{
        type: toolCall.label,
        state: toolCall.state,
        input: toolCall.input,
        output: toolCall.output,
        toolCallId: toolCall.name,
      }}
      className={className}
      data-testid={`simulated-tool-${toolCall.id}`}
      data-tool-state={toolCall.state}
    />
  );
}
