import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { TypeHabitat } from "@/types/api";

export type HabitatIconName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * Retourne le nom d'icône MaterialCommunityIcons pour un type d'habitat.
 * Centralise le mapping pour éviter la dispersion (DRY).
 *
 * - MAISON   → "home"
 * - PAVILLON → "home-group"
 * - IMMEUBLE → "office-building"
 * - QUARTIER → "map-marker-radius"
 */
export function getHabitatIconName(type?: TypeHabitat | "quartiers"): HabitatIconName {
  if (type === "MAISON") return "home";
  if (type === "PAVILLON") return "home-group";
  if (type === "quartiers") return "map-marker-radius";
  return "office-building";
}

type HabitatIconProps = {
  type?: TypeHabitat | "quartiers";
  size: number;
  color: string;
};

export function HabitatIcon({ type, size, color }: HabitatIconProps) {
  return (
    <MaterialCommunityIcons
      name={getHabitatIconName(type)}
      size={size}
      color={color}
    />
  );
}
