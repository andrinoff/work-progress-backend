// /Users/andrinoff/Documents/local github projects/vscode_extensions/work-progress/work-progress-backend/api/server.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import checkUserExists from "../database/check";
import saveToDatabase from "../database/save";
import getApi from "../database/getApi";
import { createTable } from '../database/connection';
import express from 'express';
import cors from 'cors';

// Call createTable once, potentially outside the handler if the environment allows,
// or ensure it's called reliably before any DB operations.
// For Vercel serverless, calling it at the start of the handler might be necessary,
// but understand it might run on every invocation.
// await createTable(); // This won't work here, needs to be inside async handler or managed differently.

export default async function handler(req: VercelRequest, res: VercelResponse) {
 // Import the cors middleware
// ... other imports (database functions, etc.)

const app = express();

// --- CORS Configuration ---
// Define the allowed origins. IMPORTANT: Include your frontend's Vercel URL!
const allowedOrigins = [
    'https://work-progress-git-development-dreysekis-projects.vercel.app',
    'http://localhost:3000', // Example for local frontend dev server
    'http://vswork-progress.vercel.app' // Main production URL
];

const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // or requests from whitelisted origins
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error(`CORS blocked origin: ${origin}`); // Log blocked origins for debugging
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET, POST', // Ensure OPTIONS and POST are allowed
  allowedHeaders: 'Content-Type', // Add any custom headers your frontend sends
  credentials: false // If you need to handle cookies or authorization headers
};

// --- Apply CORS Middleware ---
// IMPORTANT: This MUST come *before* your API routes definition!
app.use(cors(corsOptions));

// Optional but recommended: Handle OPTIONS requests explicitly for preflight checks
// This ensures preflight requests pass even if they don't match a specific route method like POST/GET
app.options('*', cors(corsOptions));
// --- End CORS Configuration ---


// --- Other Middleware ---
// Body parsing middleware (should generally come after CORS)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// --- End Other Middleware ---



    if (req.method === 'POST') {
        const { email, password, sign } = req.body;

        if (!email || !password || !sign) {
            // It's better practice to specify which field is missing if possible
            return res.status(400).json({ success: false, error: 'Missing required fields: email, password, or sign' });
        }

        if (sign === "in") {
            try {
                // getApi now returns null on error or not found/wrong password
                const apiKey = await getApi(email, password);

                if (apiKey) {
                    return res.status(200).json({ apiKey: apiKey });
                } else {
                    // Could be user not found or wrong password
                    return res.status(401).json({ success: false, error: 'Invalid credentials or user not found' });
                }
            } catch (error) {
                console.error('Error during sign in:', error);
                return res.status(500).json({ success: false, error: 'Database server error during sign in' });
            }
        } else if (sign === "up") {
            try {
                const exists = await checkUserExists(email); // Use await

                if (!exists) {
                    // Hash the password before saving (using bcrypt example)
                    // import bcrypt from 'bcrypt';
                    // const saltRounds = 10;
                    // const hashedPassword = await bcrypt.hash(password, saltRounds);
                    // const apiKey = await saveToDatabase(email, hashedPassword); // Save hashed password

                    // Using plain text password (INSECURE - for demonstration of flow only)
                    const apiKey = await saveToDatabase(email, password); // Use await

                    return res.status(201).json({ apiKey }); // Return success
                } else {
                    return res.status(409).json({ success: false, error: 'User already exists' });
                }
            } catch (error) {
                console.error('Error during sign up:', error);
                // Check if the error is the duplicate entry error, in case of race conditions
                if ((error as any).code === 'ER_DUP_ENTRY') {
                     return res.status(409).json({ success: false, error: 'User already exists (concurrent request?)' });
                }
                return res.status(500).json({ success: false, error: 'Database server error during sign up' });
            }
        } else {
            return res.status(400).json({ success: false, error: 'Invalid sign parameter value' });
        }

    } else {
        // Handle other methods like GET if needed, or return method not allowed
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

// Refactor createTable slightly to be awaitable (optional but good practice)
// In connection.ts:
/*

*/

