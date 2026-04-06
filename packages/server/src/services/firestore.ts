import { Firestore } from '@google-cloud/firestore';
import { logger } from '../utils/logger.js';

// Singleton Firestore client
let _db: Firestore | null = null;

export function getFirestore(): Firestore {
  if (!_db) {
    _db = new Firestore({
      projectId: process.env.GCP_PROJECT_ID || 'stock-decision-assistant',
      // In Cloud Run, ADC (Application Default Credentials) is used automatically.
      // Locally, set GOOGLE_APPLICATION_CREDENTIALS to a service account key path.
    });
    logger.info('Firestore client initialized');
  }
  return _db;
}

// ── Collection helpers ────────────────────────────────────────

export const Collections = {
  STRATEGIES: 'strategies',
  STRATEGY_VERSIONS: (strategyId: string) => `strategies/${strategyId}/versions`,
  BACKTESTS: 'backtests',
  POSITIONS: 'positions',
  TRADES: 'trades',
  ALERTS: 'alerts',
  SETTINGS: 'settings',
  DATA_STATUS: 'dataStatus',
  BOARDS: 'boards',
  SCREENERS: 'screeners',
} as const;
