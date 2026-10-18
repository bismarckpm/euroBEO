/** Builds a redirect on the host the browser actually used. */
export function sameOriginUrl(request: Request, path: string): URL {
  const current = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto");
  if (host) {
    current.host = host;
  }
  if (proto) {
    current.protocol = proto.endsWith(":") ? proto : `${proto}:`;
  }
  return new URL(path, current);
}
