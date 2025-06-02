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

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

async function findBibFiles(directory) {
    let results = [];
    
    try {
      const items = await fs.readdir(directory);
      
      for (const item of items) {
        const fullPath = path.join(directory, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          // Recursively search subdirectories
          const subResults = await findBibFiles(fullPath);
          results = results.concat(subResults);
        } else if (path.extname(item) === '.bib') {
          // Add .bib files to results
          results.push(fullPath);
        }
      }
    } catch (err) {
      console.error(`Error searching in ${directory}:`, err);
    }
    
    return results;
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const fileid = makeid(5)
        const dir = path.join(__dirname, `uploads/${fileid}`);
        req.dir = dir;
        fs.mkdirSync(dir);
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
        
        const workDir = req.dir;
        const outputDir = path.join(__dirname, 'output');
        fs.ensureDirSync(outputDir);

        const baseName = path.parse(latexFile.filename).name;
        const outputPath = path.join(outputDir, `${baseName}.pdf`);

        // If there's a bibliography file, we need multiple compilation passes
        if (bibFile) {
            console.log("with bib")
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
            console.log("no bib")
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
            const bibFiles = await findBibFiles(workDir);
            if(bibFiles.length > 0){
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
            }
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