"use client";
import * as React from "react";

type SliderProps = {
  value: [number];
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  onValueChange?: (v: [number]) => void;
};

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  className,
  onValueChange,
}: SliderProps) {
  const val = Array.isArray(value) && typeof value[0] === "number" ? value[0] : min;

  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => {
          const n = Number(e.target.value);
          onValueChange?.([n]);
        }}
        className="w-full"
      />
      <span className="text-xs text-slate-300 tabular-nums">{val}</span>
    </div>
  );
}

export default Slider;
