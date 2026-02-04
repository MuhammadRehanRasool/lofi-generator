// Re-export all UI components

// Button
export { Button, buttonVariants } from './Button';
export type { ButtonProps } from './Button';

// Slider
export { Slider } from './Slider';

// Input
export { Input } from './Input';

// Card
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './Card';

// Toggle (custom component with default export)
export { default as Toggle } from './Toggle';

// Select (simple API for common use + advanced primitives)
export {
  Select,
  SelectRoot,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './Select';

// ColorPicker (custom component with default export)
export { default as ColorPicker } from './ColorPicker';

// Progress
export { Progress } from './Progress';

// Checkbox
export { Checkbox } from './Checkbox';

// Tabs (simple API for common use + advanced primitives)
export { Tabs, TabsRoot, TabsList, TabsTrigger, TabsContent } from './Tabs';

// Label
export { Label } from './label';

// Switch
export { Switch } from './switch';

// ScrollArea
export { ScrollArea, ScrollBar } from './scroll-area';

// Separator
export { Separator } from './separator';
