/** The server has to be reached over https (RNF-09); plain http only for the dev machine. */
// The port, if any, is digits only: `http://localhost:80@evil.com` names evil.com as the host.
const LOCAL_HOST = /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?(\/|$)/;

/** Whether the app may talk to the server at `url` (RNF-09). */
export function isAllowedServerUrl(url: string): boolean {
  return url.startsWith('https://') || LOCAL_HOST.test(url);
}
