// /Users/andrinoff/Documents/local github projects/vscode_extensions/work-progress/work-progress-backend/api/server.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import cors from 'cors';
import util from 'util';
// Node 18+ has fetch built-in. Ensure your Vercel environment uses Node 18+.
// import fetch from 'node-fetch'; // Only needed for Node < 18

import checkUserExists from "../database/check";
import saveToDatabase from "../database/save";
import getApi from "../database/getApi";
import { createTable, createTable2 } from '../database/connection';
import getEmail from '../database/getEmail';
import dotenv from 'dotenv';
import {getLatestTime, updateLatestTime} from '../database/latestTime';
import { create } from 'domain';

// dotenv.config(); // Load environment variables from .env file - uncomment if needed locally or configure in Vercel

// --- CORS Configuration ---
const allowedOrigins = [
    'https://work-progress-git-development-dreysekis-projects.vercel.app',
    'http://localhost:3000', // For local web dev
    'https://vswork-progress.vercel.app', // <<< The origin mentioned in the error
    'https://vswork-progress.vercel.app/account/github_handler.html', // Specific page
    'https://work-progress.github.io', // GitHub Pages
    'https://andrinoff.github.io', // GitHub Pages 2 

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
  methods: ['POST', 'OPTIONS'], // Ensure OPTIONS is allowed
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Ensure all headers sent by client are listed
  credentials: false // Typically false for public APIs unless using cookies/sessions
};

const corsMiddleware = cors(corsOptions);
const runCorsMiddleware = util.promisify(corsMiddleware);
// --- End CORS Configuration ---


