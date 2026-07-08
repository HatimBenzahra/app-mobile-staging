import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { StyleProp, TextStyle } from "react-native";

type MCIGlyph = ComponentProps<typeof MaterialCommunityIcons>["name"];

/**
 * Source de vérité UNIQUE du style d'icônes de l'app.
 *
 * Les clés sont les noms sémantiques hérités de Feather (déjà utilisés partout
 * dans le code) ; les valeurs sont les glyphs Material Community Icons. Pour
 * changer l'aspect des icônes dans toute l'app, on édite ce seul mapping —
 * jamais les 62 écrans qui consomment `<Icon name="..." />`.
 *
 * `satisfies Record<string, MCIGlyph>` garantit à la compilation que chaque
 * glyph existe réellement dans MaterialCommunityIcons.
 */
const ICON_MAP = {
  "account-multiple-outline": "account-multiple-outline",
  activity: "pulse",
  "alert-circle": "alert-circle",
  "alert-triangle": "alert",
  "arrow-down-right": "arrow-bottom-right",
  "arrow-left": "arrow-left",
  "arrow-right": "arrow-right",
  "arrow-right-circle": "arrow-right-circle",
  "arrow-up-right": "arrow-top-right",
  award: "trophy",
  "bar-chart-2": "chart-bar",
  bell: "bell",
  "book-open": "book-open-variant",
  briefcase: "briefcase",
  calendar: "calendar",
  check: "check",
  "check-circle": "check-circle",
  "chevron-down": "chevron-down",
  "chevron-left": "chevron-left",
  "chevron-right": "chevron-right",
  "chevrons-up": "chevron-double-up",
  circle: "circle-outline",
  clock: "clock-outline",
  "corner-down-left": "keyboard-return",
  "corner-up-left": "undo-variant",
  crosshair: "crosshairs-gps",
  "edit-3": "pencil",
  eye: "eye",
  "file-text": "file-document-outline",
  filter: "filter-variant",
  grid: "view-grid-outline",
  hash: "pound",
  "help-circle": "help-circle",
  home: "home",
  inbox: "inbox-outline",
  info: "information-outline",
  key: "key-variant",
  layers: "layers-outline",
  loader: "loading",
  lock: "lock-outline",
  "log-out": "logout",
  mail: "email-outline",
  map: "map-outline",
  "map-pin": "map-marker",
  menu: "menu",
  "message-circle": "message-outline",
  "message-square": "chat-outline",
  minus: "minus",
  "minus-circle": "minus-circle-outline",
  move: "cursor-move",
  package: "package-variant-closed",
  phone: "phone",
  plus: "plus",
  "plus-circle": "plus-circle-outline",
  "refresh-cw": "refresh",
  repeat: "repeat",
  "rotate-ccw": "rotate-left",
  search: "magnify",
  shield: "shield-outline",
  sliders: "tune",
  star: "star",
  target: "target",
  "trash-2": "trash-can-outline",
  "trending-down": "trending-down",
  "trending-up": "trending-up",
  user: "account",
  "user-check": "account-check",
  "user-x": "account-remove",
  users: "account-multiple",
  "vector-polygon": "vector-polygon",
  watch: "watch-variant",
  "wifi-off": "wifi-off",
  x: "close",
  "x-circle": "close-circle",
  zap: "lightning-bolt",
} as const satisfies Record<string, MCIGlyph>;

/** Nom sémantique d'icône accepté par `<Icon />` (API stable de l'app). */
export type IconName = keyof typeof ICON_MAP;

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

/**
 * Icône applicative. Wrapper au-dessus de Material Community Icons, câblé via
 * `ICON_MAP`. À utiliser partout à la place d'un jeu d'icônes brut.
 */
export function Icon({ name, size = 24, color, style }: IconProps) {
  return (
    <MaterialCommunityIcons
      name={ICON_MAP[name]}
      size={size}
      color={color}
      style={style}
    />
  );
}

export default Icon;
