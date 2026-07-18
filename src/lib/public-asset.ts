/**
 * Resolves files copied from `public/` relative to the deployed application.
 *
 * This deliberately does not use a leading slash: a static export may be
 * hosted at a repository subpath (for example `/LasuNav3/`) rather than the
 * domain root.
 */
export function publicAsset(path: string) {
  const relativePath = path.replace(/^\/+/, "");
  return new URL(relativePath, document.baseURI).toString();
}
