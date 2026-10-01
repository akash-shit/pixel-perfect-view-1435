import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Phone, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/ss/AppShell";
import { useApp } from "@/lib/app-state";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "Family protection — ScamShield" },
      {
        name: "description",
        content: "Keep trusted contacts one tap away and ask them before you act.",
      },
      { property: "og:title", content: "Family protection — ScamShield" },
      { property: "og:description", content: "Protect the people you love from scams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Family,
});

function Family() {
  const { contacts, addContact, updateContact, removeContact, dataLoading, dataError, settings } =
    useApp();
  const lang = settings.language;
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("Other");
  const [phone, setPhone] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setRelation("Other");
    setPhone("");
    setEditingId(null);
  };

  const saveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    try {
      const contact = { name: name.trim(), phone: phone.trim(), relationship: relation };
      if (editingId) {
        await updateContact(editingId, contact);
        toast.success(t(lang, "Contact updated"));
      } else {
        await addContact({ ...contact, relation: contact.relationship, canBeAsked: true });
        toast.success(t(lang, "Contact added"));
      }
      resetForm();
    } catch (error) {
      toast.error(
        t(lang, error instanceof Error ? error.message : "The contact could not be saved."),
      );
    }
  };

  const remove = async (id: string) => {
    try {
      await removeContact(id);
      toast.success(t(lang, "Contact removed"));
    } catch (error) {
      toast.error(
        t(lang, error instanceof Error ? error.message : "The contact could not be removed."),
      );
    }
  };

  const field =
    "focus-ring w-full rounded-2xl border-2 border-border bg-paper px-4 py-3 text-lg text-ink outline-none focus:border-brand";

  return (
    <AppShell>
      <PageHeader
        title="Trusted people"
        sub="When something feels off, ask one of them before you pay or share anything."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <ul className="grid gap-4 sm:grid-cols-2">
          {dataLoading && (
            <li className="text-lg text-inksoft">{t(lang, "Loading your trusted people…")}</li>
          )}
          {dataError && (
            <li role="alert" className="text-lg font-bold text-risk">
              {t(lang, dataError)}
            </li>
          )}
          {!dataLoading && contacts.length === 0 && !dataError && (
            <li className="text-lg text-inksoft">{t(lang, "No trusted people saved yet.")}</li>
          )}
          {contacts.map((c) => (
            <li key={c.id} className="card-soft min-w-0 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 wrap-break-word">
                  <div className="text-xl font-extrabold text-ink">{c.name}</div>
                  <div className="text-inksoft">{t(lang, c.relation)} · <span className="wrap-anywhere">{c.phone}</span></div>
                </div>
                <div className="flex gap-1">
                  <button
                    aria-label={t(lang, "Edit {name}", { name: c.name })}
                    onClick={() => {
                      setEditingId(c.id);
                      setName(c.name);
                      setRelation(c.relation);
                      setPhone(c.phone);
                    }}
                    className="focus-ring rounded-lg p-2 text-inksoft hover:text-brand"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    aria-label={t(lang, "Remove {name}", { name: c.name })}
                    onClick={() => void remove(c.id)}
                    className="focus-ring rounded-lg p-2 text-inksoft hover:text-risk"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <a
                href={`tel:${c.phone.replace(/\s/g, "")}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-safe py-3 text-lg font-extrabold text-primary-foreground"
              >
                <Phone className="h-5 w-5" />{" "}
                {t(lang, "Call {name}", { name: c.name.split(" ")[0] ?? c.name })}
              </a>
            </li>
          ))}
        </ul>
        <form onSubmit={saveContact} className="card-soft space-y-3 p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <UserPlus className="h-5 w-5" />{" "}
            {t(lang, editingId ? "Edit trusted person" : "Add someone")}
          </h2>
          <label className="block font-extrabold text-ink" htmlFor="contact-name">
            {t(lang, "Name")}
          </label>
          <input
            id="contact-name"
            className={field}
            placeholder={t(lang, "Name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label className="block font-extrabold text-ink" htmlFor="contact-relationship">
            {t(lang, "Relationship")}
          </label>
          <select
            id="contact-relationship"
            className={field}
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
          >
            {["Son", "Daughter", "Brother", "Sister", "Friend", "Doctor", "Other"].map((value) => (
              <option key={value} value={value}>
                {t(lang, value)}
              </option>
            ))}
          </select>
          <label className="block font-extrabold text-ink" htmlFor="contact-phone">
            {t(lang, "Phone number")}
          </label>
          <input
            id="contact-phone"
            className={field}
            placeholder={t(lang, "Phone number")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <button
            disabled={dataLoading}
            className="focus-ring min-h-12 w-full rounded-2xl bg-brand py-3 text-lg font-extrabold text-primary-foreground disabled:opacity-60"
          >
            {t(lang, editingId ? "Save changes" : "Save contact")}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="focus-ring min-h-11 w-full rounded-2xl px-4 font-bold text-inksoft"
            >
              {t(lang, "Cancel edit")}
            </button>
          )}
        </form>
      </div>
    </AppShell>
  );
}
