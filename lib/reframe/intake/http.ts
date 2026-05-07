export function readRequestCookie(headers: Headers, name: string) {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookiePair = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookiePair) {
    return null;
  }

  return decodeURIComponent(cookiePair.slice(name.length + 1));
}

export function readRequestCookies(headers: Headers) {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return null;
      }

      return {
        name: part.slice(0, separatorIndex),
        value: decodeURIComponent(part.slice(separatorIndex + 1)),
      };
    })
    .filter((cookie): cookie is { name: string; value: string } =>
      Boolean(cookie),
    );
}

export function getClientIpAddress(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return headers.get("x-real-ip")?.trim() || null;
}
