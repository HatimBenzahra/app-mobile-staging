export type DataSyncEventType =
  | "IMMEUBLE_CREATED"
  | "IMMEUBLE_UPDATED"
  | "IMMEUBLE_DELETED"
  | "QUARTIER_CREATED"
  | "ZONE_CREATED"
  // Assignation/retrait d'une zone à l'utilisateur courant (déclenché par la
  // réception d'une notification push). Force le rechargement de « ma zone en
  // cours » + historique + zones sur la carte.
  | "ZONE_ASSIGNED"
  | "ZONE_UNASSIGNED"
  | "PORTE_CREATED"
  | "PORTE_UPDATED"
  | "PORTE_DELETED";

export type DataSyncEvent = {
  type: DataSyncEventType;
  immeubleId?: number;
  porteId?: number;
  occurredAt: number;
};

type DataSyncListener = (event: DataSyncEvent) => void;

class DataSyncService {
  private listeners = new Set<DataSyncListener>();

  emit(event: Omit<DataSyncEvent, "occurredAt">): void {
    const payload: DataSyncEvent = {
      ...event,
      occurredAt: Date.now(),
    };
    this.listeners.forEach((listener) => listener(payload));
  }

  subscribe(listener: DataSyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const dataSyncService = new DataSyncService();
