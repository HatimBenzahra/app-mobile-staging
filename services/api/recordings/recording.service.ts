import { gql } from "@/services/core/graphql";

const LAST_PORTE_RECORDING_DURATION = `
  query LastPorteRecordingDurationSec($porteId: Int!) {
    lastPorteRecordingDurationSec(porteId: $porteId)
  }
`;

export const recordingApi = {
  async getLastPorteDurationSec(porteId: number): Promise<number | null> {
    const response = await gql<
      { lastPorteRecordingDurationSec: number | null },
      { porteId: number }
    >(LAST_PORTE_RECORDING_DURATION, { porteId });
    return response.lastPorteRecordingDurationSec ?? null;
  },
};
