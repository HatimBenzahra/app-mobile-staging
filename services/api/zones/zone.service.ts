import { gql } from "@/services/core/graphql";
import type { CreateZoneInput, Zone } from "@/types/api";
import { ASSIGN_ZONE_TO_COMMERCIAL, CREATE_ZONE } from "./zone.mutations";

export const zoneApi = {
  async create(input: CreateZoneInput): Promise<Zone> {
    const response = await gql<
      { createZone: Zone },
      { createZoneInput: CreateZoneInput }
    >(CREATE_ZONE, { createZoneInput: input });
    return response.createZone;
  },

  async assignToCommercial(commercialId: number, zoneId: number): Promise<boolean> {
    const response = await gql<
      { assignZoneToCommercial: boolean },
      { commercialId: number; zoneId: number }
    >(ASSIGN_ZONE_TO_COMMERCIAL, { commercialId, zoneId });
    return response.assignZoneToCommercial;
  },
};
