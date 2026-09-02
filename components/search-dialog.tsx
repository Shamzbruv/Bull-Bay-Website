"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Result = { type: string; title: string; href: string };

const STATIC_PAGES: Result[] = [
  { type: "Page", title: "Plan Your Visit", href: "/visit" },
  { type: "Page", title: "Prayer Request", href: "/prayer" },
  { type: "Page", title: "Online Giving", href: "/give" },
  { type: "Page", title: "Contact Us", href: "/contact" },
];

export function SearchDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [term, setTerm] = useState("");

  async function runSearch(value: string) {
    setTerm(value);
    if (!value) {
      setResults([]);
      return;
    }
    const supabase = createClient();
    const like = `%${value}%`;
    const [sermons, events, ministries, products] = await Promise.all([
      supabase.from("sermons").select("title, slug").eq("status", "published").ilike("title", like).limit(4),
      supabase.from("events").select("title, slug").eq("status", "published").ilike("title", like).limit(4),
      supabase.from("ministries").select("name, slug").eq("is_active", true).ilike("name", like).limit(4),
      supabase.from("products").select("name, slug").eq("status", "active").ilike("name", like).limit(4),
    ]);

    const combined: Result[] = [
      ...(sermons.data ?? []).map((s) => ({ type: "Sermon", title: s.title, href: `/sermons/${s.slug}` })),
      ...(events.data ?? []).map((e) => ({ type: "Event", title: e.title, href: `/events/${e.slug}` })),
      ...(ministries.data ?? []).map((m) => ({ type: "Ministry", title: m.name, href: `/ministries/${m.slug}` })),
      ...(products.data ?? []).map((p) => ({ type: "Shop", title: p.name, href: `/shop/${p.slug}` })),
      ...STATIC_PAGES.filter((p) => p.title.toLowerCase().includes(value.toLowerCase())),
    ];
    setResults(combined.slice(0, 8));
  }

  return (
    <>
      <button
        type="button"
        className="icon-button search-trigger"
        aria-label="Search the website"
        onClick={() => dialogRef.current?.showModal()}
      >
        ⌕
      </button>
      <dialog ref={dialogRef} className="search-dialog">
        <div className="search-panel">
          <button
            type="button"
            className="close-dialog"
            aria-label="Close search"
            onClick={() => dialogRef.current?.close()}
          >
            ×
          </button>
          <p className="eyebrow">
            <span /> SEARCH BULL BAY
          </p>
          <h2>What are you looking for?</h2>
          <input
            type="search"
            placeholder='Try "prayer", "youth" or "faith"'
            autoFocus
            value={term}
            onChange={(e) => runSearch(e.target.value)}
          />
          <div className="search-results">
            {!term && <p>Search sermons, ministries, events and shop resources.</p>}
            {term && results.length === 0 && <p>No result found. Try a different word.</p>}
            {results.map((r) => (
              <div className="search-result" key={r.type + r.href}>
                <span>
                  <b>{r.title}</b>
                  <br />
                  <small>{r.type}</small>
                </span>
                <Link href={r.href} onClick={() => dialogRef.current?.close()}>
                  Open →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}
