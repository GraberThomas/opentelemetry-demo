/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { getRequiredEnv } from "../util.js";

const SHIPPING_ADDR = getRequiredEnv("SHIPPING_ADDR").replace(/\/$/, "");

type CartItemInput = {
  productId: string;
  quantity: number;
};

type AddressInput = {
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
};

type RawMoney = {
  currency_code: string;
  units: number;
  nanos: number;
};

type RawGetQuoteResponse = {
  cost_usd?: RawMoney;
};

type RawShipOrderResponse = {
  tracking_id: string;
};

async function postJson<TResponse>(
  path: string,
  body: unknown
): Promise<TResponse> {
  const response = await fetch(`${SHIPPING_ADDR}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Shipping service returned ${response.status}: ${text}`
    );
  }

  return response.json() as Promise<TResponse>;
}

function mapMoney(money: RawMoney) {
  return {
    currencyCode: money.currency_code,
    units: money.units,
    nanos: money.nanos,
  };
}

const ShippingGateway = () => ({
  async getQuote(args: {
    items: CartItemInput[];
    address?: AddressInput;
  }) {
    const response = await postJson<RawGetQuoteResponse>("/get-quote", {
      items: args.items,
      address: args.address,
    });

    if (!response.cost_usd) {
      throw new Error("Shipping service did not return cost_usd");
    }

    return {
      costUsd: mapMoney(response.cost_usd),
    };
  },

  async shipOrder(args: {
    items: CartItemInput[];
    address?: AddressInput;
  }) {
    const response = await postJson<RawShipOrderResponse>("/ship-order", {
      items: args.items,
      address: args.address,
    });

    return {
      trackingId: response.tracking_id,
    };
  },
});

export default ShippingGateway();
