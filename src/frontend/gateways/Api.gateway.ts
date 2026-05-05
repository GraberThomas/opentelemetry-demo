// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { Ad, Address, Cart, CartItem, Money, PlaceOrderRequest, Product, ProductReview } from '../protos/demo';
import { IProductCart, IProductCartItem, IProductCheckout } from '../types/Cart';
import request from '../utils/Request';
import { AttributeNames } from '../utils/enums/AttributeNames';
import SessionGateway from './Session.gateway';
import { context, propagation } from "@opentelemetry/api";
import { graphqlRequest } from './graphql/GraphQL.gateway';

const { userId } = SessionGateway.getSession();

const basePath = '/api';

const Apis = () => ({
  getCart(currencyCode: string) {
    return request<IProductCart>({
      url: `${basePath}/cart`,
      queryParams: { sessionId: userId, currencyCode },
    });
  },
  addCartItem({ currencyCode, ...item }: CartItem & { currencyCode: string }) {
    return request<Cart>({
      url: `${basePath}/cart`,
      body: { item, userId },
      queryParams: { currencyCode },
      method: 'POST',
    });
  },
  emptyCart() {
    return request<undefined>({
      url: `${basePath}/cart`,
      method: 'DELETE',
      body: { userId },
    });
  },

  getSupportedCurrencyList() {
    return graphqlRequest<{ supportedCurrencies: string[] }>(
      `
        query Currency {
          supportedCurrencies
        }
      `,
      undefined,
      'Currency'
    ).then(data => data.supportedCurrencies);
  },

  getShippingCost(itemList: IProductCartItem[], currencyCode: string, address: Address) {
    return request<Money>({
      url: `${basePath}/shipping`,
      queryParams: {
        itemList: JSON.stringify(itemList.map(({ productId, quantity }) => ({ productId, quantity }))),
        currencyCode,
        address: JSON.stringify(address),
      },
    });
  },

  placeOrder({ currencyCode, ...order }: PlaceOrderRequest & { currencyCode: string }) {
    return request<IProductCheckout>({
      url: `${basePath}/checkout`,
      method: 'POST',
      queryParams: { currencyCode },
      body: order,
    });
  },

  listProducts(currencyCode: string) {
    return graphqlRequest<{ products: Product[] }>(
      `
        query Products($currencyCode: String = "USD") {
          products {
            id
            name
            description
            picture
            categories
            priceUsd: price(currencyCode: $currencyCode) {
              currencyCode
              units
              nanos
            }
          }
        }
      `,
      { currencyCode },
      'Products'
    ).then(data => data.products);
  },

  getProduct(productId: string, currencyCode: string) {
    return graphqlRequest<{ product: Product | null }>(
      `
        query Product($productId: ID!, $currencyCode: String = "USD") {
          product(id: $productId) {
            id
            name
            description
            picture
            categories
            priceUsd: price(currencyCode: $currencyCode) {
              currencyCode
              units
              nanos
            }
          }
        }
      `,
      { productId, currencyCode },
      'Product'
    ).then(data => {
      if (!data.product) {
        throw new Error(`Product ${productId} not found`);
      }

      return data.product;
    });
  },

  getProductReviews(productId: string) {
    return request<ProductReview[]>({
      url: `${basePath}/product-reviews/${productId}`
    });
  },
  getAverageProductReviewScore(productId: string) {
    return request<string>({
      url: `${basePath}/product-reviews-avg-score/${productId}`
    });
  },
  askProductAIAssistant(productId: string, question: string) {
    return request<string>({
      url: `${basePath}/product-ask-ai-assistant/${productId}`,
      method: 'POST',
      body: { question },
    });
  },

  listRecommendations(productIds: string[], currencyCode: string) {
    return graphqlRequest<{ recommendations: Product[] }>(
      `
        query Recommendations($userId: ID!, $productIds: [ID!]!, $currencyCode: String = "USD") {
          recommendations(userId: $userId, productIds: $productIds) {
            id
            name
            description
            picture
            categories
            priceUsd: price(currencyCode: $currencyCode) {
              currencyCode
              units
              nanos
            }
          }
        }
      `,
      { userId, productIds, currencyCode },
      'Recommendations'
    ).then(data => data.recommendations);
  },

  listAds(contextKeys: string[]) {
    return request<Ad[]>({
      url: `${basePath}/data`,
      queryParams: {
        contextKeys,
      },
    });
  },
});

/**
 * Extends all the API calls to set baggage automatically.
 */
const ApiGateway = new Proxy(Apis(), {
  get(target, prop, receiver) {
    const originalFunction = Reflect.get(target, prop, receiver);

    if (typeof originalFunction !== 'function') {
      return originalFunction;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function (...args: any[]) {
      const baggage = propagation.getActiveBaggage() || propagation.createBaggage();
      const newBaggage = baggage.setEntry(AttributeNames.SESSION_ID, { value: userId });
      const newContext = propagation.setBaggage(context.active(), newBaggage);
      return context.with(newContext, () => {
        return Reflect.apply(originalFunction, undefined, args);
      });
    };
  },
});

export default ApiGateway;
