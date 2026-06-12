import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "vibewriting-dev-secret-change-in-production"
);

const ACCESS_EXPIRES = "7d";
const REFRESH_EXPIRES = "30d";

export async function signToken(userId: string, type: "access" | "refresh" = "access") {
  return new SignJWT({ sub: userId, type })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(type === "access" ? ACCESS_EXPIRES : REFRESH_EXPIRES)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<{ userId: string; type: string }> {
  const { payload } = await jwtVerify(token, secret);
  return { userId: payload.sub as string, type: payload.type as string };
}
