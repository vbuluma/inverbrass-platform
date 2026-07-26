/**
 * Purpose:
 * Legacy /profile/businesses route — My Businesses now lives on Platform Home.
 *
 * Why this exists:
 * BP-001 Final UX Alignment keeps business management on Platform Home and
 * account settings under My Account. This route redirects to preserve links.
 */

import { redirect } from "next/navigation";

export default function MyBusinessesProfilePage() {
  redirect("/home");
}
