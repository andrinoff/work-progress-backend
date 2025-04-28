// /Users/andrinoff/Documents/local github projects/vscode_extensions/work-progress/work-progress-backend/api/server.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import cors from 'cors'; // Import cors
import util from 'util'; // Import Node.js util for promisify

// Your database functions
import checkUserExists from "../database/check";
import saveToDatabase from "../database/save";
import getApi from "../database/getApi";
import { createTable } from '../database/connection'; // Assuming createTable is potentially async now

// --- CORS Configuration ---
// Define the allowed origins. IMPORTANT: Include your frontend's Vercel URL!
const allowedOrigins = [
    'https://work-progress-git-development-dreysekis-projects.vercel.app',
    'http://localhost:3000', // Example for local frontend dev server
    'https://vswork-progress.vercel.app', // Main production URL - Added https://
];

const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, browser extensions)
    // or requests from whitelisted origins
    // Note: Browser extensions might send an origin like `chrome-extension://<id>`
    // You might need to explicitly allow that if your requests come from the extension's pages.
    // If requests come from content scripts injected into allowed web pages, the origin will be the web page's.
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('chrome-extension://')) { // Example for chrome extension
      callback(null, true);
    } else {
      console.error(`CORS blocked origin: ${origin}`); // Log blocked origins for debugging
      callback(new Error(`Origin ${origin} not allowed by CORS`)); // More specific error
    }
  },
  methods: ['POST', 'OPTIONS'], // Allow POST and the implicit OPTIONS preflight
  allowedHeaders: ['Content-Type'], // Specify allowed headers
  credentials: false // Keep false unless you specifically need credentials/cookies
};

// Create the CORS middleware instance
const corsMiddleware = cors(corsOptions);

// Promisify the middleware to use with async/await
// This allows us to `await` the middleware execution.
const runCorsMiddleware = util.promisify(corsMiddleware);
// --- End CORS Configuration ---


// --- Main Serverless Function Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // --- Apply CORS Middleware FIRST ---
        // Run the CORS middleware and wait for it to finish.
        // It will handle OPTIONS preflight requests automatically and add
        // necessary headers (like Access-Control-Allow-Origin) to the response.
        await runCorsMiddleware(req, res);

        // If the request is an OPTIONS preflight request, corsMiddleware likely ended the response.
        // Vercel might also handle OPTIONS implicitly. We can proceed.

        // --- Ensure Database Table Exists ---
        // Call this *after* CORS, before database operations.
        // Assuming createTable is refactored to be async or handles its execution correctly.
        // If createTable is still synchronous: createTable();
        // If createTable is async: await createTable();
        createTable(); // Using original synchronous call based on previous context

        // --- Handle Request Method ---
        // Now handle the actual request (POST) after CORS headers are set
        if (req.method === 'POST') {
            // --- Body Parsing ---
            // Vercel automatically parses JSON bodies for POST requests by default
            // and puts them in req.body. You usually don't need express.json() here.
            // If you needed urlencoded, Vercel might parse that too, check Vercel docs if needed.
            const { email, password, sign } = req.body;

            if (!email || !password || !sign) {
                return res.status(400).json({ success: false, error: 'Missing required fields: email, password, or sign' });
            }

            // --- Sign In Logic ---
            if (sign === "in") {
                try {
                    const apiKey = await getApi(email, password); // Assuming getApi is async
                    if (apiKey) {
                        return res.status(200).json({ apiKey: apiKey });
                    } else {
                        return res.status(401).json({ success: false, error: 'Invalid credentials or user not found' });
                    }
                } catch (error) {
                    console.error('Error during sign in:', error);
                    return res.status(500).json({ success: false, error: 'Database server error during sign in' });
                }
            }
            // --- Sign Up Logic ---
            else if (sign === "up") {
                try {
                    const exists = await checkUserExists(email); // Assuming checkUserExists is async
                    if (!exists) {
                        // REMEMBER: Implement password hashing here!
                        const apiKey = await saveToDatabase(email, password); // Assuming saveToDatabase is async
                        return res.status(201).json({ apiKey });
                    } else {
                        return res.status(409).json({ success: false, error: 'User already exists' });
                    }
                } catch (error: any) { // Type error explicitly
                    console.error('Error during sign up:', error);
                    if (error.code === 'ER_DUP_ENTRY') {
                         return res.status(409).json({ success: false, error: 'User already exists (concurrent request?)' });
                    }
                    return res.status(500).json({ success: false, error: 'Database server error during sign up' });
                }
            }
            // --- Invalid Sign Value ---
            else {
                return res.status(400).json({ success: false, error: 'Invalid sign parameter value' });
            }
        }
        // --- Handle Methods Other Than POST (and OPTIONS, which CORS handles) ---
        else {
            // Set Allow header for 405 response
            res.setHeader('Allow', ['POST', 'OPTIONS']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
        }

    } catch (error: any) { // Catch errors from CORS or other parts of the handler
        console.error('Handler error:', error);
        // Specifically handle CORS errors if possible
        if (error.message.includes('Not allowed by CORS')) {
             return res.status(403).json({ success: false, error: error.message });
        }
        // Generic server error for other issues
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
}

// No need for the Refactor createTable comment here unless you are modifying connection.ts
