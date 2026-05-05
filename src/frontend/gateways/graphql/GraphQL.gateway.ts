/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

type GraphQLError = {
  message: string;
};

type GraphQLResponse<TData> = {
  data?: TData;
  errors?: GraphQLError[];
};

const GRAPHQL_API_PATH = '/api/graphql';

export async function graphqlRequest<TData, TVariables = Record<string, unknown>>(
  query: string,
  variables?: TVariables,
  operationName?: string
): Promise<TData> {
  const response = await fetch(GRAPHQL_API_PATH, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
      operationName,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as GraphQLResponse<TData>;

  if (payload.errors?.length) {
    throw new Error(payload.errors.map(error => error.message).join('\n'));
  }

  if (!payload.data) {
    throw new Error('GraphQL response does not contain data');
  }

  return payload.data;
}
