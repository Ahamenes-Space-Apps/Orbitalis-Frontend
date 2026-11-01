import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('flex flex-wrap gap-2', className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'min-h-9 cursor-pointer  border border-line-2 px-3 text-[13px] text-mist transition-colors hover:text-ink data-[state=active]:border-white data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-field',
        className,
      )}
      {...props}
    />
  );
}
