import { Suspense } from "react";
import { connection } from "next/server";
import { aiConfigured, env, paypalConfigured } from "@/lib/env";
import { AiPlayground, PayButton } from "./playground";

function Badge({ live, label }: { live: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        live
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      }`}
    >
      {label}
    </span>
  );
}

// Reads env at request time so the badge reflects the deployed config, not the build machine.
async function IntegrationBadge({ kind }: { kind: "paypal" | "ai" }) {
  await connection();
  if (kind === "paypal") {
    return <Badge live={paypalConfigured} label={paypalConfigured ? "sandbox" : "mock"} />;
  }
  return <Badge live={aiConfigured} label={aiConfigured ? env.ai.model : "mock"} />;
}

async function PaymentBanner({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const payment = typeof params.payment === "string" ? params.payment : undefined;
  if (!payment) return null;
  const order = typeof params.order === "string" ? params.order : undefined;

  return (
    <div className="rounded-md border border-zinc-300 p-3 text-sm dark:border-zinc-700">
      Payment result: <strong>{payment}</strong>
      {order && <> · order {order}</>}
      {params.mock === "1" && <> · mock</>}
    </div>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Project skeleton</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Smoke tests for the two required integrations. Replace this page once the idea is chosen.
        </p>
      </header>

      <Suspense fallback={null}>
        <PaymentBanner searchParams={searchParams} />
      </Suspense>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium">PayPal</h2>
          <Suspense fallback={null}>
            <IntegrationBadge kind="paypal" />
          </Suspense>
        </div>
        <PayButton />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium">AI</h2>
          <Suspense fallback={null}>
            <IntegrationBadge kind="ai" />
          </Suspense>
        </div>
        <AiPlayground />
      </section>
    </main>
  );
}
