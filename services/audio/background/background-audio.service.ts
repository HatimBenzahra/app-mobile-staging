import { AppState, PermissionsAndroid, Platform } from "react-native";
import BackgroundService from "react-native-background-actions";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const BACKGROUND_OPTIONS = {
  taskName: "ProWinAudio",
  taskTitle: "ProWin — échange en cours",
  taskDesc: "L'échange à la porte est en train d'être enregistré.",
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

/**
 * Foreground service micro : c'est lui qui autorise Android à laisser l'app
 * capter le micro quand le commercial quitte l'app pendant un échange. Sans
 * lui, le fichier continue de grossir mais ne contient que du silence.
 *
 * Android 14 (API 34) n'accepte un FGS `type=microphone` que si TOUTES ces
 * conditions sont réunies à l'instant du démarrage :
 *   1. `FOREGROUND_SERVICE_MICROPHONE` déclarée      → AndroidManifest / app.json
 *   2. service déclaré `foregroundServiceType="microphone"`
 *                                                    → plugins/with-foreground-service-type
 *   3. `RECORD_AUDIO` réellement accordée            → vérifiée ici
 *   4. app au premier plan (« while-in-use »)        → vérifiée ici
 *
 * Sinon le framework lève une SecurityException dans `onStartCommand`. Comme
 * `RNBackgroundActionsTask.startForeground()` n'a pas de try/catch, c'est un
 * crash de process, non catchable depuis le JS : on vérifie donc AVANT de
 * demander le service, plutôt que de renoncer sur la seule version d'Android.
 *
 * Sur les tablettes kiosk, `RECORD_AUDIO` est accordée et verrouillée par le
 * Device Owner (`PermissionService.PROWIN_PERMISSIONS`). Hors kiosk, l'app ne
 * demande jamais la permission au runtime : le service ne démarre pas et
 * l'enregistrement reste limité à l'avant-plan — sans crash.
 */
export class BackgroundAudioService {
  static isSupported(): boolean {
    return Platform.OS === "android";
  }

  /**
   * Les deux conditions vérifiables côté JS (permission micro + app au premier
   * plan). Ne jette jamais : un échec signifie « on ne démarre pas le service »,
   * pas « l'échange ne s'enregistre pas ».
   */
  static async canStart(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    if (AppState.currentState !== "active") {
      if (__DEV__) {
        console.warn(
          "[BackgroundAudioService] Skip start: app not active",
          AppState.currentState,
        );
      }
      return false;
    }

    try {
      const hasMicPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (!hasMicPermission && __DEV__) {
        console.warn(
          "[BackgroundAudioService] Skip start: RECORD_AUDIO not granted",
        );
      }
      return hasMicPermission;
    } catch (err) {
      if (__DEV__) {
        console.warn(
          "[BackgroundAudioService] Permission check failed:",
          err,
        );
      }
      return false;
    }
  }

  static isRunning(): boolean {
    if (!this.isSupported()) {
      return false;
    }
    return BackgroundService.isRunning();
  }

  /** @returns true si le service micro tourne à la sortie. */
  static async start(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }
    if (this.isRunning()) {
      return true;
    }
    if (!(await this.canStart())) {
      return false;
    }
    try {
      await BackgroundService.start(backgroundKeepAlive, BACKGROUND_OPTIONS);
      return BackgroundService.isRunning();
    } catch (err) {
      if (__DEV__) {
        console.warn(
          "[BackgroundAudioService] start failed (non-fatal):",
          err,
        );
      }
      return false;
    }
  }

  static async stop(): Promise<void> {
    if (!this.isSupported() || !this.isRunning()) {
      return;
    }
    await BackgroundService.stop();
  }
}
