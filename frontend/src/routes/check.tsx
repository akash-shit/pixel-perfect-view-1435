import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell, PageHeader } from "@/components/ss/AppShell";
import { Checker } from "@/components/ss/Checker";

const schema = z.object({
  kind: z.enum(["message", "link", "phone", "qr", "email", "screenshot"]).optional(),
});

export const Route = createFileRoute("/check")({
  validateSearch: schema,
  head: () => ({
    meta: [
      { title: "ScamShield" },
      { name: "description", content: "Paste anything suspicious and get a clear Safe, Suspicious or High Risk answer with reasons." },
      { property: "og:title", content: "Check for scams — ScamShield" },
      { property: "og:description", content: "Get a plain-language scam check in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckPage,
});

function CheckPage() {
  const { kind } = Route.useSearch();
  return (
    <AppShell>
      <PageHeader
        title={kind === "screenshot" ? "Check a Screenshot" : "What would you like to check?"}
        sub={kind === "screenshot"
          ? "Upload a screenshot of a suspicious message, link, email, or payment request. ScamShield will analyze it for possible scam indicators."
          : "Paste it below. We'll read it carefully and explain what we find."}
      />
      <Checker initialKind={kind ?? "message"} />
    </AppShell>
  );
}
