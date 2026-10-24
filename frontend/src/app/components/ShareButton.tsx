// frontend/src/app/components/ShareButton.tsx
//
// "Jaa" button for detail pages. Shares the current page's URL:
//   1) phones / some browsers: opens the system share menu (Web Share API)
//   2) otherwise: copies the link and shows "Linkki kopioitu!" for 2 seconds
// Every listing has its own URL 

import { useState } from "react";
import { Share2 } from "lucide-react";

interface ShareButtonProps {
  /** Shown in the share menu */
  title: string;
  lang: string;
  /** Button text, "Jaa" */
  label: string;
}

export function ShareButton({ title, lang, label }: ShareButtonProps) {
  const fi = lang === "fi";
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;

    // 1) System share menu, if the browser supports it (feature detection)
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // The user closed the share menu: do nothing
        if (err instanceof Error && err.name === "AbortError") return;
        // Any other problem: fall through to copying the link
      }
    }

    // 2) Copy the link
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Very old browser or no permission: let the user copy it by hand
      window.prompt(fi ? "Kopioi linkki:" : "Copy the link:", url);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-sm"
    >
      <Share2 className="w-3.5 h-3.5" />
      {copied ? (fi ? "Linkki kopioitu!" : "Link copied!") : label}
    </button>
  );
}
