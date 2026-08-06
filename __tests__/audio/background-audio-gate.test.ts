/**
 * Garanties sur le gate du foreground service micro.
 *
 * Ce service est ce qui autorise Android à laisser l'app capter le micro quand
 * le commercial quitte l'app pendant un échange. Le démarrer alors que les
 * conditions d'Android 14 ne sont pas réunies provoque un crash natif non
 * catchable depuis le JS — d'où ces tests sur les préconditions.
 */

const mockCheck = jest.fn<Promise<boolean>, [string]>();
const mockStart = jest.fn<Promise<void>, [unknown, unknown]>();
const mockStop = jest.fn<Promise<void>, []>();
const mockIsRunning = jest.fn<boolean, []>();

const appState = { currentState: "active" as string };

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  AppState: appState,
  PermissionsAndroid: {
    PERMISSIONS: { RECORD_AUDIO: "android.permission.RECORD_AUDIO" },
    check: (permission: string) => mockCheck(permission),
  },
}));

jest.mock("react-native-background-actions", () => ({
  __esModule: true,
  default: {
    start: (task: unknown, options: unknown) => mockStart(task, options),
    stop: () => mockStop(),
    isRunning: () => mockIsRunning(),
  },
}));

import { BackgroundAudioService } from "@/services/audio/background/background-audio.service";

describe("BackgroundAudioService — préconditions de démarrage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appState.currentState = "active";
    mockCheck.mockResolvedValue(true);
    mockStart.mockResolvedValue(undefined);
    mockStop.mockResolvedValue(undefined);
    mockIsRunning.mockReturnValue(false);
  });

  it("démarre quand le micro est accordé et l'app au premier plan", async () => {
    mockStart.mockImplementation(async () => {
      mockIsRunning.mockReturnValue(true);
    });

    await expect(BackgroundAudioService.start()).resolves.toBe(true);
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it("ne démarre pas — et ne jette pas — si RECORD_AUDIO n'est pas accordée", async () => {
    mockCheck.mockResolvedValue(false);

    await expect(BackgroundAudioService.start()).resolves.toBe(false);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("ne démarre pas si l'app n'est pas au premier plan", async () => {
    appState.currentState = "background";

    await expect(BackgroundAudioService.start()).resolves.toBe(false);
    expect(mockStart).not.toHaveBeenCalled();
    // La permission n'est même pas interrogée : l'état de l'app suffit à refuser.
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it("ne démarre pas si la vérification de permission échoue", async () => {
    mockCheck.mockRejectedValue(new Error("permission check exploded"));

    await expect(BackgroundAudioService.start()).resolves.toBe(false);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("renvoie false sans jeter si le démarrage du service échoue", async () => {
    mockStart.mockRejectedValue(new Error("SecurityException"));

    await expect(BackgroundAudioService.start()).resolves.toBe(false);
  });

  it("ne redémarre pas un service déjà en cours", async () => {
    mockIsRunning.mockReturnValue(true);

    await expect(BackgroundAudioService.start()).resolves.toBe(true);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("n'est plus gaté sur la version d'Android", async () => {
    // Le blocage historique était `Platform.Version < 34`. Android 14 est
    // maintenant supporté dès lors que les préconditions réelles sont réunies.
    await expect(BackgroundAudioService.canStart()).resolves.toBe(true);
    expect(BackgroundAudioService.isSupported()).toBe(true);
  });

  it("arrête le service seulement s'il tourne", async () => {
    await BackgroundAudioService.stop();
    expect(mockStop).not.toHaveBeenCalled();

    mockIsRunning.mockReturnValue(true);
    await BackgroundAudioService.stop();
    expect(mockStop).toHaveBeenCalledTimes(1);
  });
});
