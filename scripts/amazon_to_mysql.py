import pandas as pd
import random
from sqlalchemy import create_engine
from faker import Faker
import datetime

DB_URL = "mysql+pymysql://root:1234@localhost:3306/ecommerce_db"
engine = create_engine(DB_URL)
fake = Faker()

FILE_PATH = 'data/Pakistan Largest Ecommerce Dataset.csv'
NROWS = 15000  # İlk 15k satır yüklenir; daha fazlası için artır

STATUS_MAP = {
    'complete':       'COMPLETED',
    'closed':         'COMPLETED',
    'canceled':       'CANCELLED',
    'order_refunded': 'CANCELLED',
    'refund':         'CANCELLED',
    'fraud':          'CANCELLED',
    'received':       'SHIPPED',
    'holded':         'PROCESSING',
}

# ── 1. DOSYA OKU ──────────────────────────────────────────────────────────
print("1. Veri okunuyor...")
df = pd.read_csv(FILE_PATH, on_bad_lines='skip', nrows=NROWS)
df.columns = df.columns.str.strip()

df['Customer ID']    = df['Customer ID'].astype(str).str.strip()
df['sku']            = df['sku'].astype(str).str.strip().str[:255]
df['category_name_1']= df['category_name_1'].astype(str).str.strip()
df['increment_id']   = df['increment_id'].astype(str).str.strip()
df['price']          = pd.to_numeric(df['price'].astype(str).str.replace(',','').str.strip(), errors='coerce').fillna(0)
df['grand_total']    = pd.to_numeric(df['grand_total'].astype(str).str.replace(',','').str.strip(), errors='coerce').fillna(0)
df['qty_ordered']    = pd.to_numeric(df['qty_ordered'], errors='coerce').fillna(1).astype(int)
df['discount_amount']= pd.to_numeric(df['discount_amount'].astype(str).str.replace(',','').str.strip(), errors='coerce').fillna(0)

df = df[(df['Customer ID'] != 'nan') & (df['sku'] != 'nan') & (df['price'] > 0)]
print(f"   {len(df)} satır | {df['increment_id'].nunique()} sipariş | {df['Customer ID'].nunique()} müşteri")

# ── 2. CORPORATE USERS ────────────────────────────────────────────────────
print("2. Corporate kullanıcılar oluşturuluyor...")
NUM_STORES = 8
corp_data = []
for _ in range(NUM_STORES):
    corp_data.append({
        'email':         fake.unique.email(),
        'password_hash': '$2a$10$kzYzMrzVRDMOAluG9xjJA.SioMHjCGrXKPFi.VVFhLJK9Oo8SsN3e',
        'name':          fake.company()[:100],
        'role_type':     'CORPORATE',
        'gender':        None,
        'avatar':        None,
        'status':        'ACTIVE',
        'created_at':    datetime.datetime.now(),
    })
max_user_id = pd.read_sql("SELECT COALESCE(MAX(id),0) as m FROM users", engine)['m'].iloc[0]
pd.DataFrame(corp_data).to_sql('users', engine, if_exists='append', index=False)
corp_ids = pd.read_sql(f"SELECT id FROM users WHERE id > {max_user_id} ORDER BY id", engine)['id'].tolist()

# ── 3. STORES ─────────────────────────────────────────────────────────────
print("3. Mağazalar oluşturuluyor...")
store_cats = df['category_name_1'].dropna().unique()
stores_data = []
for i, oid in enumerate(corp_ids):
    stores_data.append({
        'name':       fake.company()[:100] + ' Store',
        'owner_id':   oid,
        'status':     'OPEN',
        'category':   str(store_cats[i % len(store_cats)])[:100],
        'rating':     round(random.uniform(3.5, 5.0), 1),
        'created_at': datetime.datetime.now(),
    })
max_store_id = pd.read_sql("SELECT COALESCE(MAX(id),0) as m FROM stores", engine)['m'].iloc[0]
pd.DataFrame(stores_data).to_sql('stores', engine, if_exists='append', index=False)
store_ids = pd.read_sql(f"SELECT id FROM stores WHERE id > {max_store_id} ORDER BY id", engine)['id'].tolist()

# ── 4. INDIVIDUAL USERS ───────────────────────────────────────────────────
print("4. Individual kullanıcılar oluşturuluyor...")
unique_customers = df['Customer ID'].unique()
ind_data = [{
    'email':         f"pak_cust_{cid}@shop.com",
    'password_hash': '$2a$10$kzYzMrzVRDMOAluG9xjJA.SioMHjCGrXKPFi.VVFhLJK9Oo8SsN3e',
    'name':          fake.name()[:100],
    'role_type':     'INDIVIDUAL',
    'gender':        random.choice(['M', 'F', None]),
    'avatar':        None,
    'status':        'ACTIVE',
    'created_at':    datetime.datetime.now(),
} for cid in unique_customers]

