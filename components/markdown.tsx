import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownProps = {
    content: string;
    className?: string;
};

export function Markdown({ content, className }: MarkdownProps) {
    return (
        <div className={className}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
}
