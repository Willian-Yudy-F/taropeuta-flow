export function StatusTag({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending_payment: "bg-amber-100 text-amber-800", paid: "bg-emerald-100 text-emerald-800",
    confirmed: "bg-emerald-100 text-emerald-800", completed: "bg-slate-200 text-slate-700",
    cancelled: "bg-rose-100 text-rose-700", refunded: "bg-rose-100 text-rose-700", no_show: "bg-rose-100 text-rose-700",
  };
  const label: Record<string, string> = {
    pending_payment: "Aguard. pagamento", paid: "Pago", confirmed: "Confirmado",
    completed: "Concluído", cancelled: "Cancelado", refunded: "Reembolsado", no_show: "Não compareceu",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs ${map[s] ?? "bg-slate-100"}`}>{label[s] ?? s}</span>;
}

export const PAYMENT_LABELS: Record<string, string> = {
  pending: "Pendente", succeeded: "Pago", failed: "Falhou", refunded: "Reembolsado", manual_review: "Revisão manual",
};

export function PaymentTag({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800", succeeded: "bg-emerald-100 text-emerald-800",
    failed: "bg-rose-100 text-rose-700", refunded: "bg-rose-100 text-rose-700", manual_review: "bg-sky-100 text-sky-800",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs ${map[s] ?? "bg-slate-100"}`}>{PAYMENT_LABELS[s] ?? s}</span>;
}
