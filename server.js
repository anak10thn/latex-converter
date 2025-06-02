const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const port = 50458;

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads');
        fs.ensureDirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

app.post('/convert', upload.fields([
    { name: 'latex', maxCount: 1 },
    { name: 'bib', maxCount: 1 }
]), async (req, res) => {
    try {
        if (!req.files['latex']) {
            return res.status(400).json({ error: 'No LaTeX file provided' });
        }

        const latexFile = req.files['latex'][0];
        const bibFile = req.files['bib'] ? req.files['bib'][0] : null;
        
        const workDir = path.join(__dirname, 'uploads');
        const outputDir = path.join(__dirname, 'output');
        fs.ensureDirSync(outputDir);

        const baseName = path.parse(latexFile.filename).name;
        const outputPath = path.join(outputDir, `${baseName}.pdf`);

        // If there's a bibliography file, we need multiple compilation passes
        if (bibFile) {
            await new Promise((resolve, reject) => {
                exec(`cd ${workDir} && pdflatex ${latexFile.filename} && bibtex ${baseName} && pdflatex ${latexFile.filename} && pdflatex ${latexFile.filename}`,
                    (error, stdout, stderr) => {
                        if (error) {
                            console.error('LaTeX Error:', error);
                            return reject(error);
                        }
                        resolve();
                    });
            });
        } else {
            // Single pass for documents without bibliography
            await new Promise((resolve, reject) => {
                exec(`cd ${workDir} && pdflatex ${latexFile.filename}`,
                    (error, stdout, stderr) => {
                        if (error) {
                            console.error('LaTeX Error:', error);
                            return reject(error);
                        }
                        resolve();
                    });
            });
        }

        // Move the generated PDF to output directory
        await fs.move(path.join(workDir, `${baseName}.pdf`), outputPath, { overwrite: true });

        // Clean up temporary files
        const extensions = ['.aux', '.log', '.bbl', '.blg', '.out'];
        for (const ext of extensions) {
            const tempFile = path.join(workDir, `${baseName}${ext}`);
            if (await fs.pathExists(tempFile)) {
                await fs.remove(tempFile);
            }
        }

        // Send the PDF file
        res.download(outputPath, `${baseName}.pdf`, async (err) => {
            if (err) {
                console.error('Download Error:', err);
            }
            // Clean up after sending
            await fs.remove(outputPath);
            await fs.remove(path.join(workDir, latexFile.filename));
            if (bibFile) {
                await fs.remove(path.join(workDir, bibFile.filename));
            }
        });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: 'Error converting LaTeX to PDF' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
});