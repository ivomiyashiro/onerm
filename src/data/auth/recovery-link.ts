/**
 * The account a recovery link is for: the `sub` of its access token, read without checking the
 * signature. Only good to refuse a link early; the server checks the token when it is used.
 */
export function recoveryLinkUserId(url: string): string | null {
  const tokens = parseRecoveryLink(url);
  const payload = tokens?.accessToken.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replaceAll('-', '+').replaceAll('_', '/');
    const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as {
      sub?: unknown;
    };
    return typeof claims.sub === 'string' ? claims.sub : null;
  } catch {
    return null;
  }
}

/**
 * The session a recovery link carries. Supabase redirects to the app with the tokens in the
 * fragment (`#access_token=…&refresh_token=…&type=recovery`), or with `#error=…` when the link
 * expired or was already used (RF-AUTH-08.AC3). Anything else is not a recovery link.
 */
export function parseRecoveryLink(
  url: string,
): { accessToken: string; refreshToken: string } | null {
  const hash = url.indexOf('#');
  if (hash === -1) return null;
  const params = new URLSearchParams(url.slice(hash + 1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (params.get('type') !== 'recovery' || !accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}
