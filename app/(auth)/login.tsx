import ProwinLogo from "@/components/navigation/ProwinLogo";
import { authService } from "@/services/auth";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoLogging, setIsAutoLogging] = useState(true);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;

  const horizontalPad = isTablet ? 32 : 20;
  const cardMaxWidth = isTablet ? 460 : 520;
  const inputHeight = isTablet ? 56 : 52;

  const attemptAutoLogin = useCallback(async () => {
    try {
      const saved = await authService.getSavedCredentials();
      if (!saved) {
        setIsAutoLogging(false);
        return;
      }
      setEmail(saved.username);
      setPassword(saved.password);
      await authService.login(saved);
      router.replace("/(app)");
    } catch {
      setIsAutoLogging(false);
    }
  }, [router]);

  useEffect(() => {
    attemptAutoLogin();
  }, [attemptAutoLogin]);

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Email et mot de passe requis.");
      return;
    }
    setIsLoading(true);
    try {
      await authService.login({ username: email.trim(), password });
      router.replace("/(app)");
    } catch (err: any) {
      if (err?.message === "UNAUTHORIZED_GROUP") {
        setError("Compte non autorisé (commercial ou manager uniquement).");
      } else if (err?.graphQLErrors?.length) {
        setError(err.graphQLErrors[0]?.message || "Connexion impossible.");
      } else if (err?.message) {
        setError("Erreur réseau. Vérifie ta connexion.");
      } else {
        setError("Connexion impossible. Vérifie tes identifiants.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isAutoLogging) {
    return (
      <SafeAreaView style={styles.bootScreen}>
        <View style={styles.bootLogo}>
          <ProwinLogo size={64} />
        </View>
        <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 24 }} />
        <Text style={styles.bootText}>Connexion en cours…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPad }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.column, { maxWidth: cardMaxWidth }]}>
            {/* Brand */}
            <View style={styles.brand}>
              <View style={styles.logoTile}>
                <ProwinLogo size={isTablet ? 72 : 60} />
              </View>
              <View style={styles.wordmarkRow}>
                <Text style={styles.wordmarkDark}>pro</Text>
                <Text style={styles.wordmarkDark}>-</Text>
                <Text style={styles.wordmarkBlue}>win</Text>
              </View>
              <Text style={styles.tagline}>
                Prospecter • Trouver • Développer
              </Text>
            </View>

            {/* Card */}
            <View style={[styles.card, isTablet && styles.cardTablet]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Bienvenue</Text>
                <Text style={styles.cardSubtitle}>
                  Connecte-toi pour reprendre ta prospection.
                </Text>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={15} color="#B91C1C" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Identifiant</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      { height: inputHeight },
                    ]}
                  >
                    <Feather
                      name="user"
                      size={18}
                      color="#94A3B8"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="email@exemple.com"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      style={styles.input}
                      editable={!isLoading}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Mot de passe</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      { height: inputHeight },
                    ]}
                  >
                    <Feather
                      name="lock"
                      size={18}
                      color="#94A3B8"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      autoComplete="password"
                      autoCorrect={false}
                      style={styles.input}
                      editable={!isLoading}
                      onSubmitEditing={handleLogin}
                      returnKeyType="go"
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                    >
                      <Feather
                        name={showPassword ? "eye-off" : "eye"}
                        size={18}
                        color="#64748B"
                      />
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  onPress={handleLogin}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.cta,
                    pressed && !isLoading && styles.ctaPressed,
                    isLoading && styles.ctaDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Se connecter"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.ctaText}>Se connecter</Text>
                      <Feather name="arrow-right" size={18} color="#FFFFFF" />
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Besoin d'aide ? Contacte ton administrateur.
              </Text>
              <Text style={styles.versionText}>
                v{Constants.expoConfig?.version ?? "1.0.0"}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  bootScreen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  bootLogo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  bootText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 32,
  },
  column: {
    width: "100%",
    alignSelf: "center",
    gap: 24,
  },
  brand: {
    alignItems: "center",
    gap: 12,
  },
  logoTile: {
    width: 92,
    height: 92,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  wordmarkDark: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  wordmarkBlue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#2563EB",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  cardTablet: {
    padding: 32,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 13.5,
    color: "#64748B",
    fontWeight: "500",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 4,
  },
  cta: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#0F172A",
    height: 54,
    borderRadius: 16,
  },
  ctaPressed: {
    opacity: 0.92,
  },
  ctaDisabled: {
    backgroundColor: "#94A3B8",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 15.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  footer: {
    alignItems: "center",
    gap: 4,
    paddingTop: 4,
  },
  footerText: {
    color: "#64748B",
    fontSize: 12.5,
    fontWeight: "500",
  },
  versionText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
