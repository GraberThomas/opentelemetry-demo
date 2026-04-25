/**
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getRequiredNumberEnv(name: string): number {
  const value = getRequiredEnv(name);
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }

  return parsedValue;
}