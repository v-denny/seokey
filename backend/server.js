// File: seokey/backend/server.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const bcrypt = require('bcryptjs');
const jwt =require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(helmet());
app.use(express.json());

// --- MongoDB Connection ---
if (process.env.NODE_ENV !== 'test') {
    mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Successfully connected to MongoDB."))
    .catch(err => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });
}

// --- Mongoose Schemas ---
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model('User', UserSchema);

const KeywordListSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    keywords: { type: Array, required: true },
    createdAt: { type: Date, default: Date.now },
});
const KeywordList = mongoose.model('KeywordList', KeywordListSchema);

// --- Auth Middleware ---
const authMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ message: 'No token, authorization denied' });
    
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token is malformed' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// --- Helper Functions ---
const analyzeTextWithGemini = async (text) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const prompt = `Analyze the following webpage text. Identify the main topics and extract the top 15-20 most relevant keywords. For each keyword, classify it into one of the following categories: "Brand", "Product", "Feature", "Industry Term", "Long-tail Query", or "General Topic". Provide no other text, preamble, or explanation. Just the JSON. Webpage Text: "${text.substring(0, 30000)}"`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: { keyword: { type: "STRING" }, category: { type: "STRING" } }, required: ["keyword", "category"] } }
        }
    };
    try {
        const response = await axios.post(apiUrl, payload, { headers: { 'Content-Type': 'application/json' } });
        if (response.data?.candidates?.[0]) return response.data.candidates[0].content.parts[0].text;
        else throw new Error("Invalid response structure from AI model.");
    } catch (error) {
        console.error("Error calling Gemini API:", error.response ? error.response.data : error.message);
        throw new Error("Failed to analyze text with AI model.");
    }
};

const fetchKeywordMetrics = async (keywords) => {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
        console.warn("SERPAPI_API_KEY not found. Skipping metrics fetch.");
        return {};
    }
    const metricsMap = {};
    for (const keyword of keywords) {
        try {
            const params = { api_key: apiKey, engine: "google", q: keyword };
            const response = await axios.get('https://serpapi.com/search.json', { params });
            const data = response.data;
            const searchInfo = data?.search_information;
            const organicResults = data?.organic_results;
            const adWeight = (data?.ads?.length || 0) * 8;
            const resultsWeight = Math.log10(searchInfo?.total_results || 1) * 7;
            const difficulty = Math.min(100, Math.round(adWeight + resultsWeight));
            metricsMap[keyword] = {
                search_results: searchInfo?.total_results || null,
                difficulty: difficulty,
                top_competitor: organicResults?.[0]?.link ? new URL(organicResults[0].link).hostname : 'N/A',
            };
        } catch (error) {
            console.error(`Failed to fetch metrics for "${keyword}":`, error.message);
        }
    }
    return metricsMap;
};

// --- API Routes ---
app.post('/api/auth/register', async (req, res) => { /* ... */ });
app.post('/api/auth/login', async (req, res) => { /* ... */ });

app.post('/api/analyze-url', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    try {
        const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(html);
        $('script, style, nav, footer, aside').remove();
        const mainText = $('body').text().replace(/\s\s+/g, ' ').trim();
        if (!mainText) return res.status(404).json({ error: 'Could not extract text.' });
        const analysisResultString = await analyzeTextWithGemini(mainText);
        let keywordsWithCategories = JSON.parse(analysisResultString);
        const keywordStrings = keywordsWithCategories.map(k => k.keyword);
        const metrics = await fetchKeywordMetrics(keywordStrings);
        const enrichedData = keywordsWithCategories.map(item => ({
            ...item,
            ...(metrics[item.keyword] || { search_results: null, difficulty: null, top_competitor: 'N/A' }),
        }));
        res.status(200).json(enrichedData);
    } catch (error) {
        console.error(`Error in /api/analyze-url: ${error.message}`);
        res.status(500).json({ message: 'An error occurred while analyzing the URL.' });
    }
});

// ** NEW ** API Route for Manual Keyword Metrics
app.post('/api/keywords/metrics', async (req, res) => {
    const { keywords } = req.body;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return res.status(400).json({ message: 'Keywords array is required.' });
    }
    console.log(`Analyzing manual keywords: ${keywords.length} keywords`);
    try {
        const metrics = await fetchKeywordMetrics(keywords);
        
        const enrichedData = keywords.map(keyword => ({
            keyword: keyword,
            category: 'Manual', // Assign a default category
            ...(metrics[keyword] || { search_results: null, difficulty: null, top_competitor: 'N/A' }),
        }));
        
        res.status(200).json(enrichedData);
    } catch (error) {
        console.error(`Error in /api/keywords/metrics: ${error.message}`);
        res.status(500).json({ message: 'An error occurred while fetching keyword metrics.' });
    }
});

// --- List Routes (Now Protected) ---
app.post('/api/lists', authMiddleware, async (req, res) => { /* ... */ });
app.get('/api/lists', authMiddleware, async (req, res) => { /* ... */ });
app.get('/api/lists/:id', authMiddleware, async (req, res) => { /* ... */ });
app.delete('/api/lists/:id', authMiddleware, async (req, res) => { /* ... */ });

// --- Server Listener ---
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Backend server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
