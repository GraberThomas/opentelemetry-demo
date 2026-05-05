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
    return graphqlRequest<{ cart: IProductCart }>(
      `
        query Cart($userId: ID!, $currencyCode: String = "USD") {
          cart(userId: $userId) {
            userId
            items {
              productId
              quantity
              product {
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
          }
        }
      `,
      { userId, currencyCode },
      'Cart'
    ).then(data => data.cart);
  },

  addCartItem({ currencyCode, ...item }: CartItem & { currencyCode: string }) {
    return graphqlRequest<{ addItem: Cart }>(
      `
        mutation AddItem($userId: ID!, $item: CartItemInput!) {
          addItem(userId: $userId, item: $item) {
            userId
            items {
              productId
              quantity
            }
          }
        }
      `,
      { userId, item },
      'AddItem'
    ).then(data => data.addItem);
  },

  emptyCart() {
    return graphqlRequest<{ emptyCart: Cart }>(
      `
        mutation EmptyCart($userId: ID!) {
          emptyCart(userId: $userId) {
            userId
            items {
              productId
              quantity
            }
          }
        }
      `,
      { userId },
      'EmptyCart'
    ).then(() => undefined);
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
    return graphqlRequest<{ shippingQuote: { costUsd: Money } }>(
      `
        query ShippingQuote($items: [CartItemInput!]!, $address: AddressInput) {
          shippingQuote(items: $items, address: $address) {
            costUsd {
              currencyCode
              units
              nanos
            }
          }
        }
      `,
      {
        items: itemList.map(({ productId, quantity }) => ({ productId, quantity })),
        address,
      },
      'ShippingQuote'
    ).then(data =>
      graphqlRequest<{ convertCurrency: Money }>(
        `
          query ConvertShippingCost($from: MoneyInput!, $currencyCode: String!) {
            convertCurrency(from: $from, toCode: $currencyCode) {
              currencyCode
              units
              nanos
            }
          }
        `,
        {
          from: data.shippingQuote.costUsd,
          currencyCode,
        },
        'ConvertShippingCost'
      ).then(result => result.convertCurrency)
    );
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
    return graphqlRequest<{ product: { reviews: ProductReview[] } | null }>(
      `
        query ProductReviews($productId: ID!) {
          product(id: $productId) {
            reviews {
              username
              description
              score
            }
          }
        }
      `,
      { productId },
      'ProductReviews'
    ).then(data => {
      if (!data.product) {
        throw new Error(`Product ${productId} not found`);
      }

      return data.product.reviews;
    });
  },

  getAverageProductReviewScore(productId: string) {
    return graphqlRequest<{ product: { averageReviewScore: string } | null }>(
      `
        query ProductAverageReviewScore($productId: ID!) {
          product(id: $productId) {
            averageReviewScore
          }
        }
      `,
      { productId },
      'ProductAverageReviewScore'
    ).then(data => {
      if (!data.product) {
        throw new Error(`Product ${productId} not found`);
      }

      return data.product.averageReviewScore;
    });
  },

  askProductAIAssistant(productId: string, question: string) {
    return graphqlRequest<{ product: { aiReviewSummary: string | null } | null }>(
      `
        query ProductAiReviewSummary($productId: ID!, $question: String!) {
          product(id: $productId) {
            aiReviewSummary(question: $question)
          }
        }
      `,
      { productId, question },
      'ProductAiReviewSummary'
    ).then(data => {
      if (!data.product) {
        throw new Error(`Product ${productId} not found`);
      }

      return data.product.aiReviewSummary ?? '';
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
    return graphqlRequest<{ ads: Ad[] }>(
      `
        query Ads($contextKeys: [String!]!) {
          ads(contextKeys: $contextKeys) {
            text
            redirectUrl
          }
        }
      `,
      { contextKeys },
      'Ads'
    ).then(data => data.ads);
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
