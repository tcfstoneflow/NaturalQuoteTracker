#!/bin/bash
# Automated backup script for Natural Stone Distribution CRM
# Usage: ./scripts/backup.sh [database|files|full]

set -e

# Configuration
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Create backup directories
create_backup_dirs() {
    mkdir -p "$BACKUP_DIR/database"
    mkdir -p "$BACKUP_DIR/files"
    mkdir -p "$BACKUP_DIR/logs"
}

# Database backup
backup_database() {
    log "Starting database backup..."
    
    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL environment variable not set"
        exit 1
    fi
    
    local backup_file="$BACKUP_DIR/database/db_backup_$TIMESTAMP.sql"
    
    # Create database dump
    pg_dump "$DATABASE_URL" > "$backup_file"
    
    # Compress the backup
    gzip "$backup_file"
    
    local final_file="${backup_file}.gz"
    local size=$(du -h "$final_file" | cut -f1)
    
    log "Database backup completed: $final_file ($size)"
}

# Files backup
backup_files() {
    log "Starting files backup..."
    
    local backup_file="$BACKUP_DIR/files/files_backup_$TIMESTAMP.tar.gz"
    
    # Backup important directories
    tar -czf "$backup_file" \
        --exclude="node_modules" \
        --exclude="dist" \
        --exclude="backups" \
        --exclude="*.log" \
        upload/ \
        src/ \
        shared/ \
        client/ \
        server/ \
        package*.json \
        tsconfig.json \
        README.md \
        2>/dev/null || true
    
    local size=$(du -h "$backup_file" | cut -f1)
    log "Files backup completed: $backup_file ($size)"
}

# Log backup
backup_logs() {
    log "Starting logs backup..."
    
    if [ -d "logs" ]; then
        local backup_file="$BACKUP_DIR/logs/logs_backup_$TIMESTAMP.tar.gz"
        tar -czf "$backup_file" logs/ 2>/dev/null || true
        
        local size=$(du -h "$backup_file" | cut -f1)
        log "Logs backup completed: $backup_file ($size)"
    else
        warn "Logs directory not found, skipping logs backup"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Database backups
    find "$BACKUP_DIR/database" -name "*.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # File backups
    find "$BACKUP_DIR/files" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Log backups
    find "$BACKUP_DIR/logs" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    log "Cleanup completed"
}

# Health check before backup
health_check() {
    log "Performing health check..."
    
    # Check if application is running
    if curl -f -s http://localhost:5000/health > /dev/null 2>&1; then
        log "Application health check passed"
    else
        warn "Application health check failed - continuing with backup"
    fi
    
    # Check database connectivity
    if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        log "Database connectivity check passed"
    else
        error "Database connectivity check failed"
        exit 1
    fi
}

# Send notification (if configured)
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$BACKUP_WEBHOOK_URL" ]; then
        curl -X POST "$BACKUP_WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{\"status\":\"$status\",\"message\":\"$message\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
             > /dev/null 2>&1 || true
    fi
}

# Main backup function
perform_backup() {
    local backup_type=${1:-full}
    
    log "Starting $backup_type backup process..."
    
    create_backup_dirs
    health_check
    
    case $backup_type in
        "database")
            backup_database
            ;;
        "files")
            backup_files
            backup_logs
            ;;
        "full")
            backup_database
            backup_files
            backup_logs
            ;;
        *)
            error "Invalid backup type: $backup_type"
            echo "Usage: $0 [database|files|full]"
            exit 1
            ;;
    esac
    
    cleanup_old_backups
    
    log "Backup process completed successfully"
    send_notification "success" "$backup_type backup completed at $TIMESTAMP"
}

# Error handling
trap 'error "Backup failed"; send_notification "error" "Backup failed at $TIMESTAMP"; exit 1' ERR

# Main execution
main() {
    # Load environment variables if .env exists
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi
    
    perform_backup "$1"
}

# Run main function
main "$@"