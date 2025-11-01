import { FileAdapter } from './file-adapter';
import type { DatabaseAdapter } from './base-adapter';
import dotenv from 'dotenv';

dotenv.config();

const DB_TYPE = process.env.DB_TYPE || 'file';

export function createDatabaseAdapter(): DatabaseAdapter {
  switch (DB_TYPE) {
    case 'file':
      const dbPath = process.env.DB_FILE_PATH || './data/restaurant.db';
      return new FileAdapter(dbPath);
    
    case 'sql':
      // TODO: Implement PostgreSQL adapter
      throw new Error('PostgreSQL adapter not yet implemented. Use DB_TYPE=file for now.');
    
    case 'mongodb':
      // TODO: Implement MongoDB adapter
      throw new Error('MongoDB adapter not yet implemented. Use DB_TYPE=file for now.');
    
    default:
      throw new Error(`Unknown DB_TYPE: ${DB_TYPE}. Use 'file', 'sql', or 'mongodb'.`);
  }
}

export const db = createDatabaseAdapter();
