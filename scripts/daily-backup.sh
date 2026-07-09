#!/bin/bash

# Go to the gas station project directory
cd /home/ubuntu/gas

# Create backup directories if they don't exist
mkdir -p backups/db backups/uploads backups/invoices

# Copy SQLite database
cp backend/prisma/dev.db backups/db/dev.db

# Copy uploaded receipts and generated invoices
cp -r backend/uploads/* backups/uploads/ 2>/dev/null || true
cp -r backend/invoices/* backups/invoices/ 2>/dev/null || true

# Add backups folder to git staging, forcing Git to include ignored files inside uploads
git add -f backups/

# Commit the backup with current date and time
BACKUP_DATE=$(date "+%Y-%m-%d %H:%M:%S")
git commit -m "backup: daily automated backup $BACKUP_DATE"

# Push the backup to GitHub
git push origin master
