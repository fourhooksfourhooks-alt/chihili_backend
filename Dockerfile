# Use the official lightweight Node.js image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy the rest of the source code
COPY . .

# Expose the default Cloud Run port
EXPOSE 8080

# Start the app
CMD ["npm", "start"]


# For deploying to GCP Cloud Run
#gcloud builds submit --tag gcr.io/boreal-airway-433110-c0/chihili-backend
#gcloud run deploy --image gcr.io/boreal-airway-433110-c0/chihili-backend --platform managed