import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup nach jedem Test
afterEach(() => {
    cleanup();
}); 