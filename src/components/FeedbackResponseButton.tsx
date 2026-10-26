"use client";

import { Btn } from "@/components/ui";
import { useFormStatus } from "react-dom";

export function FeedbackResponseButton({ hasExisting }: { hasExisting: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Btn type="submit" disabled={pending} className="text-sm">
      {pending ? "Saving…" : hasExisting ? "Update response" : "Post response"}
    </Btn>
  );
}