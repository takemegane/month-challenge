import { setupRedisCleanup } from './redis';

let initialized = false;

export function initializeConnections() {
  if (!initialized) {
    setupRedisCleanup();
    initialized = true;
  }
}

// Auto-initialize on module load for API routes
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  initializeConnections();
}