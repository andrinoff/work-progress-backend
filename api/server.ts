// /Users/andrinoff/Documents/local github projects/vscode_extensions/work-progress/work-progress-backend/api/server.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import cors from 'cors';
import util from 'util';

import checkUserExists from "../database/check";
import saveToDatabase from "../database/save";
import getApi from "../database/getApi";
import { createTable } from '../database/connection';
import getEmail from '../database/getEmail';
// Unused import - removed: import { apikeys } from 'googleapis/build/src/apis/apikeys';

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
    // Be careful with overly broad patterns like vscode-webview://*
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
        // Consider if this needs to run on every request or just once at startup/deployment
        await createTable(); // Assuming it's async now based on typical DB operations

        // --- Handle Request Method ---
        if (req.method === 'POST') {
            // --- Body Parsing & Validation ---
            // Destructure body *only* for POST requests *after* CORS
            // Use optional chaining or default values if fields might be missing
            const { email, password, sign, apiKey: apiKeyFromBody } = req.body || {}; // Use default empty object

            // --- Sign In Logic ---
            if (sign === "in") {
                if (!email || !password) {
                    return res.status(400).json({ success: false, error: 'Missing email or password for sign in' });
                }
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
                 if (!email || !password) {
                    return res.status(400).json({ success: false, error: 'Missing email or password for sign up' });
                }
                try {
                    const exists = await checkUserExists(email);
                    if (!exists) {
                        // REMEMBER: Implement password hashing here!
                        console.log(`Attempting sign-up for new user: ${email}`);
                        const newApiKey = await saveToDatabase(email, password); // Renamed variable for clarity
                        console.log(`Sign-up successful for: ${email}`);
                        return res.status(201).json({ apiKey: newApiKey }); // Return the generated key
                    } else {
                        console.warn(`Sign-up failed (user already exists): ${email}`);
                        return res.status(409).json({ success: false, error: 'User already exists' });
                    }
                } catch (error: any) {
                    console.error(`Error during sign-up for ${email}:`, error);
                    if (error.code === 'ER_DUP_ENTRY' || (error.message && error.message.includes('Duplicate entry'))) { // Check common duplicate errors
                         return res.status(409).json({ success: false, error: 'User already exists (concurrent request?)' });
                    }
                    return res.status(500).json({ success: false, error: 'Database server error during sign up' });
                }
            }
            // --- Get Email Logic ---
            else if (sign === "getEmail") {
                // *** ADDED VALIDATION ***
                if (!apiKeyFromBody || typeof apiKeyFromBody !== 'string' || apiKeyFromBody.trim() === '') {
                    console.warn(`getEmail request received without a valid apiKey.`);
                    return res.status(400).json({ success: false, error: 'Missing or invalid apiKey parameter in request body' });
                }
                // *** END VALIDATION ***

                try {
                    // Now we know apiKeyFromBody is a non-empty string
                    const emailResult = await getEmail(apiKeyFromBody); // Use the validated key

                    if (emailResult) { // Check if getEmail found a user
                        // Avoid logging full API key in production if possible
                        console.log(`getEmail successful for apiKey starting with: ${apiKeyFromBody.substring(0, 5)}...`);
                        return res.status(200).json({ email: emailResult });
                    } else {
                        console.warn(`getEmail failed: No user found for apiKey starting with: ${apiKeyFromBody.substring(0, 5)}...`);
                        // Use 404 Not Found if the API key is valid format but doesn't match any user
                        return res.status(404).json({ success: false, error: 'API key not found' });
                    }
                } catch (error: any) {
                    // Log the specific key prefix for easier debugging if needed, but be cautious
                    console.error(`Error during getEmail processing for key starting with ${apiKeyFromBody.substring(0, 5)}...:`, error);
                    return res.status(500).json({ success: false, error: 'Database server error during getEmail: ' + error.message });
                }
            }
            // --- Invalid Sign Value ---
            else {
                console.warn(`Invalid 'sign' parameter value received: ${sign}`);
                return res.status(400).json({ success: false, error: 'Invalid or missing sign parameter value' });
            }
        }
        // --- Handle Methods Other Than POST (OPTIONS is handled by CORS middleware) ---
        else if (req.method !== 'OPTIONS') { // Explicitly ignore OPTIONS here as it's handled
            console.log(`Method Not Allowed: ${req.method}`);
            res.setHeader('Allow', ['POST', 'OPTIONS']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
        // If it's an OPTIONS request, the CORS middleware should have handled it and potentially ended the response.
        // No explicit handling needed here unless the middleware fails to end it.

    } catch (error: any) {
        // Log the error caught by the main handler
        console.error('Unhandled Handler error:', error);

        // Check if it's a CORS error triggered by our origin function
        if (error.message && error.message.includes('Not allowed by CORS')) {
             // CORS middleware might have already set headers, but setting status/body here is needed
             return res.status(403).json({ success: false, error: error.message });
        }

        // Generic server error for other unexpected issues
        // Ensure CORS headers are still potentially added even on error
        // The 'cors' middleware modifies 'res' directly. If an error occurs *before*
        // the middleware runs (unlikely with current structure), headers might be missing.
        // Adding a default Allow-Origin header here can be a fallback but might override specific origins.
        // res.setHeader('Access-Control-Allow-Origin', '*'); // Use cautiously

        // Avoid sending detailed internal error messages to the client in production
        const errorMessage = process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error';
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            details: errorMessage // Send details only in dev
         });
    }
}
