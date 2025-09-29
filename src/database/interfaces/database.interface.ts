/**
 * Database Interface - Abstract layer for database operations
 * 
 * This interface defines the contract for all database adapters
 * allowing seamless switching between different database types
 */

export interface DatabaseAdapter {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  
  // Health check
  healthCheck(): Promise<{ status: string; details: any }>;
}

export interface OLTPDatabaseAdapter extends DatabaseAdapter {
  // Application data operations
  createShop(data: ShopData): Promise<Shop>;
  getShop(shopId: string): Promise<Shop | null>;
  updateShop(shopId: string, data: Partial<ShopData>): Promise<Shop>;
  deleteShop(shopId: string): Promise<boolean>;
  
  // User management
  createUser(data: UserData): Promise<User>;
  getUser(userId: string): Promise<User | null>;
  updateUser(userId: string, data: Partial<UserData>): Promise<User>;
  
  // Plan management
  createPlan(data: PlanData): Promise<Plan>;
  getPlan(planId: string): Promise<Plan | null>;
  updatePlan(planId: string, data: Partial<PlanData>): Promise<Plan>;
  
  // Product management
  createProduct(data: ProductData): Promise<Product>;
  getProduct(productId: string): Promise<Product | null>;
  updateProduct(productId: string, data: Partial<ProductData>): Promise<Product>;
  deleteProduct(productId: string): Promise<boolean>;
}

export interface OLAPDatabaseAdapter extends DatabaseAdapter {
  // Analytics data operations
  createEvent(data: EventData): Promise<Event>;
  createEvents(events: EventData[]): Promise<Event[]>;
  
  // Analytics queries
  getSessionAnalytics(shopId: string, filters: AnalyticsFilters): Promise<SessionAnalytics>;
  getPageViewAnalytics(shopId: string, filters: AnalyticsFilters): Promise<PageViewAnalytics>;
  getConversionAnalytics(shopId: string, filters: AnalyticsFilters): Promise<ConversionAnalytics>;
  
  // Real-time metrics
  getActiveUsers(shopId: string): Promise<number>;
  getActiveCarts(shopId: string): Promise<number>;
  getAddToCartCount(shopId: string): Promise<number>;
  
  // Aggregated data
  getHourlyMetrics(shopId: string, date: Date): Promise<HourlyMetrics>;
  getDailyMetrics(shopId: string, date: Date): Promise<DailyMetrics>;
  getMonthlyMetrics(shopId: string, date: Date): Promise<MonthlyMetrics>;
}

export interface CacheDatabaseAdapter extends DatabaseAdapter {
  // Presence tracking
  setPresence(key: string, data: any, ttl?: number): Promise<void>;
  getPresence(key: string): Promise<any>;
  deletePresence(key: string): Promise<boolean>;
  
  // Real-time counters
  incrementCounter(key: string, value?: number): Promise<number>;
  decrementCounter(key: string, value?: number): Promise<number>;
  getCounter(key: string): Promise<number>;
  setCounter(key: string, value: number, ttl?: number): Promise<void>;
  
  // Rate limiting
  checkRateLimit(key: string, limit: number, window: number): Promise<boolean>;
  incrementRateLimit(key: string, window: number): Promise<number>;
  
  // Pub/Sub
  publish(channel: string, message: any): Promise<void>;
  subscribe(channel: string, callback: (message: any) => void): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
}

// Data Types
export interface ShopData {
  domain: string;
  name: string;
  plan_id: string;
  settings: any;
  created_at?: Date;
  updated_at?: Date;
}

export interface Shop {
  id: string;
  domain: string;
  name: string;
  plan_id: string;
  settings: any;
  created_at: Date;
  updated_at: Date;
}

export interface UserData {
  email: string;
  name: string;
  shop_id: string;
  role: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  shop_id: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface PlanData {
  name: string;
  description: string;
  features: string[];
  limits: any;
  price: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  features: string[];
  limits: any;
  price: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProductData {
  shop_id: string;
  external_id: string;
  title: string;
  sku: string;
  price: number;
  status: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Product {
  id: string;
  shop_id: string;
  external_id: string;
  title: string;
  sku: string;
  price: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface EventData {
  shop_id: string;
  user_id: string;
  session_id: string;
  event_type: string;
  event_data: any;
  timestamp: Date;
  page_url?: string;
  referrer?: string;
  user_agent?: string;
  ip_hash?: string;
  consent?: boolean;
}

export interface Event {
  id: string;
  shop_id: string;
  user_id: string;
  session_id: string;
  event_type: string;
  event_data: any;
  timestamp: Date;
  page_url?: string;
  referrer?: string;
  user_agent?: string;
  ip_hash?: string;
  consent?: boolean;
}

export interface AnalyticsFilters {
  start_date: Date;
  end_date: Date;
  shop_id?: string;
  event_types?: string[];
  user_ids?: string[];
  session_ids?: string[];
}

export interface SessionAnalytics {
  total_sessions: number;
  unique_users: number;
  avg_session_duration: number;
  bounce_rate: number;
  conversion_rate: number;
}

export interface PageViewAnalytics {
  total_page_views: number;
  unique_pages: number;
  avg_time_on_page: number;
  top_pages: Array<{ page: string; views: number }>;
}

export interface ConversionAnalytics {
  total_conversions: number;
  conversion_rate: number;
  funnel_steps: Array<{ step: string; count: number; rate: number }>;
}

export interface HourlyMetrics {
  hour: string;
  page_views: number;
  sessions: number;
  unique_users: number;
  conversions: number;
  revenue: number;
}

export interface DailyMetrics {
  date: string;
  page_views: number;
  sessions: number;
  unique_users: number;
  conversions: number;
  revenue: number;
}

export interface MonthlyMetrics {
  month: string;
  page_views: number;
  sessions: number;
  unique_users: number;
  conversions: number;
  revenue: number;
}
