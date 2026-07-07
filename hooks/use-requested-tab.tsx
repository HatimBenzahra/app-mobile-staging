import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Canal « onglet cible » inter-écrans : permet à une route empilée (ex. la page
 * de création de zone) de demander à l'écran onglets de basculer sur un onglet
 * précis (par sa `key`) au retour. Calqué sur `use-map-focus` : un state global
 * posé par `requestTab`, consommé puis remis à zéro par l'écran onglets.
 */
type RequestedTabContextValue = {
  requestedTabKey: string | null;
  requestTab: (key: string) => void;
  clearRequestedTab: () => void;
};

const RequestedTabContext = createContext<RequestedTabContextValue | undefined>(
  undefined,
);

export function RequestedTabProvider({ children }: { children: React.ReactNode }) {
  const [requestedTabKey, setRequestedTabKey] = useState<string | null>(null);

  const requestTab = useCallback((key: string) => {
    setRequestedTabKey(key);
  }, []);

  const clearRequestedTab = useCallback(() => {
    setRequestedTabKey(null);
  }, []);

  const value = useMemo(
    () => ({ requestedTabKey, requestTab, clearRequestedTab }),
    [requestedTabKey, requestTab, clearRequestedTab],
  );

  return (
    <RequestedTabContext.Provider value={value}>
      {children}
    </RequestedTabContext.Provider>
  );
}

export function useRequestedTab() {
  const context = useContext(RequestedTabContext);
  if (!context) {
    throw new Error("useRequestedTab must be used within RequestedTabProvider");
  }
  return context;
}
