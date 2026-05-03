/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelCredentials } from "@grpc/grpc-js";
import {
  RecommendationServiceClient,
  type ListRecommendationsResponse,
} from "../../protos/demo.js";
import { getRequiredEnv } from "../util.js";

const RECOMMENDATION_ADDR = getRequiredEnv("RECOMMENDATION_ADDR");

const client = new RecommendationServiceClient(
  RECOMMENDATION_ADDR,
  ChannelCredentials.createInsecure()
);

const RecommendationGateway = () => ({
  listRecommendations(userId: string, productIds: string[]) {
    return new Promise<ListRecommendationsResponse>((resolve, reject) =>
      client.listRecommendations(
        {
          userId,
          productIds,
        },
        (error, response) => (error ? reject(error) : resolve(response))
      )
    );
  },
});

export default RecommendationGateway();
