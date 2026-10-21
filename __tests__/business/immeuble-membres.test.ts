/**
 * Règles de l'immeuble partagé : une porte compte pour l'auteur de son dernier
 * passage, et « Fait par » n'apparaît que sur les portes faites par un autre.
 */
import {
  getAutresMembres,
  getPorteAuteurLabel,
  isPorteFaitePar,
  toImmeubleViewer,
} from "@/utils/business/immeuble-membres";
import type { ImmeubleMembre, Porte } from "@/types/api";

const membres: ImmeubleMembre[] = [
  { id: 1, nom: "Martin", prenom: "Léa", type: "COMMERCIAL" },
  { id: 2, nom: "Durand", prenom: "Marc", type: "COMMERCIAL" },
  { id: 1, nom: "Petit", prenom: "Sophie", type: "MANAGER" },
];

const porte = (patch: Partial<Porte>): Porte => ({
  id: 10,
  numero: "1",
  etage: 1,
  immeubleId: 5,
  statut: "REFUS",
  ...patch,
});

describe("toImmeubleViewer", () => {
  it("attend une identité complète", () => {
    expect(toImmeubleViewer(null, "commercial")).toBeNull();
    expect(toImmeubleViewer(3, null)).toBeNull();
  });

  it("convertit le rôle stocké en type d'utilisateur", () => {
    expect(toImmeubleViewer(3, "manager")).toEqual({ id: 3, type: "MANAGER" });
    expect(toImmeubleViewer(3, "commercial")).toEqual({ id: 3, type: "COMMERCIAL" });
  });
});

describe("getAutresMembres", () => {
  it("retire l'utilisateur connecté en comparant id ET type", () => {
    const autres = getAutresMembres(membres, { id: 1, type: "COMMERCIAL" });
    expect(autres.map((m) => m.prenom)).toEqual(["Marc", "Sophie"]);
  });
});

describe("isPorteFaitePar", () => {
  it("compare l'auteur commercial pour un commercial", () => {
    const viewer = { id: 1, type: "COMMERCIAL" as const };
    expect(isPorteFaitePar(porte({ dernierCommercialId: 1 }), viewer)).toBe(true);
    expect(isPorteFaitePar(porte({ dernierCommercialId: 2 }), viewer)).toBe(false);
    expect(isPorteFaitePar(porte({ dernierManagerId: 1 }), viewer)).toBe(false);
  });

  it("compare l'auteur manager pour un manager", () => {
    const viewer = { id: 1, type: "MANAGER" as const };
    expect(isPorteFaitePar(porte({ dernierManagerId: 1 }), viewer)).toBe(true);
    expect(isPorteFaitePar(porte({ dernierCommercialId: 1 }), viewer)).toBe(false);
  });
});

describe("getPorteAuteurLabel", () => {
  const viewer = { id: 1, type: "COMMERCIAL" as const };

  it("ne dit rien sur mes portes ni sur les portes non prospectées", () => {
    expect(getPorteAuteurLabel(porte({ dernierCommercialId: 1 }), membres, viewer)).toBeNull();
    expect(
      getPorteAuteurLabel(porte({ statut: "NON_VISITE", dernierCommercialId: 2 }), membres, viewer),
    ).toBeNull();
    expect(getPorteAuteurLabel(porte({}), membres, viewer)).toBeNull();
  });

  it("préfère le prénom porté par la porte", () => {
    expect(
      getPorteAuteurLabel(
        porte({ dernierCommercialId: 2, dernierActeurPrenom: "Marco" }),
        membres,
        viewer,
      ),
    ).toBe("Fait par Marco");
  });

  it("retrouve le prénom dans les membres, sans confondre commercial et manager", () => {
    expect(getPorteAuteurLabel(porte({ dernierCommercialId: 2 }), membres, viewer)).toBe(
      "Fait par Marc",
    );
    expect(getPorteAuteurLabel(porte({ dernierManagerId: 1 }), membres, viewer)).toBe(
      "Fait par Sophie",
    );
  });

  it("reste explicite quand l'auteur n'est plus membre", () => {
    expect(getPorteAuteurLabel(porte({ dernierCommercialId: 9 }), membres, viewer)).toBe(
      "Fait par un collègue",
    );
  });
});
