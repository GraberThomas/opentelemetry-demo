/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import CurrencyGateway from "./grpc/currency-gateway.js";

type Money = {
  currencyCode: string;
  units: number;
  nanos: number;
};

type ProductWithPrice = {
  id: string;
  priceUsd?: Money;
};

export const resolvers = {
  Product: {
    price: async (
      product: ProductWithPrice,
      args: { currencyCode?: string | null }
    ) => {
      const currencyCode = args.currencyCode || "USD";

      if (!product.priceUsd) {
        throw new Error("Cannot resolve Product.price without priceUsd");
      }

      if (currencyCode === product.priceUsd.currencyCode) {
        return product.priceUsd;
      }

      return CurrencyGateway.convert(product.priceUsd, currencyCode);
    },
  },

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