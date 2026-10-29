/**
 * Canonical site and contact configuration.
 *
 * The site URL resolves in this order: `NEXT_PUBLIC_SITE_URL` →
 * `VERCEL_PROJECT_PRODUCTION_URL` → `VERCEL_URL` → localhost. Set
 * `NEXT_PUBLIC_SITE_URL` to a domain the project owns before a public
 * deployment; the localhost fallback prevents the app from advertising an
 * unowned domain.
 *
 * `NEXT_PUBLIC_CONTACT_EMAIL` is required for a production deployment. The
 * guard below fails fast rather than publishing a privacy policy with no
 * monitored contact channel. An unset or invalid site URL is treated as a
 * local build so `npm run build` works without deployment env; production
 * deploys must set both variables.
 */

const LOCAL_SITE_URL = "http://localhost:3000";

export const REPOSITORY_URL = "https://github.com/vskrch/Quintara";
export const ISSUES_URL = `${REPOSITORY_URL}/issues`;
export const SECURITY_ADVISORY_URL = `${REPOSITORY_URL}/security/advisories/new`;

function normalizeSiteUrl(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function fromDeploymentHost(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  return normalizeSiteUrl(
    /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`,
  );
}

export function getSiteUrl(): string {
  return (
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    fromDeploymentHost(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    fromDeploymentHost(process.env.VERCEL_URL) ??
    LOCAL_SITE_URL
  );
}

function isProductionDeployment(): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.NODE_ENV !== "production") return false;

  const configuredSite = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (!configuredSite) return false;

  return !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0|host\.docker\.internal)(:\d+)?$/.test(
    configuredSite,
  );
}

export function getContactEmail(): string | null {
  const value = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  const email =
    value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;

  if (!email && isProductionDeployment()) {
    throw new Error(
      "NEXT_PUBLIC_CONTACT_EMAIL must be set to a monitored address for production deployments.",
    );
  }

  return email;
}