// --- Main Serverless Function Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // Run CORS middleware first. It will handle OPTIONS requests automatically.
        await runCorsMiddleware(req, res);

        // --- REMOVED THE MANUAL OPTIONS HANDLING BLOCK ---
        // if (req.method === 'OPTIONS') {
        //     console.log("Handling OPTIONS request");
        //     return res.status(204).end(); // No Content
        // }
        // --- END REMOVAL ---

        // If the request was OPTIONS, the cors middleware should have already ended the response.
        // We only proceed if it wasn't an OPTIONS request handled by the middleware.
        // Note: Some configurations of the cors middleware might call next() even on OPTIONS,
        // but the default behavior usually sends the response. If you still hit issues,
        // you might need to check if the response was already sent before proceeding.
        // However, typically, removing the manual block is sufficient.

        // Ensure database table exists (idempotent)
        await createTable();
        await createTable2();

        if (req.method === 'POST') {
            // Destructure expected fields from body
            const { email, password, sign, apiKey: apiKeyFromBody, code, latestTime } = req.body || {};

            // --- Sign In Logic ---
            if (sign === "in") {
                // ... (rest of your sign-in logic)
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
                // ... (rest of your sign-up logic)
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
                // ... (rest of your getEmail logic)
                if (!apiKeyFromBody || typeof apiKeyFromBody !== 'string' || apiKeyFromBody.trim() === '') {
                    console.warn(`getEmail request received without a valid apiKey.`);
                    return res.status(400).json({ success: false, error: 'Missing or invalid apiKey parameter in request body' });
                }
                try {
                    const emailResult = await getEmail(apiKeyFromBody);
                    if (emailResult) {
                        console.log(`getEmail successful for apiKey starting with: ${apiKeyFromBody.substring(0, 5)}...`);
                        console.log(emailResult)
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
                // ... (rest of your github logic)
                if (!code || typeof code !== 'string' || code.trim() === '') {
                    console.warn(`GitHub sign-in request received without a valid 'code'.`);
                    return res.status(400).json({ success: false, error: "Missing or invalid 'code' parameter in request body" });
                }
                console.log(`Received GitHub OAuth code starting with: ${code.substring(0, 5)}...`);

                const clientId = process.env.GITHUB_CLIENT_ID;
                const clientSecret = process.env.GITHUB_CLIENT_SECRET;

                if (!clientId || !clientSecret) {
                    console.error("GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET environment variables are not set.");
                    return res.status(500).json({ success: false, error: "Server configuration error: GitHub OAuth credentials missing." });
                }

                let accessToken = '';

                try {
                    console.log("Exchanging code for GitHub access token...");
                    console.log(code)
                    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'User-Agent': 'work-progress'
                        },
                        body: JSON.stringify({
                            client_id: clientId,
                            client_secret: clientSecret,
                            code: code,
                            redirect_uri: 'https://vswork-progress.vercel.app/account/github_handler.html'
                        }),
                    });

                    const tokenData = await tokenResponse.json();
                    // Inside the 'sign === "github"' block, after getting tokenData

                    accessToken = tokenData.access_token;
                    console.log(`Successfully obtained GitHub access token. Granted Scopes: ${tokenData.scope}`); // <--- ADD THIS
                    console.log("Fetching user emails from GitHub API...");
                    console.log(tokenData.access_token)

                    if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
                        console.error(`GitHub token exchange failed (${tokenResponse.status}):`, tokenData);
                        const errorMessage = tokenData.error_description || tokenData.error || `Failed to exchange code for token (status: ${tokenResponse.status})`;
                        if (tokenData.error === 'bad_verification_code') {
                             return res.status(400).json({ success: false, error: 'Invalid or expired GitHub authorization code.' });
                        }
                        return res.status(tokenResponse.status > 399 ? tokenResponse.status : 400).json({ success: false, error: errorMessage });
                    }

                    accessToken = tokenData.access_token;
                    console.log(`Successfully obtained GitHub access token (type: ${tokenData.token_type}, scope: ${tokenData.scope})`);

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
                        const errorBody = await emailResponse.text();
                        console.error(`GitHub API error fetching emails (${emailResponse.status}): ${errorBody}`);
                        if (emailResponse.status === 401) {
                             return res.status(401).json({ success: false, error: 'Invalid or expired GitHub token (or insufficient scope)' });
                        }
                        return res.status(emailResponse.status).json({ success: false, error: `GitHub API error fetching emails: ${emailResponse.statusText}`, details: errorBody });
                    }

                    const emails: { email: string; primary: boolean; verified: boolean; visibility: string | null }[] = await emailResponse.json();
                    const primaryVerifiedEmail = emails.find(e => e.primary && e.verified);

                    if (primaryVerifiedEmail) {
                        console.log(`Successfully found primary verified GitHub email: ${primaryVerifiedEmail.email}`);
                        try {
                            const userExists = await checkUserExists(primaryVerifiedEmail.email);
                            if (!userExists) {
                                console.log(`GitHub user ${primaryVerifiedEmail.email} not found in DB, creating...`);
                                // Ensure saveToDatabase handles this case (e.g., generates a secure random password or marks as GitHub user)
                                let userApiKey = await saveToDatabase(primaryVerifiedEmail.email, "ilikecoding2025"); // FIXME: Use a secure way to handle password/auth for GitHub users
                                console.log(`Created new user for ${primaryVerifiedEmail.email} via GitHub.`);
                                return res.status(201).json({ apiKey: userApiKey });
                            } else {
                                console.log(`Found existing user for ${primaryVerifiedEmail.email} via GitHub.`);
                                // You need to retrieve the API key for the existing user.
                                // Modify getApi or add a new function to get API key by email *without* password check for GitHub logins.
                                // For now, returning an error as the logic is incomplete.
                                console.warn(`Need to implement API key retrieval for existing GitHub user: ${primaryVerifiedEmail.email}`);
                                // Example: Fetch the API key based on email
                                const existingApiKey = await getApi(primaryVerifiedEmail.email, null); // Modify getApi to handle null password for known GitHub users
                                if (existingApiKey) {
                                    return res.status(200).json({ apiKey: existingApiKey });
                                } else {
                                    // This case shouldn't happen if checkUserExists was true, indicates DB inconsistency or logic error
                                    console.error(`User ${primaryVerifiedEmail.email} exists but failed to retrieve API key.`);
                                    return res.status(500).json({ success: false, error: 'Error retrieving API key for existing user.' });
                                }
                                // Original placeholder: return res.status(500).json({ message: "exists" }); // 500 fail - This was incorrect
                            }
                        } catch (dbError) {
                            console.error(`Database error during GitHub user lookup/creation for ${primaryVerifiedEmail.email}:`, dbError);
                            return res.status(500).json({ success: false, error: 'Database error processing GitHub login.' });
                        }
                    } else {
                        console.warn(`No primary and verified email found for the provided GitHub token.`);
                        return res.status(404).json({ success: false, error: 'No primary, verified email address found for this GitHub account. Please check your GitHub email settings.' });
                    }

                } catch (error: any) {
                    console.error('Error during GitHub OAuth code exchange or email fetch:', error);
                    return res.status(500).json({ success: false, error: 'Server error during GitHub authentication', details: error.message });
                }

            }
            else if (sign === "getLatestTime") {
                const latestTime = await getLatestTime(apiKeyFromBody);
                return res.status(200).json({ latestTime:  latestTime });
            }
            else if (sign === "updateLatestTime") {
                if (!apiKeyFromBody || typeof apiKeyFromBody !== 'string' || apiKeyFromBody.trim() === '') {
                    console.warn(`updateLatestTime request received without a valid apiKey.`);
                    return res.status(400).json({ success: false, error: 'Missing or invalid apiKey parameter in request body' });
                }
                if (latestTime === undefined || typeof latestTime !== 'number') {
                    console.warn(`updateLatestTime request received without a valid latestTime.`);
                    return res.status(400).json({ success: false, error: 'Missing or invalid latestTime parameter in request body' });
                }
                try {
                    await updateLatestTime(apiKeyFromBody, latestTime);
                    console.log(`Latest time updated successfully for API key starting with: ${apiKeyFromBody.substring(0, 5)}...`);
                    return res.status(200).json({ success: true, message: 'Latest time updated successfully' });
                } catch (error: any) {
                    console.error(`Error during updateLatestTime processing for key starting with ${apiKeyFromBody.substring(0, 5)}...:`, error);
                    return res.status(500).json({ success: false, error: 'Database server error during updateLatestTime: ' + error.message });
                }
            }
            // --- Invalid Sign Value ---
            else {
                console.warn(`Invalid 'sign' parameter value received: ${sign}`);
                return res.status(400).json({ success: false, error: 'Invalid or missing sign parameter value' });
            }
        }
        // --- Handle Methods Other Than POST ---
        // Note: OPTIONS is handled by the CORS middleware now
        else {
            console.log(`Method Not Allowed: ${req.method}`);
            res.setHeader('Allow', ['POST', 'OPTIONS']); // Keep OPTIONS here for clarity
            return res.status(405).end(`Method ${req.method} Not Allowed`);
        }

    } catch (error: any) {
        // Catch top-level errors (e.g., CORS issues from the middleware itself, unhandled exceptions)
        console.error('Unhandled Handler error:', error);
        // Check if the response has already been sent (e.g., by the CORS middleware on error)
        if (!res.headersSent) {
            if (error.message && error.message.includes('Not allowed by CORS')) {
                 // CORS middleware might throw this error if origin check fails
                 return res.status(403).json({ success: false, error: error.message });
            } else {
                const errorMessage = process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error';
                return res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    details: errorMessage // Only include details in dev or based on policy
                 });
            }
        } else {
            // Log the error even if headers were sent, but don't try to send another response
             console.error("Error occurred after headers were sent:", error);
        }
    }
}


