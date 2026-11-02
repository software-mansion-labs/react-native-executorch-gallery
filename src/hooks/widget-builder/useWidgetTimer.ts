import { useEffect, useRef, useState } from 'react';

/** Runs a local countdown against a wall-clock deadline, avoiding drift when JS pauses or the app backgrounds. */
export function useWidgetTimer(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const deadline = useRef(0);
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(left);
      if (!left) setRunning(false);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [running]);
  const toggle = () => {
    if (running) {
      setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
      setRunning(false);
    } else {
      const duration = remaining || seconds;
      setRemaining(duration);
      deadline.current = Date.now() + duration * 1000;
      setRunning(true);
    }
  };
  const reset = () => {
    setRunning(false);
    setRemaining(seconds);
  };
  return {
    running,
    remaining,
    toggle,
    reset,
    display: `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`,
  };
}
