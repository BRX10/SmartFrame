echo "Deploying changes..."
# Pull changes from the live branch
git pull

# Shut down the existing containers
docker-compose -f docker-compose.prod.yml down

# Start the new containers
docker-compose -f docker-compose.prod.yml up --build -d
echo "Deployed!"