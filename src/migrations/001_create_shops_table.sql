-- Create shops table for storing Shopify app installations
CREATE TABLE IF NOT EXISTS shops (
    id SERIAL PRIMARY KEY,
    shop_domain VARCHAR(255) UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    shop_name VARCHAR(255),
    shop_email VARCHAR(255),
    shop_currency VARCHAR(10),
    shop_timezone VARCHAR(100),
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shops_domain ON shops(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shops_installed_at ON shops(installed_at);

-- Add comments
COMMENT ON TABLE shops IS 'Stores Shopify app installation data';
COMMENT ON COLUMN shops.shop_domain IS 'Shopify store domain (e.g., my-store.myshopify.com)';
COMMENT ON COLUMN shops.access_token IS 'Shopify OAuth access token';
COMMENT ON COLUMN shops.shop_name IS 'Store name from Shopify API';
COMMENT ON COLUMN shops.shop_email IS 'Store email from Shopify API';
COMMENT ON COLUMN shops.shop_currency IS 'Store currency from Shopify API';
COMMENT ON COLUMN shops.shop_timezone IS 'Store timezone from Shopify API';
COMMENT ON COLUMN shops.installed_at IS 'When the app was installed';
COMMENT ON COLUMN shops.updated_at IS 'Last update timestamp';
COMMENT ON COLUMN shops.created_at IS 'Record creation timestamp';
