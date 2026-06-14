export function withTimeout(promise, timeoutMs, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      window.setTimeout(() => resolve(fallback), timeoutMs);
    })
  ]);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeAttr(value) {
  return escapeHtml(value);
}

export function classifyContent(value) {
  const text = value.trim();
  if (/^https?:\/\//i.test(text)) return "link";
  try {
    JSON.parse(text);
    return "json";
  } catch {
    // Not JSON; continue with code heuristics.
  }
  const codeSignals = [
    /function\s+\w+\s*\(/,
    /const\s+\w+\s*=/,
    /let\s+\w+\s*=/,
    /class\s+\w+/,
    /import\s+.+from\s+["']/,
    /<\/?[a-z][\s\S]*>/i,
    /\bSELECT\b[\s\S]+\bFROM\b/i,
    /\bdef\s+\w+\s*\(/,
    /\bconsole\.log\s*\(/
  ];
  return codeSignals.some((pattern) => pattern.test(text)) ? "code" : "text";
}

export function domainFromUrl(value) {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function makePreview(value) {
  return String(value).trim().replace(/\s+/g, " ").slice(0, 160);
}

export function titleFromContent(value, type) {
  const text = value.trim();
  if (type === "link") return domainFromUrl(text) || text.slice(0, 80);
  if (type === "json") return "JSON 片段";
  if (type === "code") return text.split(/\r?\n/).find(Boolean)?.slice(0, 80) || "代码片段";
  return text.split(/\r?\n/).find(Boolean)?.slice(0, 80) || "文本收藏";
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
