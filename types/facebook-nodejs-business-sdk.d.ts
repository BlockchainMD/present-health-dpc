declare module 'facebook-nodejs-business-sdk' {
    export const FacebookAdsApi: {
        init(accessToken: string): void;
        getDefaultApi(): {
            setDebug(debug: boolean): void;
        };
    };

    export class AdAccount {
        constructor(id: string);
        createCampaign(fields: string[], params: any): Promise<{ id: string }>;
        createAdSet(fields: string[], params: any): Promise<{ id: string }>;
        createAdCreative(fields: string[], params: any): Promise<{ id: string }>;
        createAd(fields: string[], params: any): Promise<{ id: string }>;
        createAdImage(fields: string[], params: any): Promise<{ hash: string }>;
    }

    export class AdImage {
        constructor(id: string);
    }

    export class Campaign {
        static Status: {
            active: string;
            paused: string;
            deleted: string;
            archived: string;
        };
        constructor(id: string);
        update(fields: string[], params: any): Promise<void>;
        getInsights(fields: string[], params: any): Promise<any[]>;
    }

    export class AdSet {
        static Status: {
            active: string;
            paused: string;
            deleted: string;
            archived: string;
        };
        static BillingEvent: {
            impressions: string;
            link_clicks: string;
            page_likes: string;
        };
        constructor(id: string);
    }

    export class AdCreative {
        constructor(id: string);
    }

    export class Ad {
        static Status: {
            active: string;
            paused: string;
            deleted: string;
            archived: string;
        };
        constructor(id: string);
    }

    const bizSdk: {
        FacebookAdsApi: typeof FacebookAdsApi;
        AdAccount: typeof AdAccount;
        Campaign: typeof Campaign;
        AdSet: typeof AdSet;
        AdCreative: typeof AdCreative;
        Ad: typeof Ad;
        AdImage: typeof AdImage;
    };

    export default bizSdk;
}
