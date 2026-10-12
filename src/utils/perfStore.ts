import { PerformanceMetrics } from '../types/visual';

type PerfListener = (metrics: PerformanceMetrics) => void;
const listeners = new Set<PerfListener>();

export const perfStore = {
  emit(metrics: PerformanceMetrics): void {
    if (listeners.size === 0) return;
    listeners.forEach(fn => fn(metrics));
  },
  subscribe(fn: PerfListener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  hasSubscribers(): boolean {
    return listeners.size > 0;
  }
};
