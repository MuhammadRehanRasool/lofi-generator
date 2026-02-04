import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  presets?: string[];
  className?: string;
}

const DEFAULT_PRESETS = [
  '#8b5cf6', // Purple (primary)
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f97316', // Orange
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#eab308', // Yellow
];

export default function ColorPicker({
  value,
  onChange,
  label,
  presets = DEFAULT_PRESETS,
  className,
}: ColorPickerProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <label className="text-sm font-medium text-foreground block">{label}</label>
      )}
      <div className="flex items-center gap-3">
        {/* Color preview and picker */}
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
            id="color-picker"
          />
          <label
            htmlFor="color-picker"
            className="block w-11 h-11 rounded-lg border-2 border-border cursor-pointer overflow-hidden shadow-sm hover:scale-105 transition-transform hover:border-primary"
            style={{ backgroundColor: value }}
          />
        </div>

        {/* Hex input */}
        <div className="flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              const newValue = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(newValue)) {
                onChange(newValue);
              }
            }}
            className="w-full h-11 px-4 bg-background border border-input rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background transition-all"
            placeholder="#000000"
          />
        </div>
      </div>

      {/* Preset colors */}
      <div className="flex gap-2 flex-wrap">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={cn(
              'w-8 h-8 rounded-lg border-2 transition-all duration-150 hover:scale-110',
              value === preset
                ? 'border-foreground scale-110 shadow-md'
                : 'border-transparent hover:border-primary/50'
            )}
            style={{ backgroundColor: preset }}
          />
        ))}
      </div>
    </div>
  );
}
