import { commercialApi } from "./commercials/commercial.service";
import { gamificationApi } from "./gamification/gamification.service";
import { gpsApi } from "./gps/gps.service";
import { immeubleApi } from "./immeubles/immeuble.service";
import { managerApi } from "./managers/manager.service";
import { porteApi } from "./portes/porte.service";
import { recordingApi } from "./recordings/recording.service";
import { statisticApi } from "./statistics/statistic.service";
import { zoneApi } from "./zones/zone.service";

export const api = {
  commercials: commercialApi,
  gamification: gamificationApi,
  gps: gpsApi,
  immeubles: immeubleApi,
  managers: managerApi,
  portes: porteApi,
  recordings: recordingApi,
  statistics: statisticApi,
  zones: zoneApi,
};
