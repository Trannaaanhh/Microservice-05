#!/bin/bash
# rollback.sh - Rollback deployment script

set -e

TARGET_VERSION=$1
CURRENT_ENVIRONMENT="${ENVIRONMENT:-prod}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

usage() {
    echo "Usage: $0 <version>"
    echo "  version - Docker image version to rollback to (e.g., v1.0.0)"
    echo ""
    echo "Example:"
    echo "  $0 v1.0.0"
    exit 1
}

# Validate kubectl connection
if ! kubectl cluster-info &> /dev/null; then
    log_error "Cannot connect to Kubernetes cluster"
    exit 1
fi

# Get target version
if [ -z "$TARGET_VERSION" ]; then
    usage
fi

log_warn "=== ROLLBACK OPERATION ==="
log_info "Target version: $TARGET_VERSION"
log_info "Current environment: $CURRENT_ENVIRONMENT"

# Show current deployments
log_info "Current deployments:"
kubectl get deployments -o wide

read -p "Are you sure you want to rollback to $TARGET_VERSION? (yes/no) " confirm
if [ "$confirm" != "yes" ]; then
    log_warn "Rollback cancelled"
    exit 0
fi

# Rollback for each service
SERVICES=(auth-service book-service cart-service order-service pay-service ship-service api-gateway)
REGISTRY="${REGISTRY:-myregistry}"

log_info "Starting rollback process..."

for service in "${SERVICES[@]}"; do
    log_info "Rolling back $service to $TARGET_VERSION..."
    
    # Get current deployment name
    DEPLOYMENT=$(kubectl get deployment -l app=$service -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -z "$DEPLOYMENT" ]; then
        log_warn "No deployment found for $service, skipping..."
        continue
    fi
    
    # Update image to target version
    kubectl set image deployment/$DEPLOYMENT \
        $service=$REGISTRY/$service:$TARGET_VERSION \
        --record
    
    # Wait for rollout to complete
    kubectl rollout status deployment/$DEPLOYMENT --timeout=300s
done

log_info "Rollback to $TARGET_VERSION completed successfully"
log_info "Running health checks..."

# Health checks
sleep 10
for service in "${SERVICES[@]}"; do
    DEPLOYMENT=$(kubectl get deployment -l app=$service -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$DEPLOYMENT" ]; then
        if kubectl rollout status deployment/$DEPLOYMENT --timeout=60s > /dev/null; then
            log_info "✓ $service is healthy"
        else
            log_error "✗ $service is not healthy"
        fi
    fi
done

log_info "Rollback operation completed"
