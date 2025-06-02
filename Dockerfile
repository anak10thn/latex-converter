# Use Node.js LTS as base image
FROM node:20-slim

# Install required packages
RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-bibtex-extra \
    biber \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Create directories for uploads and output
RUN mkdir -p uploads output && \
    chmod 777 uploads output

# Expose the port
EXPOSE 50458

# Start the application
CMD ["node", "server.js"]