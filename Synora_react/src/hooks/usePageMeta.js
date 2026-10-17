import { useEffect } from "react";

const DEFAULT_DESCRIPTION = document.querySelector('meta[name="description"]')?.content || "";

/* Each vanilla page had its own <title> (and some a description). */
export default function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = description || DEFAULT_DESCRIPTION;
  }, [title, description]);
}
