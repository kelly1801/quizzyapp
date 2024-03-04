const express = require('express');
const multer = require('multer');
const mammoth = require('mammoth');

const app = express();
const port = 3000;

// Multer configuration for file upload
const upload = multer({ dest: 'uploads/' });

// Function to read the Word file
async function readWordFile(filePath) {
    const { value } = await mammoth.extractRawText({ path: filePath });
    return value;
}

// Function to extract questions from the Word file content
async function extractQuestions(content) {
    const questions = [];
    const questionRegex = /(\d+)\.\s(.*?)(\*[a-z]\.\s.*?)(?=\d+\.\s|$)/gis;

    let match;
    while ((match = questionRegex.exec(content)) !== null) {
        const [, questionNumber, questionText, answersText] = match;
        const answers = answersText.split('\n').map(answer => answer.trim()).filter(Boolean);
        const correctAnswerIndex = answers.findIndex(answer => answer.startsWith('*'));
        const correctAnswer = correctAnswerIndex !== -1 ? answers[correctAnswerIndex].substring(2).trim() : null;

        questions.push({
            question: `${questionNumber}. ${questionText.trim()}`,
            answers: answers,
            correctAnswer: correctAnswer
        });
    }

    return questions;
}

// Function to randomly select n questions from an array
function selectRandomQuestions(questions, n) {
    const shuffledQuestions = questions.sort(() => Math.random() - 0.5); // Shuffle the array
    return shuffledQuestions.slice(0, n); // Return the first n questions
}

// Function to check the answer and update score
function checkAnswer(question, userAnswer, score) {
    if (userAnswer === question.correctAnswer) {
        score++;
    }
    return score;
}

// Store questions on the server
let questions = [];

// API endpoint to handle file upload and store questions
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded');
        }
        
        // Extract questions from the Word file
        const filePath = req.file.path;
        const content = await readWordFile(filePath);
        questions = await extractQuestions(content);

        res.json({ message: 'Questions uploaded successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});

// API endpoint to handle user responses and check answers at the end
app.post('/submit', (req, res) => {
    try {
        // Extract user responses from the request
        const userAnswers = req.body.answers;

        // Check user answers and calculate score
        let score = 0;
        questions.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            if (userAnswer === question.correctAnswer) {
                score++;
            }
        });

        // Determine if the user passes or fails based on the threshold
        const passThreshold = 38;
        const result = score >= passThreshold ? 'pass' : 'fail';

        // Return the score and result to the frontend
        res.json({ score, result });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});