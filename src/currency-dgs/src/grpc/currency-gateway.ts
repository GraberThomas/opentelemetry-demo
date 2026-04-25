/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelCredentials } from "@grpc/grpc-js";
import {
  GetSupportedCurrenciesResponse,
  CurrencyServiceClient,
  Money,
} from "../../protos/demo.js";
import { getRequiredEnv } from "../util.js";

const CURRENCY_ADDR = getRequiredEnv("CURRENCY_ADDR");

const client = new CurrencyServiceClient(
  CURRENCY_ADDR,
  ChannelCredentials.createInsecure()
);

const CurrencyGateway = () => ({
  convert(from: Money, toCode: string) {
    return new Promise<Money>((resolve, reject) =>
      client.convert({ from, toCode }, (error, response) =>
        error ? reject(error) : resolve(response)
      )
    );
  },

  getSupportedCurrencies() {
    return new Promise<GetSupportedCurrenciesResponse>((resolve, reject) =>
      client.getSupportedCurrencies({}, (error, response) =>
        error ? reject(error) : resolve(response)
      )
    );
  },
});

export default CurrencyGateway();