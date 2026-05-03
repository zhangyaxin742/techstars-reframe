"use client";

import { useEffect, useState, type ComponentType } from "react";

export function AgentationToolbarLazy() {
  const [Toolbar, setToolbar] = useState<ComponentType | null>(null);

  useEffect(() => {
    let mounted = true;

    void import("./agentation-toolbar").then((mod) => {
      if (mounted) {
        setToolbar(() => mod.AgentationToolbar);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!Toolbar) {
    return null;
  }

  return <Toolbar />;
}
