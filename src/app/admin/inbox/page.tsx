import FlowDemo from "@/components/FlowDemo";
import { requireAdmin } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

export default async function SocialInboxPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="font-display text-3xl">Social Inbox</h1>
      <p className="mt-2 text-sm text-navy-mid/75">Demonstração com mensagens sintéticas. Nenhuma mensagem é enviada automaticamente.</p>
      <div className="mt-6 rounded-2xl bg-navy-deep p-2 md:p-4">
        <FlowDemo compact />
      </div>
    </div>
  );
}
