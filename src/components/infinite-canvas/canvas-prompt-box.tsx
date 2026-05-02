import { ArrowUp } from "@phosphor-icons/react";
import { memo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { CanvasPromptBoxData } from "@/lib/infinite-canvas/types";
import { cn } from "@/lib/utils";

interface CanvasPromptBoxProps {
  title?: string;
  data?: CanvasPromptBoxData;
  selected?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onSelect?: (event: React.MouseEvent) => void;
  onDragHandlePointerDown?: (event: React.PointerEvent) => void;
}

const countOptions = [1, 2, 3, 4] as const;

export const CanvasPromptBox = memo(function CanvasPromptBox({
  title,
  data,
  selected,
  onChange,
  onSubmit,
  onSelect,
  onDragHandlePointerDown: _onDragHandlePointerDown,
}: CanvasPromptBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const value = data?.value ?? "";
  const mode = data?.mode ?? "editing";
  const isLocked = data?.disabled || data?.busy;
  const isEditing = mode === "editing";

  const submitLabel = data?.actionLabel ?? "Send";
  const busyLabel = data?.busyLabel ?? "Sending";
  const placeholder = data?.placeholder ?? "Describe your edit...";
  const trimmedValue = value.trim();
  const canSubmit = isEditing && !isLocked && trimmedValue.length > 0 && Boolean(onSubmit);
  const activeCount = data?.count ?? 1;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [value]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.(trimmedValue);
  };

  return (
    <section
      data-testid="canvas-prompt-box"
      data-prompt-mode={mode}
      data-selected={selected ? "true" : undefined}
      className="relative z-20 text-card-foreground"
      onMouseDown={(event) => {
        event.stopPropagation();
        const target = event.target as HTMLElement;
        const isTypingSurface = target.closest("textarea, button");
        if (!isTypingSurface) {
          event.preventDefault();
          textareaRef.current?.focus();
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onSelect}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[28px] border border-black/[0.04] bg-neutral-100/60 p-1 shadow-lg backdrop-blur-xl",
          selected && "ring-2 ring-ring"
        )}
      >
        <div className="overflow-hidden min-h-0">
          <div className="px-2 pb-3 pt-2">
            <div className="relative size-12 overflow-hidden rounded-2xl border border-transparent bg-white/80 shadow-md ring-1 ring-border/50 min-[480px]:size-16 sm:size-24">
              {data?.sourceImageUrl ? (
                <img
                  src={data.sourceImageUrl}
                  alt={data.sourceAlt ?? ""}
                  className="size-full object-cover"
                  draggable={Boolean(0)}
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-secondary text-xs font-medium uppercase text-muted-foreground">
                  {title?.slice(0, 2) ?? "In"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] border border-black/[0.08] bg-white/80 shadow-sm backdrop-blur-md">
          <div className="relative px-4 py-3">
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={value}
                rows={1}
                disabled={isLocked}
                placeholder={placeholder}
                className={cn(
                  "max-h-[200px] w-full resize-none bg-transparent p-0 pr-12 text-base leading-relaxed text-foreground outline-none",
                  "placeholder:text-muted-foreground disabled:opacity-40"
                )}
                onChange={(event) => onChange?.(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            ) : (
              <p className="line-clamp-4 pr-12 text-pretty text-base leading-relaxed text-foreground">
                {value || "No prompt"}
              </p>
            )}
          </div>

          {isEditing ? (
            <div className="flex items-center gap-1.5 px-2.5 py-2">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {(data?.badges ?? []).map((badge) => (
                  <span
                    key={badge}
                    className="h-8 rounded-3xl border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {badge}
                  </span>
                ))}
              </div>
              <div className="flex-1" />
              <div className="flex h-8 items-center rounded-3xl bg-neutral-100 p-1">
                {countOptions.map((count) => (
                  <span
                    key={count}
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs tabular-nums text-muted-foreground",
                      activeCount === count && "bg-card text-foreground shadow-sm"
                    )}
                  >
                    {count}
                  </span>
                ))}
              </div>
              <div className="ml-auto w-8" />
            </div>
          ) : null}
        </div>
      </div>

      {isEditing ? (
        <div className="absolute bottom-[15px] right-[14px]">
          <Button
            type="button"
            variant="default"
            size="icon"
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-label={submitLabel}
            className="rounded-full"
          >
            {data?.busy ? (
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <ArrowUp className="size-4" weight="bold" />
            )}
            <span className="sr-only">{data?.busy ? busyLabel : submitLabel}</span>
          </Button>
        </div>
      ) : null}
    </section>
  );
});
