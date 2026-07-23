/**
 * Import de fichiers `.svg` comme composants React (via react-native-svg-transformer).
 * Ex. `import Trophy from "@/assets/gamification-icons/badges/trophy.svg"`.
 */
declare module "*.svg" {
  import type React from "react";
  import type { SvgProps } from "react-native-svg";
  const content: React.FC<SvgProps>;
  export default content;
}
