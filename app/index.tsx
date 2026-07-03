import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View } from "react-native";
import { colors } from "@/constants/theme";
import { useAppBootstrap } from "@/hooks/use-app-bootstrap";

export default function Index() {
  const { ready, targetRoute } = useAppBootstrap();

  // Le splash natif (tenu par app/_layout.tsx) reste affiché jusqu'ici : dès que
  // l'app est prête, on le masque puis on redirige. Un seul écran de chargement.
  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready || !targetRoute) {
    // Sous le splash natif : même fond, pour un raccord invisible au masquage.
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return <Redirect href={targetRoute} />;
}
