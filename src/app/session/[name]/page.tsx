import { notFound } from "next/navigation";
import { readSession } from "@/lib/sessions";
import SessionEditor from "@/components/SessionEditor";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const session = await readSession(name);
  if (!session) notFound();

  return <SessionEditor slug={name} initialSession={session} />;
}
