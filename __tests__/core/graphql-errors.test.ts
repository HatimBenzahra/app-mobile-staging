/**
 * Classement des erreurs GraphQL renvoyées en HTTP 200.
 *
 * Le type décide si une file d'envoi écarte une donnée (refus définitif) ou la
 * retente : le code structuré du serveur (NestJS / Apollo) prime sur le texte
 * du message, qui ne sert que de repli.
 */

import { ErrorType, errorHandler } from "@/services/core/graphql/errors";

function classify(error: { message: string; extensions?: unknown }): ErrorType {
  return errorHandler.handleGraphQLErrors([error]).type;
}

describe("errorHandler.handleGraphQLErrors", () => {
  it.each([
    ["FORBIDDEN", ErrorType.AUTHORIZATION],
    ["UNAUTHENTICATED", ErrorType.AUTHENTICATION],
    ["BAD_USER_INPUT", ErrorType.VALIDATION],
    ["NOT_FOUND", ErrorType.NOT_FOUND],
  ])("extensions.code %s → %s", (code, expected) => {
    expect(classify({ message: "Erreur", extensions: { code } })).toBe(expected);
  });

  it.each([
    [400, ErrorType.VALIDATION],
    [401, ErrorType.AUTHENTICATION],
    [403, ErrorType.AUTHORIZATION],
    [404, ErrorType.NOT_FOUND],
    [422, ErrorType.VALIDATION],
  ])("originalError.statusCode %i → %s", (statusCode, expected) => {
    expect(
      classify({
        message: "Erreur",
        extensions: { code: "INTERNAL_SERVER_ERROR", originalError: { statusCode } },
      }),
    ).toBe(expected);
  });

  it("le code structuré prime sur les mots-clés du message", () => {
    expect(
      classify({ message: "Validation impossible", extensions: { code: "FORBIDDEN" } }),
    ).toBe(ErrorType.AUTHORIZATION);
  });

  it("ForbiddenException('Access denied') du backend est un refus d'autorisation", () => {
    expect(classify({ message: "Access denied" })).toBe(ErrorType.AUTHORIZATION);
    expect(
      classify({
        message: "Access denied",
        extensions: { code: "FORBIDDEN", originalError: { statusCode: 403, message: "Access denied" } },
      }),
    ).toBe(ErrorType.AUTHORIZATION);
  });

  it("sans code exploitable, repli sur les mots-clés du message", () => {
    expect(classify({ message: "Token expiré", extensions: { code: "SOMETHING" } })).toBe(
      ErrorType.AUTHENTICATION,
    );
    expect(classify({ message: "Porte introuvable" })).toBe(ErrorType.NOT_FOUND);
    expect(classify({ message: "Données invalides" })).toBe(ErrorType.VALIDATION);
  });

  it("une erreur non reconnue reste GRAPHQL (traitée comme temporaire)", () => {
    expect(classify({ message: "Erreur interne", extensions: { code: "INTERNAL_SERVER_ERROR" } })).toBe(
      ErrorType.GRAPHQL,
    );
  });
});
