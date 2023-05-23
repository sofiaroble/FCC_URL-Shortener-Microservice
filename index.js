require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient } = require('mongodb');
const dns = require('dns');
const urlparser = require('url')
const validUrl = require('valid-url');

const client = new MongoClient(process.env.DB_URL);
const db = client.db("urlshortener");
const urls = db.collection("urls");

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



function validateURL(url) {
  return new Promise((resolve, reject) => {
    const hostname = new URL(url).hostname;
    dns.lookup(hostname, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}


app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.post('/api/shorturl', async function (req, res) {
  const { url } = req.body;

// Validate the URL format
  if (!validUrl.isWebUri(url)) {
    return res.json({ error: 'invalid url' });
  }

// Parse the URL and extract the hostname
  const { hostname } = urlparser.parse(url);

  try {
    // Perform a DNS lookup on the hostname
    await validateURL(url);
  } catch (error) {
    return res.json({ error: 'invalid url' });
  }

// Generate a short URL and save it in the database
  const count = await urls.countDocuments();
  const shortUrl = count + 1;
  await urls.insertOne({ original_url: url, short_url: shortUrl });

// Return the response with original_url and short_url properties
  res.json({ original_url: url, short_url: shortUrl });
});

app.get('/api/shorturl/:short_url', async function (req, res) {
  const { short_url } = req.params;

// Retrieve the original URL from the database based on the short URL
  const document = await urls.findOne({ short_url: parseInt(short_url) });

  if (!document) {
    return res.json({ error: 'invalid short url' });
  }

// Redirect to the original URL
  res.redirect(document.original_url);
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});