// Backend API route to handle getting emails from api keys requests

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createTable, createTable2, createTable3, createTableGitHub } from '../database/connection';
import dotenv from 'dotenv';
import { runCorsMiddleware } from './cors_config';
import { getWeekTime } from '../database/week';
import getLatest from '../database/latest';


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
            const { apiKey } = req.body || {};
            if (!apiKey) {
                return res.status(400).json({ success: false, error: 'Missing email or password for sign in' });
            }
            else if (apiKey !== null) {
                try {
                    const time = await getLatest(apiKey);
                    if (time) {
                    return res.status(200).json({ success: true, time: time[7] });
                }
                else {
                    return res.status(400).json({success: false})
                }
                    
                } catch (error) {
                    console.error('Error during sign-in:', error);
                    return res.status(500).json({ success: false, error: 'something went wrong while signing in' });
                }

            }
            else {
                // Log the error
                console.error('Unknown error:', req.method);
            }
    }
    else {
            // Log the error even if headers were sent, but don't try to send another response
            console.error('Invalid request method:', req.method);
        }} catch (error) {
                console.error('Error during sign-in:', error);
                return res.status(500).json({ success: false, error: 'something went wrong while signing in' });
        }
    }