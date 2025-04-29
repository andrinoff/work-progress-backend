// /Users/andrinoff/Documents/local github projects/vscode_extensions/work-progress/work-progress-backend/api/server.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import cors from 'cors';
import util from 'util';
// Node 18+ has fetch built-in. Ensure your Vercel environment uses Node 18+.
// import fetch from 'node-fetch'; // Only needed for Node < 18

import checkUserExists from "../database/check";
import saveToDatabase from "../database/save";
import getApi from "../database/getApi";
import { createTable } from '../database/connection';
import getEmail from '../database/getEmail';
// import dotenv from 'dotenv';

// dotenv.config(); // Load environment variables from .env file
// --- CORS Configuration ---
const allowedOrigins = [
    'https://work-progress-git-development-dreysekis-projects.vercel.app',
    'http://localhost:3000', // For local web dev
    'https://vswork-progress.vercel.app',
    // Add specific VS Code extension origins if needed, e.g.:
    // 'vscode-webview://vscode.git', // Example, adjust based on actual origin
];

const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    console.log(`CORS Check: Received origin: ${origin}`);
    if (!origin) {
        // Allow requests with no origin (like curl requests, server-to-server)
        // Be cautious with this in production if not needed.
        console.log("CORS Check: Allowing request with no origin");
        return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
        console.log(`CORS Check: Allowing origin: ${origin}`);
        return callback(null, true);
    }
    // Allow common extension origins more reliably
    // Note: 'vscode-webview://*' is broad; be more specific if possible.
    const allowedPrefixes = ['chrome-extension://', 'vscode-webview://', 'moz-extension://'];
    if (allowedPrefixes.some(prefix => origin?.startsWith(prefix))) {
        console.log(`CORS Check: Allowing extension origin: ${origin}`);
        return callback(null, true);
    }
    console.error(`CORS Check: Blocking origin: ${origin}`);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false // Typically false for public APIs unless using cookies/sessions
};

const corsMiddleware = cors(corsOptions);
const runCorsMiddleware = util.promisify(corsMiddleware);
// --- End CORS Configuration ---


