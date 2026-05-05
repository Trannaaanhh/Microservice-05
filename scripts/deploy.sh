#!/bin/bash
# deploy.sh - Main deployment script for Book Microservice Project

set -e

REGISTRY="${REGISTRY:-myregistry}"
ENVIRONMENT=$1
SERVICES=(auth-service book-service cart-service order-service pay-service ship-service api-gateway clothes-service customer-service comment-rate-service recommender-ai-service catalog-service manager-service staff-service)
CI_COMMIT_SHA="${CI_COMMIT_SHA:-$(git rev-parse --short HEAD)}"

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Display usage
usage() {
    echo "Usage: $0 {dev|staging|prod}"
    echo "  dev     - Deploy to development environment"
    echo "  staging - Deploy to staging environment"
    echo "  prod    - Deploy to production environment"
    exit 1
}

# Build and push Docker images
build_and_push() {
    log_info "Building and pushing Docker images..."
    
    for service in "${SERVICES[@]}"; do
        if [ ! -d "./$service" ]; then
            log_warn "Service directory ./$service not found, skipping..."
            continue
        fi
        
        if [ ! -f "./$service/Dockerfile" ]; then
            log_warn "Dockerfile not found for $service, skipping..."
            continue
        fi
        
        log_info "Building Docker image for $service..."
        docker build \
            -t $REGISTRY/$service:$CI_COMMIT_SHA \
            -t $REGISTRY/$service:latest \
            ./$service
        
        log_info "Pushing Docker image for $service..."
        docker push $REGISTRY/$service:$CI_COMMIT_SHA
        docker push $REGISTRY/$service:latest
    done
    
    log_info "All Docker images built and pushed successfully"
}

# Deploy to Dev environment
deploy_dev() {
    log_info "Deploying to Dev environment..."
    
    # Stop and remove existing containers
    docker-compose -f docker-compose.yml down || true
    
    # Start services
    log_info "Starting services with Docker Compose..."
    docker-compose -f docker-compose.yml up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 15
    
    # Run health checks
    run_health_checks
    
    # Run integration tests
    run_integration_tests_dev
    
    log_info "Dev deployment completed successfully"
    log_info "API Gateway is available at http://localhost:8000"
}

# Deploy to Staging environment
deploy_staging() {
    log_info "Deploying to Staging environment..."
    
    # Get staging server details
    STAGING_HOST="${STAGING_HOST:-staging.example.com}"
    STAGING_USER="${STAGING_USER:-ubuntu}"
    STAGING_KEY="${STAGING_KEY:-~/.ssh/staging-key}"
    
    log_info "Connecting to staging server: $STAGING_USER@$STAGING_HOST"
    
    # Deploy via SSH
    ssh -i "$STAGING_KEY" "$STAGING_USER@$STAGING_HOST" << EOFSH
        set -e
        cd ~/book-microservice
        
        echo "[INFO] Pulling latest Docker images..."
        docker-compose -f docker-compose.staging.yml pull
        
        echo "[INFO] Stopping existing services..."
        docker-compose -f docker-compose.staging.yml down || true
        
        echo "[INFO] Starting services..."
        docker-compose -f docker-compose.staging.yml up -d
        
        echo "[INFO] Waiting for services to be ready..."
        sleep 15
        
        echo "[INFO] Running health checks..."
        curl -f http://localhost:8000/health/ || exit 1
        
        echo "[INFO] Staging deployment completed successfully"
EOFSH
    
    log_info "Staging deployment completed"
}

