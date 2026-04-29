/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import AdGateway from "./grpc/ad-gateway.js";

export const resolvers = {
  Query: {
    ads: async (
      _: unknown,
      args: { contextKeys: string[] }
    ) => {
      const response = await AdGateway.getAds({
        contextKeys: args.contextKeys,
      });

      return response.ads;
    },
  },
};