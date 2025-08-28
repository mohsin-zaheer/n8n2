import React from "react";
import { cn } from "@/lib/utils";

interface VettedBadgeProps {
  className?: string;
}

export function VettedBadge({ className }: VettedBadgeProps = {}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-5 py-1.5",
        "bg-emerald-500",
        "rounded-full",
        "shadow-sm hover:shadow-md transition-all",
        "hover:bg-emerald-600",
        className
      )}
    >
      <i className="fa-solid fa-shield-check text-white" />
      <span className="text-sm font-semibold text-white">
        Vetted Workflow
      </span>
    </div>
  );
}