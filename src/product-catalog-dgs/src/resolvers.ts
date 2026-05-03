/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { status } from "@grpc/grpc-js";
import ProductCatalogGateway from "./grpc/product-catalog-gateway.js";

type ProductReference = {
  id: string;
};

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === status.NOT_FOUND
  );
}

async function getProductOrNull(id: string) {
  try {
    return await ProductCatalogGateway.getProduct(id);
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

export const resolvers = {
  Product: {
    __resolveReference: async (reference: ProductReference) => {
      return getProductOrNull(reference.id);
    },
  },

  Query: {
    products: async () => {
      const response = await ProductCatalogGateway.listProducts();
      return response.products;
    },

    product: async (_: unknown, args: { id: string }) => {
      return getProductOrNull(args.id);
    },

    searchProducts: async (_: unknown, args: { query: string }) => {
      const response = await ProductCatalogGateway.searchProducts(args.query);
      return response.results;
    },
  },
};
