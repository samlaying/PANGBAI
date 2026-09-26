import { NextRequest, NextResponse } from "next/server";

const MAX_API_BODY_BYTES = 2 * 1024 * 1024;
type AuthEnv = {
  NODE_ENV?: string;
  PANGBAI_AUTH_USER?: string;
  PANGBAI_AUTH_PASSWORD?: string;
};

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="PANGBAI"' },
  });
}

function hasValidBasicAuth(
  request: NextRequest,
  env: AuthEnv = process.env,
): boolean {
  const expectedUser = env.PANGBAI_AUTH_USER;
  const expectedPassword = env.PANGBAI_AUTH_PASSWORD;
  const header = request.headers.get("authorization");
  if (!expectedUser || !expectedPassword || !header?.startsWith("Basic ")) return false;

  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    return separator >= 0 &&
      decoded.slice(0, separator) === expectedUser &&
      decoded.slice(separator + 1) === expectedPassword;
  } catch {
    return false;
  }
}

export function proxy(
  request: NextRequest,
  env: AuthEnv = process.env,
) {
  const isProduction = env.NODE_ENV === "production";
  if (isProduction && (!env.PANGBAI_AUTH_USER || !env.PANGBAI_AUTH_PASSWORD)) {
    return new NextResponse("Production authentication is not configured", { status: 503 });
  }

  if (isProduction && !hasValidBasicAuth(request, env)) return unauthorized();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_API_BODY_BYTES) {
      return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
