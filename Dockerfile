FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDeps for build)
RUN npm ci

# Copy source code
COPY . .

# Build server (CJS format)
RUN npm run server:build

# Verify build output is CJS
RUN head -1 server_dist/index.js | grep -q '"use strict"' && echo "✓ CJS build verified" || (echo "✗ Build is not CJS!" && exit 1)

# Remove devDependencies to shrink image
RUN npm prune --omit=dev

# Expose port
EXPOSE 5000

ENV NODE_ENV=production

CMD ["npm", "run", "server:prod"]
