/**
 * ClickHouse Database Adapter
 */

import { ClickHouse } from 'clickhouse';
import { 
  OLAPDatabaseAdapter, 
  EventData, 
  Event, 
  AnalyticsFilters,
  SessionAnalytics,
  PageViewAnalytics,
  ConversionAnalytics,
  HourlyMetrics,
  DailyMetrics,
  MonthlyMetrics
} from '../interfaces/database.interface';

export class ClickHouseAdapter implements OLAPDatabaseAdapter {
  private client: any;
  private connected = false;

  constructor() {
    // ClickHouse client will be initialized in connect()
  }

  // DatabaseAdapter interface methods
  async connect(): Promise<void> {
    try {
      const host = process.env['CLICKHOUSE_HOST'] || 'localhost';
      const port = parseInt(process.env['CLICKHOUSE_PORT'] || '8123');
      const username = process.env['CLICKHOUSE_USERNAME'] || 'default';
      const password = process.env['CLICKHOUSE_PASSWORD'] || '';
      const database = process.env['CLICKHOUSE_DATABASE'] || 'default';

      this.client = new ClickHouse({
        host: `http://${host}:${port}`,
        username,
        password,
        database,
        requestTimeout: 30000,
        maxOpenConnections: 10,
      });

      // Test connection
      await this.client.query('SELECT 1');
      
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(`ClickHouse connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    this.connected = false;
  }

  async isConnected(): Promise<boolean> {
    if (!this.client || !this.connected) {
      return false;
    }
    
    try {
      await this.client.query('SELECT 1');
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
          type: 'clickhouse',
          connected: isConnected
        } 
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: { 
          type: 'clickhouse',
          error: error instanceof Error ? error.message : 'Unknown error'
        } 
      };
    }
  }

  // OLAPDatabaseAdapter interface methods
  async createEvent(data: EventData): Promise<Event> {
    if (!this.client) {
      throw new Error('ClickHouse not connected');
    }

    const query = `
      INSERT INTO events (
        shop_id, user_id, session_id, event_type, event_data, 
        timestamp, page_url, referrer, user_agent, ip_hash, consent
      ) VALUES (
        {shop_id:String}, {user_id:String}, {session_id:String}, {event_type:String}, 
        {event_data:String}, {timestamp:DateTime64}, {page_url:String}, 
        {referrer:String}, {user_agent:String}, {ip_hash:String}, {consent:UInt8}
      )
    `;

    const params = {
      shop_id: data.shop_id,
      user_id: data.user_id,
      session_id: data.session_id,
      event_type: data.event_type,
      event_data: JSON.stringify(data.event_data),
      timestamp: data.timestamp,
      page_url: data.page_url || '',
      referrer: data.referrer || '',
      user_agent: data.user_agent || '',
      ip_hash: data.ip_hash || '',
      consent: data.consent ? 1 : 0
    };

    try {
      await this.client.insert({ query, params });
      
      // Return the event with a generated ID
      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...data
      } as Event;
    } catch (error) {
      throw new Error(`Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createEvents(events: EventData[]): Promise<Event[]> {
    if (!this.client) {
      throw new Error('ClickHouse not connected');
    }

    const results: Event[] = [];
    for (const eventData of events) {
      const event = await this.createEvent(eventData);
      results.push(event);
    }
    return results;
  }

  async getSessionAnalytics(shopId: string, filters: AnalyticsFilters): Promise<SessionAnalytics> {
    if (!this.client) {
      throw new Error('ClickHouse not connected');
    }

    const query = `
      SELECT 
        count(DISTINCT session_id) as total_sessions,
        count(DISTINCT user_id) as unique_users,
        avg(session_duration) as avg_session_duration,
        countIf(bounce = 1) / count(*) as bounce_rate,
        countIf(conversion = 1) / count(*) as conversion_rate
      FROM sessions 
      WHERE shop_id = {shop_id:String}
        AND timestamp >= {start_date:DateTime}
        AND timestamp <= {end_date:DateTime}
    `;

    const params = {
      shop_id: shopId,
      start_date: filters.start_date,
      end_date: filters.end_date
    };

    try {
      const result = await this.client.query({ query, params });
      const data = result.data[0];
      
      return {
        total_sessions: data.total_sessions || 0,
        unique_users: data.unique_users || 0,
        avg_session_duration: data.avg_session_duration || 0,
        bounce_rate: data.bounce_rate || 0,
        conversion_rate: data.conversion_rate || 0
      };
    } catch (error) {
      throw new Error(`Failed to get session analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPageViewAnalytics(shopId: string, filters: AnalyticsFilters): Promise<PageViewAnalytics> {
    if (!this.client) {
      throw new Error('ClickHouse not connected');
    }

    const query = `
      SELECT 
        count(*) as total_page_views,
        count(DISTINCT page_url) as unique_pages,
        avg(time_on_page) as avg_time_on_page,
        page_url,
        count(*) as views
      FROM page_views 
      WHERE shop_id = {shop_id:String}
        AND timestamp >= {start_date:DateTime}
        AND timestamp <= {end_date:DateTime}
      GROUP BY page_url
      ORDER BY views DESC
      LIMIT 10
    `;

    const params = {
      shop_id: shopId,
      start_date: filters.start_date,
      end_date: filters.end_date
    };

    try {
      const result = await this.client.query({ query, params });
      const data = result.data;
      
      const total_page_views = data.reduce((sum: number, row: any) => sum + row.views, 0);
      const unique_pages = data.length;
      const avg_time_on_page = data.reduce((sum: number, row: any) => sum + (row.avg_time_on_page || 0), 0) / data.length;
      const top_pages = data.map((row: any) => ({ page: row.page_url, views: row.views }));

      return {
        total_page_views,
        unique_pages,
        avg_time_on_page: avg_time_on_page || 0,
        top_pages
      };
    } catch (error) {
      throw new Error(`Failed to get page view analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getConversionAnalytics(shopId: string, filters: AnalyticsFilters): Promise<ConversionAnalytics> {
    if (!this.client) {
      throw new Error('ClickHouse not connected');
    }

    const query = `
      SELECT 
        countIf(event_type = 'conversion') as total_conversions,
        countIf(event_type = 'conversion') / count(*) as conversion_rate,
        event_type,
        count(*) as count
      FROM events 
      WHERE shop_id = {shop_id:String}
        AND timestamp >= {start_date:DateTime}
        AND timestamp <= {end_date:DateTime}
        AND event_type IN ('view', 'add_to_cart', 'checkout', 'conversion')
      GROUP BY event_type
    `;

    const params = {
      shop_id: shopId,
      start_date: filters.start_date,
      end_date: filters.end_date
    };

    try {
      const result = await this.client.query({ query, params });
      const data = result.data;
      
      const total_conversions = data.find((row: any) => row.event_type === 'conversion')?.count || 0;
      const total_events = data.reduce((sum: number, row: any) => sum + row.count, 0);
      const conversion_rate = total_events > 0 ? total_conversions / total_events : 0;
      
      const funnel_steps = data.map((row: any) => ({
        step: row.event_type,
        count: row.count,
        rate: total_events > 0 ? row.count / total_events : 0
      }));

      return {
        total_conversions,
        conversion_rate,
        funnel_steps
      };
    } catch (error) {
      throw new Error(`Failed to get conversion analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getActiveUsers(shopId: string): Promise<number> {
    if (!this.client) {
      throw new Error('ClickHouse not connected');
    }

    const query = `
      SELECT count(DISTINCT user_id) as active_users
      FROM events 
      WHERE shop_id = {shop_id:String}
        AND timestamp >= now() - INTERVAL 5 MINUTE
    `;

    try {
      const result = await this.client.query({ query, params: { shop_id: shopId } });
      return result.data[0]?.active_users || 0;
    } catch (error) {
      throw new Error(`Failed to get active users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getActiveCarts(shopId: string): Promise<number> {
    if (!this.client) {
      throw new Error('ClickHouse not connected');
    }

    const query = `
      SELECT count(DISTINCT session_id) as active_carts
      FROM events 
      WHERE shop_id = {shop_id:String}
        AND event_type = 'add_to_cart'
        AND timestamp >= now() - INTERVAL 30 MINUTE
    `;

    try {
      const result = await this.client.query({ query, params: { shop_id: shopId } });
      return result.data[0]?.active_carts || 0;
    } catch (error) {
      throw new Error(`Failed to get active carts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAddToCartCount(shopId: string): Promise<number> {
    if (!this.client) {
      throw new Error('ClickHouse not connected');
    }

    const query = `
      SELECT count(*) as add_to_cart_count
      FROM events 
      WHERE shop_id = {shop_id:String}
        AND event_type = 'add_to_cart'
        AND timestamp >= now() - INTERVAL 1 HOUR
    `;

    try {
      const result = await this.client.query({ query, params: { shop_id: shopId } });
      return result.data[0]?.add_to_cart_count || 0;
    } catch (error) {
      throw new Error(`Failed to get add to cart count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getHourlyMetrics(shopId: string, date: Date): Promise<HourlyMetrics> {
    if (!this.client) {
      throw new Error('ClickHouse not connected');
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = `
      SELECT 
        formatDateTime(timestamp, '%H:00') as hour,
        countIf(event_type = 'page_view') as page_views,
        count(DISTINCT session_id) as sessions,
        count(DISTINCT user_id) as unique_users,
        countIf(event_type = 'conversion') as conversions,
        sumIf(event_data.revenue, event_type = 'conversion') as revenue
      FROM events 
      WHERE shop_id = {shop_id:String}
        AND timestamp >= {start_date:DateTime}
        AND timestamp <= {end_date:DateTime}
      GROUP BY hour
      ORDER BY hour
    `;

    const params = {
      shop_id: shopId,
      start_date: startOfDay,
      end_date: endOfDay
    };

    try {
      const result = await this.client.query({ query, params });
      const data = result.data;
      
      // Aggregate hourly data into single metrics object
      const total_page_views = data.reduce((sum: number, row: any) => sum + row.page_views, 0);
      const total_sessions = data.reduce((sum: number, row: any) => sum + row.sessions, 0);
      const total_unique_users = data.reduce((sum: number, row: any) => sum + row.unique_users, 0);
      const total_conversions = data.reduce((sum: number, row: any) => sum + row.conversions, 0);
      const total_revenue = data.reduce((sum: number, row: any) => sum + (row.revenue || 0), 0);

      return {
        hour: date.toISOString().split('T')[0], // Return date as hour identifier
        page_views: total_page_views,
        sessions: total_sessions,
        unique_users: total_unique_users,
        conversions: total_conversions,
        revenue: total_revenue
      };
    } catch (error) {
      throw new Error(`Failed to get hourly metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDailyMetrics(shopId: string, date: Date): Promise<DailyMetrics> {
    if (!this.client) {
      throw new Error('ClickHouse not connected');
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = `
      SELECT 
        countIf(event_type = 'page_view') as page_views,
        count(DISTINCT session_id) as sessions,
        count(DISTINCT user_id) as unique_users,
        countIf(event_type = 'conversion') as conversions,
        sumIf(event_data.revenue, event_type = 'conversion') as revenue
      FROM events 
      WHERE shop_id = {shop_id:String}
        AND timestamp >= {start_date:DateTime}
        AND timestamp <= {end_date:DateTime}
    `;

    const params = {
      shop_id: shopId,
      start_date: startOfDay,
      end_date: endOfDay
    };

    try {
      const result = await this.client.query({ query, params });
      const data = result.data[0];

      return {
        date: date.toISOString().split('T')[0],
        page_views: data.page_views || 0,
        sessions: data.sessions || 0,
        unique_users: data.unique_users || 0,
        conversions: data.conversions || 0,
        revenue: data.revenue || 0
      };
    } catch (error) {
      throw new Error(`Failed to get daily metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMonthlyMetrics(shopId: string, date: Date): Promise<MonthlyMetrics> {
    if (!this.client) {
      throw new Error('ClickHouse not connected');
    }

    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    const query = `
      SELECT 
        countIf(event_type = 'page_view') as page_views,
        count(DISTINCT session_id) as sessions,
        count(DISTINCT user_id) as unique_users,
        countIf(event_type = 'conversion') as conversions,
        sumIf(event_data.revenue, event_type = 'conversion') as revenue
      FROM events 
      WHERE shop_id = {shop_id:String}
        AND timestamp >= {start_date:DateTime}
        AND timestamp <= {end_date:DateTime}
    `;

    const params = {
      shop_id: shopId,
      start_date: startOfMonth,
      end_date: endOfMonth
    };

    try {
      const result = await this.client.query({ query, params });
      const data = result.data[0];

      return {
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        page_views: data.page_views || 0,
        sessions: data.sessions || 0,
        unique_users: data.unique_users || 0,
        conversions: data.conversions || 0,
        revenue: data.revenue || 0
      };
    } catch (error) {
      throw new Error(`Failed to get monthly metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
