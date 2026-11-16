/** The server has to be reached over https (RNF-09); plain http only for the dev machine. */
const LOCAL_HOST = /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:|\/|$)/;

/** Whether the app may talk to the server at `url` (RNF-09). */
export function isAllowedServerUrl(url: string): boolean {
  return url.startsWith('https://') || LOCAL_HOST.test(url);
}
