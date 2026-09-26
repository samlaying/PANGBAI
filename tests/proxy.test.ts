import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

test("production proxy fails closed when credentials are missing", () => {
  const response = proxy(new NextRequest("http://localhost/api/projects"), { NODE_ENV: "production" });
  assert.equal(response.status, 503);
});

test("production proxy accepts valid Basic Auth", () => {
  const auth = btoa("admin:secret");
  const response = proxy(new NextRequest("http://localhost/api/projects", {
    headers: { authorization: `Basic ${auth}` },
  }), { NODE_ENV: "production", PANGBAI_AUTH_USER: "admin", PANGBAI_AUTH_PASSWORD: "secret" });
  assert.equal(response.status, 200);
});

test("proxy rejects oversized API bodies", () => {
  const response = proxy(new NextRequest("http://localhost/api/events", {
    headers: { "content-length": String(2 * 1024 * 1024 + 1) },
  }), { NODE_ENV: "development" });
  assert.equal(response.status, 413);
});
