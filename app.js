// Imports
const express = require("express");
const fs = require("fs");
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use("/css", express.static(path.join(__dirname, "public/css")));

// File paths
const filePaths = {
  tfIdf: path.join(__dirname, "txt/Vectorized_Documents.txt"),
  words: path.join(__dirname, "txt/Words.txt"),
  titles: path.join(__dirname, "txt/Title.txt"),
  links: path.join(__dirname, "txt/Links.txt")
};

// Load data
const vectorizedDocuments = loadVectorizedDocuments(filePaths.tfIdf);
const words = loadFile(filePaths.words);
const titles = loadFile(filePaths.titles);
const links = loadFile(filePaths.links);

// Routes
app.get("/", (req, res) => {
  res.render("index", { results: [] });
});

app.get("/search", (req, res) => {
  const searchTerm = req.query.q || "";
  const results = performSearch(searchTerm);
  res.render("index", { results });
});

// Start the server
app.listen(port, () => console.info(`My Server running on port ${port}`));

// Search functionality
function performSearch(searchTerm) {
  const query = searchTerm.toLowerCase().split(" ");
  const queryVector = vectorizeQuery(query, words);
  const similarityScores = calculateSimilarity(queryVector, vectorizedDocuments);
  const sortedIndices = getSortedDocumentIndices(similarityScores);
  return processResults(sortedIndices, titles, links);
}

// Vectorize the query
function vectorizeQuery(query, words) {
  return words.map(word => query.includes(word) ? 1 : 0);
}

// Calculate cosine similarity
function calculateSimilarity(queryVector, documentVectors) {
  return documentVectors.map(docVector => {
    const dotProd = dotProduct(queryVector, docVector);
    const magnitude1 = magnitude(queryVector);
    const magnitude2 = magnitude(docVector);
    return magnitude1 && magnitude2 ? dotProd / (magnitude1 * magnitude2) : 0;
  });
}

// Dot product of two vectors
function dotProduct(vector1, vector2) {
  return vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
}

// Magnitude of a vector
function magnitude(vector) {
  return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
}

// Sort document indices based on similarity scores
function getSortedDocumentIndices(similarityScores) {
  return similarityScores
    .map((score, index) => ({ score, index: index + 1 }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ index }) => index);
}

// Process results for rendering
function processResults(sortedIndices, titles, links) {
  return sortedIndices.map(index => ({
    title: titles[index - 1],
    link: links[index - 1]
  }));
}

// Load vectorized documents from file
function loadVectorizedDocuments(filePath) {
  return fs.readFileSync(filePath, "utf8").split("\n")
    .map(row => row.trim().split(" ").map(parseFloat));
}

// Load a file and return an array of lines
function loadFile(filePath) {
  return fs.readFileSync(filePath, "utf8").split("\n").map(line => line.trim());
}
