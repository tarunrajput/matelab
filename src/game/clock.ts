import { useCallback, useEffect, useRef, useState } from 'react';

export interface TimeControl {
  id: string;
  label: string;
  initialMs: number; // per player
  incrementMs: number;
  category: 'Bullet' | 'Blitz' | 'Rapid' | 'Custom';
}

export const TIME_CONTROLS: TimeControl[] = [
  { id: 'bullet-1-0', label: 'Bullet 1|0', initialMs: 60_000, incrementMs: 0, category: 'Bullet' },
  { id: 'bullet-2-1', label: 'Bullet 2|1', initialMs: 120_000, incrementMs: 1000, category: 'Bullet' },
  { id: 'blitz-3-0', label: 'Blitz 3|0', initialMs: 180_000, incrementMs: 0, category: 'Blitz' },
  { id: 'blitz-3-2', label: 'Blitz 3|2', initialMs: 180_000, incrementMs: 2000, category: 'Blitz' },
  { id: 'blitz-5-0', label: 'Blitz 5|0', initialMs: 300_000, incrementMs: 0, category: 'Blitz' },
  { id: 'rapid-10-0', label: 'Rapid 10|0', initialMs: 600_000, incrementMs: 0, category: 'Rapid' },
  { id: 'rapid-15-10', label: 'Rapid 15|10', initialMs: 900_000, incrementMs: 10_000, category: 'Rapid' },
];

export function formatClock(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function useChessClock(initialMs: number, incrementMs: number) {
  const [whiteMs, setWhiteMs] = useState(initialMs);
  const [blackMs, setBlackMs] = useState(initialMs);
  const [running, setRunning] = useState<'w' | 'b' | null>(null);
  const [flag, setFlag] = useState<'w' | 'b' | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (!running || flag) return;
    const now = Date.now();
    const delta = now - lastTickRef.current;
    lastTickRef.current = now;
    if (running === 'w') {
      setWhiteMs((prev) => {
        const next = prev - delta;
        if (next <= 0) {
          setFlag('w');
          setRunning(null);
          clearTick();
          return 0;
        }
        return next;
      });
    } else {
      setBlackMs((prev) => {
        const next = prev - delta;
        if (next <= 0) {
          setFlag('b');
          setRunning(null);
          clearTick();
          return 0;
        }
        return next;
      });
    }
  }, [running, flag, clearTick]);

  useEffect(() => {
    if (running && !flag) {
      lastTickRef.current = Date.now();
      intervalRef.current = setInterval(tick, 100);
    } else {
      clearTick();
    }
    return clearTick;
  }, [running, flag, tick, clearTick]);

  const start = useCallback((turn: 'w' | 'b') => {
    if (flag) return;
    setRunning(turn);
    lastTickRef.current = Date.now();
  }, [flag]);

  const switchTurn = useCallback((nextTurn: 'w' | 'b') => {
    // apply increment to the player who just moved
    if (running === 'w') {
      setWhiteMs((prev) => prev + incrementMs);
    } else if (running === 'b') {
      setBlackMs((prev) => prev + incrementMs);
    }
    setRunning(nextTurn);
    lastTickRef.current = Date.now();
  }, [running, incrementMs]);

  const pause = useCallback(() => setRunning(null), []);
  const resume = useCallback((turn: 'w' | 'b') => {
    if (!flag) {
      setRunning(turn);
      lastTickRef.current = Date.now();
    }
  }, [flag]);

  const reset = useCallback((ms = initialMs, inc = incrementMs) => {
    clearTick();
    setWhiteMs(ms);
    setBlackMs(ms);
    setRunning(null);
    setFlag(null);
  }, [initialMs, incrementMs, clearTick]);

  // Keep clocks in sync when time control changes and game not running
  const reconfigure = useCallback((ms: number, inc: number) => {
    clearTick();
    setWhiteMs(ms);
    setBlackMs(ms);
    setRunning(null);
    setFlag(null);
  }, [clearTick]);

  return { whiteMs, blackMs, running, flag, formatWhite: formatClock(whiteMs), formatBlack: formatClock(blackMs), start, switchTurn, pause, resume, reset, reconfigure, setWhiteMs, setBlackMs };
}
