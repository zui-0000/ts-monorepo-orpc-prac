import type { HTTPMethod } from "@orpc/contract";

export const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
  HEAD: "HEAD",
} as const satisfies Record<string, HTTPMethod>;

export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];
