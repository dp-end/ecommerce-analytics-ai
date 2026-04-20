#!/usr/bin/env python3
"""
DataPulse – Veri Tohumlama Scripti
====================================
amazon.csv  → products, users, orders, order_items
Train.csv   → shipments  (orders ile eşleştirilir)
Oluşturulur → audit_logs (rastgele etkinlik kayıtları)

Kullanım:
    cd scripts
    .venv\Scripts\Activate.ps1
    python data_seeder.py
"""

import random
import datetime
import uuid
import sys
import re

import pandas as pd
from sqlalchemy import create_engine, text

# ─── Ayarlar ────────────────────────────────────────────────────────────────
DB_URL = "mysql+pymysql://root:1234@localhost:3306/ecommerce_db"
AMAZON_CSV  = "data/amazon.csv"
TRAIN_CSV   = "data/Train.csv"
ORDER_LIMIT = 2000
DUMMY_HASH  = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh3y"

engine = create_engine(DB_URL, echo=False)

# ─── Yardımcılar ────────────────────────────────────────────────────────────

def count(table):
    with engine.connect() as c:
        return c.execute(text(f"SELECT COUNT(*) FROM `{table}`")).scalar()

def read_db(table, cols="*"):
    return pd.read_sql(f"SELECT {cols} FROM `{table}`", engine)

def insert(df, table, chunk=300):
    df.to_sql(table, engine, if_exists="append", index=False, chunksize=chunk)

def max_id(table):
    with engine.connect() as c:
        val = c.execute(text(f"SELECT COALESCE(MAX(id),0) FROM `{table}`")).scalar()
        return int(val)

def parse_price(val):
    if pd.isna(val):
        return 0.01
    cleaned = re.sub(r"[₹,\s]", "", str(val))
    try:
        return max(float(cleaned), 0.01)
    except ValueError:
        return 0.01

def parse_discount(val):
    if pd.isna(val):
        return 0.0
    cleaned = re.sub(r"[%\s]", "", str(val))
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

def top_category(cat_str):
    if pd.isna(cat_str):
        return "Electronics"
    return str(cat_str).split("|")[0].strip()[:100]

# ─── İdempotency kontrolü ───────────────────────────────────────────────────

if count("orders") > 10:
    print("Siparişler zaten mevcut. Tekrar çalıştırmak için önce tabloları temizleyin:")
    print("   TRUNCATE TABLE order_items; TRUNCATE TABLE shipments;")
    print("   TRUNCATE TABLE audit_logs; TRUNCATE TABLE orders;")
    sys.exit(0)

print("=" * 55)
print("  DataPulse – Veri Tohumlama Başlıyor")
print("=" * 55)

# ─── 1. Amazon.csv yükle ────────────────────────────────────────────────────
print(f"\n[1/6] amazon.csv okunuyor (ilk {ORDER_LIMIT} satır)...")
df = pd.read_csv(AMAZON_CSV, nrows=ORDER_LIMIT)
df = df.dropna(subset=["product_id", "user_id"])
df["user_id"]      = df["user_id"].astype(str).str.split(",").str[0].str.strip()
df["product_id"]   = df["product_id"].astype(str).str.split(",").str[0].str.strip()
df["unit_price"]   = df["discounted_price"].apply(parse_price)
df["discount_pct"] = df["discount_percentage"].apply(parse_discount)
df["top_cat"]      = df["category"].apply(top_category)
df["order_date"]   = [
    datetime.datetime.now() - datetime.timedelta(days=random.randint(1, 365))
    for _ in range(len(df))
]
print(f"  {len(df)} satır yüklendi.")

# ─── 2. Kategorileri ekle ───────────────────────────────────────────────────
print("\n[2/6] Kategoriler kontrol ediliyor...")
cats_db        = read_db("categories")
existing_names = set(cats_db["name"].tolist())
new_cats       = [
    {"name": c, "description": f"{c} category items"}
    for c in df["top_cat"].unique()
    if c not in existing_names
]
if new_cats:
    print(f"  {len(new_cats)} yeni kategori ekleniyor...")
    insert(pd.DataFrame(new_cats), "categories")

cats_db        = read_db("categories")
cat_name_to_id = dict(zip(cats_db["name"], cats_db["id"].astype(int)))
print(f"  Toplam kategori: {count('categories')}")

