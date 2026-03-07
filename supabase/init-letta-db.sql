-- Initialize Letta database with pgvector extension
-- This script runs automatically on container startup via docker-entrypoint-initdb.d

-- Create letta database
CREATE DATABASE letta;

-- Connect to letta database and enable pgvector
\c letta

-- Enable pgvector extension (required by Letta for embeddings)
CREATE EXTENSION IF NOT EXISTS vector;
