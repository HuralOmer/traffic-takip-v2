/**
 * PostgreSQL Database Adapter
 */

import { Pool } from 'pg';
import { 
  OLTPDatabaseAdapter, 
  ShopData, 
  Shop, 
  UserData, 
  User, 
  PlanData, 
  Plan, 
  ProductData, 
  Product 
} from '../interfaces/database.interface';

export class PostgreSQLAdapter implements OLTPDatabaseAdapter {
  private pool: Pool | null = null;
  private connected = false;

  constructor() {
    // PostgreSQL connection pool will be initialized in connect()
  }

  // DatabaseAdapter interface methods
  async connect(): Promise<void> {
    try {
      const connectionString = process.env['POSTGRESQL_URL'] || 
        `postgresql://${process.env['POSTGRESQL_USERNAME'] || 'hrl_user'}:${process.env['POSTGRESQL_PASSWORD'] || 'hrl_password'}@${process.env['POSTGRESQL_HOST'] || 'localhost'}:${process.env['POSTGRESQL_PORT'] || '5432'}/${process.env['POSTGRESQL_DATABASE'] || 'hrl_tracking'}`;
      
      this.pool = new Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(`PostgreSQL connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.connected = false;
  }

  async isConnected(): Promise<boolean> {
    if (!this.pool || !this.connected) {
      return false;
    }
    
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch {
      this.connected = false;
      return false;
    }
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const isConnected = await this.isConnected();
      return { 
        status: isConnected ? 'healthy' : 'unhealthy', 
        details: { 
          type: 'postgresql',
          connected: isConnected,
          poolSize: this.pool?.totalCount || 0
        } 
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: { 
          type: 'postgresql',
          error: error instanceof Error ? error.message : 'Unknown error'
        } 
      };
    }
  }

  // OLTPDatabaseAdapter interface methods - Shop operations
  async createShop(data: ShopData): Promise<Shop> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    const query = `
      INSERT INTO shops (domain, name, plan_id, settings, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, domain, name, plan_id, settings, created_at, updated_at
    `;
    
    const now = new Date();
    const values = [
      data.domain,
      data.name,
      data.plan_id,
      JSON.stringify(data.settings || {}),
      data.created_at || now,
      data.updated_at || now
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create shop: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getShop(_shopId: string): Promise<Shop | null> {
    throw new Error('Method not implemented.');
  }

  async updateShop(_shopId: string, _data: Partial<ShopData>): Promise<Shop> {
    throw new Error('Method not implemented.');
  }

  async deleteShop(_shopId: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  // User management
  async createUser(data: UserData): Promise<User> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    const query = `
      INSERT INTO users (email, name, shop_id, role, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, email, name, shop_id, role, created_at, updated_at
    `;
    
    const now = new Date();
    const values = [
      data.email,
      data.name,
      data.shop_id,
      data.role,
      data.created_at || now,
      data.updated_at || now
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUser(userId: string): Promise<User | null> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    const query = 'SELECT * FROM users WHERE id = $1';
    try {
      const result = await this.pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateUser(userId: string, data: Partial<UserData>): Promise<User> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.role !== undefined) {
      fields.push(`role = $${paramCount++}`);
      values.push(data.role);
    }
    
    fields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    values.push(userId);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Plan management
  async createPlan(data: PlanData): Promise<Plan> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    const query = `
      INSERT INTO plans (name, description, features, limits, price, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id, name, description, features, limits, price, created_at, updated_at
    `;
    
    const now = new Date();
    const values = [
      data.name,
      data.description,
      JSON.stringify(data.features || []),
      JSON.stringify(data.limits || {}),
      data.price,
      data.created_at || now,
      data.updated_at || now
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPlan(planId: string): Promise<Plan | null> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    const query = 'SELECT * FROM plans WHERE id = $1';
    try {
      const result = await this.pool.query(query, [planId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to get plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePlan(planId: string, data: Partial<PlanData>): Promise<Plan> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.features !== undefined) {
      fields.push(`features = $${paramCount++}`);
      values.push(JSON.stringify(data.features));
    }
    if (data.limits !== undefined) {
      fields.push(`limits = $${paramCount++}`);
      values.push(JSON.stringify(data.limits));
    }
    if (data.price !== undefined) {
      fields.push(`price = $${paramCount++}`);
      values.push(data.price);
    }
    
    fields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    values.push(planId);

    const query = `UPDATE plans SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Product management
  async createProduct(data: ProductData): Promise<Product> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    const query = `
      INSERT INTO products (shop_id, external_id, title, sku, price, status, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id, shop_id, external_id, title, sku, price, status, created_at, updated_at
    `;
    
    const now = new Date();
    const values = [
      data.shop_id,
      data.external_id,
      data.title,
      data.sku,
      data.price,
      data.status,
      data.created_at || now,
      data.updated_at || now
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getProduct(productId: string): Promise<Product | null> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    const query = 'SELECT * FROM products WHERE id = $1';
    try {
      const result = await this.pool.query(query, [productId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to get product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateProduct(productId: string, data: Partial<ProductData>): Promise<Product> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.sku !== undefined) {
      fields.push(`sku = $${paramCount++}`);
      values.push(data.sku);
    }
    if (data.price !== undefined) {
      fields.push(`price = $${paramCount++}`);
      values.push(data.price);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    
    fields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    values.push(productId);

    const query = `UPDATE products SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteProduct(productId: string): Promise<boolean> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    const query = 'DELETE FROM products WHERE id = $1';
    try {
      const result = await this.pool.query(query, [productId]);
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
