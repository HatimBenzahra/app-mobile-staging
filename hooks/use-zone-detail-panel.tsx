import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Panneau de détail zone rendu EMBARQUÉ dans la zone de contenu (au-dessus des
 * onglets, sous la NavigationRail) plutôt qu'en route empilée plein écran. Le
 * contexte vit au niveau de (app)/_layout — au-dessus de la pile — afin que
 * l'écran onglets (AppContent) ET les scènes d'onglets (Zones, Carte) partagent
 * le même canal d'ouverture/fermeture, sur le modèle de `use-map-focus`.
 */
type ZoneDetailPanelContextValue = {
  zoneDetailId: number | null;
  openZoneDetail: (id: number) => void;
  closeZoneDetail: () => void;
};

const ZoneDetailPanelContext = createContext<
  ZoneDetailPanelContextValue | undefined
>(undefined);

export function ZoneDetailPanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [zoneDetailId, setZoneDetailId] = useState<number | null>(null);

  const openZoneDetail = useCallback((id: number) => {
    setZoneDetailId(id);
  }, []);

  const closeZoneDetail = useCallback(() => {
    setZoneDetailId(null);
  }, []);

  const value = useMemo(
    () => ({ zoneDetailId, openZoneDetail, closeZoneDetail }),
    [zoneDetailId, openZoneDetail, closeZoneDetail],
  );

  return (
    <ZoneDetailPanelContext.Provider value={value}>
      {children}
    </ZoneDetailPanelContext.Provider>
  );
}

export function useZoneDetailPanel() {
  const context = useContext(ZoneDetailPanelContext);
  if (!context) {
    throw new Error(
      "useZoneDetailPanel must be used within ZoneDetailPanelProvider",
    );
  }
  return context;
}