max_user_id2 = pd.read_sql("SELECT COALESCE(MAX(id),0) as m FROM users", engine)['m'].iloc[0]
pd.DataFrame(ind_data).to_sql('users', engine, if_exists='append', index=False, chunksize=500)
saved_ind = pd.read_sql(f"SELECT id, email FROM users WHERE id > {max_user_id2}", engine)
saved_ind['cid'] = saved_ind['email'].str.extract(r'pak_cust_(.+)@shop\.com')
cid_to_db = dict(zip(saved_ind['cid'], saved_ind['id']))

# ── 5. CATEGORIES ─────────────────────────────────────────────────────────
print("5. Kategoriler oluşturuluyor...")
cats = df['category_name_1'].dropna().unique()
cat_rows = [{'name': str(c)[:255], 'description': f'{c} products'} for c in cats]
df_cat = pd.DataFrame(cat_rows).drop_duplicates(subset=['name'])
df_cat.to_sql('categories', engine, if_exists='append', index=False)
cat_map = dict(zip(
    pd.read_sql("SELECT id, name FROM categories", engine)['name'],
    pd.read_sql("SELECT id, name FROM categories", engine)['id']
))

# ── 6. PRODUCTS ───────────────────────────────────────────────────────────
print("6. Ürünler oluşturuluyor...")
unique_prods = df.drop_duplicates(subset=['sku'])
prod_rows = []
for _, row in unique_prods.iterrows():
    sku = str(row['sku'])[:255]
    prod_rows.append({
        'store_id':    random.choice(store_ids),
        'category_id': cat_map.get(str(row['category_name_1'])),
        'sku':         sku,
        'name':        sku,
        'unit_price':  float(row['price']) if row['price'] > 0 else round(random.uniform(100, 5000), 2),
        'stock':       random.randint(10, 500),
        'description': None,
        'emoji':       '🛍️',
        'image_url':   None,
        'rating':      0.0,
        'created_at':  datetime.datetime.now(),
    })
max_prod_id = pd.read_sql("SELECT COALESCE(MAX(id),0) as m FROM products", engine)['m'].iloc[0]
pd.DataFrame(prod_rows).to_sql('products', engine, if_exists='append', index=False, chunksize=500)
sku_map = dict(zip(
    pd.read_sql("SELECT id, sku FROM products", engine)['sku'],
    pd.read_sql("SELECT id, sku FROM products", engine)['id']
))

# ── 7. ORDERS ─────────────────────────────────────────────────────────────
print("7. Siparişler oluşturuluyor...")
order_rows = []
inc_order = []  # [(increment_id, row_dict)] to map back after insert

for inc, group in df.groupby('increment_id'):
    first = group.iloc[0]
    db_uid = cid_to_db.get(str(first['Customer ID']))
    if not db_uid:
        continue
    status = STATUS_MAP.get(str(first['status']).lower().strip(), 'COMPLETED')
    try:
        created_at = pd.to_datetime(first['created_at']).to_pydatetime()
    except Exception:
        created_at = datetime.datetime.now()

    row_dict = {
        'user_id':        db_uid,
        'store_id':       random.choice(store_ids),
        'status':         status,
        'grand_total':    round(float(group['grand_total'].sum()), 2),
        'payment_method': str(first.get('payment_method', 'cod'))[:50],
        'discount':       round(float(group['discount_amount'].sum()), 2),
        'tax':            0.0,
        'shipping_cost':  0.0,
        'city':           None,
        'state':          None,
        'country':        'Pakistan',
        'created_at':     created_at,
    }
    order_rows.append(row_dict)
    inc_order.append(inc)

max_order_id = pd.read_sql("SELECT COALESCE(MAX(id),0) as m FROM orders", engine)['m'].iloc[0]
pd.DataFrame(order_rows).to_sql('orders', engine, if_exists='append', index=False, chunksize=500)
new_order_ids = pd.read_sql(
    f"SELECT id FROM orders WHERE id > {max_order_id} ORDER BY id ASC", engine
)['id'].tolist()

inc_to_order_id = dict(zip(inc_order, new_order_ids))
print(f"   {len(new_order_ids)} sipariş eklendi")

# ── 8. ORDER ITEMS ────────────────────────────────────────────────────────
print("8. Sipariş kalemleri oluşturuluyor...")
item_rows = []
for _, row in df.iterrows():
    db_oid  = inc_to_order_id.get(str(row['increment_id']))
    db_pid  = sku_map.get(str(row['sku'])[:255])
    if not db_oid or not db_pid:
        continue
    item_rows.append({
        'order_id':   db_oid,
        'product_id': db_pid,
        'quantity':   int(row['qty_ordered']),
        'price':      float(row['price']),
        'discount':   float(row['discount_amount']),
    })
pd.DataFrame(item_rows).to_sql('order_items', engine, if_exists='append', index=False, chunksize=1000)
print(f"   {len(item_rows)} sipariş kalemi eklendi")

print("\n✅ Pakistan veri seti başarıyla yüklendi!")
