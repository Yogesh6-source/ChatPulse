FROM node:20-alpine

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Expose backend port
EXPOSE 10000

ENV PORT=10000
ENV NODE_ENV=production

CMD ["npm", "start"]
