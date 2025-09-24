import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce, throttle } from 'lodash';

// Lazy loading utilities
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  return React.lazy(importFunc);
};

// Memory management
export class MemoryManager {
  private static instance: MemoryManager;
  private cache = new Map<string, { data: any; timestamp: number; size: number }>();
  private maxCacheSize = 100 * 1024 * 1024; // 100MB
  private currentCacheSize = 0;

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  set(key: string, data: any, ttl: number = 300000): void { // 5 minutes default TTL
    const size = this.estimateSize(data);
    
    // Clean up if cache is getting too large
    if (this.currentCacheSize + size > this.maxCacheSize) {
      this.cleanup();
    }

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.currentCacheSize -= this.cache.get(key)!.size;
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl,
      size
    });

    this.currentCacheSize += size;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp) {
      this.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentCacheSize -= entry.size;
      this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
  }

  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove expired entries first
    entries.forEach(([key, entry]) => {
      if (now > entry.timestamp) {
        this.delete(key);
      }
    });

    // If still too large, remove oldest entries
    if (this.currentCacheSize > this.maxCacheSize * 0.8) {
      const sortedEntries = entries
        .filter(([key]) => this.cache.has(key))
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = Math.ceil(sortedEntries.length * 0.3);
      for (let i = 0; i < toRemove; i++) {
        this.delete(sortedEntries[i][0]);
      }
    }
  }

  private estimateSize(obj: any): number {
    const seen = new WeakSet();
    
    const sizeOf = (obj: any): number => {
      if (obj === null || obj === undefined) return 0;
      if (typeof obj === 'boolean') return 4;
      if (typeof obj === 'number') return 8;
      if (typeof obj === 'string') return obj.length * 2;
      if (typeof obj === 'object') {
        if (seen.has(obj)) return 0;
        seen.add(obj);
        
        let size = 0;
        if (Array.isArray(obj)) {
          size += obj.reduce((acc, item) => acc + sizeOf(item), 0);
        } else {
          size += Object.keys(obj).reduce((acc, key) => {
            return acc + sizeOf(key) + sizeOf(obj[key]);
          }, 0);
        }
        return size;
      }
      return 0;
    };

    return sizeOf(obj);
  }

  getCacheStats() {
    return {
      size: this.currentCacheSize,
      maxSize: this.maxCacheSize,
      entries: this.cache.size,
      utilization: (this.currentCacheSize / this.maxCacheSize) * 100
    };
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTiming(label: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(label, duration);
    };
  }

  recordMetric(label: string, value: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    
    const values = this.metrics.get(label)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  getMetrics(label: string) {
    const values = this.metrics.get(label) || [];
    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  getAllMetrics() {
    const result: Record<string, any> = {};
    this.metrics.forEach((_, label) => {
      result[label] = this.getMetrics(label);
    });
    return result;
  }
}

// React hooks for performance optimization
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const throttledCallback = useMemo(
    () => throttle(callback, delay),
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      throttledCallback.cancel();
    };
  }, [throttledCallback]);

  return throttledCallback as T;
};

export const useVirtualization = <T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex + 1),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, scrollTop, containerHeight, itemHeight, overscan]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    ...visibleItems,
    handleScroll
  };
};

export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setEntry(entry);
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  return { elementRef, isIntersecting, entry };
};

export const useMemoizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, deps);
};

export const useAsyncMemo = <T>(
  factory: () => Promise<T>,
  deps: React.DependencyList,
  initialValue: T
): [T, boolean, Error | null] => {
  const [value, setValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    setLoading(true);
    setError(null);
    
    factory()
      .then(result => {
        if (!cancelled) {
          setValue(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, deps);

  return [value, loading, error];
};

// Bundle splitting utilities
export const preloadRoute = (routeComponent: () => Promise<any>) => {
  // Preload the component when user hovers over a link
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'script';
  
  routeComponent().then(module => {
    // Component is now loaded and cached
  });
};

// Image optimization
export const optimizeImage = (
  src: string,
  width?: number,
  height?: number,
  quality: number = 80
): string => {
  // In production, this would integrate with an image optimization service
  const params = new URLSearchParams();
  
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  params.append('q', quality.toString());
  
  return `${src}?${params.toString()}`;
};

// Data processing optimization
export const processLargeDataset = async <T, R>(
  data: T[],
  processor: (item: T) => R,
  batchSize: number = 1000
): Promise<R[]> => {
  const results: R[] = [];
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchResults = batch.map(processor);
    results.push(...batchResults);
    
    // Yield control to prevent blocking the main thread
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return results;
};

// Web Worker utilities
export const createWorker = (workerFunction: Function): Worker => {
  const blob = new Blob([`(${workerFunction.toString()})()`], {
    type: 'application/javascript'
  });
  
  return new Worker(URL.createObjectURL(blob));
};

export const runInWorker = <T, R>(
  data: T,
  workerFunction: (data: T) => R
): Promise<R> => {
  return new Promise((resolve, reject) => {
    const worker = createWorker(() => {
      self.onmessage = (e) => {
        try {
          const result = workerFunction(e.data);
          self.postMessage({ success: true, result });
        } catch (error) {
          self.postMessage({ success: false, error: error.message });
        }
      };
    });

    worker.onmessage = (e) => {
      const { success, result, error } = e.data;
      worker.terminate();
      
      if (success) {
        resolve(result);
      } else {
        reject(new Error(error));
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };

    worker.postMessage(data);
  });
};

// Global instances
export const memoryManager = MemoryManager.getInstance();
export const performanceMonitor = PerformanceMonitor.getInstance();