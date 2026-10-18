"use server";

import { redirect } from "next/navigation";
import {
  editItem,
  editMapping,
  editMemo,
  removeAlias,
  removeItem,
  removeMapping,
  removeMemo,
  removeSalon,
  renameSalon,
  saveAlias,
  saveFixedText,
  saveItem,
  saveMapping,
  saveMemo,
  saveSalon,
  saveSequence,
} from "@/lib/catalog-db";
import { CatalogValidationError } from "@/lib/catalog-mutations";
import { getCurrentUser } from "@/lib/current-user";

const tabs = new Set(["salones", "secciones", "items", "textos", "memorandums", "correlativo"]);

async function requireSession(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
}

function fail(tab: string, error: unknown): never {
  if (error instanceof CatalogValidationError) {
    const target = tabs.has(tab) ? tab : "salones";
    redirect(`/configuracion?tab=${target}&error=${encodeURIComponent(error.message)}`);
  }
  throw error;
}

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

export async function addSalon(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await saveSalon(text(formData, "name"));
  } catch (error) {
    fail("salones", error);
  }
  redirect("/configuracion?tab=salones&guardado=1");
}

export async function changeSalon(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await renameSalon(text(formData, "id"), text(formData, "name"));
  } catch (error) {
    fail("salones", error);
  }
  redirect("/configuracion?tab=salones&guardado=1");
}

export async function dropSalon(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await removeSalon(text(formData, "id"));
  } catch (error) {
    fail("salones", error);
  }
  redirect("/configuracion?tab=salones&guardado=1");
}

export async function addAlias(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await saveAlias(text(formData, "salonId"), text(formData, "label"));
  } catch (error) {
    fail("salones", error);
  }
  redirect("/configuracion?tab=salones&guardado=1");
}

export async function dropAlias(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await removeAlias(text(formData, "id"));
  } catch (error) {
    fail("salones", error);
  }
  redirect("/configuracion?tab=salones&guardado=1");
}

export async function addMapping(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await saveMapping(text(formData, "header"), text(formData, "section"));
  } catch (error) {
    fail("secciones", error);
  }
  redirect("/configuracion?tab=secciones&guardado=1");
}

export async function changeMapping(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await editMapping(text(formData, "id"), text(formData, "header"), text(formData, "section"));
  } catch (error) {
    fail("secciones", error);
  }
  redirect("/configuracion?tab=secciones&guardado=1");
}

export async function dropMapping(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await removeMapping(text(formData, "id"));
  } catch (error) {
    fail("secciones", error);
  }
  redirect("/configuracion?tab=secciones&guardado=1");
}

export async function addItem(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await saveItem(
      text(formData, "description"),
      text(formData, "category"),
      text(formData, "section"),
    );
  } catch (error) {
    fail("items", error);
  }
  redirect("/configuracion?tab=items&guardado=1");
}

export async function changeItem(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await editItem(
      text(formData, "id"),
      text(formData, "description"),
      text(formData, "category"),
      text(formData, "section"),
    );
  } catch (error) {
    fail("items", error);
  }
  redirect("/configuracion?tab=items&guardado=1");
}

export async function dropItem(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await removeItem(text(formData, "id"));
  } catch (error) {
    fail("items", error);
  }
  redirect("/configuracion?tab=items&guardado=1");
}

export async function changeTexts(formData: FormData): Promise<void> {
  await requireSession();
  const keys = ["special_instructions", "service_preparation", "footer_initials"] as const;
  try {
    for (const key of keys) {
      await saveFixedText(key, text(formData, key));
    }
  } catch (error) {
    fail("textos", error);
  }
  redirect("/configuracion?tab=textos&guardado=1");
}

export async function addMemo(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await saveMemo(memoFrom(formData));
  } catch (error) {
    fail("memorandums", error);
  }
  redirect("/configuracion?tab=memorandums&guardado=1");
}

export async function changeMemo(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await editMemo(text(formData, "id"), memoFrom(formData));
  } catch (error) {
    fail("memorandums", error);
  }
  redirect("/configuracion?tab=memorandums&guardado=1");
}

export async function dropMemo(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await removeMemo(text(formData, "id"));
  } catch (error) {
    fail("memorandums", error);
  }
  redirect("/configuracion?tab=memorandums&guardado=1");
}

export async function changeSequence(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await saveSequence(text(formData, "code"));
  } catch (error) {
    fail("correlativo", error);
  }
  redirect("/configuracion?tab=correlativo&guardado=1");
}

function memoFrom(formData: FormData) {
  return {
    name: text(formData, "name"),
    recipient: text(formData, "recipient"),
    company: text(formData, "company"),
    reference: text(formData, "reference"),
    body: text(formData, "body"),
    keywords: text(formData, "keywords"),
    templateFile: text(formData, "templateFile"),
  };
}
