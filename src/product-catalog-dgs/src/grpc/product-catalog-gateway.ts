/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelCredentials } from "@grpc/grpc-js";
import {
  ProductCatalogServiceClient,
  type Empty,
  type Product,
  type ListProductsResponse,
  type SearchProductsResponse,
} from "../../protos/demo.js";
import { getRequiredEnv } from "../util.js";

const PRODUCT_CATALOG_ADDR = getRequiredEnv("PRODUCT_CATALOG_ADDR");

const client = new ProductCatalogServiceClient(
  PRODUCT_CATALOG_ADDR,
  ChannelCredentials.createInsecure()
);

const ProductCatalogGateway = () => ({
  listProducts() {
    return new Promise<ListProductsResponse>((resolve, reject) =>
      client.listProducts({} as Empty, (error, response) =>
        error ? reject(error) : resolve(response)
      )
    );
  },

  getProduct(id: string) {
    return new Promise<Product>((resolve, reject) =>
      client.getProduct({ id }, (error, response) =>
        error ? reject(error) : resolve(response)
      )
    );
  },

  searchProducts(query: string) {
    return new Promise<SearchProductsResponse>((resolve, reject) =>
      client.searchProducts({ query }, (error, response) =>
        error ? reject(error) : resolve(response)
      )
    );
  },
});

export default ProductCatalogGateway();
