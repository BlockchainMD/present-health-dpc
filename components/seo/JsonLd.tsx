import Head from "next/head";

type JsonLdProps = {
    data: Record<string, unknown>;
    id?: string;
};

function hashString(input: string) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

export function JsonLd({ data, id }: JsonLdProps) {
    const json = JSON.stringify(data);
    const scriptId = id || `jsonld-${hashString(json).slice(0, 8)}`;

    return (
        <Head>
            <script
                id={scriptId}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: json }}
            />
        </Head>
    );
}
