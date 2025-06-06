// Backend API route to handle getting emails from api keys requests

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runCorsMiddleware } from './cors_config';


export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // Run CORS middleware first. It will handle OPTIONS requests automatically.
        await runCorsMiddleware(req, res);


        if (req.method === 'POST') {
            return res.status(200).json({ success: true, message: 'received' });
    }
    else {
            // Log the error even if headers were sent, but don't try to send another response
            console.error('Invalid request method:', req.method);
        }} catch (error) {
                console.error('Error during sign-in:', error);
                return res.status(500).json({ success: false, error: 'something went wrong while signing in' });
        }
    }