import React from "react";

interface ToggleSwitchIndicatorProps {
  checked: boolean;
}

export const ToggleSwitchIndicator: React.FC<ToggleSwitchIndicatorProps> = ({
  checked,
}) => (
  <span
    aria-hidden="true"
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors ${
      checked
        ? "border-primary bg-primary"
        : "border-outline-variant/40 bg-surface-container-high"
    }`}
  >
    <span
      className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </span>
);

interface ToggleSwitchProps extends ToggleSwitchIndicatorProps {
  label: string;
  onChange: (checked: boolean) => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  label,
  onChange,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className="rounded-full focus-visible:outline-2 focus-visible:outline-primary"
  >
    <ToggleSwitchIndicator checked={checked} />
  </button>
);