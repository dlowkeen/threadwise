import { Pool, PoolConfig } from "pg";
import { config } from "./config";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const dbUrl = config.database.url;

    const poolConfig: PoolConfig = {
      connectionString: dbUrl,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    pool = new Pool(poolConfig);

    pool.on("error", (err) => {
      console.error("Unexpected error on idle database client", err);
    });
  }

  return pool;
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const dbPool = getPool();
  try {
    const result = await dbPool.query(text, params);
    return result.rows as T[];
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

process.on("SIGINT", async () => {
  await closePool();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closePool();
  process.exit(0);
});