CAT_EMOJI = {
    "Electronics": "💻", "Computers&Accessories": "💻",
    "Books": "📚", "Clothing": "👗",
    "Home&Kitchen": "🏠", "Sports": "⚽",
    "Toys": "🎮", "Health": "💊",
}

# ─── 3. Ürünleri ekle ───────────────────────────────────────────────────────
print("\n[3/6] Ürünler ekleniyor...")
stores_db  = read_db("stores", "id")
store_ids  = stores_db["id"].astype(int).tolist()

existing_skus = set(read_db("products", "sku")["sku"].dropna().astype(str).tolist())
unique_prods  = df.drop_duplicates(subset=["product_id"])

prods_to_ins = []
for _, row in unique_prods.iterrows():
    sku = str(row["product_id"])
    if sku in existing_skus:
        continue
    cat_id   = cat_name_to_id.get(row["top_cat"])
    store_id = random.choice(store_ids) if store_ids else None
    prods_to_ins.append({
        "store_id":    int(store_id) if store_id else None,
        "category_id": int(cat_id)   if cat_id  else None,
        "sku":         sku,
        "brand":       None,
        "name":        str(row["product_name"])[:255],
        "unit_price":  row["unit_price"],
        "stock":       random.randint(20, 500),
        "description": str(row.get("about_product", ""))[:800] if pd.notna(row.get("about_product")) else "",
        "emoji":       CAT_EMOJI.get(row["top_cat"], "📦"),
        "image_url":   str(row.get("img_link", ""))[:500] if pd.notna(row.get("img_link")) else None,
        "rating":      float(row["rating"]) if pd.notna(row.get("rating")) and str(row.get("rating")) != "|" else 0.0,
        "created_at":  datetime.datetime.now(),
    })

if prods_to_ins:
    print(f"  {len(prods_to_ins)} ürün ekleniyor...")
    insert(pd.DataFrame(prods_to_ins), "products")
else:
    print("  Ürünler zaten mevcut.")

prods_db   = read_db("products", "id, sku")
sku_to_pid = {str(r["sku"]): int(r["id"]) for _, r in prods_db.iterrows()}
print(f"  Toplam ürün: {count('products')}")

# ─── 4. Kullanıcıları ekle ──────────────────────────────────────────────────
print("\n[4/6] Kullanıcılar ekleniyor...")
existing_emails = set(read_db("users", "email")["email"].tolist())
unique_custs    = df.drop_duplicates(subset=["user_id"])

users_to_ins = []
for _, row in unique_custs.iterrows():
    email = f"{str(row['user_id']).lower()[:50]}@datapulse.shop"
    if email in existing_emails:
        continue
    name = str(row["user_name"])[:255] if pd.notna(row.get("user_name")) else f"User {row['user_id']}"
    users_to_ins.append({
        "email":         email,
        "password_hash": DUMMY_HASH,
        "name":          name,
        "role_type":     "INDIVIDUAL",
        "gender":        random.choice(["M", "F", None]),
        "avatar":        None,
        "status":        "ACTIVE",
        "created_at":    row["order_date"],
    })

if users_to_ins:
    print(f"  {len(users_to_ins)} kullanıcı ekleniyor...")
    insert(pd.DataFrame(users_to_ins), "users")

    users_db  = read_db("users", "id, email")
    email_map = dict(zip(users_db["email"], users_db["id"].astype(int)))
    profiles  = []
    for u in users_to_ins:
        uid = email_map.get(u["email"])
        if uid:
            profiles.append({
                "user_id":          uid,
                "age":              random.randint(18, 65),
                "city":             random.choice(["Istanbul", "Ankara", "Izmir", "New York", "London"]),
                "membership_type":  random.choice(["GOLD", "SILVER", "BRONZE"]),
                "total_spend":      round(random.uniform(50, 5000), 2),
                "items_purchased":  random.randint(1, 50),
                "avg_rating":       round(random.uniform(3.0, 5.0), 1),
                "discount_applied": random.choice([True, False]),
                "satisfaction_level": random.choice(["Satisfied", "Neutral", "Unsatisfied"]),
                "days_since_last_purchase": random.randint(1, 365),
                "state":            None,
                "country":          random.choice(["Turkey", "United States", "United Kingdom", "India"]),
            })
    if profiles:
        insert(pd.DataFrame(profiles), "customer_profiles")
