import { notFound } from "next/navigation";
import { TemplateWorkspace } from "@/components/template-editor/TemplateWorkspace";
import { toEditorTemplate } from "@/lib/db/editor-template";
import { getDb } from "@/lib/db";
import { getTemplateGraph } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ field?: string }>;
}) {
  const { id } = await params;
  const { field } = await searchParams;
  const template = await getTemplateGraph(getDb(), id);
  if (!template) notFound();

  return (
    <TemplateWorkspace
      template={toEditorTemplate(template)}
      initialFieldId={field}
    />
  );
}
