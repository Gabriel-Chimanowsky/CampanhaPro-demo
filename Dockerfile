FROM node:20-alpine
LABEL version="1.0.3"
LABEL build_id="7c682c4"
ENV NODE_ENV=production

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Environment variables for build (optional now with local bridge)
ARG VITE_APP_URL
ENV VITE_APP_URL=$VITE_APP_URL

# Build frontend
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3001

# Run the unified server (serves frontend + api)
CMD ["npm", "start"]