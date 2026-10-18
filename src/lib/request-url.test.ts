import { describe, expect, it } from "vitest";
import { sameOriginUrl } from "./request-url";

describe("sameOriginUrl", () => {
  it("keeps the host header when the request URL was rewritten", () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      headers: { host: "127.0.0.1:3000" },
    });
    expect(sameOriginUrl(request, "/login?error=credenciales").href).toBe(
      "http://127.0.0.1:3000/login?error=credenciales",
    );
  });
});
