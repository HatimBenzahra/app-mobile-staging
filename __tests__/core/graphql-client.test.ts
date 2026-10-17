/**
 * Classement des échecs de requête par le client GraphQL.
 *
 * Sous React Native, une requête sans réseau lève TypeError("Network request
 * failed") : elle doit être classée NETWORK, ce qui permet aux files d'envoi
 * d'arrêter leur tour au lieu d'essayer chaque élément.
 */

import { ErrorType, GraphQLClient, GraphQLClientError } from "@/services/core/graphql/client";

jest.mock("@/constants/env", () => ({ API_URL: "https://api.test" }));

const mockFetch = jest.fn<Promise<Response>, [string, RequestInit]>();

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, statusText: "OK", json: async () => body } as Response;
}

async function requestError(client: GraphQLClient): Promise<GraphQLClientError> {
  try {
    await client.request("query { ping }");
  } catch (err) {
    if (err instanceof GraphQLClientError) return err;
    throw err;
  }
  throw new Error("La requête aurait dû échouer");
}

describe("GraphQLClient", () => {
  const originalFetch = global.fetch;
  let client: GraphQLClient;

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
    client = new GraphQLClient("https://api.test/graphql");
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("TypeError('Network request failed') de React Native → NETWORK", async () => {
    mockFetch.mockRejectedValue(new TypeError("Network request failed"));

    const error = await requestError(client);
    expect(error.type).toBe(ErrorType.NETWORK);
    expect(error.isRetryable()).toBe(true);
  });

  it("tout échec de fetch (ex. requête annulée) → NETWORK", async () => {
    mockFetch.mockRejectedValue(new Error("Aborted"));

    expect((await requestError(client)).type).toBe(ErrorType.NETWORK);
  });

  it("une erreur après la réponse du serveur n'est pas une panne réseau", async () => {
    mockFetch.mockResolvedValue(jsonResponse(null));

    expect((await requestError(client)).type).not.toBe(ErrorType.NETWORK);
  });

  it("les erreurs GraphQL gardent leur classement", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ errors: [{ message: "Access denied", extensions: { code: "FORBIDDEN" } }] }),
    );

    expect((await requestError(client)).type).toBe(ErrorType.AUTHORIZATION);
  });
});
