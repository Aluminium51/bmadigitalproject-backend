// src/modules/lookups/lookup.controller.ts
import type { Context } from 'hono';
import {
  getDivisionsLookup,
  getFourQuadrantsLookup,
  getDeputyGovernorsLookup,
  getProjectStatusesLookup
} from './lookup.service';

export const lookupController = {
  async getDivisions(c: Context) {
    const result = await getDivisionsLookup();
    return c.json({ data: result }, 200);
  },

  async getFourQuadrants(c: Context) {
    const result = await getFourQuadrantsLookup();
    return c.json({ data: result }, 200);
  },

  async getDeputyGovernors(c: Context) {
    const result = await getDeputyGovernorsLookup();
    return c.json({ data: result }, 200);
  },

  async getProjectStatuses(c: Context) {
    const result = await getProjectStatusesLookup();
    return c.json({ data: result }, 200);
  }
};
