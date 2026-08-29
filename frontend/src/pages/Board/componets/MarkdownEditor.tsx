import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markdown";
import styles from "./MarkdownEditor.module.css";

// CommonMark (what react-markdown renders) only treats an ATX heading as a
// heading when the '#' is followed by a space at the start of a line — "# Title".
// Prism's default grammar flags a bare "#Title" too, so the editor would
// highlight it as a heading that then renders as plain text. Tighten the ATX
// pattern to require the space so the editor matches the rendered output.
{
  const title = (Prism.languages.markdown as Record<string, unknown>).title;
  if (Array.isArray(title)) {
    for (const tok of title) {
      const t = tok as { pattern?: RegExp };
      if (t.pattern instanceof RegExp && t.pattern.source.includes("#")) {
        t.pattern = /(^\s*)#{1,6}[ \t].+/m;
      }
    }
  }
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// A textarea with live markdown syntax highlighting: Prism tokenises the raw
// text and react-simple-code-editor overlays the transparent textarea on top of
// the highlighted <pre>. Token colours are defined in the CSS module so they use
// the app's palette instead of a stock Prism theme.
export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
}: MarkdownEditorProps) {
  return (
    <div className={styles.editor}>
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={(code) =>
          Prism.highlight(code, Prism.languages.markdown, "markdown")
        }
        placeholder={placeholder}
        padding={12}
        textareaClassName={styles.textarea}
        preClassName={styles.pre}
      />
    </div>
  );
}
