/**
 * Configuration management for ehrsh
 * Loads settings from environment variables or defaults
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

export interface Config {
  /** Base URL for the FHIR server */
  fhirBaseUrl: string;
  /** Bearer token for authentication */
  bearerToken?: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Enable verbose/debug output */
  verbose: boolean;
}

/** Current mutable configuration */
let currentConfig: Config;

/**
 * Load configuration from environment variables and config files
 */
export function loadConfig(): Config {
  // Also check for ~/.ehrshrc
  const homeEnvPath = path.join(process.env.HOME || '', '.ehrshrc');
  if (fs.existsSync(homeEnvPath)) {
    dotenv.config({ path: homeEnvPath });
  }

  return {
    fhirBaseUrl: process.env.FHIR_BASE_URL || 'https://hapi.fhir.org/baseR4',
    bearerToken: process.env.FHIR_BEARER_TOKEN,
    timeout: parseInt(process.env.FHIR_TIMEOUT || '', 10) || 30000,
    verbose: process.env.EHRSH_VERBOSE === 'true',
  };
}

/**
 * Get the current configuration
 */
export function getConfig(): Config {
  if (!currentConfig) {
    currentConfig = loadConfig();
  }
  return { ...currentConfig };
}

/**
 * Override configuration values at runtime
 * @param overrides Partial configuration to merge
 */
export function setConfigOverrides(overrides: Partial<Config>): void {
  if (!currentConfig) {
    currentConfig = loadConfig();
  }
  currentConfig = { ...currentConfig, ...overrides };
}

/**
 * Reset configuration to values from environment
 */
export function resetConfig(): void {
  currentConfig = loadConfig();
}

/**
 * Validate the current configuration
 * @returns Array of validation error messages (empty if valid)
 */
export function validateConfig(): string[] {
  const errors: string[] = [];
  const cfg = getConfig();

  // Validate FHIR base URL
  try {
    new URL(cfg.fhirBaseUrl);
  } catch {
    errors.push(`Invalid FHIR_BASE_URL: ${cfg.fhirBaseUrl}`);
  }

  // Validate timeout
  if (cfg.timeout < 0) {
    errors.push(`Invalid timeout: ${cfg.timeout} (must be positive)`);
  }

  return errors;
}

/**
 * Get a formatted string showing current configuration (for display)
 */
export function getConfigSummary(): string {
  const cfg = getConfig();
  const lines = [
    `FHIR Server: ${cfg.fhirBaseUrl}`,
    `Timeout: ${cfg.timeout}ms`,
    `Verbose: ${cfg.verbose}`,
  ];

  if (cfg.bearerToken) {
    lines.push(`Auth: Bearer token configured`);
  }

  return lines.join('\n');
}

// Initialize configuration on module load
export const config = loadConfig();
currentConfig = config;
export default config;
