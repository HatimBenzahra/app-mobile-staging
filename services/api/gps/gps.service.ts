import { gql } from "@/services/core/graphql";
import type { ReportPositionInput } from "@/types/api";
import { REPORT_MY_POSITIONS } from "./gps.mutations";

export const gpsApi = {
  /**
   * Uploads a batch of positions for the authenticated commercial.
   * @returns the number of points persisted by the backend.
   */
  async reportPositions(inputs: ReportPositionInput[]): Promise<number> {
    const response = await gql<
      { reportMyPositions: number },
      { input: ReportPositionInput[] }
    >(REPORT_MY_POSITIONS, { input: inputs });
    return response.reportMyPositions;
  },
};
