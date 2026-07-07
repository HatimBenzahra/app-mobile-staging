import { ZoneDetailView } from "@/components/zones/ZoneDetailView";
import { useLocalSearchParams, useRouter } from "expo-router";

/**
 * Wrapper de route conservé pour les deep-links / accès direct par URL
 * (`/zone/[id]`). Dans l'app, le détail zone s'ouvre désormais en panneau
 * embarqué (voir `useZoneDetailPanel` + AppContent) afin de garder la
 * NavigationRail visible ; cette route empilée reste un point d'entrée par URL.
 */
export default function ZoneDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ZoneDetailView zoneId={id ? Number(id) : NaN} onBack={() => router.back()} />
  );
}
