import React from "react";
import { cn } from "../../../lib/utils";

export function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange?: (e: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange?.(!enabled)}
      className={cn(
        "w-11 h-6 rounded-full transition-colors flex items-center px-1 flex-shrink-0 cursor-pointer",
        enabled ? "bg-[#0B7A4B]" : "bg-slate-300",
      )}
    >
      <div
        className={cn(
          "w-4 h-4 rounded-full bg-white transition-transform",
          enabled ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
