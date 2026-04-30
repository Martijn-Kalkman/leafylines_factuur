import { SignJWT, jwtVerify } from "jose";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: "user" | "admin";
  name?: string;
}

const COOKIE_NAME = "leafylines_session";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

function getTtlSeconds(): number {
  const raw = (process.env.JWT_TTL_SECONDS || "").trim();
  if (!raw) return DEFAULT_TTL_SECONDS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 60) return DEFAULT_TTL_SECONDS;
  return parsed;
}

function getSecretKey(): Uint8Array {
  const secret = (process.env.AUTH_SECRET || "").trim();
  if (!secret) {
    throw new Error("Missing AUTH_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export function getAuthCookieName(): string {
  return COOKIE_NAME;
}

export function getAuthCookieMaxAgeSeconds(): number {
  return getTtlSeconds();
}

export async function signAuthToken(payload: AuthTokenPayload): Promise<string> {
  const ttlSeconds = getTtlSeconds();
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getSecretKey());
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const role = payload.role === "admin" ? "admin" : "user";
    const name = typeof payload.name === "string" ? payload.name : undefined;
    if (!sub || !email) return null;
    return { sub, email, role, name };
  } catch {
    return null;
  }
}