else:
    print("  Kullanıcılar zaten mevcut.")

users_db     = read_db("users", "id, email")
email_to_uid = dict(zip(users_db["email"], users_db["id"].astype(int)))
print(f"  Toplam kullanıcı: {count('users')}")

# ─── 5. Siparişler + Sipariş Kalemleri ─────────────────────────────────────
print("\n[5/6] Siparişler ve sipariş kalemleri ekleniyor...")

STATUSES = ["COMPLETED", "SHIPPED", "PENDING", "CANCELLED"]

valid = []
for _, row in df.iterrows():
    email = f"{str(row['user_id']).lower()[:50]}@datapulse.shop"
    uid   = email_to_uid.get(email)
    pid   = sku_to_pid.get(str(row["product_id"]))
    if uid and pid:
        valid.append({"row": row, "uid": uid, "pid": pid})

orders_rows = []
for v in valid:
    row    = v["row"]
    price  = row["unit_price"]
    disc   = row["discount_pct"] / 100 * price
    tax    = round(price * 0.08, 2)
    ship   = round(random.uniform(5, 30), 2)
    qty    = random.randint(1, 3)
    total  = round(price * qty - disc + tax + ship, 2)
    orders_rows.append({
        "user_id":        v["uid"],
        "store_id":       random.choice(store_ids) if store_ids else None,
        "status":         random.choice(STATUSES),
        "grand_total":    max(total, 0.01),
        "payment_method": random.choice(["Credit Card", "PayPal", "Bank Transfer"]),
        "discount":       round(disc, 2),
        "tax":            tax,
        "shipping_cost":  ship,
        "city":           random.choice(["Istanbul", "Ankara", "Izmir", "London", "New York"]),
        "state":          None,
        "country":        random.choice(["Turkey", "United States", "United Kingdom"]),
        "created_at":     row["order_date"],
    })

prev_max = max_id("orders")
print(f"  {len(orders_rows)} sipariş ekleniyor...")
insert(pd.DataFrame(orders_rows), "orders")

new_order_ids = pd.read_sql(
    f"SELECT id FROM orders WHERE id > {prev_max} ORDER BY id ASC",
    engine
)["id"].astype(int).tolist()

items_rows = []
for i, v in enumerate(valid):
    if i >= len(new_order_ids):
        break
    row = v["row"]
    items_rows.append({
        "order_id":   new_order_ids[i],
        "product_id": v["pid"],
        "quantity":   random.randint(1, 3),
        "price":      row["unit_price"],
        "discount":   round(row["discount_pct"] / 100 * row["unit_price"], 2),
    })

print(f"  {len(items_rows)} sipariş kalemi ekleniyor...")
insert(pd.DataFrame(items_rows), "order_items")
print(f"  Toplam sipariş: {count('orders')} | Kalem: {count('order_items')}")

# ─── 6. Shipments (Train.csv) ───────────────────────────────────────────────
print("\n[6a/6] Gönderiler ekleniyor (Train.csv)...")

MODE_MAP = {"Flight": "FLIGHT", "Ship": "SHIP", "Road": "ROAD"}
ORDER_STATUS_TO_SHIP = {
    "COMPLETED": "DELIVERED",
    "SHIPPED":   "IN_TRANSIT",
    "PENDING":   "PENDING",
    "CANCELLED": "RETURNED",
}
CARRIERS = ["FedEx", "UPS", "DHL", "USPS", "PTT Kargo", "Yurtici Kargo", "MNG Kargo"]

df_train = pd.read_csv(TRAIN_CSV)
for col in ["Customer_care_calls", "Customer_rating", "Prior_purchases",
            "Discount_offered", "Weight_in_gms", "Reached.on.Time_Y.N"]:
    df_train[col] = pd.to_numeric(df_train[col], errors="coerce").fillna(0)

orders_snap = pd.read_sql(
    f"SELECT id, status FROM orders WHERE id > {prev_max} ORDER BY id ASC LIMIT {len(df_train)}",
    engine
)

