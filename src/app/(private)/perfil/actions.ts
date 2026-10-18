"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { ProfileValidationError, updateSignerProfile } from "@/lib/profile";

export async function saveProfile(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  try {
    await updateSignerProfile(user.id, {
      name: String(formData.get("name") ?? ""),
      title: String(formData.get("title") ?? ""),
    });
  } catch (error) {
    if (error instanceof ProfileValidationError) {
      redirect("/perfil?error=datos");
    }
    throw error;
  }

  redirect("/perfil?guardado=1");
}
