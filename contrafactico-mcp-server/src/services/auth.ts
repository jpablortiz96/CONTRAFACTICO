import { timingSafeEqual } from "node:crypto";

import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
} from "jose";
import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

import type { RuntimeConfig } from "./config.js";

function bearerToken(request: Request): string | undefined {
  const authorization = request.header("Authorization");
  if (authorization === undefined) {
    return undefined;
  }

  const match = authorization.match(/^Bearer ([^\s]+)$/i);
  return match?.[1];
}

function tokenMatches(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function unauthorized(response: Response): void {
  response
    .status(401)
    .set("WWW-Authenticate", "Bearer")
    .json({ error: "Unauthorized." });
}

async function verifyEntraToken(
  token: string,
  jwks: JWTVerifyGetKey,
  config: RuntimeConfig,
): Promise<void> {
  const issuer = config.entraIssuer;
  const audience = config.entraAudience;
  if (issuer === undefined || audience === undefined) {
    throw new Error("Entra JWT configuration is incomplete.");
  }

  const result = await jwtVerify(token, jwks, {
    algorithms: ["RS256"],
    issuer,
    audience,
  });
  const expiration = result.payload.exp;
  if (
    typeof expiration !== "number" ||
    expiration <= Math.floor(Date.now() / 1000)
  ) {
    throw new Error("JWT expiration is missing or invalid.");
  }
}

export function createAuthMiddleware(
  config: RuntimeConfig,
): RequestHandler {
  const jwks =
    config.authMode === "entra-jwt" && config.entraJwksUri !== undefined
      ? createRemoteJWKSet(new URL(config.entraJwksUri))
      : undefined;

  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    if (config.authMode === "disabled") {
      next();
      return;
    }

    const token = bearerToken(request);
    if (token === undefined) {
      unauthorized(response);
      return;
    }

    if (config.authMode === "dev-bearer") {
      if (
        config.devBearerToken !== undefined &&
        tokenMatches(token, config.devBearerToken)
      ) {
        next();
        return;
      }
      unauthorized(response);
      return;
    }

    if (jwks === undefined) {
      unauthorized(response);
      return;
    }

    void verifyEntraToken(token, jwks, config)
      .then(() => {
        next();
      })
      .catch(() => {
        unauthorized(response);
      });
  };
}
