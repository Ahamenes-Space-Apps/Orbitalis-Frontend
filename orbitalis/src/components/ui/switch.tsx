import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'inline-flex h-4 w-7 shrink-0 cursor-pointer items-center border border-line-2 bg-panel-2 transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent/20',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-2.5 translate-x-0.5 bg-haze transition-transform data-[state=checked]:translate-x-[13px] data-[state=checked]:bg-accent" />
    </SwitchPrimitive.Root>
  );
}
