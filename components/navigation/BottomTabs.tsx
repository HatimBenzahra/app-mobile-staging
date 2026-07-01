import { Feather } from "@expo/vector-icons";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useMemo, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabRoute = {
  key: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
};

type BottomTabsProps = {
  routes: TabRoute[];
  index: number;
  onTabPress: (index: number) => void;
};

export default function BottomTabs({ routes, index, onTabPress }: BottomTabsProps) {
  const insets = useSafeAreaInsets();
  const tabAnimsRef = useRef<Animated.Value[]>([]);

  if (tabAnimsRef.current.length !== routes.length) {
    tabAnimsRef.current = routes.map(
      (_route, routeIndex) =>
        tabAnimsRef.current[routeIndex] ??
        new Animated.Value(routeIndex === index ? 1 : 0),
    );
  }

  const tabAnims = tabAnimsRef.current;

  useEffect(() => {
    const animations = tabAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: i === index ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    );
    Animated.parallel(animations).start();
  }, [index, tabAnims]);

  const tabInterpolations = useMemo(
    () =>
      tabAnims.map((progress) => ({
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        }),
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [2, 0],
        }),
        opacity: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 1],
        }),
      })),
    // tabAnims is a stable ref-backed array that only reallocates when
    // routes.length changes, so recompute interpolations solely on that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routes.length],
  );

  return (
    <View style={[styles.container, { paddingBottom: 10 + insets.bottom }]}>
      {routes.map((route, routeIndex) => {
        const isActive = index === routeIndex;
        const color = isActive ? "#005BFF" : "#94A3B8";
        const { scale, translateY, opacity } = tabInterpolations[routeIndex];

        return (
          <Pressable
            key={route.key}
            onPress={() => onTabPress(routeIndex)}
            style={styles.tab}
          >
            <Animated.View
              style={[
                styles.tabContent,
                {
                  opacity,
                  transform: [{ translateY }, { scale }],
                },
              ]}
            >
              <View style={styles.activeBarWrap}>
                <View
                  style={[
                    styles.activeBar,
                    { opacity: isActive ? 1 : 0 },
                  ]}
                />
              </View>
              <Feather name={route.icon} size={20} color={color} />
              <Text style={[styles.label, { color }]}>{route.title}</Text>
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  activeBarWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 6,
  },
  activeBar: {
    width: "60%",
    height: 3,
    borderRadius: 999,
    backgroundColor: "#005BFF",
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
});
