import http from 'http';
import { URL } from 'url';
import https from 'https';
import { storeRefreshToken } from './token-store';

// OAuth configuration - these should come from environment or config
const OAUTH_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

/**
 * Validate OAuth configuration at startup
 * Logs warnings if required environment variables are not set, but does not throw
 * Returns true if config is complete, false if missing credentials
 */
export const validateOAuthConfig = (): boolean => {
  let isValid = true;

  if (!OAUTH_CLIENT_ID) {
    console.warn(
      'GOOGLE_CLIENT_ID environment variable is not set. ' +
      'OAuth login will not be available. See .env.example for details.'
    );
    isValid = false;
  }
  if (!OAUTH_CLIENT_SECRET) {
    console.warn(
      'GOOGLE_CLIENT_SECRET environment variable is not set. ' +
      'OAuth login will not be available. See .env.example for details.'
    );
    isValid = false;
  }

  return isValid;
};

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * Start a local OAuth redirect server listening on localhost:3000
 * The server handles the redirect from Google's OAuth flow and extracts the authorization code
 */
export const startOAuthServer = (callback: (code: string) => void): http.Server => {
  const server = http.createServer((req, res) => {
    try {
      if (!req.url) {
        res.writeHead(400);
        res.end('Bad request');
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host}`);

      // Check for authorization code
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        const errorDesc = url.searchParams.get('error_description') || error;
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(`Authorization failed: ${errorDesc}`);
        server.close();
        return;
      }

      if (code) {
        // Authorization successful
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head>
              <title>Authorization Successful</title>
            </head>
            <body>
              <h1>Authorization Successful</h1>
              <p>You can close this window and return to gshell.</p>
            </body>
          </html>
        `);
        callback(code);
        // Close server after a short delay to allow response to send
        setTimeout(() => server.close(), 100);
        return;
      }

      res.writeHead(400);
      res.end('Missing authorization code');
    } catch (error) {
      console.error('OAuth server error:', (error as Error).message);
      res.writeHead(500);
      res.end('Internal server error');
    }
  });

  // Listen only on localhost to prevent network exposure
  server.listen(3000, 'localhost');

  return server;
};

/**
 * Exchange authorization code for access and refresh tokens
 * Uses PKCE (code_verifier) for additional security
 */
export const exchangeCodeForToken = async (
  code: string,
  codeVerifier: string
): Promise<TokenResponse> => {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }).toString();

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`Token exchange failed with status ${res.statusCode}`));
            return;
          }

          const parsed = JSON.parse(data);

          if (parsed.error) {
            reject(new Error(`OAuth error: ${parsed.error_description || parsed.error}`));
            return;
          }

          // Store refresh token if provided
          if (parsed.refresh_token) {
            storeRefreshToken(parsed.refresh_token);
          }

          resolve(parsed as TokenResponse);
        } catch (error) {
          reject(new Error(`Failed to parse token response: ${(error as Error).message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Token exchange request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
};

/**
 * Generate the Google OAuth authorization URL
 */
export const getAuthorizationUrl = (codeChallenge: string): string => {
  const params = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256', // PKCE SHA256
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};
