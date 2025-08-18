// Database Client - Drizzle + PostgreSQL
// Using your existing PostgreSQL database

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from './schema.js'

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://anmol:admin@localhost:5432/discord_clone'

// Create PostgreSQL connection
const sql = postgres(DATABASE_URL)

// Create Drizzle instance
export const db = drizzle(sql, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
})

// Export everything from schema for easy imports
export * from './schema.js'

// Export the SQL instance for advanced queries
export { sql }

// Graceful shutdown
const cleanup = async () => {
  console.log('Closing database connection...')
  await sql.end({ timeout: 5_000 })
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
process.on('beforeExit', cleanup)