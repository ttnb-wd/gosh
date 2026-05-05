"use client";

import { useEffect, useMemo, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Archive, CheckCircle2, Inbox, Mail, RefreshCw } from "lucide-react";

type MessageStatus = "unread" | "read" | "archived";
type FilterType = "active" | "unread" | "read" | "archived";

interface ContactMessage {
  id: string;
  full_name: string;
  email: string;
  subject: string;
  message: string;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("active");
  const [error, setError] = useState<string | null>(null);

  const loadMessages = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const { data, error: fetchError } = await supabase
        .from("contact_messages")
        .select("id, full_name, email, subject, message, status, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setMessages((data || []) as ContactMessage[]);
    } catch (fetchError) {
      console.error("Contact messages fetch error:", fetchError);
      setError("Could not load contact messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const counts = useMemo(() => {
    const unread = messages.filter((message) => message.status === "unread").length;
    const read = messages.filter((message) => message.status === "read").length;
    const archived = messages.filter((message) => message.status === "archived").length;

    return {
      active: unread + read,
      unread,
      read,
      archived,
    };
  }, [messages]);

  const filteredMessages = useMemo(() => {
    if (filter === "active") {
      return messages.filter((message) => message.status !== "archived");
    }

    return messages.filter((message) => message.status === filter);
  }, [filter, messages]);

  const updateStatus = async (messageId: string, status: MessageStatus) => {
    setUpdatingId(messageId);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const { error: updateError } = await supabase
        .from("contact_messages")
        .update({ status })
        .eq("id", messageId);

      if (updateError) throw updateError;

      setMessages((prev) =>
        prev.map((message) => (message.id === messageId ? { ...message, status } : message))
      );
    } catch (updateError) {
      console.error("Contact message update error:", updateError);
      setError("Could not update the message.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filters: Array<{ key: FilterType; label: string; count: number }> = [
    { key: "active", label: "Inbox", count: counts.active },
    { key: "unread", label: "Unread", count: counts.unread },
    { key: "read", label: "Read", count: counts.read },
    { key: "archived", label: "Archived", count: counts.archived },
  ];

  return (
    <div className="min-h-screen">
      <AdminHeader title="Messages" subtitle="Review contact form submissions" />

      {/* Screen Reader Loading Announcement */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {loading ? "Loading messages, please wait..." : `${filteredMessages.length} message${filteredMessages.length !== 1 ? 's' : ''} loaded`}
      </div>

      <main role="main" className="p-6">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  filter === item.key
                    ? "bg-yellow-400 text-black"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-yellow-50"
                }`}
              >
                {item.label} ({item.count})
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={loadMessages}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-black transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-yellow-600" />
            <p className="mt-3 text-sm font-bold text-zinc-500">Loading messages...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <Inbox className="mx-auto h-10 w-10 text-zinc-300" />
            <p className="mt-3 text-base font-black text-black">No messages found</p>
            <p className="mt-1 text-sm text-zinc-500">Contact form messages will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredMessages.map((message) => (
              <article
                key={message.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  message.status === "unread" ? "border-yellow-300" : "border-zinc-200"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${
                          message.status === "unread"
                            ? "bg-yellow-100 text-yellow-700"
                            : message.status === "archived"
                              ? "bg-zinc-100 text-zinc-500"
                              : "bg-green-50 text-green-700"
                        }`}
                      >
                        {message.status}
                      </span>
                      <p className="text-xs font-bold text-zinc-400">
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>

                    <h2 className="mt-3 text-lg font-black text-black">{message.subject}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600">
                      <span className="font-bold text-black">{message.full_name}</span>
                      <a
                        href={`mailto:${message.email}`}
                        className="inline-flex items-center gap-1 break-all font-semibold text-yellow-700 hover:text-yellow-900"
                      >
                        <Mail className="h-4 w-4" />
                        {message.email}
                      </a>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{message.message}</p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {message.status !== "read" && (
                      <button
                        type="button"
                        onClick={() => updateStatus(message.id, "read")}
                        disabled={updatingId === message.id}
                        className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark Read
                      </button>
                    )}
                    {message.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => updateStatus(message.id, "archived")}
                        disabled={updatingId === message.id}
                        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Archive className="h-4 w-4" />
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
