import * as React from "react";
import { cn } from "@/lib/utils";

export interface ScrollListProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string | number;
}

export const ScrollList = React.forwardRef<HTMLDivElement, ScrollListProps>(
  ({ className, children, maxHeight = "100%", ...props }, ref) => {
    return (
      <div
        ref={ref}
        style={{ maxHeight }}
        className={cn(
          "overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent scrollbar-thumb-rounded-full hover:scrollbar-thumb-indigo-500/30 transition-all",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ScrollList.displayName = "ScrollList";
