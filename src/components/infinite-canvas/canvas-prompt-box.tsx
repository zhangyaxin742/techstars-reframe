import { ArrowUp, DotsSixVertical } from "@phosphor-icons/react";
import { memo, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { CanvasPromptBoxData } from "@/lib/infinite-canvas/types";
import { cn } from "@/lib/utils";

interface CanvasPromptBoxProps {
  title: string;
  data?: CanvasPromptBoxData;
  selected?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onSelect?: (event: React.MouseEvent) => void;
  onDragHandlePointerDown?: (event: React.PointerEvent) => void;
}

export const CanvasPromptBox = memo(function CanvasPromptBox({
  title,
  data,
  selected,
  onChange,
  onSubmit,
  onSelect,
  onDragHandlePointerDown,
}: CanvasPromptBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const value = data?.value ?? "";
  const mode = data?.mode ?? "editing";
  const isLocked = data?.disabled || data?.busy;
  const isEditing = mode === "editing";

  const submitLabel = data?.actionLabel ?? "Send";
  const busyLabel = data?.busyLabel ?? "Sending";
  const placeholder = data?.placeholder ?? "Describe the next step...";
  const trimmedValue = value.trim();
  const canSubmit = isEditing && !isLocked && trimmedValue.length > 0 && Boolean(onSubmit);

  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return true;
    return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 192)}px`;
  }, [value]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.(trimmedValue);
  };

  return (
    <section
      data-testid="canvas-prompt-box"
      data-prompt-mode={mode}
      className={cn(
        "group/prompt-box relative flex h-full flex-col gap-2 overflow-visible rounded-lg border bg-card p-2 text-card-foreground shadow-lg",
        selected && "border-accent shadow-md ring-2 ring-ring"
      )}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onSelect}
    >
      {onDragHandlePointerDown ? (
        <button
          type="button"
          aria-label="Move prompt"
          className={cn(
            "absolute -top-8 left-0 right-0 flex h-8 items-end justify-center pb-1 text-muted-foreground opacity-0 transition-opacity duration-150",
            "cursor-grab hover:text-foreground group-hover/prompt-box:opacity-100"
          )}
          onPointerDown={onDragHandlePointerDown}
        >
          <DotsSixVertical weight="bold" className="size-4 rotate-90" />
        </button>
      ) : null}

      <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
        <div className="mb-1 truncate text-xs font-medium text-muted-foreground">{title}</div>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={value}
            rows={1}
            disabled={isLocked}
            placeholder={placeholder}
            className={cn(
              "max-h-48 w-full resize-none bg-transparent p-0 text-sm leading-6 text-foreground outline-none",
              "placeholder:text-muted-foreground disabled:opacity-50"
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
          <p className="line-clamp-4 text-pretty text-sm leading-6 text-foreground">
            {value || "No prompt"}
          </p>
        )}
      </div>

      <div className="flex min-h-8 items-center gap-2 px-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {(data?.badges ?? []).map((badge) => (
            <span
              key={badge}
              className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground"
            >
              {badge}
            </span>
          ))}
        </div>

        {isEditing ? (
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-label={submitLabel}
          >
            {data?.busy ? busyLabel : submitLabel}
            {data?.busy ? null : <ArrowUp weight="bold" />}
            <span className="ml-1 hidden items-center gap-1 md:flex">
              <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
              <Kbd>↵</Kbd>
            </span>
          </Button>
        ) : null}
      </div>
    </section>
  );
});
