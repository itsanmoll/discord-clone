// Database Client - Drizzle + Bun + SQLite
// Optimized for performance and simplicity

import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import { schema } from './schema.js'

// Create SQLite database connection (Bun's built-in SQLite)
const sqlite = new Database('./discord.db')

// Create Drizzle instance
export const db = drizzle(sqlite, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
})

// Export everything from schema for easy imports
export * from './schema.js'

// Export the database instance for advanced queries
export { sqlite }

// Graceful shutdown
const cleanup = () => {
  console.log('Closing database connection...')
  sqlite.close()
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
process.on('beforeExit', cleanup)