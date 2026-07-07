import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Modal « Mes zones » (lecture seule) : « En cours » + « Historique » des
 * assignations de l'utilisateur, ouvert depuis un FAB de la carte terrain. Le
 * contexte vit au niveau de (app)/_layout — au-dessus de la pile — sur le même
 * modèle que `use-zone-detail-panel` / `use-map-focus`, afin que le FAB de la
 * carte et le modal partagent le même canal d'ouverture/fermeture.
 */
type ZonesHistoryModalContextValue = {
  open: boolean;
  openZonesHistory: () => void;
  closeZonesHistory: () => void;
};

const ZonesHistoryModalContext = createContext<
  ZonesHistoryModalContextValue | undefined
>(undefined);

export function ZonesHistoryModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const openZonesHistory = useCallback(() => {
    setOpen(true);
  }, []);

  const closeZonesHistory = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({ open, openZonesHistory, closeZonesHistory }),
    [open, openZonesHistory, closeZonesHistory],
  );

  return (
    <ZonesHistoryModalContext.Provider value={value}>
      {children}
    </ZonesHistoryModalContext.Provider>
  );
}

export function useZonesHistoryModal() {
  const context = useContext(ZonesHistoryModalContext);
  if (!context) {
    throw new Error(
      "useZonesHistoryModal must be used within ZonesHistoryModalProvider",
    );
  }
  return context;
}
