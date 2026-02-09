import { useState, useEffect } from 'react';

/**
 * Breakpoints:
 *   < 768px  → mobile
 *   768–1024 → tablet
 *   > 1024   → desktop
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);

  return isMobile;
}

export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState(() =>
    typeof window !== 'undefined'
      ? window.innerWidth >= 768 && window.innerWidth <= 1024
      : false
  );

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsTablet(w >= 768 && w <= 1024);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isTablet;
}
