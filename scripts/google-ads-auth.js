const { google } = require('googleapis');
const dotenv = require('dotenv');
const http = require('http');
const url = require('url');

dotenv.config();

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const SCOPES = ['https://www.googleapis.com/auth/adwords'];
const PORT = 8080;
const REDIRECT_URI = `http://localhost:${PORT}`;

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

async function startAuth() {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });

    console.log('1. Visit this URL to authorize:', authUrl);
    console.log('\n2. Waiting for browser to redirect back to localhost:8080...');

    const server = http.createServer(async (req, res) => {
        try {
            if (req.url.startsWith('/?code=')) {
                const queryData = url.parse(req.url, true).query;
                const code = queryData.code;

                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<h1>Authentication Successful!</h1><p>You can close this tab now and check your terminal.</p>');

                console.log('\n3. Code received! Exchanging for tokens...');
                const { tokens } = await oauth2Client.getToken(code);

                console.log('\n✅ NEW REFRESH TOKEN:');
                console.log(tokens.refresh_token);
                console.log('\nCopy this token into your .env file as GOOGLE_ADS_REFRESH_TOKEN');

                process.exit(0);
            }
        } catch (e) {
            console.error('Error during token exchange:', e);
            res.writeHead(500);
            res.end('Internal Server Error');
            process.exit(1);
        }
    }).listen(PORT);
}

startAuth().catch(console.error);
