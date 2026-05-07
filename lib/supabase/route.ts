import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";

import { readRequestCookies } from "@/lib/reframe/intake/http";
import { readSupabaseBrowserConfig } from "@/lib/supabase/env";

export function createSupabaseRouteClient(request: Request) {
  const { url, publishableKey } = readSupabaseBrowserConfig();
  const responseCookies: {
    name: string;
    value: string;
    options: CookieOptions;
  }[] = [];
  const responseHeaders = new Headers();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return readRequestCookies(request.headers);
      },
      setAll(cookiesToSet, headers) {
        responseCookies.splice(0, responseCookies.length, ...cookiesToSet);
        Object.entries(headers).forEach(([key, value]) => {
          responseHeaders.set(key, value);
        });
      },
    },
  });

  return {
    supabase,
    applyToResponse(response: NextResponse) {
      responseCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      responseHeaders.forEach((value, key) => {
        response.headers.set(key, value);
      });
      return response;
    },
  };
}
