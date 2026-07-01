import { useHamburgerMenu } from "@/hooks/use-hamburger-menu";
import { authService } from "@/services/auth";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MenuItemProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  isActive: boolean;
  animValue: Animated.Value;
};

const MenuItem = memo(function MenuItem({
  icon,
  label,
  onPress,
  isActive,
  animValue,
}: MenuItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View
      style={{
        opacity: animValue,
        transform: [
          {
            translateX: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0],
            }),
          },
          { scale: scaleAnim },
        ],
      }}
    >
      <Pressable
        style={[styles.menuItem, isActive && styles.menuItemActive]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          style={[
            styles.menuIconContainer,
            isActive && styles.menuIconContainerActive,
          ]}
        >
          <Feather
            name={icon}
            size={20}
            color={isActive ? "#005BFF" : "#64748B"}
          />
        </View>
        <Text
          style={[styles.menuItemText, isActive && styles.menuItemTextActive]}
        >
          {label}
        </Text>
        {isActive && <View style={styles.activeBar} />}
      </Pressable>
    </Animated.View>
  );
});

type HamburgerMenuOverlayProps = {
  currentIndex: number;
  onNavigate: (index: number) => void;
};

export default function HamburgerMenuOverlay({
  currentIndex,
  onNavigate,
}: HamburgerMenuOverlayProps) {
  const { isVisible, close } = useHamburgerMenu();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const itemAnimsRef = useRef<Animated.Value[]>([]);

  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const loadUserInfo = async () => {
      const role = await authService.getUserRole();
      setUserRole(role === "manager" ? "Manager" : "Commercial");
      setIsManager(role === "manager");
      setUserName("Pro-Win");
    };
    void loadUserInfo();
  }, []);

  const menuItems = useMemo(
    () => [
      {
        key: "dashboard",
        icon: "bar-chart-2" as keyof typeof Feather.glyphMap,
        label: "Tableau",
        targetIndex: 0,
        isActive: currentIndex === 0,
      },
      {
        key: "carte",
        icon: "map" as keyof typeof Feather.glyphMap,
        label: "Carte",
        targetIndex: 1,
        isActive: currentIndex === 1,
      },
      {
        key: "immeubles",
        icon: "map-pin" as keyof typeof Feather.glyphMap,
        label: "Lieux",
        targetIndex: 2,
        isActive: currentIndex === 2,
      },
      {
        key: "agenda",
        icon: "book-open" as keyof typeof Feather.glyphMap,
        label: "Agenda",
        targetIndex: 3,
        isActive: currentIndex === 3,
      },
      {
        key: "statistiques",
        icon: "trending-up" as keyof typeof Feather.glyphMap,
        label: "Stats",
        targetIndex: 4,
        isActive: currentIndex === 4,
      },
      {
        key: "classement",
        icon: "award" as keyof typeof Feather.glyphMap,
        label: "Classement",
        targetIndex: 5,
        isActive: currentIndex === 5,
      },
      ...(isManager
        ? [
            {
              key: "equipe",
              icon: "users" as keyof typeof Feather.glyphMap,
              label: "Équipe",
              targetIndex: 6,
              isActive: currentIndex === 6,
            },
          ]
        : []),
      {
        key: "historique",
        icon: "clock" as keyof typeof Feather.glyphMap,
        label: "Historique",
        targetIndex: isManager ? 7 : 6,
        isActive: currentIndex === (isManager ? 7 : 6),
      },
    ],
    [currentIndex, isManager],
  );

  if (itemAnimsRef.current.length !== menuItems.length) {
    itemAnimsRef.current = menuItems.map(
      (_item, itemIndex) => itemAnimsRef.current[itemIndex] ?? new Animated.Value(0),
    );
  }

  const itemAnims = itemAnimsRef.current;

  useEffect(() => {
    if (isVisible) {
      itemAnims.forEach((a) => a.setValue(0));

      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }).start();

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();

      Animated.stagger(
        60,
        itemAnims.slice(0, menuItems.length).map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            friction: 8,
            tension: 50,
            useNativeDriver: true,
          }),
        ),
      ).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      itemAnims.forEach((a) => a.setValue(0));
    }
    // slideAnim/fadeAnim are stable refs; itemAnims is a stable ref-backed
    // array that only reallocates when menuItems.length changes, in which
    // case this effect should still react solely to visibility toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const handleNavigate = useCallback(
    (index: number) => {
      onNavigate(index);
      close();
    },
    [close, onNavigate],
  );

  if (!isVisible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      <Animated.View
        style={[styles.dim, { opacity: fadeAnim }]}
        pointerEvents="none"
      />
      <Pressable style={styles.backdrop} onPress={close} />

      <Animated.View
        style={[
          styles.panel,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Feather name="user" size={24} color="#005BFF" />
            </View>
            <View style={styles.onlineIndicator} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName}</Text>
            <View style={styles.roleBadge}>
              <View style={styles.roleDot} />
              <Text style={styles.roleText}>{userRole}</Text>
            </View>
          </View>
          <Pressable style={styles.closeButton} onPress={close}>
            <Feather name="x" size={18} color="#64748B" />
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.navigationSection}>
          <Text style={styles.sectionLabel}>Navigation</Text>
          {menuItems.map((item, index) => (
            <MenuItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              isActive={item.isActive}
              animValue={itemAnims[index]}
              onPress={() => handleNavigate(item.targetIndex)}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 288,
    backgroundColor: "#FFFFFF",
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 8, height: 0 },
    elevation: 12,
  },

  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5EEFF",
    borderWidth: 2,
    borderColor: "#CCDEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
    backgroundColor: "#E5EEFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#005BFF",
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#005BFF",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 20,
  },

  navigationSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 2,
    position: "relative",
  },
  menuItemActive: {
    backgroundColor: "#E5EEFF",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuIconContainerActive: {
    backgroundColor: "#CCDEFF",
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
    flex: 1,
  },
  menuItemTextActive: {
    color: "#005BFF",
    fontWeight: "700",
  },
  activeBar: {
    width: 4,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#005BFF",
    position: "absolute",
    left: 0,
  },

});
