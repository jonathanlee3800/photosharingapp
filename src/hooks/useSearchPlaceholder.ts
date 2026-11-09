'use client';

import { useState, useEffect } from 'react';

/**
 * Responsive search placeholder that adapts dynamically to viewport width
 * ensuring text is never cut off on phones.
 */
export function useSearchPlaceholder(): string {
  // Default to concise mobile string on SSR so initial render is clean and fits any viewport
  const [placeholder, setPlaceholder] = useState('Search photos...');

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      if (width < 360) {
        setPlaceholder('Search photos...');
      } else if (width < 640) {
        setPlaceholder('Search guest or tag...');
      } else {
        setPlaceholder('Search photos by guest name, tag, or note...');
      }
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return placeholder;
}
