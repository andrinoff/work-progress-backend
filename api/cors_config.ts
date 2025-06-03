import cors from 'cors';
import util from 'util';

const allowedOrigins = [
    'https://work-progress-git-development-dreysekis-projects.vercel.app',
    'http://localhost:3000', // For local web dev
    'https://vswork-progress.vercel.app', // <<< The origin mentioned in the error
    'https://vswork-progress.vercel.app/account/github_handler.html', // Specific page
    'https://work-progress.github.io', // GitHub Pages

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
    console.error(`CORS Check: Blocking origin: ${origin}`);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
},
methods: ['POST', 'OPTIONS'], // Ensure OPTIONS is allowed
allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Ensure all headers sent by client are listed
credentials: false // Typically false for public APIs unless using cookies/sessions
};

const corsMiddleware = cors(corsOptions);

// --- End CORS Configuration

export const runCorsMiddleware = util.promisify(corsMiddleware);
