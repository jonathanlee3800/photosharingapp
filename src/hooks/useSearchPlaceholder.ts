'use client';

import { useState, useEffect } from 'react';

/**
 * Responsive search placeholder that adapts dynamically to viewport width
 * ensuring text is never cut off on phones.
 */
export function useSearchPlaceholder(): string {
  // Default to standard mobile string on SSR so initial render is clean
  const [placeholder, setPlaceholder] = useState('Search by guest or caption (e.g. Sarah)...');

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      if (width < 380) {
        setPlaceholder('Search guest or caption...');
      } else if (width < 640) {
        setPlaceholder('Search by guest or caption (e.g. Sarah)...');
      } else {
        setPlaceholder('Search photos by guest name or caption (e.g. Sarah, first dance)...');
      }
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return placeholder;
}
