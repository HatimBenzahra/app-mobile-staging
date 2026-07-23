import type React from "react";
import type { SvgProps } from "react-native-svg";

/**
 * Registre des icônes de gamification (pack Game Icons, CC BY 3.0), bundlées localement.
 * SVG monochromes (`fill="currentColor"`) → colorés au runtime via la prop `color`.
 * Clés = noms de fichier, alignées sur `manifest.byCode` / `manifest.tiers`.
 * RN exige des imports statiques (pas de résolution dynamique de chemin).
 */

// --- Badges ---
import ArcheryTargetBadge from "@/assets/gamification-icons/badges/archery-target.svg";
import CardAceSpadesBadge from "@/assets/gamification-icons/badges/card-ace-spades.svg";
import CenturionHelmetBadge from "@/assets/gamification-icons/badges/centurion-helmet.svg";
import ChartBadge from "@/assets/gamification-icons/badges/chart.svg";
import CheckedShieldBadge from "@/assets/gamification-icons/badges/checked-shield.svg";
import ChessKingBadge from "@/assets/gamification-icons/badges/chess-king.svg";
import CycleBadge from "@/assets/gamification-icons/badges/cycle.svg";
import DiamondTrophyBadge from "@/assets/gamification-icons/badges/diamond-trophy.svg";
import DoorBadge from "@/assets/gamification-icons/badges/door.svg";
import FountainPenBadge from "@/assets/gamification-icons/badges/fountain-pen.svg";
import GearsBadge from "@/assets/gamification-icons/badges/gears.svg";
import GoldBarBadge from "@/assets/gamification-icons/badges/gold-bar.svg";
import HouseKeysBadge from "@/assets/gamification-icons/badges/house-keys.svg";
import LightningTrioBadge from "@/assets/gamification-icons/badges/lightning-trio.svg";
import MountainClimbingBadge from "@/assets/gamification-icons/badges/mountain-climbing.svg";
import MountaintopBadge from "@/assets/gamification-icons/badges/mountaintop.svg";
import NetworkBarsBadge from "@/assets/gamification-icons/badges/network-bars.svg";
import PerspectiveDiceFiveBadge from "@/assets/gamification-icons/badges/perspective-dice-five.svg";
import PerspectiveDiceFourBadge from "@/assets/gamification-icons/badges/perspective-dice-four.svg";
import PlantRootsBadge from "@/assets/gamification-icons/badges/plant-roots.svg";
import PodiumSecondBadge from "@/assets/gamification-icons/badges/podium-second.svg";
import PodiumThirdBadge from "@/assets/gamification-icons/badges/podium-third.svg";
import PowerLightningBadge from "@/assets/gamification-icons/badges/power-lightning.svg";
import RadarDishBadge from "@/assets/gamification-icons/badges/radar-dish.svg";
import RocketBadge from "@/assets/gamification-icons/badges/rocket.svg";
import ShakingHandsBadge from "@/assets/gamification-icons/badges/shaking-hands.svg";
import SmartphoneBadge from "@/assets/gamification-icons/badges/smartphone.svg";
import SprintBadge from "@/assets/gamification-icons/badges/sprint.svg";
import SproutBadge from "@/assets/gamification-icons/badges/sprout.svg";
import StairsGoalBadge from "@/assets/gamification-icons/badges/stairs-goal.svg";
import TalkBadge from "@/assets/gamification-icons/badges/talk.svg";
import TemplarShieldBadge from "@/assets/gamification-icons/badges/templar-shield.svg";
import TopHatBadge from "@/assets/gamification-icons/badges/top-hat.svg";
import TowTruckBadge from "@/assets/gamification-icons/badges/tow-truck.svg";
import TrophyCupBadge from "@/assets/gamification-icons/badges/trophy-cup.svg";
import TvBadge from "@/assets/gamification-icons/badges/tv.svg";
import TvTowerBadge from "@/assets/gamification-icons/badges/tv-tower.svg";
import UpgradeBadge from "@/assets/gamification-icons/badges/upgrade.svg";

// --- Paliers ---
import BronzeTier from "@/assets/gamification-icons/tiers/bronze.svg";
import DiamondTier from "@/assets/gamification-icons/tiers/diamond.svg";
import GoldTier from "@/assets/gamification-icons/tiers/gold.svg";
import GrandmasterTier from "@/assets/gamification-icons/tiers/grandmaster.svg";
import LegendTier from "@/assets/gamification-icons/tiers/legend.svg";
import MasterTier from "@/assets/gamification-icons/tiers/master.svg";
import PlatinumTier from "@/assets/gamification-icons/tiers/platinum.svg";
import SilverTier from "@/assets/gamification-icons/tiers/silver.svg";

type SvgIcon = React.FC<SvgProps>;

export const BADGE_ICONS: Record<string, SvgIcon> = {
  "archery-target": ArcheryTargetBadge,
  "card-ace-spades": CardAceSpadesBadge,
  "centurion-helmet": CenturionHelmetBadge,
  "chart": ChartBadge,
  "checked-shield": CheckedShieldBadge,
  "chess-king": ChessKingBadge,
  "cycle": CycleBadge,
  "diamond-trophy": DiamondTrophyBadge,
  "door": DoorBadge,
  "fountain-pen": FountainPenBadge,
  "gears": GearsBadge,
  "gold-bar": GoldBarBadge,
  "house-keys": HouseKeysBadge,
  "lightning-trio": LightningTrioBadge,
  "mountain-climbing": MountainClimbingBadge,
  "mountaintop": MountaintopBadge,
  "network-bars": NetworkBarsBadge,
  "perspective-dice-five": PerspectiveDiceFiveBadge,
  "perspective-dice-four": PerspectiveDiceFourBadge,
  "plant-roots": PlantRootsBadge,
  "podium-second": PodiumSecondBadge,
  "podium-third": PodiumThirdBadge,
  "power-lightning": PowerLightningBadge,
  "radar-dish": RadarDishBadge,
  "rocket": RocketBadge,
  "shaking-hands": ShakingHandsBadge,
  "smartphone": SmartphoneBadge,
  "sprint": SprintBadge,
  "sprout": SproutBadge,
  "stairs-goal": StairsGoalBadge,
  "talk": TalkBadge,
  "templar-shield": TemplarShieldBadge,
  "top-hat": TopHatBadge,
  "tow-truck": TowTruckBadge,
  "trophy-cup": TrophyCupBadge,
  "tv": TvBadge,
  "tv-tower": TvTowerBadge,
  "upgrade": UpgradeBadge,
};

export const TIER_ICONS: Record<string, SvgIcon> = {
  "bronze": BronzeTier,
  "diamond": DiamondTier,
  "gold": GoldTier,
  "grandmaster": GrandmasterTier,
  "legend": LegendTier,
  "master": MasterTier,
  "platinum": PlatinumTier,
  "silver": SilverTier,
};

/** Composant SVG d'un badge par nom d'icône (ou `null` si inconnu). */
export function badgeIcon(key?: string | null): SvgIcon | null {
  if (!key) return null;
  return BADGE_ICONS[key] ?? null;
}

/** Composant SVG d'un palier par clé serveur (insensible à la casse). */
export function tierIcon(tierKey?: string | null): SvgIcon | null {
  if (!tierKey) return null;
  return TIER_ICONS[tierKey.toLowerCase()] ?? null;
}
