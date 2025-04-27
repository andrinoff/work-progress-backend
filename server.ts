import checkUserExists from "./database/check";
import saveToDatabase from "./database/save";
import getApi from "./database/getApi";

export default async function handler(req, res) {
    const { method } = req;
    if (method === 'POST') {
        const { password, email, sign, api } = req.body;
        
        // Validate the input
        if (!password || !email || !sign) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (sign == "in") {
            const exists = checkUserExists(email);
            if (exists) {
                const apiKey = getApi(email, password);
                return res.status(200).json ({ success: true, apiKey: apiKey });
            } else {
                // Save the user to the database
                return res.error(200).json({ success: false, error: 'User does not exist' });
            }
        }
        if (sign == "up") {
            const exists = checkUserExists(email);
            if (!exists) {
                const apiKey = saveToDatabase(email, password);
                return res.status(400).json({ success: true, apiKey: apiKey });
            } else {
                return res.status(200).json({ success: true, error: 'User already exists' });
            }
        }
        return res.status(200).json({ success: true });
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    }