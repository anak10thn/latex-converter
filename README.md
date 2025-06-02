# LaTeX to PDF Converter API

A Node.js-based REST API service that converts LaTeX documents to PDF with BibTeX support.

## Features

- Convert LaTeX documents to PDF
- Support for BibTeX bibliography
- Automatic bibliography detection and processing
- Clean error handling and reporting
- Automatic cleanup of temporary files
- Secure file handling with isolated directories

## Prerequisites

- Node.js (v14 or higher)
- LaTeX distribution (TeX Live recommended)
- BibTeX

### Required LaTeX Packages
```bash
sudo apt-get install texlive-latex-base texlive-latex-extra texlive-bibtex-extra biber
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd latex-converter
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
node server.js
```

The server will start on port 50458 by default.

## API Endpoints

### Convert LaTeX to PDF
- **URL**: `/convert`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`

#### Request Parameters
| Field  | Type | Required | Description |
|--------|------|----------|-------------|
| latex  | File | Yes      | LaTeX source file (.tex) |
| bib    | File | No       | BibTeX bibliography file (.bib) |

#### Success Response
- **Content-Type**: `application/pdf`
- **Description**: Returns the generated PDF file

#### Error Response
- **Content-Type**: `application/json`
- **Structure**:
```json
{
    "error": "LaTeX compilation failed",
    "step": "Step where error occurred",
    "message": "Detailed error message",
    "details": {
        "stdout": "Compilation output",
        "stderr": "Error output"
    }
}
```

## Usage Examples

### Using cURL

1. Basic LaTeX document:
```bash
curl -X POST \
  -F "latex=@document.tex" \
  http://localhost:50458/convert \
  -o output.pdf
```

2. LaTeX with bibliography:
```bash
curl -X POST \
  -F "latex=@document.tex" \
  -F "bib=@references.bib" \
  http://localhost:50458/convert \
  -o output.pdf
```

### Example LaTeX Files

1. Simple LaTeX document (simple.tex):
```latex
\documentclass{article}
\begin{document}
Hello, World!
\end{document}
```

2. LaTeX document with bibliography (document.tex):
```latex
\documentclass{article}
\usepackage{cite}

\begin{document}
\section{Introduction}
This is a citation \cite{reference1}.

\bibliographystyle{plain}
\bibliography{references}
\end{document}
```

3. BibTeX file (references.bib):
```bibtex
@article{reference1,
    author = {John Doe},
    title = {Example Article},
    journal = {Journal Name},
    year = {2024},
    volume = {1},
    pages = {1-10}
}
```

## Error Handling

The service handles various types of errors:

1. Input Validation
- Missing LaTeX file
- Invalid file formats

2. LaTeX Compilation
- Syntax errors
- Missing packages
- Bibliography errors

3. File System
- File access errors
- Disk space issues

Each error response includes:
- The step where the error occurred
- A descriptive error message
- Compilation output (if available)

## Implementation Details

### File Processing
1. Files are uploaded to isolated directories
2. Each upload gets a unique directory
3. LaTeX compilation is done in multiple passes when bibliography is present
4. Temporary files are automatically cleaned up

### Bibliography Processing
1. Automatic detection of bibliography commands in LaTeX
2. Support for explicitly uploaded .bib files
3. Automatic search for .bib files in the working directory
4. Multiple LaTeX passes for proper citation processing

### Security Features
1. Isolated working directories for each upload
2. Automatic cleanup of temporary files
3. Non-interactive LaTeX compilation mode
4. File extension validation

## Development

### Project Structure
```
latex-converter/
├── server.js          # Main server file
├── package.json       # Node.js dependencies
├── uploads/           # Temporary upload directory
├── output/           # PDF output directory
└── README.md         # Documentation
```

### Key Functions

1. `makeid(length)`: Generates unique IDs for upload directories
2. `findBibFiles(directory)`: Recursively searches for .bib files
3. `runLatexCommand(command, description)`: Executes LaTeX commands with error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Troubleshooting

### Common Issues

1. **PDF Not Generated**
   - Check LaTeX installation
   - Verify file permissions
   - Check LaTeX syntax

2. **Bibliography Not Processed**
   - Verify .bib file format
   - Check citation commands
   - Ensure bibliography style is specified

3. **Server Errors**
   - Check disk space
   - Verify LaTeX installation
   - Check file permissions

### Debug Logs

The server logs all compilation steps and errors to the console. For detailed debugging:

```bash
node server.js > server.log 2>&1
```

Then check server.log for detailed error information.