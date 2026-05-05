/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import InstrumentationMiddleware from '../../utils/telemetry/InstrumentationMiddleware';

const {
  GRAPHQL_GATEWAY_ADDR = '',
  GRAPHQL_GATEWAY_URL = `http://${GRAPHQL_GATEWAY_ADDR}/graphql`,
} = process.env;

const handler = async ({ method, body }: NextApiRequest, res: NextApiResponse) => {
  if (method !== 'POST') {
    return res.status(405).send('');
  }

  const response = await fetch(GRAPHQL_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();

  res.status(response.status);

  if (!responseText) {
    return res.send('');
  }

  const contentType = response.headers.get('content-type');

  if (contentType) {
    res.setHeader('content-type', contentType);
  }

  return res.send(responseText);
};

export default InstrumentationMiddleware(handler);
