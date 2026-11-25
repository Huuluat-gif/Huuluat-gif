import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
import { getSQL } from '../lib/db';
async function main(){const sql=getSQL();const statements=[
`CREATE TABLE IF NOT EXISTS lowf_payment_config(version uuid PRIMARY KEY,is_active boolean NOT NULL DEFAULT false,mode text NOT NULL CHECK(mode IN ('disabled','sandbox','production')),tmn_code text NOT NULL DEFAULT '',secret_cipher text,shipping_fee_vnd integer NOT NULL DEFAULT 0 CHECK(shipping_fee_vnd BETWEEN 0 AND 1000000),created_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`,
`CREATE UNIQUE INDEX IF NOT EXISTS lowf_payment_config_active ON lowf_payment_config(is_active) WHERE is_active=true`,
`CREATE TABLE IF NOT EXISTS lowf_orders(id uuid PRIMARY KEY,user_id text NOT NULL,reference varchar(40) NOT NULL UNIQUE,mode text NOT NULL CHECK(mode IN ('sandbox','production')),config_version uuid NOT NULL REFERENCES lowf_payment_config(version),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed','expired','sandbox_paid')),items jsonb NOT NULL,shipping jsonb,customer jsonb NOT NULL,subtotal_vnd bigint NOT NULL CHECK(subtotal_vnd>0),shipping_fee_vnd integer NOT NULL DEFAULT 0 CHECK(shipping_fee_vnd>=0),total_vnd bigint NOT NULL CHECK(total_vnd BETWEEN 5000 AND 9999999999),idempotency_key uuid NOT NULL,request_fingerprint text NOT NULL,fulfillment_status text NOT NULL DEFAULT 'unfulfilled' CHECK(fulfillment_status IN ('unfulfilled','processing','shipped','completed')),gateway_transaction_no text,gateway_response_code text,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL,paid_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,idempotency_key))`,
`CREATE INDEX IF NOT EXISTS lowf_orders_user_created ON lowf_orders(user_id,created_at DESC)`,
`CREATE UNIQUE INDEX IF NOT EXISTS lowf_orders_gateway_transaction ON lowf_orders(mode,gateway_transaction_no) WHERE gateway_transaction_no IS NOT NULL`,
`CREATE TABLE IF NOT EXISTS lowf_order_grants(order_id uuid PRIMARY KEY REFERENCES lowf_orders(id),created_at timestamptz NOT NULL DEFAULT now())`,
`CREATE TABLE IF NOT EXISTS lowf_book_entitlements(user_id text NOT NULL,book_id text NOT NULL,order_id uuid NOT NULL REFERENCES lowf_orders(id),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(order_id,book_id))`,
`CREATE INDEX IF NOT EXISTS lowf_book_entitlements_user ON lowf_book_entitlements(user_id,book_id)`
];for(const statement of statements)await sql.query(statement,[]);console.log('Commerce schema ready. No merchant credentials, products, orders or paid entitlements seeded.');}
main().catch(e=>{console.error('Commerce migration failed',e instanceof Error?e.name:'UnknownError');process.exitCode=1;});
