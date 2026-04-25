/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import CurrencyGateway from "./grpc/currency-gateway.js";

export const resolvers = {
  Query: {
    supportedCurrencies: async () => {
      const response = await CurrencyGateway.getSupportedCurrencies();
      return response.currencyCodes;
    },

    convertCurrency: async (
      _: unknown,
      args: {
        from: {
          currencyCode: string;
          units: number;
          nanos: number;
        };
        toCode: string;
      }
    ) => {
      return CurrencyGateway.convert(args.from, args.toCode);
    },
  },
};