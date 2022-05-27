echo "Deploying changes..."
# Pull changes from the live branch
git pull

# Start the new containers
docker-compose -f docker-compose.prod.yml up --build -d
echo "Deployed!"