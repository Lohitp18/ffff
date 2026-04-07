import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE_URL = (() => {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
  if (configured) return configured;
  return import.meta.env.DEV ? "http://localhost:5000" : "";
})();

const cache = new Map();

function isAzureBlobUrl(url) {
  return typeof url === "string" && url.startsWith("http") && url.includes(".blob.core.windows.net/");
}

function hasSas(url) {
  return typeof url === "string" && url.includes("sig=");
}

export function useSasUrl(rawUrl) {
  const key = useMemo(() => (typeof rawUrl === "string" ? rawUrl : ""), [rawUrl]);
  const [url, setUrl] = useState(rawUrl || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setUrl(rawUrl || "");

    if (!rawUrl || !isAzureBlobUrl(rawUrl) || hasSas(rawUrl)) return;

    const cached = cache.get(rawUrl);
    if (cached) {
      setUrl(cached);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/blob/sas`, {
          params: { url: rawUrl },
        });
        const sasUrl = res.data?.url;
        if (sasUrl && mounted) {
          cache.set(rawUrl, sasUrl);
          setUrl(sasUrl);
        }
      } catch (e) {
        // Keep raw url (will fail if public access disabled), but avoid breaking UI.
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [key, rawUrl]);

  return { url, loading };
}

