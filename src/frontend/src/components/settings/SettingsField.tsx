import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReactNode } from "react";

interface SettingsFieldProps {
  id: string;
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ocid: string;
  /** Node identity class (e.g. node-chat) for the colored dot */
  nodeClass?: string;
  type?: "text" | "password" | "url";
  trailing?: ReactNode;
}

export const fieldInputClass =
  "h-9 rounded-md border-input bg-background font-mono text-[13px] transition-smooth placeholder:text-muted-foreground/60 hover:border-muted-foreground/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0";

export function SettingsField({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
  ocid,
  nodeClass,
  type = "text",
  trailing,
}: SettingsFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label
        htmlFor={id}
        className="flex items-center gap-2 text-xs font-medium text-foreground"
      >
        {nodeClass && (
          <span
            className={`${nodeClass} node-dot h-2 w-2 rounded-full`}
            aria-hidden
          />
        )}
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          data-ocid={ocid}
          className={`${fieldInputClass} ${trailing ? "pr-10" : ""}`}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-1 flex items-center">
            {trailing}
          </div>
        )}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
