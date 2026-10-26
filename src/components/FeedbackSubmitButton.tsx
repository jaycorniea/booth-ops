"use client";

import { useFormStatus } from "react-dom";

export function FeedbackSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-blue-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-60"
    >
      {pending ? "Submitting…" : "Submit Feedback"}
    </button>
  );
}
