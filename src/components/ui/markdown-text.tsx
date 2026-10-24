/**
 * Renders a deliberately tiny Markdown subset as React nodes.
 * No raw HTML, links, images, or dangerouslySetInnerHTML are involved.
 */
export function MarkdownText({ content }: { content: string }) {
  return <div className="space-y-2">{content.split("\n").map((line, index) => {
    if (!line.trim()) return null;
    const bullet = line.match(/^[-*]\s+(.*)/)?.[1];
    const numbered = line.match(/^\d+\.\s+(.*)/)?.[1];
    const text = bullet ?? numbered ?? line;
    const parts = text.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={partIndex} className="font-semibold">{part.slice(2, -2)}</strong>
        : part,
    );
    if (bullet || numbered) return <div key={index} className="flex gap-2"><span aria-hidden="true">{numbered ? "–" : "•"}</span><p>{parts}</p></div>;
    return <p key={index}>{parts}</p>;
  })}</div>;
}
