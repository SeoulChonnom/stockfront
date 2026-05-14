import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

export function Select({
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root {...props} />;
}

export function SelectValue({
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value {...props} />;
}

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex min-h-11 w-full items-center justify-between rounded-[14px] border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-3.5 py-2 text-left text-[color:var(--text)] outline-none transition-all data-[placeholder]:text-[color:var(--text-faint)] focus:border-[color:color-mix(in_srgb,var(--primary)_45%,transparent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className='size-4 shrink-0 text-[color:var(--text-faint)]' />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          'relative z-50 max-h-80 min-w-[8rem] overflow-hidden rounded-[16px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] text-[color:var(--text)] shadow-[var(--shadow-lg)]',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className='flex cursor-default items-center justify-center py-1'>
          <ChevronUp className='size-4' />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className='p-1'>
          {children}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className='flex cursor-default items-center justify-center py-1'>
          <ChevronDown className='size-4' />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-[12px] py-2 pl-8 pr-3 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-[color:var(--surface-muted)] data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className='absolute left-2.5 flex size-4 items-center justify-center'>
        <SelectPrimitive.ItemIndicator>
          <Check className='size-4' />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
