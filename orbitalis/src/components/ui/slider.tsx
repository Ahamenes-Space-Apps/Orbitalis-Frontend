import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  thumbLabels?: string[];
};

/** Radix slider wrapper. One thumb is rendered per value, so two-handle ranges work. */
export function Slider({ className, thumbLabels, value, defaultValue, ...props }: SliderProps) {
  const values = value ?? defaultValue ?? [0];
  return (
    <SliderPrimitive.Root
      className={cn('relative flex h-6 w-full touch-none items-center select-none', className)}
      value={value}
      defaultValue={defaultValue}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[#1a2338]">
        <SliderPrimitive.Range className="absolute h-full bg-amber" />
      </SliderPrimitive.Track>
      {values.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          aria-label={thumbLabels?.[index] ?? `Value ${index + 1}`}
          className="block size-5 rounded-full border-2 border-amber bg-field shadow"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
