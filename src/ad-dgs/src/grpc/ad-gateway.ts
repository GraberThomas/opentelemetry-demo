/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelCredentials } from "@grpc/grpc-js";
import {
  AdRequest,
  AdResponse,
  AdServiceClient,
} from "../../protos/demo.js";
import { getRequiredEnv } from "../util.js";


const AD_ADDR = getRequiredEnv("AD_ADDR");

const client = new AdServiceClient(
  AD_ADDR,
  ChannelCredentials.createInsecure()
);

const AdGateway = () => ({
  getAds(request: AdRequest) {
    return new Promise<AdResponse>((resolve, reject) =>
      client.getAds(request, (error, response) =>
        error ? reject(error) : resolve(response)
      )
    );
  },
});

export default AdGateway();