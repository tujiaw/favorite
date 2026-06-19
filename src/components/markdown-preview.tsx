import ReactMarkdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

const sanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src || []), "data"]
  }
};

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <article className="grid min-w-0 gap-3 text-sm leading-7 text-foreground">
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
            return <pre {...props} className="overflow-auto rounded-md bg-muted p-3" />;
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
