import { JsonLd } from "@/components/seo/JsonLd";
import type { SchemaBlock } from "@/lib/schema";

export function SchemaBlocks({ blocks, idPrefix }: { blocks: SchemaBlock[]; idPrefix?: string }) {
    if (!Array.isArray(blocks) || blocks.length === 0) return null;
    const prefix = idPrefix || "schema";

    return (
        <>
            {blocks.map((block, idx) => (
                <JsonLd key={`${prefix}-${idx}`} data={block} id={`${prefix}-${idx}`} />
            ))}
        </>
    );
}

