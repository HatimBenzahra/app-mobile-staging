import { commercialApi } from "./commercials/commercial.service";
import { gamificationApi } from "./gamification/gamification.service";
import { immeubleApi } from "./immeubles/immeuble.service";
import { managerApi } from "./managers/manager.service";
import { porteApi } from "./portes/porte.service";
import { recordingApi } from "./recordings/recording.service";
import { statisticApi } from "./statistics/statistic.service";

export const api = {
  commercials: commercialApi,
  gamification: gamificationApi,
  immeubles: immeubleApi,
  managers: managerApi,
  portes: porteApi,
  recordings: recordingApi,
  statistics: statisticApi,
};
