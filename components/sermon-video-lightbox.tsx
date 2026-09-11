"use client";

import { useRef } from "react";
import Link from "next/link";
import type { SermonVideoSource } from "@/lib/data/sermon-video";

/**
 * The homepage "Latest message" play button — whoever manages sermons
 * (the media team, via sermons.manage) controls what's here just by
 * publishing a sermon with a video attached; this only decides what
 * happens on click. A real video plays right in a lightbox instead of
 * the button being decorative; with no video attached yet, it falls back
 * to linking through to the sermon page instead of pretending to play
 * something that isn't there.
 */
export function SermonVideoLightbox({
  video,
  title,
  sermonHref,
  triggerClassName,
  triggerLabel,
}: {
  video: SermonVideoSource;
  title: string;
  sermonHref: string;
  triggerClassName: string;
  triggerLabel: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  if (!video) {
    return (
      <Link className={triggerClassName} href={sermonHref} aria-label={triggerLabel}>
        <PlayIcon />
      </Link>
    );
  }

  return (
    <>
      <button type="button" className={triggerClassName} aria-label={triggerLabel} onClick={() => dialogRef.current?.showModal()}>
        <PlayIcon />
      </button>
      <dialog ref={dialogRef} className="video-dialog" aria-label={title}>
        <div className="video-panel">
          <button type="button" className="close-dialog" aria-label="Close video" onClick={() => dialogRef.current?.close()}>
            ×
          </button>
          <div className="video-frame">
            {video.kind === "youtube" ? (
              <iframe
                src={`${video.embedUrl}?autoplay=1`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={video.url} controls autoPlay />
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}

/** Matches the play icon already used elsewhere on the public site
 * (app/(public)/page.tsx's local Icon component isn't exported, so this
 * mirrors it rather than importing it). */
function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" stroke="none">
      <path d="m8 5 11 7-11 7V5Z" />
    </svg>
  );
}
