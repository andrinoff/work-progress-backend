// Backend API route to handle sign-in requests through GitHub

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createTable, createTable2, createTable3, createTableGitHub } from '../database/connection';
import dotenv from 'dotenv';
import { runCorsMiddleware } from './cors_config';
import saveGitHub from '../database/GitHubSave';
import checkGitHub from '../database/GitHubCheck';
dotenv.config(); // for local development


export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // Run CORS middleware first. It will handle OPTIONS requests automatically.
        await runCorsMiddleware(req, res);

        // Ensure database table exists (idempotent)
        await createTable();
        await createTable2();
        await createTable3()
        await createTableGitHub();

        if (req.method === 'POST') {
            // Destructure expected fields from body
            const { code} = req.body || {};
             if (!code || typeof code !== 'string' || code.trim() === '') {
                console.warn(`GitHub sign-in request received without a valid 'code'.`);
                return res.status(400).json({ success: false, error: "Missing or invalid 'code' parameter in request body" });
            }
            console.log(`Received GitHub OAuth code starting with: ${code.substring(0, 5)}...`);

            const clientId = process.env._GITHUB_CLIENT_ID;
            const clientSecret = process.env._GITHUB_CLIENT_SECRET;

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
                        redirect_uri: 'https://work-progress.github.io/account/github_handler.html'
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
                        const userExists = await checkGitHub(primaryVerifiedEmail.email);
                        if (userExists === null) {
                            console.log(`GitHub user ${primaryVerifiedEmail.email} not found in DB, creating...`);
                            // Ensure saveToDatabase handles this case (e.g., generates a secure random password or marks as GitHub user)
                            let userApiKey = await saveGitHub(primaryVerifiedEmail.email);
                            console.log(`Created new user for ${primaryVerifiedEmail.email} via GitHub.`);
                            return res.status(201).json({ apiKey: userApiKey, email: primaryVerifiedEmail.email });
                        } else {
                            console.log(`Found existing user for ${primaryVerifiedEmail.email} via GitHub.`);
                            console.warn(`Need to implement API key retrieval for existing GitHub user: ${primaryVerifiedEmail.email}`);
                            const existingApiKey = await checkGitHub(primaryVerifiedEmail.email);
                            console.log(existingApiKey)
                            if (existingApiKey) {
                                return res.status(200).json({ apiKey: existingApiKey });
                            } else {
                                console.error(`User ${primaryVerifiedEmail.email} exists but failed to retrieve API key.`);
                                return res.status(500).json({ success: false, error: 'Error retrieving API key for existing user.' });
                            }

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
    }
    catch (error) {
        // Handle any errors that occur during the request
        console.error('Error in handler:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
