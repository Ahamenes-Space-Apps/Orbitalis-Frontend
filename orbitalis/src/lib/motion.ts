import type { Transition, Variants } from 'motion/react';

/** Shared timing tokens. Everything stays short enough to feel responsive, not showy. */
export const DURATION = {
  fast: 0.16,
  base: 0.24,
  slow: 0.34,
  chart: 0.55,
  epoch: 0.42,
} as const;

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const springSoft: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 30,
  mass: 0.7,
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base, ease: EASE } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE } },
  exit: { opacity: 0, y: -6, transition: { duration: DURATION.fast, ease: EASE } },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } },
  exit: { opacity: 0, y: -6, transition: { duration: DURATION.fast, ease: EASE } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } },
  exit: { opacity: 0, y: -4, transition: { duration: DURATION.fast, ease: EASE } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: DURATION.base, ease: EASE } },
  exit: { opacity: 0, y: -4, scale: 0.99, transition: { duration: DURATION.fast, ease: EASE } },
};
