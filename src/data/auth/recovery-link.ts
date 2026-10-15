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
