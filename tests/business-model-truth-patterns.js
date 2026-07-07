const FORBIDDEN = [
    /accept (most )?(major )?(commercial )?insurance/i,
    /we accept insurance/i,
    /insurance accepted/i,
    /works with your insurance/i,
    /\$29( per| \/)? ?visit/i,
    /visits start at \$29/i,
    /\$29\s*\/?\s*(per\s*)?employee/i,
    /your copay/i,
    // The practice is Michigan-first; never render the raw US_STATES count as
    // a licensure claim (the March 2026 hero claimed "Licensed across 52 states").
    /licensed (across|in) \d+ states/i,
];

module.exports = {
    FORBIDDEN,
};
