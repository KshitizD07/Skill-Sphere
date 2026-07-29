FROM node:22-alpine

LABEL maintainer="Kshitiz Dixit"
LABEL project="SkillSphere Backend"

# Install system dependencies needed for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching
COPY --chown=node:node package*.json ./

# Install clean, production-ready dependencies
RUN npm ci

# Copy the rest of the application source code with node user ownership
COPY --chown=node:node . .

# Generate Prisma client
RUN npm run db:generate

# Expose backend port (as configured in server.js/pm2.config)
EXPOSE 5001

# Run the container as the non-root 'node' user for security
USER node

# Start the application
CMD ["npm", "start"]
