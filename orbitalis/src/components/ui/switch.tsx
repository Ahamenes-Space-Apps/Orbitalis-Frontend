import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-line-2 bg-panel-2 transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent/25',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4 translate-x-1 rounded-full bg-haze transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-accent" />
    </SwitchPrimitive.Root>
  );
}
