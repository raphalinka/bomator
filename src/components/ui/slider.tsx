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
  const [val, setVal] = React.useState<number>(Array.isArray(value) ? value[0] : min);

  React.useEffect(() => {
    if (Array.isArray(value) && typeof value[0] === "number" && value[0] !== val) {
      setVal(value[0]);
    }
  }, [value?.[0]]); // keep in sync with parent

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
          setVal(n);
          onValueChange?.([n]);
        }}
        className="w-full"
      />
      <span className="text-xs text-slate-300 tabular-nums">{val}</span>
    </div>
  );
}

export default Slider;
