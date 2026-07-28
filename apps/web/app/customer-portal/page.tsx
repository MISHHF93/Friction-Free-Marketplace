import { redirect } from "next/navigation";

/**
 * Legacy route retained for old bookmarks.
 *
 * Marketplace accounts use the unified buyer/seller dashboard rather than a
 * tenant subscription portal.
 */
export default function CustomerPortalRedirect() {
  redirect("/dashboard");
}
