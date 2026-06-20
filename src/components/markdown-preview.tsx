import type { ReactNode } from "react";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";

const sanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src || []), "data"]
  }
};

function textFromNode(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (typeof node === "object" && "props" in node) return textFromNode((node as { props?: { children?: ReactNode } }).props?.children);
  return "";
}

function CodeBlock({ children, ...props }: React.ComponentPropsWithoutRef<"pre">) {
  const [copied, setCopied] = useState(false);
  const code = textFromNode(children).replace(/\n$/, "");

  async function copyCode() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="group/code-block relative min-w-0">
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        className="absolute right-2 top-2 z-10 opacity-80 shadow-sm transition-opacity hover:opacity-100"
        title={copied ? "已复制" : "复制代码"}
        onClick={copyCode}
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </Button>
      <pre {...props} className="overflow-auto rounded-md bg-muted px-3 py-2 pr-11 leading-6">
        {children}
      </pre>
    </div>
  );
}

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <article className="markdown-preview grid min-w-0 gap-3 text-sm leading-7 text-foreground [&_pre_code]:block [&_pre_code]:rounded-none [&_pre_code]:bg-transparent [&_pre_code]:p-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={{
          a(props) {
            return <a {...props} className="text-primary" target="_blank" rel="noreferrer" />;
          },
          code(props) {
            return <code {...props} className="rounded bg-muted px-1" />;
          },
          h1(props) {
            return <h1 {...props} className="text-xl font-semibold" />;
          },
          h2(props) {
            return <h2 {...props} className="text-lg font-semibold" />;
          },
          h3(props) {
            return <h3 {...props} className="font-semibold" />;
          },
          img(props) {
            return <img {...props} className="max-w-full rounded-md border object-contain" loading="lazy" />;
          },
          li(props) {
            return <li {...props} className="ml-5 list-disc" />;
          },
          pre(props) {
            return <CodeBlock {...props} />;
          },
          table(props) {
            return <table {...props} className="w-full border-collapse text-left text-sm" />;
          },
          td(props) {
            return <td {...props} className="border px-2 py-1 align-top" />;
          },
          th(props) {
            return <th {...props} className="border bg-muted px-2 py-1 align-top font-semibold" />;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
