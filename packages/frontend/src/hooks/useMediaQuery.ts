import { useEffect, useState } from 'react';

/**
 * Hook to check if a media query matches the current viewport
 * @param query Media query string (e.g. '(max-width: 480px)')
 * @returns Boolean indicating if the query matches
 */
export const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState<boolean>(false);

    useEffect(() => {
        // Create media query list
        const mediaQuery = window.matchMedia(query);

        // Set initial value
        setMatches(mediaQuery.matches);

        // Define callback for changes
        const handleResize = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        // Add event listener
        mediaQuery.addEventListener('change', handleResize);

        // Cleanup
        return () => {
            mediaQuery.removeEventListener('change', handleResize);
        };
    }, [query]);

    return matches;
};

export default useMediaQuery; 