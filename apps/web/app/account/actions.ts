"use server";

import { revalidatePath } from "next/cache";
import { getMarketplaceSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const shipped = new Set(["en"]);

export async function updateLocaleAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  if (!shipped.has(locale)) return;
  const session = await getMarketplaceSession();
  if (!session || session.source !== "supabase") return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ locale }).eq("user_id", session.id);
  revalidatePath("/");
  revalidatePath("/account/settings");
}
