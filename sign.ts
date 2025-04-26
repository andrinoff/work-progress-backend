import checkUserExists from "./database/check";
import saveToDatabase from "./database/save";

export default async function handler(req, res) {

    const { method } = req;
    
    if (method === 'POST') {
        const { password, email, sign } = req.body;
    
        // Validate the input
        if (!password || !email) {
        return res.status(400).json({ error: 'All fields are required' });
        }
        if (sign == "in") {
            const exists = checkUserExists(email);
            if (exists) {
                return res.status(400).json({ error: 'User already exists' });
            } else {
                // Save the user to the database
                return res.status(200).json({ success: true });
            }
        }
        if (sign == "up") {
            const exists = checkUserExists(email);
            if (!exists) {
                return res.status(400).json({ error: 'User does not exist' });
            } else {
                // Save the user to the database
                const apiKey = saveToDatabase(email, password);
                return res.status(200).json({ success: true, apiKey: apiKey });
            }
        }
        
    
        return res.status(200).json({ success: true });
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    }