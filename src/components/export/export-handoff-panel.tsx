import { ArrowSquareOut, CheckCircle, X } from "@phosphor-icons/react";
import React, { useCallback, useState } from "react";
import type { ExportTarget } from "../../data/reframe-demo";
import { cn } from "../../lib/utils";

interface ExportHandoffPanelProps {
  targets: ExportTarget[];
  open: boolean;
  onClose: () => void;
  className?: string;
}

export function ExportHandoffPanel({
  targets,
  open,
  onClose,
  className,
}: ExportHandoffPanelProps) {
  const [exportedId, setExportedId] = useState<string | null>(null);

  const handleExport = useCallback((targetId: string) => {
    setExportedId(targetId);
    setTimeout(() => setExportedId(null), 2000);
  }, []);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm",
        className
      )}
      data-testid="export-handoff-panel"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Export Timeline</h2>
            <p className="text-xs text-muted-foreground">
              Hand off your assembled timeline to your editor
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="Close export panel"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-2 px-5 py-4">
          {targets.map((target) => {
            const isExported = exportedId === target.id;
            return (
              <button
                key={target.id}
                type="button"
                onClick={() => handleExport(target.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition",
                  isExported
                    ? "border-green-500/50 bg-green-50 dark:bg-green-950/20"
                    : "hover:border-primary hover:shadow-sm"
                )}
              >
                <span className="text-xl">{target.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{target.editor}</p>
                  <p className="text-xs text-muted-foreground">{target.description}</p>
                </div>
                {isExported ? (
                  <CheckCircle className="size-5 text-green-600" weight="fill" />
                ) : (
                  <ArrowSquareOut className="size-4 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>

        <div className="border-t px-5 py-3">
          <p className="text-center text-[10px] text-muted-foreground">
            Exports are conceptual handoffs — editor integrations coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