// --- Main Serverless Function Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // Run CORS middleware first
        await runCorsMiddleware(req, res);

        // Handle OPTIONS preflight requests
        if (req.method === 'OPTIONS') {
            console.log("Handling OPTIONS request");
            return res.status(204).end(); // No Content
        }

        // Ensure database table exists (idempotent)
        await createTable();

        if (req.method === 'POST') {
            // Destructure expected fields from body
            const { email, password, sign, apiKey: apiKeyFromBody, code } = req.body || {};

            // --- Sign In Logic ---
            if (sign === "in") {
                // ... (existing sign-in logic - seems correct)
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
                // ... (existing sign-up logic - seems correct)
                 if (!email || !password) {
                    return res.status(400).json({ success: false, error: 'Missing email or password for sign up' });
                }
                try {
                    const exists = await checkUserExists(email);
                    if (!exists) {
                        console.log(`Attempting sign-up for new user: ${email}`);
                        const newApiKey = await saveToDatabase(email, password);
                        console.log(`Sign-up successful for: ${email}`);
                        return res.status(201).json({ apiKey: newApiKey });
                    } else {
                        console.warn(`Sign-up failed (user already exists): ${email}`);
                        return res.status(409).json({ success: false, error: 'User already exists' });
                    }
                } catch (error: any) {
                    console.error(`Error during sign-up for ${email}:`, error);
                    if (error.code === 'ER_DUP_ENTRY' || (error.message && error.message.includes('Duplicate entry'))) {
                         return res.status(409).json({ success: false, error: 'User already exists (concurrent request?)' });
                    }
                    return res.status(500).json({ success: false, error: 'Database server error during sign up' });
                }
            }
            // --- Get Email Logic (using API Key) ---
            else if (sign === "getEmail") {
                // ... (existing getEmail logic - seems correct)
                if (!apiKeyFromBody || typeof apiKeyFromBody !== 'string' || apiKeyFromBody.trim() === '') {
                    console.warn(`getEmail request received without a valid apiKey.`);
                    return res.status(400).json({ success: false, error: 'Missing or invalid apiKey parameter in request body' });
                }
                try {
                    const emailResult = await getEmail(apiKeyFromBody);
                    if (emailResult) {
                        console.log(`getEmail successful for apiKey starting with: ${apiKeyFromBody.substring(0, 5)}...`);
                        return res.status(200).json({ email: emailResult });
                    } else {
                        console.warn(`getEmail failed: No user found for apiKey starting with: ${apiKeyFromBody.substring(0, 5)}...`);
                        return res.status(404).json({ success: false, error: 'API key not found' });
                    }
                } catch (error: any) {
                    console.error(`Error during getEmail processing for key starting with ${apiKeyFromBody.substring(0, 5)}...:`, error);
                    return res.status(500).json({ success: false, error: 'Database server error during getEmail: ' + error.message });
                }
            }
            // --- Github OAuth Code Exchange and Email Fetch Logic ---
            else if (sign === "github") {
                // 1. Validate Input Code
                if (!code || typeof code !== 'string' || code.trim() === '') {
                    console.warn(`GitHub sign-in request received without a valid 'code'.`);
                    return res.status(400).json({ success: false, error: "Missing or invalid 'code' parameter in request body" });
                }
                console.log(`Received GitHub OAuth code starting with: ${code.substring(0, 5)}...`);

                // 2. Check for Environment Variables
                const clientId = process.env.GITHUB_CLIENT_ID;
                const clientSecret = process.env.GITHUB_CLIENT_SECRET;

                if (!clientId || !clientSecret) {
                    console.error("GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET environment variables are not set.");
                    return res.status(500).json({ success: false, error: "Server configuration error: GitHub OAuth credentials missing." });
                }

                let accessToken = '';

                try {
                    // 3. Exchange Code for Access Token
                    console.log("Exchanging code for GitHub access token...");
                    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json', // Important: Ask for JSON response
                            'User-Agent': 'work-progress' // Optional but good practice
                        },
                        body: JSON.stringify({
                            client_id: clientId,
                            client_secret: clientSecret,
                            code: code,
                            redirect_uri: 'https://vswork-progress.vercel.app' // Optional: Add if you specified one in the initial request
                        }),
                    });

                    const tokenData = await tokenResponse.json();

                    if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
                        console.error(`GitHub token exchange failed (${tokenResponse.status}):`, tokenData);
                        const errorMessage = tokenData.error_description || tokenData.error || `Failed to exchange code for token (status: ${tokenResponse.status})`;
                        // Provide specific feedback for common issues
                        if (tokenData.error === 'bad_verification_code') {
                             return res.status(400).json({ success: false, error: 'Invalid or expired GitHub authorization code.' });
                        }
                        return res.status(tokenResponse.status > 399 ? tokenResponse.status : 400).json({ success: false, error: errorMessage });
                    }

                    accessToken = tokenData.access_token;
                    console.log(`Successfully obtained GitHub access token (type: ${tokenData.token_type}, scope: ${tokenData.scope})`);

                    // 4. Use Access Token to Fetch User Emails
                    console.log("Fetching user emails from GitHub API...");
                    const emailResponse = await fetch('https://api.github.com/user/emails', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'User-Agent': 'work-progress'
                        }
                    });

                    if (!emailResponse.ok) {
                        // Handle GitHub API errors (e.g., invalid token scope, rate limits)
                        const errorBody = await emailResponse.text();
                        console.error(`GitHub API error fetching emails (${emailResponse.status}): ${errorBody}`);
                        if (emailResponse.status === 401) { // Unauthorized - token issue
                             return res.status(401).json({ success: false, error: 'Invalid or expired GitHub token (or insufficient scope)' });
                        }
                         // Other errors (403 Forbidden - scope?, 404 Not Found, 5xx Server Error)
                        return res.status(emailResponse.status).json({ success: false, error: `GitHub API error fetching emails: ${emailResponse.statusText}`, details: errorBody });
                    }

                    const emails: { email: string; primary: boolean; verified: boolean; visibility: string | null }[] = await emailResponse.json();

                    // 5. Find Primary & Verified Email
                    const primaryVerifiedEmail = emails.find(e => e.primary && e.verified);

                    if (primaryVerifiedEmail) {
                        console.log(`Successfully found primary verified GitHub email: ${primaryVerifiedEmail.email}`);
                        // *** IMPORTANT: Now you have the email. What next? ***
                        // Do you want to:
                        // a) Just return the email?
                        // b) Check if this email exists in your DB and return *your* API key?
                        // c) Create a new user in your DB if the email doesn't exist and return a new API key?

                        // --- Example: Just return the email (Option a) ---
                        

                    
                        
                        try {
                            // Check if the user already exists in your database
                            const userExists = await checkUserExists(primaryVerifiedEmail.email);
                            if (!userExists) {
                                // Modify getApi to handle GitHub login (e.g., null password, check a 'provider' column)
                                console.log(`GitHub user ${primaryVerifiedEmail.email} not found in DB, creating...`);
                                // You might need a different save function or modify saveToDatabase
                                // to handle GitHub sign-ups (e.g., no password, set provider='github')
                                let userApiKey = await saveToDatabase(primaryVerifiedEmail.email, null); // Adjust saveToDatabase accordingly
                                console.log(`Created new user for ${primaryVerifiedEmail.email} via GitHub.`);
                                return res.status(201).json({ apiKey: userApiKey }); // 201 Created
                                }
                                 if (userExists) {
                                    console.log(`User already exists for ${primaryVerifiedEmail.email}`);
                                    // Adjust getApi to handle GitHub login
                                 return res.status(500).json({ message: "exists" }); // 200 OK
                                } 
                                else {
                                    console.log(`Found existing user for ${primaryVerifiedEmail.email} via GitHub.`);
                                    return res.status(200).json({ 
                                        message: "Error"
                                     }); // 200 OK
                                }
                            } catch (dbError) {
                                console.error(`Database error during GitHub user lookup/creation for ${primaryVerifiedEmail.email}:`, dbError);
                                return res.status(500).json({ success: false, error: 'Database error processing GitHub login.' });
                            }
                       
                        

                    } else {
                        // Handle case where no primary, verified email exists for the account
                        console.warn(`No primary and verified email found for the provided GitHub token.`);
                        return res.status(404).json({ success: false, error: 'No primary, verified email address found for this GitHub account. Please check your GitHub email settings.' });
                    }

                } catch (error: any) {
                    // Handle network errors or JSON parsing errors during the process
                    console.error('Error during GitHub OAuth code exchange or email fetch:', error);
                    return res.status(500).json({ success: false, error: 'Server error during GitHub authentication', details: error.message });
                }
            }

            // --- Invalid Sign Value ---
            else {
                console.warn(`Invalid 'sign' parameter value received: ${sign}`);
                return res.status(400).json({ success: false, error: 'Invalid or missing sign parameter value' });
            }
        }
        // --- Handle Methods Other Than POST/OPTIONS ---
        else {
            console.log(`Method Not Allowed: ${req.method}`);
            res.setHeader('Allow', ['POST', 'OPTIONS']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
        }

    } catch (error: any) {
        // Catch top-level errors (e.g., CORS issues, unhandled exceptions)
        console.error('Unhandled Handler error:', error);
        if (error.message && error.message.includes('Not allowed by CORS')) {
             // CORS middleware already sent the response, but log it
             console.error("CORS blocked the request.");
             // Avoid sending another response if CORS middleware already did
             if (!res.headersSent) {
                return res.status(403).json({ success: false, error: error.message });
             }
             return; // Stop processing
        }
        // Avoid sending another response if one was already sent
        if (!res.headersSent) {
            const errorMessage = process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error';
            return res.status(500).json({
                success: false,
                error: 'Internal Server Error',
                details: errorMessage
             });
        }
    }
}
