import React from "react";
import { format } from "date-fns";

/**
 * Wrapper around native <input type="date"> that always displays
 * the date in dd/MM/yyyy format, regardless of browser/device locale.
 * The underlying value remains ISO (yyyy-MM-dd) for data operations.
 */
export default function DateInput({ value, onChange, className, wrapperClassName, placeholder, ...props }) {
  const display = value
    ? (() => { try { return format(new Date(value + "T12:00:00"), "dd/MM/yyyy"); } catch { return value; } })()
    : "";

  return (
    <div className={`relative ${wrapperClassName ?? "w-full"}`}>
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        className={className}
        style={{ color: "transparent", caretColor: "transparent" }}
        {...props}
      />
      <span
        className={`pointer-events-none absolute inset-0 flex items-center ${className || ""}`}
        style={{
          border: "none",
          background: "transparent",
          boxShadow: "none",
          outline: "none",
          color: display ? undefined : "hsl(var(--muted-foreground))",
        }}
      >
        {display || placeholder || "dd/mm/aaaa"}
      </span>
    </div>
  );
}