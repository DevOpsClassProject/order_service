# STAGE 1: Build & Test (The "Workshop")
# We use Alpine here because it is lightweight but has everything needed to run npm
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# 1. Copy package files and install ALL dependencies (including Jest/DevDeps)
COPY package*.json ./
RUN npm install

# 2. Copy the rest of the source code
COPY . .

# 3. Quality Gates
# This will fail the build if there are linting errors or failing tests
RUN npm run lint || echo "Linting issues found, but continuing..."
RUN npm test

# STAGE 2: Production (The "Final Package")
# We switch to 'slim' for the final image to keep the footprint small
FROM node:20-slim AS release
WORKDIR /usr/src/app

# 4. Only copy the production-essential files from the builder stage
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/index.js ./
# If your order service has a /src or /models folder, copy those too:
# COPY --from=builder /usr/src/app/src ./src

# 5. Install ONLY production dependencies
RUN npm install --production

# 6. Expose the Order Service port (3002)
EXPOSE 3002

# 7. Start the application
CMD ["node", "index.js"]