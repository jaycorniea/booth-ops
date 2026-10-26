"use client";

import { useEffect } from "react";

export function CaptainPickedDayScroll({ cardKey }: { cardKey?: string }) {
  useEffect(() => {
    if (!cardKey) return;
    document.getElementById(`event-day-${cardKey}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [cardKey]);

  return null;
}
