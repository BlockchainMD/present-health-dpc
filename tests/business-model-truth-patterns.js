const FORBIDDEN = [
    /accept (most )?(major )?(commercial )?insurance/i,
    /we accept insurance/i,
    /insurance accepted/i,
    /works with your insurance/i,
    /\$29( per| \/)? ?visit/i,
    /visits start at \$29/i,
    /your copay/i,
];

module.exports = {
    FORBIDDEN,
};
