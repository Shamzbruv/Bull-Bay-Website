import { useEffect, useState } from 'react';
import { brand } from '../config/brand';

const CRITICAL_ASSETS = [brand.logo, brand.icon];

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

export function usePreloadAssets() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(CRITICAL_ASSETS.map(preloadImage)).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
