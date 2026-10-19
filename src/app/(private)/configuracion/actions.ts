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
import { saveTemplateVersion, TemplateError } from "@/lib/template-store";
import { getCurrentUser } from "@/lib/current-user";
import {
  deactivateLearnedNormalization,
  NormalizationInputError,
  probeSalonText,
  saveLearnedNormalization,
  updateLearnedNormalization,
} from "@/lib/normalization";

const tabs = new Set([
  "salones",
  "secciones",
  "items",
  "textos",
  "memorandums",
  "correlativo",
  "aprendidas",
  "plantilla",
]);

async function requireSession(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
}

function fail(tab: string, error: unknown): never {
  if (error instanceof CatalogValidationError || error instanceof TemplateError) {
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

function learnedError(error: unknown): never {
  if (error instanceof NormalizationInputError) {
    redirect(`/configuracion?tab=aprendidas&error=${encodeURIComponent(error.message)}`);
  }
  throw error;
}

export async function addLearned(formData: FormData): Promise<void> {
  await requireSession();
  const task = text(formData, "task");
  const result =
    task === "item_section"
      ? text(formData, "section")
      : task === "trigger_clause"
        ? text(formData, "memo")
        : text(formData, "salon");
  try {
    await saveLearnedNormalization({ task, sourceText: text(formData, "sourceText"), result });
  } catch (error) {
    learnedError(error);
  }
  redirect("/configuracion?tab=aprendidas&guardado=1");
}

export async function changeLearned(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await updateLearnedNormalization(text(formData, "id"), text(formData, "result"));
  } catch (error) {
    learnedError(error);
  }
  redirect("/configuracion?tab=aprendidas&guardado=1");
}

export async function disableLearned(formData: FormData): Promise<void> {
  await requireSession();
  try {
    await deactivateLearnedNormalization(text(formData, "id"));
  } catch (error) {
    learnedError(error);
  }
  redirect("/configuracion?tab=aprendidas&guardado=1");
}

export async function processSample(formData: FormData): Promise<void> {
  await requireSession();
  const sample = text(formData, "sample").trim();
  if (!sample) {
    redirect(
      `/configuracion?tab=aprendidas&error=${encodeURIComponent("Escribe el texto a procesar.")}`,
    );
  }
  const result = await probeSalonText(sample);
  const params = new URLSearchParams({
    tab: "aprendidas",
    salon: result.salon ?? "",
    estado: result.status,
    llamadas: String(result.calls),
  });
  redirect(`/configuracion?${params.toString()}`);
}

export async function uploadTemplate(formData: FormData): Promise<void> {
  await requireSession();
  const file = formData.get("template");
  if (!(file instanceof File) || file.size === 0) {
    redirect(
      `/configuracion?tab=plantilla&error=${encodeURIComponent("Selecciona una plantilla .docx.")}`,
    );
  }
  try {
    await saveTemplateVersion(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    fail("plantilla", error);
  }
  redirect("/configuracion?tab=plantilla&guardado=1");
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
