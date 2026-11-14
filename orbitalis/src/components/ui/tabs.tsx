import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex flex-nowrap overflow-x-auto rounded-sm border border-line-2 bg-panel-2 p-px',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'min-h-7 shrink-0 cursor-pointer whitespace-nowrap px-2.5 text-[11px] text-haze transition-colors hover:text-ink data-[state=active]:bg-accent data-[state=active]:font-semibold data-[state=active]:text-canvas',
        className,
      )}
      {...props}
    />
  );
}
