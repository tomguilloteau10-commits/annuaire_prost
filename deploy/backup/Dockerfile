# Sauvegardes automatiques de VelvetGirl (base de données + photos + clés).
# Même version de PostgreSQL que la base (pg_dump compatible).
ARG BASE_IMAGE=postgis/postgis:16-3.4
FROM ${BASE_IMAGE}

# rclone : copie hors du serveur (stockage S3 compatible, Swiss Backup…).
ARG INSTALL_RCLONE=true
RUN if [ "$INSTALL_RCLONE" = "true" ]; then \
      apt-get update && apt-get install -y --no-install-recommends rclone ca-certificates \
      && rm -rf /var/lib/apt/lists/*; \
    fi

COPY backup.sh restore.sh scheduler.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh /usr/local/bin/scheduler.sh

ENTRYPOINT []
CMD ["scheduler.sh"]
