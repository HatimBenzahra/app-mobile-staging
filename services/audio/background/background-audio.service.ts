import { Platform } from "react-native";
import BackgroundService from "react-native-background-actions";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const BACKGROUND_OPTIONS = {
  taskName: "ProWinAudio",
  taskTitle: "ProWin audio actif",
  taskDesc: "Ecoute en cours en arriere-plan",
  taskIcon: {
    name: "ic_launcher",
    type: "mipmap",
  },
  color: "#000000",
  linkingURI: "prospection://",
  parameters: {
    delay: 30000,
  },
};

async function backgroundKeepAlive(taskDataArguments?: { delay: number }) {
  const delay = taskDataArguments?.delay ?? 30000;
  while (BackgroundService.isRunning()) {
    await sleep(delay);
  }
}

// Android 14+ (API 34+) rejects FGS of type=microphone unless the app is in
// an eligible state at start time. The crash is a native SecurityException
// raised in onStartCommand and is NOT catchable from JS. Until we move to a
// non-mic foregroundServiceType or implement a while-in-use trigger, skip
// the background service on these OS versions. Local recording still works
// while the app is in foreground.
const SUPPORTS_BACKGROUND_AUDIO_FGS =
  Platform.OS === "android" &&
  typeof Platform.Version === "number" &&
  Platform.Version < 34;

export class BackgroundAudioService {
  static isSupported(): boolean {
    return SUPPORTS_BACKGROUND_AUDIO_FGS;
  }

  static isRunning(): boolean {
    if (!this.isSupported()) {
      return false;
    }
    return BackgroundService.isRunning();
  }

  static async start(): Promise<void> {
    if (!this.isSupported() || this.isRunning()) {
      return;
    }
    try {
      await BackgroundService.start(backgroundKeepAlive, BACKGROUND_OPTIONS);
    } catch (err) {
      if (__DEV__) {
        console.warn(
          "[BackgroundAudioService] start failed (non-fatal):",
          err,
        );
      }
    }
  }

  static async stop(): Promise<void> {
    if (!this.isSupported() || !this.isRunning()) {
      return;
    }
    await BackgroundService.stop();
  }
}
