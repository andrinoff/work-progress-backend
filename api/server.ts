import type { VercelRequest, VercelResponse } from '@vercel/node';
import checkUserExists from "../database/check";
import saveToDatabase from "../database/save";
import getApi from "../database/getApi";


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { email, password, sign } = req.body;
    // return res.status(200).json({ email, password, sign });
    if (!email || !password || !sign) {
      return res.status(400).json({email, password, sign});
    }

    if (sign === "in") {
        try {
            const exists = await checkUserExists(email);
            // return res.status(200).json({ success: exists });
            if (exists) {
            try {
                const apiKey = await getApi(email, password);
                return res.status(200).json({ apiKey });
                
            }catch(error){
                console.error('Error getting API key:', error);
                return res.status(500).json({ success: false, error: 'database server error' });
            }
        } else {
            return res.status(404).json({ success: false, error: 'User does not exist' });
        }
    }catch (error) { 
        console.log('Error checking user existence:', error); 
    }
        
    }

    else if (sign === "up") {
        
      const exists = checkUserExists(email); // Doesnt break here
      if (!exists) {
        const apiKey = await saveToDatabase(email, password, );
        return res.status(201).json({ apiKey });
      } 
    // else {
    //     return res.status(409).json({ success: false, error: 'User already exists' });
    //   }
    }
    else{
    return res.status(400).json({ error: 'Invalid sign value' });
}
  } 
    else {
    return res.status(405).json({ error: 'Method not allowed' });
    }
}
