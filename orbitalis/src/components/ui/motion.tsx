import { useEffect, useRef, useState, type HTMLAttributes } from 'react';
import {
  animate,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from 'motion/react';
import { DURATION, EASE, fadeUp, staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

/** Fade-and-rise wrapper for a single block. */
export function Reveal({
  className,
  delay = 0,
  ...props
}: HTMLMotionProps<'div'> & { delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={fadeUp}
      initial={reduce ? false : 'hidden'}
      animate="visible"
      transition={{ delay }}
      className={cn(className)}
      {...props}
    />
  );
}

/** Container that reveals its StaggerItem children one after another. */
export function Stagger({ className, ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn(className)}
      {...props}
    />
  );
}

export function StaggerItem({ className, ...props }: HTMLMotionProps<'div'>) {
  return <motion.div variants={staggerItem} className={cn(className)} {...props} />;
}

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

/** Counts up from its current value whenever `value` changes. */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 0.9,
  className,
}: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const current = useRef(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      current.current = value;
      setDisplay(value);
      return;
    }
    const controls = animate(current.current, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => {
        current.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [value, duration, reduce]);

  return (
    <span className={className}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** A width-animated bar used for scores and evidence breakdowns. */
export function AnimatedBar({
  value,
  className,
  barClassName,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  /** Fraction from 0 to 1. */
  value: number;
  barClassName?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className={cn('overflow-hidden rounded-full bg-panel-2', className)} {...props}>
      <motion.div
        className={cn('h-full rounded-full', barClassName)}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        transition={{ duration: DURATION.chart, ease: EASE }}
        style={style}
      />
    </div>
  );
}
