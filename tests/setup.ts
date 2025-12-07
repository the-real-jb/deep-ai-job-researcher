import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables for tests
process.env.HYPERBROWSER_API_KEY = 'test-hyperbrowser-key';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}));
