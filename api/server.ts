import type { VercelRequest, VercelResponse } from '@vercel/node';
import checkUserExists from "../database/check";
import saveToDatabase from "../database/save";
import getApi from "../database/getApi";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { email, password, sign } = req.body;

    if (!email || !password || !sign) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (sign === "in") {
      const exists = checkUserExists(email);
      if (exists) {
        const apiKey = getApi(email, password);
        return res.status(200).json({ success: true, apiKey });
      } else {
        return res.status(404).json({ success: false, error: 'User does not exist' });
      }
    }

    if (sign === "up") {
      const exists = checkUserExists(email);
      if (!exists) {
        const apiKey = saveToDatabase(email, password);
        return res.status(201).json({ success: true, apiKey });
      } else {
        return res.status(409).json({ success: false, error: 'User already exists' });
      }
    }

    return res.status(400).json({ error: 'Invalid sign value' });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}