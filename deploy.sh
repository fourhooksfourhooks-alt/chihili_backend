#!/bin/bash

# Fixed values from your commands
IMAGE="gcr.io/boreal-airway-433110-c0/chihili-backend"
SERVICE_NAME="chihili-backend"
REGION="us-central1"
ENV_FILE="env.yaml"

# Step 1: Build image
echo "🚀 Building image..."
gcloud builds submit --tag $IMAGE

# Step 2: Deploy image to Cloud Run
if [[ "$1" == "env" ]]; then
  echo "🚀 Deploying with env vars from $ENV_FILE..."
  gcloud run deploy $SERVICE_NAME \
    --image $IMAGE \
    --platform managed \
    --region $REGION \
    --env-vars-file $ENV_FILE
else
  echo "🚀 Deploying without updating env vars..."
  gcloud run deploy $SERVICE_NAME \
    --image $IMAGE \
    --platform managed \
    --region $REGION
fi

echo "✅ Deployment finished!"
