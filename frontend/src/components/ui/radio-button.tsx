import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface RadioButtonProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
}

export const RadioButton = React.forwardRef<HTMLInputElement, RadioButtonProps>(
  ({ className, checked = false, onCheckedChange, label, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          "flex items-center gap-3 cursor-pointer select-none text-sm text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            ref={ref}
            checked={checked}
            onChange={(e) => !disabled && onCheckedChange?.(e.target.checked)}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          <motion.div
            initial={false}
            animate={{
              scale: checked ? 1 : 0.95,
              borderColor: checked ? "rgba(99, 102, 241, 1)" : "rgba(255, 255, 255, 0.15)",
              backgroundColor: checked ? "rgba(99, 102, 241, 0.15)" : "transparent",
            }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className={cn(
              "w-5 h-5 rounded-full border flex items-center justify-center transition-shadow",
              !disabled && "hover:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20"
            )}
          >
            <AnimatePresence initial={false}>
              {checked && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Check className="h-3 w-3 text-indigo-400 stroke-[3px]" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
        {label && <span className="font-semibold text-white">{label}</span>}
      </label>
    );
  }
);
RadioButton.displayName = "RadioButton";
