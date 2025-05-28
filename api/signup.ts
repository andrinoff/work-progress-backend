import type { VercelRequest, VercelResponse } from '@vercel/node';
import save from "../database/save";
import { createTable, createTable2 } from '../database/connection';
import dotenv from 'dotenv';
import { runCorsMiddleware } from './cors_config';

dotenv.config(); // for local development


export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // Run CORS middleware first. It will handle OPTIONS requests automatically.
        await runCorsMiddleware(req, res);

        // Ensure database table exists (idempotent)
        await createTable();
        await createTable2();

        if (req.method === 'POST') {
            // Destructure expected fields from body
            const { email, password } = req.body || {};
            if (!email || !password) {
                return res.status(400).json({ success: false, error: 'Missing email or password for sign in' });
            }
            try {
                const apiKey = await save(email, password);
                if (apiKey) {
                    console.log(`Sign-up successful for: ${email}`);
                    return res.status(200).json({ apiKey: apiKey });
         }
        else {
            // Log the error even if headers were sent, but don't try to send another response
             console.error('Invalid request method:', req.method);
        }
        } catch (error) {
                console.error('Error during sign-in:', error);
                return res.status(500).json({ success: false, error: 'something went wrong while signing up' });
        }

    }
}
    catch (error) {
        // Handle any errors that occur during the request
        console.error('Error in handler:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}