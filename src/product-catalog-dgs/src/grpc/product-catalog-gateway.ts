/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelCredentials, Metadata } from "@grpc/grpc-js";
import { context, propagation, SpanStatusCode, trace } from "@opentelemetry/api";
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

const tracer = trace.getTracer("product-catalog-dgs");

function createTraceMetadata() {
  const metadata = new Metadata();

  propagation.inject(context.active(), metadata, {
    set: (carrier, key, value) => {
      carrier.set(key, value);
    },
  });

  return metadata;
}

async function tracedCall<T>(
  spanName: string,
  attributes: Record<string, string | number | boolean>,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(spanName, async (span) => {
    span.setAttributes(attributes);

    try {
      const response = await fn();

      span.setStatus({ code: SpanStatusCode.OK });
      return response;
    } catch (error) {
      const exception =
        error instanceof Error ? error : new Error(String(error));

      span.recordException(exception);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: exception.message,
      });

      throw error;
    } finally {
      span.end();
    }
  });
}

const ProductCatalogGateway = () => ({
  listProducts() {
    return tracedCall(
      "product-catalog-dgs.listProducts",
      {
        "rpc.system": "grpc",
        "rpc.service": "oteldemo.ProductCatalogService",
        "rpc.method": "ListProducts",
        "server.address": PRODUCT_CATALOG_ADDR,
      },
      () =>
        new Promise<ListProductsResponse>((resolve, reject) =>
          client.listProducts({} as Empty, createTraceMetadata(), (error, response) =>
            error ? reject(error) : resolve(response)
          )
        )
    );
  },

  getProduct(id: string) {
    return tracedCall(
      "product-catalog-dgs.getProduct",
      {
        "rpc.system": "grpc",
        "rpc.service": "oteldemo.ProductCatalogService",
        "rpc.method": "GetProduct",
        "server.address": PRODUCT_CATALOG_ADDR,
        "app.product.id": id,
      },
      () =>
        new Promise<Product>((resolve, reject) =>
          client.getProduct({ id }, createTraceMetadata(), (error, response) =>
            error ? reject(error) : resolve(response)
          )
        )
    );
  },

  searchProducts(query: string) {
    return tracedCall(
      "product-catalog-dgs.searchProducts",
      {
        "rpc.system": "grpc",
        "rpc.service": "oteldemo.ProductCatalogService",
        "rpc.method": "SearchProducts",
        "server.address": PRODUCT_CATALOG_ADDR,
        "app.product.search_query": query,
      },
      () =>
        new Promise<SearchProductsResponse>((resolve, reject) =>
          client.searchProducts({ query }, createTraceMetadata(), (error, response) =>
            error ? reject(error) : resolve(response)
          )
        )
    );
  },
});

export default ProductCatalogGateway();
