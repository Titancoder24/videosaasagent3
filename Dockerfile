FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Expose port
EXPOSE 5002

# Set environment variables
ENV PORT=5002
ENV NODE_ENV=production

# Start the server
CMD ["node", "app.js"]