n_ship = min(len(orders_snap), len(df_train))
ships  = []
for i in range(n_ship):
    o = orders_snap.iloc[i]
    t = df_train.iloc[i]
    ships.append({
        "order_id":            int(o["id"]),
        "warehouse":           f"Depo-{str(t['Warehouse_block'])}",
        "mode_of_shipment":    MODE_MAP.get(str(t["Mode_of_Shipment"]), "ROAD"),
        "carrier":             random.choice(CARRIERS),
        "destination":         f"Bolge-{random.randint(1, 81)}",
        "status":              ORDER_STATUS_TO_SHIP.get(str(o["status"]), "DELIVERED"),
        "tracking_number":     uuid.uuid4().hex[:12].upper(),
        "eta":                 (datetime.date.today() + datetime.timedelta(days=random.randint(1, 14))),
        "customer_care_calls": int(t["Customer_care_calls"]),
        "customer_rating":     int(t["Customer_rating"]),
        "discount_offered":    float(t["Discount_offered"]),
        "weight_in_gms":       float(t["Weight_in_gms"]),
        "product_importance":  str(t["Product_importance"]),
        "reached_on_time":     bool(int(t["Reached.on.Time_Y.N"])),
        "prior_purchases":     int(t["Prior_purchases"]),
    })

print(f"  {len(ships)} gönderi ekleniyor...")
insert(pd.DataFrame(ships), "shipments")
print(f"  Toplam gönderi: {count('shipments')}")

# ─── 7. Audit Logs ──────────────────────────────────────────────────────────
print("\n[6b/6] Audit loglar oluşturuluyor...")

ACTIONS = [
    ("Kullanici giris yapti",                    "INFO"),
    ("Yeni siparis olusturuldu",                 "SUCCESS"),
    ("Siparis durumu SHIPPED olarak guncellendi","SUCCESS"),
    ("Siparis durumu COMPLETED olarak guncellendi","SUCCESS"),
    ("Urun katalonuya eklendi",                  "SUCCESS"),
    ("Basarisiz giris denemesi",                 "WARNING"),
    ("Magaza durumu guncellendi",                "INFO"),
    ("Odeme islemi tamamlandi",                  "SUCCESS"),
    ("Siparis kullanici tarafindan iptal edildi","WARNING"),
    ("Urun stok tukendi uyarisi",                "WARNING"),
    ("Yeni kullanici kaydi",                     "INFO"),
    ("Admin kullanici listesine eristti",        "INFO"),
    ("Toplu urun aktarimi tamamlandi",           "SUCCESS"),
    ("Urun fiyati guncellendi",                  "INFO"),
    ("Veri senkronizasyonu basariyla tamamlandi","SUCCESS"),
    ("Baglanti zaman asimi hatasi",              "ERROR"),
    ("Yetkisiz erisim denemesi engellendi",      "WARNING"),
    ("Kullanici profili guncellendi",            "INFO"),
    ("Magaza inceleme talebi onaylandi",         "SUCCESS"),
    ("Gonderi takip numarasi olusturuldu",       "SUCCESS"),
]

all_users = read_db("users", "id, name")
logs = []
now  = datetime.datetime.now()
for _ in range(500):
    u             = all_users.sample(1).iloc[0]
    action, ltype = random.choice(ACTIONS)
    logs.append({
        "action":    action,
        "user_id":   int(u["id"]),
        "user_name": str(u["name"])[:255],
        "type":      ltype,
        "created_at": now - datetime.timedelta(
            days=random.randint(0, 180),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
        ),
    })

insert(pd.DataFrame(logs), "audit_logs")
print(f"  Toplam audit log: {count('audit_logs')}")

# ─── Özet ────────────────────────────────────────────────────────────────────
print("\n" + "=" * 55)
print("  Veri tohumlama tamamlandi!")
print("=" * 55)
print(f"  Kategoriler      : {count('categories')}")
print(f"  Urunler          : {count('products')}")
print(f"  Kullanicilar     : {count('users')}")
print(f"  Siparisler       : {count('orders')}")
print(f"  Siparis Kalemleri: {count('order_items')}")
print(f"  Gonderiler       : {count('shipments')}")
print(f"  Audit Loglar     : {count('audit_logs')}")
print("=" * 55)
