// /Users/andrinoff/Documents/local github projects/vscode_extensions/work-progress/work-progress-backend/api/server.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import cors from 'cors';
import util from 'util';

import checkUserExists from "../database/check";
import saveToDatabase from "../database/save";
import getApi from "../database/getApi";
import { createTable } from '../database/connection';
import getEmail from '../database/getEmail';

// --- CORS Configuration ---
const allowedOrigins = [
    'https://work-progress-git-development-dreysekis-projects.vercel.app',
    'http://localhost:3000',
    'https://vswork-progress.vercel.app',
    // Add any other origins like specific preview URLs if needed
    // Example for VS Code extension origin (if requests come from extension UI):
    // 'vscode-webview://*' // Adjust if needed, might require more specific origin matching
    // Example for Chrome extension origin:
    // 'chrome-extension://YOUR_EXTENSION_ID' // Replace with your actual extension ID
];

const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // Add logging to see exactly what origin is being received
    console.log(`CORS Check: Received origin: ${origin}`);

    // Allow requests with no origin (like server-to-server, curl, mobile apps, maybe some extensions)
    if (!origin) {
        console.log("CORS Check: Allowing request with no origin");
        return callback(null, true);
    }

    // Check against allowed origins list
    if (allowedOrigins.includes(origin)) {
        console.log(`CORS Check: Allowing origin: ${origin}`);
        return callback(null, true);
    }

    // Allow Chrome/VSCode extension origins (adjust patterns as needed)
    if (origin.startsWith('chrome-extension://') || origin.startsWith('vscode-webview://')) {
        console.log(`CORS Check: Allowing extension origin: ${origin}`);
        return callback(null, true);
    }

    // Otherwise, block the origin
    console.error(`CORS Check: Blocking origin: ${origin}`);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ['POST', 'OPTIONS'], // Methods allowed
  // IMPORTANT: List all headers the client might send in the actual request
  // Content-Type is needed for JSON bodies. Add others if used (e.g., Authorization)
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Be more permissive or specific
  credentials: false
};

const corsMiddleware = cors(corsOptions);
const runCorsMiddleware = util.promisify(corsMiddleware);
// --- End CORS Configuration ---


// --- Main Serverless Function Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // REMOVED: const { email, password, sign } = req.body; // Don't destructure here

    try {
        // --- Apply CORS Middleware FIRST ---
        // This handles OPTIONS preflight and adds headers to actual responses
        await runCorsMiddleware(req, res);

        // --- Ensure Database Table Exists ---
        // Call *after* CORS middleware, before DB operations
        createTable(); // Assuming sync for now

        // --- Handle Request Method ---
        if (req.method === 'POST') {
            // --- Body Parsing & Validation ---
            // Destructure body *only* for POST requests *after* CORS
            const { email, password, sign } = req.body;

            if (!email || !password || !sign) {
                // Log the received body for debugging missing fields
                console.warn('Missing required fields. Received body:', req.body);
                return res.status(400).json({ success: false, error: 'Missing required fields: email, password, or sign' });
            }

            // --- Sign In Logic ---
            if (sign === "in") {
                try {
                    const apiKey = await getApi(email, password);
                    if (apiKey) {
                        console.log(`Sign-in successful for: ${email}`);
                        return res.status(200).json({ apiKey: apiKey });
                    } else {
                        console.warn(`Sign-in failed (invalid credentials/user not found) for: ${email}`);
                        return res.status(401).json({ success: false, error: 'Invalid credentials or user not found' });
                    }
                } catch (error) {
                    console.error(`Database error during sign-in for ${email}:`, error);
                    return res.status(500).json({ success: false, error: 'Database server error during sign in' });
                }
            }
            // --- Sign Up Logic ---
            else if (sign === "up") {
                try {
                    const exists = await checkUserExists(email);
                    if (!exists) {
                        // REMEMBER: Implement password hashing here!
                        console.log(`Attempting sign-up for new user: ${email}`);
                        const apiKey = await saveToDatabase(email, password);
                        console.log(`Sign-up successful for: ${email}`);
                        return res.status(201).json({ apiKey });
                    } else {
                        console.warn(`Sign-up failed (user already exists): ${email}`);
                        return res.status(409).json({ success: false, error: 'User already exists' });
                    }
                } catch (error: any) {
                    console.error(`Error during sign-up for ${email}:`, error);
                    if (error.code === 'ER_DUP_ENTRY') {
                         return res.status(409).json({ success: false, error: 'User already exists (concurrent request?)' });
                    }
                    return res.status(500).json({ success: false, error: 'Database server error during sign up' });
                }
            }
            else if (sign == "getEmail") {
                try {
                    const apiKey = req.body.apiKey;
                    const email = await getEmail(apiKey);
                    return res.status(200).json({ email });
            }catch (error) {
                    console.error(`Error during getEmail for ${email}:`, error);
                    return res.status(500).json({ success: false, error: 'Database server error during getEmail' });
                }
        }
            // --- Invalid Sign Value ---
            else {
                console.warn(`Invalid 'sign' parameter value received: ${sign}`);
                return res.status(400).json({ success: false, error: 'Invalid sign parameter value' });
            }
        }
        // --- Handle Methods Other Than POST (OPTIONS is handled by CORS middleware) ---
        else if (req.method !== 'OPTIONS') { // Explicitly ignore OPTIONS here as it's handled
            console.log(`Method Not Allowed: ${req.method}`);
            res.setHeader('Allow', ['POST', 'OPTIONS']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
        // If it's an OPTIONS request, the CORS middleware should have handled it.
        // If it hasn't ended the response, we can let it fall through or explicitly end it.
        // else if (req.method === 'OPTIONS') {
        //    return res.status(204).end(); // Explicitly handle OPTIONS if needed after middleware
        // }

    } catch (error: any) {
        // Log the error caught by the main handler
        console.error('Handler error:', error);

        // Check if it's a CORS error triggered by our origin function
        if (error.message.includes('Not allowed by CORS')) {
             return res.status(403).json({ success: false, error: error.message });
        }

        // Generic server error for other issues
        // Ensure CORS headers are still potentially added even on error
        // The 'cors' middleware modifies 'res' directly, so headers might already be set.
        // However, explicitly setting Allow-Origin on error responses can sometimes help.
        // res.setHeader('Access-Control-Allow-Origin', '*'); // Or a specific allowed origin
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            details: error.message // Optionally include details in dev mode
         });
    }
}
