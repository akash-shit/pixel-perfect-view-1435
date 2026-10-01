import { createFileRoute } from "@tanstack/react-router";
import { Phone, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/ss/AppShell";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "Family protection — ScamShield" },
      { name: "description", content: "Keep trusted contacts one tap away and ask them before you act." },
      { property: "og:title", content: "Family protection — ScamShield" },
      { property: "og:description", content: "Protect the people you love from scams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Family,
});

function Family() {
  const { contacts, addContact, removeContact } = useApp();
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    addContact({ name: name.trim(), relation: relation.trim() || "Trusted", phone: phone.trim(), canBeAsked: true });
    setName(""); setRelation(""); setPhone("");
    toast.success("Contact added");
  };

  const field = "focus-ring w-full rounded-2xl border-2 border-border bg-paper px-4 py-3 text-lg text-ink outline-none focus:border-brand";

  return (
    <AppShell>
      <PageHeader title="Trusted people" sub="When something feels off, ask one of them before you pay or share anything." />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <ul className="grid gap-4 sm:grid-cols-2">
          {contacts.map((c) => (
            <li key={c.id} className="card-soft p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xl font-extrabold text-ink">{c.name}</div>
                  <div className="text-inksoft">{c.relation} · {c.phone}</div>
                </div>
                <button aria-label="Remove" onClick={() => removeContact(c.id)} className="p-1 text-inksoft hover:text-risk"><Trash2 className="h-5 w-5" /></button>
              </div>
              <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-safe py-3 text-lg font-extrabold text-primary-foreground">
                <Phone className="h-5 w-5" /> Call {c.name.split(" ")[0]}
              </a>
            </li>
          ))}
        </ul>
        <form onSubmit={add} className="card-soft space-y-3 p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink"><UserPlus className="h-5 w-5" /> Add someone</h2>
          <input className={field} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={field} placeholder="Relation (e.g. Son)" value={relation} onChange={(e) => setRelation(e.target.value)} />
          <input className={field} placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button className="w-full rounded-2xl bg-brand py-3 text-lg font-extrabold text-primary-foreground">Save contact</button>
        </form>
      </div>
    </AppShell>
  );
}