# Deploy to Production (Blue-Green)
deploy_prod() {
    log_info "Deploying to Production using Blue-Green strategy..."
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Get current blue deployment version
    BLUE_VERSION=$(kubectl get deployment api-gateway-blue -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "unknown")
    log_info "Current blue (active) deployment: $BLUE_VERSION"
    
    # Create green deployment
    log_info "Creating green deployment with image: $REGISTRY/api-gateway:$CI_COMMIT_SHA"
    
    # Apply green deployment files
    kubectl apply -f k8s/blue-green/green-deployment.yaml
    
    # Update image for all services in green
    for service in "${SERVICES[@]}"; do
        log_info "Updating $service in green deployment..."
        kubectl set image deployment/${service}-green \
            ${service}=$REGISTRY/$service:$CI_COMMIT_SHA \
            --record || true
    done
    
    # Wait for green deployment to be ready
    log_info "Waiting for green deployment to be ready..."
    kubectl wait --for=condition=available --timeout=300s \
        deployment/api-gateway-green 2>/dev/null || {
        log_error "Green deployment failed to become ready"
        log_info "Rolling back..."
        kubectl delete deployment api-gateway-green
        exit 1
    }
    
    # Run health checks on green
    log_info "Running health checks on green deployment..."
    GREEN_POD=$(kubectl get pods -l app=api-gateway,version=green -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -z "$GREEN_POD" ]; then
        log_error "No green pod found"
        kubectl delete deployment api-gateway-green
        exit 1
    fi
    
    kubectl exec -it $GREEN_POD -- curl -f http://localhost:8000/health/ || {
        log_error "Health check failed on green deployment"
        kubectl delete deployment api-gateway-green
        exit 1
    }
    
    # Wait for user confirmation (in manual mode)
    if [ "$AUTO_APPROVE" != "true" ]; then
        log_warn "Green deployment is ready and healthy"
        read -p "Do you want to switch traffic to green? (yes/no) " confirm
        if [ "$confirm" != "yes" ]; then
            log_warn "Deployment cancelled. Rolling back..."
            kubectl delete deployment api-gateway-green
            exit 0
        fi
    fi
    
    # Switch traffic from blue to green
    log_info "Switching traffic from blue to green..."
    kubectl patch service api-gateway -p '{"spec":{"selector":{"version":"green"}}}'
    
    # Wait for connection draining
    log_info "Waiting for connection draining..."
    sleep 30
    
    # Cleanup old blue deployment
    log_info "Cleaning up blue deployment..."
    kubectl delete deployment api-gateway-blue || true
    
    # Rename green to blue for next deployment
    log_info "Renaming green to blue for next deployment..."
    kubectl label deployment api-gateway-green version=blue --overwrite
    kubectl patch service api-gateway -p '{"spec":{"selector":{"version":"blue"}}}'
    
    log_info "Production deployment completed successfully"
    
    # Run post-deployment tests
    run_smoke_tests_prod
}

# Health check function
run_health_checks() {
    log_info "Running health checks..."
    
    local services=(
        "http://api-gateway:8000/health/"
        "http://auth-service:8000/health/"
        "http://book-service:8000/health/"
        "http://cart-service:8000/health/"
        "http://order-service:8000/health/"
        "http://pay-service:8000/health/"
        "http://ship-service:8000/health/"
    )
    
    for service_url in "${services[@]}"; do
        log_info "Checking $service_url"
        if ! curl -f -s "$service_url" > /dev/null 2>&1; then
            log_error "Health check failed for $service_url"
            return 1
        fi
    done
    
    log_info "All health checks passed"
    return 0
}

# Integration tests for Dev
run_integration_tests_dev() {
    log_info "Running integration tests..."
    
    # Test book service
    log_info "Testing book-service..."
    curl -X GET http://localhost:8002/books/ || log_warn "Book service test failed"
    
    # Test auth service
    log_info "Testing auth-service..."
    RESPONSE=$(curl -X POST http://localhost:8010/auth/token/ \
        -H "Content-Type: application/json" \
        -d '{"username":"testuser","role":"customer"}')
    echo "$RESPONSE" | grep -q "access_token" || log_warn "Auth service test failed"
    
    log_info "Integration tests completed"
}

# Smoke tests for Production
run_smoke_tests_prod() {
    log_info "Running smoke tests on production..."
    
    # Get load balancer URL
    LB_URL=$(kubectl get svc api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    
    if [ -z "$LB_URL" ]; then
        log_warn "Could not get load balancer URL"
        return 0
    fi
    
    log_info "Testing load balancer: $LB_URL"
    
    # Test health endpoint
    if curl -f -s "http://$LB_URL/health/" > /dev/null; then
        log_info "Health check passed"
    else
        log_error "Health check failed"
        return 1
    fi
    
    log_info "Smoke tests completed"
}

# Main execution
if [ -z "$ENVIRONMENT" ]; then
    usage
fi

case "$ENVIRONMENT" in
    dev)
        build_and_push
        deploy_dev
        ;;
    staging)
        build_and_push
        deploy_staging
        ;;
    prod)
        build_and_push
        deploy_prod
        ;;
    *)
        log_error "Invalid environment: $ENVIRONMENT"
        usage
esac
