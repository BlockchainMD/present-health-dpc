export type CityEntry = { name: string; slug: string };

export const STATE_CITIES: Record<string, CityEntry[]> = {
    arizona: [
        { name: "Phoenix", slug: "phoenix" },
        { name: "Tucson", slug: "tucson" },
        { name: "Mesa", slug: "mesa" },
        { name: "Scottsdale", slug: "scottsdale" },
        { name: "Chandler", slug: "chandler" },
        { name: "Gilbert", slug: "gilbert" },
        { name: "Tempe", slug: "tempe" },
    ],
    florida: [
        { name: "Miami", slug: "miami" },
        { name: "Orlando", slug: "orlando" },
        { name: "Tampa", slug: "tampa" },
        { name: "Jacksonville", slug: "jacksonville" },
        { name: "St. Petersburg", slug: "st-petersburg" },
        { name: "Fort Lauderdale", slug: "fort-lauderdale" },
        { name: "Sarasota", slug: "sarasota" },
        { name: "Naples", slug: "naples" },
    ],
    indiana: [
        { name: "Indianapolis", slug: "indianapolis" },
        { name: "Fort Wayne", slug: "fort-wayne" },
        { name: "Evansville", slug: "evansville" },
        { name: "South Bend", slug: "south-bend" },
        { name: "Carmel", slug: "carmel" },
        { name: "Fishers", slug: "fishers" },
    ],
    kentucky: [
        { name: "Louisville", slug: "louisville" },
        { name: "Lexington", slug: "lexington" },
        { name: "Bowling Green", slug: "bowling-green" },
        { name: "Owensboro", slug: "owensboro" },
        { name: "Covington", slug: "covington" },
        { name: "Richmond", slug: "richmond" },
    ],
    michigan: [
        { name: "Detroit", slug: "detroit" },
        { name: "Grand Rapids", slug: "grand-rapids" },
        { name: "Ann Arbor", slug: "ann-arbor" },
        { name: "Lansing", slug: "lansing" },
        { name: "Kalamazoo", slug: "kalamazoo" },
        { name: "Troy", slug: "troy" },
        { name: "Sterling Heights", slug: "sterling-heights" },
    ],
    minnesota: [
        { name: "Minneapolis", slug: "minneapolis" },
        { name: "St. Paul", slug: "st-paul" },
        { name: "Rochester", slug: "rochester" },
        { name: "Duluth", slug: "duluth" },
        { name: "Bloomington", slug: "bloomington" },
        { name: "Plymouth", slug: "plymouth" },
    ],
    "north-carolina": [
        { name: "Charlotte", slug: "charlotte" },
        { name: "Raleigh", slug: "raleigh" },
        { name: "Durham", slug: "durham" },
        { name: "Greensboro", slug: "greensboro" },
        { name: "Winston-Salem", slug: "winston-salem" },
        { name: "Asheville", slug: "asheville" },
        { name: "Wilmington", slug: "wilmington" },
    ],
    nebraska: [
        { name: "Omaha", slug: "omaha" },
        { name: "Lincoln", slug: "lincoln" },
        { name: "Bellevue", slug: "bellevue" },
        { name: "Grand Island", slug: "grand-island" },
        { name: "Kearney", slug: "kearney" },
    ],
    "new-hampshire": [
        { name: "Manchester", slug: "manchester" },
        { name: "Nashua", slug: "nashua" },
        { name: "Concord", slug: "concord" },
        { name: "Dover", slug: "dover" },
        { name: "Portsmouth", slug: "portsmouth" },
    ],
    ohio: [
        { name: "Columbus", slug: "columbus" },
        { name: "Cleveland", slug: "cleveland" },
        { name: "Cincinnati", slug: "cincinnati" },
        { name: "Dayton", slug: "dayton" },
        { name: "Akron", slug: "akron" },
        { name: "Toledo", slug: "toledo" },
        { name: "Canton", slug: "canton" },
    ],
    "rhode-island": [
        { name: "Providence", slug: "providence" },
        { name: "Warwick", slug: "warwick" },
        { name: "Cranston", slug: "cranston" },
        { name: "Pawtucket", slug: "pawtucket" },
        { name: "Newport", slug: "newport" },
    ],
    texas: [
        { name: "Houston", slug: "houston" },
        { name: "Dallas", slug: "dallas" },
        { name: "Austin", slug: "austin" },
        { name: "San Antonio", slug: "san-antonio" },
        { name: "Fort Worth", slug: "fort-worth" },
        { name: "El Paso", slug: "el-paso" },
        { name: "Plano", slug: "plano" },
        { name: "Frisco", slug: "frisco" },
    ],
    utah: [
        { name: "Salt Lake City", slug: "salt-lake-city" },
        { name: "Provo", slug: "provo" },
        { name: "West Jordan", slug: "west-jordan" },
        { name: "Ogden", slug: "ogden" },
        { name: "St. George", slug: "st-george" },
        { name: "Lehi", slug: "lehi" },
    ],
    washington: [
        { name: "Seattle", slug: "seattle" },
        { name: "Spokane", slug: "spokane" },
        { name: "Tacoma", slug: "tacoma" },
        { name: "Bellevue", slug: "bellevue" },
        { name: "Vancouver", slug: "vancouver" },
        { name: "Redmond", slug: "redmond" },
        { name: "Olympia", slug: "olympia" },
    ],
    wisconsin: [
        { name: "Milwaukee", slug: "milwaukee" },
        { name: "Madison", slug: "madison" },
        { name: "Green Bay", slug: "green-bay" },
        { name: "Kenosha", slug: "kenosha" },
        { name: "Racine", slug: "racine" },
        { name: "Appleton", slug: "appleton" },
    ],
};

export function getCitiesForState(stateSlug: string): CityEntry[] {
    return STATE_CITIES[stateSlug] ?? [];
}

export function getAllStateCityParams(): { stateSlug: string; citySlug: string }[] {
    return Object.entries(STATE_CITIES).flatMap(([stateSlug, cities]) =>
        cities.map((city) => ({ stateSlug, citySlug: city.slug })),
    );
}
