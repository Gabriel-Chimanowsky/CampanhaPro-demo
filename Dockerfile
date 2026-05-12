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

# Environment variables for build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build frontend
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3005

# Use tsx for simplicity in this version, or change to node if using tsc
CMD ["npm", "run", "server"]