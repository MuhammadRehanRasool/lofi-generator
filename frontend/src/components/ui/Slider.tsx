"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

interface SliderProps {
  label?: string
  min?: number
  max?: number
  step?: number
  value?: number
  onChange?: (value: number) => void
  showValue?: boolean
  formatValue?: (value: number) => string
  className?: string
  disabled?: boolean
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({
    label,
    min = 0,
    max = 100,
    step = 1,
    value = 0,
    onChange,
    showValue = true,
    formatValue,
    className,
    disabled
  }, ref) => {
    const displayValue = formatValue ? formatValue(value) : value.toFixed(step < 1 ? 2 : 0)

    return (
      <div ref={ref} className={cn("space-y-3", className)}>
        {(label || showValue) && (
          <div className="flex items-center justify-between">
            {label && (
              <label className="text-sm font-medium text-foreground">{label}</label>
            )}
            {showValue && (
              <span className="text-sm text-muted-foreground font-mono tabular-nums">
                {displayValue}
              </span>
            )}
          </div>
        )}
        <SliderPrimitive.Root
          className={cn(
            "relative flex w-full touch-none select-none items-center",
            disabled && "opacity-50 pointer-events-none"
          )}
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(values) => onChange?.(values[0])}
          disabled={disabled}
        >
          <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
            <SliderPrimitive.Range className="absolute h-full bg-primary" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-md shadow-primary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 hover:shadow-lg hover:shadow-primary/30" />
        </SliderPrimitive.Root>
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
export default Slider
