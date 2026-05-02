import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-sm border bg-secondary px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground shadow-sm",
        className
      )}
      {...props}
    />
  );
}
