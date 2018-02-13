export const isUserAuthorized = (session)  =>
  !!(session && session.userId && session.userName && session.companyId && session.db);

export function httpRedirect(response, url) {
  response.writeHead(302, { Location: url });
  response.end();
}
