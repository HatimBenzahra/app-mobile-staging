import { ErrorType, isGraphQLClientError } from "@/services/core/graphql/errors";

// Pauses entre deux essais d'une file d'envoi : croissantes, puis plafonnées.
const RETRY_DELAYS_MS = [30_000, 60_000, 2 * 60_000, 5 * 60_000];
export const MAX_RETRY_DELAY_MS = 15 * 60_000;

// Erreurs que le serveur renverra à l'identique : inutile de réessayer.
const PERMANENT_ERROR_TYPES: readonly ErrorType[] = [
  ErrorType.VALIDATION,
  ErrorType.AUTHORIZATION,
  ErrorType.NOT_FOUND,
];

/**
 * Pause avant le prochain essai, selon le nombre d'échecs consécutifs (≥ 1) :
 * 30 s → 1 min → 2 min → 5 min → 15 min ensuite.
 */
export function getRetryDelayMs(failureCount: number): number {
  const index = Math.max(0, failureCount - 1);
  return RETRY_DELAYS_MS[index] ?? MAX_RETRY_DELAY_MS;
}

/**
 * Vrai si l'erreur est un refus définitif du serveur. Dans le doute (réseau,
 * serveur, session expirée, erreur inconnue), l'erreur est temporaire : on
 * réessaie plutôt que de perdre la donnée.
 */
export function isPermanentError(err: unknown): boolean {
  return isGraphQLClientError(err) && PERMANENT_ERROR_TYPES.includes(err.type);
}
