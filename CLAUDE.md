# Omniscience Project Instructions

## Infrastructure

- **Docker context is remote**: All Docker operations (docker-compose, docker build, docker exec) run on the remote server, not locally. The Docker context is already configured and active.

## Local Development

To start local development:
```bash
cp .env.local.dev .env.local
./startup.sh
```
- Local frontend: http://localhost:3000
- Remote frontend: http://66.42.117.148:3082
