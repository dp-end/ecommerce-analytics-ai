#!/usr/bin/env python3
"""
DataPulse – Veri Tohumlama Scripti
====================================
Amazon.csv  → products, users, orders, order_items
Train.csv   → shipments  (orders ile eşleştirilir)
Oluşturulur → audit_logs (rastgele etkinlik kayıtları)

Kullanım:
    cd scripts
    source venv/bin/activate
    python3 data_seeder.py
"""

import random
import datetime
import uuid
import sys

import pandas as pd
from sqlalchemy import create_engine, text

# ─── Ayarlar ────────────────────────────────────────────────────────────────
DB_URL      = "mysql+pymysql://root:1234@localhost:3306/ecommerce_db"
AMAZON_CSV  = "data/Amazon.csv"
TRAIN_CSV   = "data/Train.csv.xls"
ORDER_LIMIT = 2000   # Amazon.csv'den kaç sipariş alınacak
# BCrypt hash of "password123" – seeded kullanıcılar login olmayacak ama format geçerli
DUMMY_HASH  = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh3y"

engine = create_engine(DB_URL, echo=False)

# ─── Yardımcılar ────────────────────────────────────────────────────────────

def count(table: str) -> int:
    with engine.connect() as c:
        return c.execute(text(f"SELECT COUNT(*) FROM `{table}`")).scalar()

def read_db(table: str, cols: str = "*") -> pd.DataFrame:
    return pd.read_sql(f"SELECT {cols} FROM `{table}`", engine)

def insert(df: pd.DataFrame, table: str, chunk: int = 300) -> None:
    df.to_sql(table, engine, if_exists="append", index=False, chunksize=chunk)

def max_id(table: str) -> int:
    with engine.connect() as c:
        val = c.execute(text(f"SELECT COALESCE(MAX(id),0) FROM `{table}`")).scalar()
        return int(val)

# ─── İdempotency kontrolü ───────────────────────────────────────────────────

if count("orders") > 10:
    print("⚠️  Siparişler zaten mevcut. Tekrar çalıştırmak için önce tabloları temizleyin:")
    print("   TRUNCATE TABLE order_items; TRUNCATE TABLE shipments;")
    print("   TRUNCATE TABLE audit_logs; TRUNCATE TABLE orders;")
    sys.exit(0)

print("=" * 55)
print("  DataPulse – Veri Tohumlama Başlıyor")
print("=" * 55)

# ─── 1. Kategorileri tamamla ────────────────────────────────────────────────
print("\n[1/6] Kategoriler kontrol ediliyor...")

EXTRA_CATS = [
    ("Clothing",           "Men's and women's apparel"),
    ("Home & Kitchen",     "Kitchen tools and home essentials"),
    ("Sports & Outdoors",  "Outdoor gear, fitness and camping"),
    ("Toys & Games",       "Games and entertainment for all ages"),
]

cats_db      = read_db("categories")
existing_names = set(cats_db["name"].tolist())
new_cats     = [c for c in EXTRA_CATS if c[0] not in existing_names]

if new_cats:
    print(f"  ➕ {len(new_cats)} yeni kategori ekleniyor...")
    insert(pd.DataFrame(new_cats, columns=["name", "description"]), "categories")
else:
    print("  ✓ Tüm kategoriler mevcut.")

cats_db      = read_db("categories")
cat_name_to_id = dict(zip(cats_db["name"], cats_db["id"].astype(int)))

# Amazon.csv kategori → DB kategori adı
AMAZON_CAT = {
    "Electronics":       "Electronics",
    "Books":             "Books",
    "Clothing":          "Clothing",
    "Home & Kitchen":    "Home & Kitchen",
    "Sports & Outdoors": "Sports & Outdoors",
    "Toys & Games":      "Toys & Games",
}
CAT_EMOJI = {
    "Electronics":       "💻",
    "Books":             "📚",
    "Clothing":          "👗",
    "Home & Kitchen":    "🏠",
    "Sports & Outdoors": "⚽",
    "Toys & Games":      "🎮",
}

print(f"  ✓ Toplam kategori: {count('categories')}")

# ─── 2. Amazon.csv yükle ────────────────────────────────────────────────────
print(f"\n[2/6] Amazon.csv okunuyor (ilk {ORDER_LIMIT} satır)...")
df = pd.read_csv(AMAZON_CSV, nrows=ORDER_LIMIT)
df = df.dropna(subset=["OrderID", "CustomerID", "ProductID"])
df["OrderDate"] = pd.to_datetime(df["OrderDate"], errors="coerce").fillna(
    pd.Timestamp("2023-06-01")
)
# Sayısal sütunları temizle
for col in ["UnitPrice", "Discount", "Tax", "ShippingCost", "TotalAmount", "Quantity"]:
    df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
df["Quantity"] = df["Quantity"].astype(int).clip(lower=1)
print(f"  ✓ {len(df)} sipariş satırı yüklendi.")

# ─── 3. Ürünleri ekle ───────────────────────────────────────────────────────
print("\n[3/6] Ürünler ekleniyor...")
stores_db    = read_db("stores", "id")
store_ids    = stores_db["id"].astype(int).tolist()

existing_skus = set(read_db("products", "sku")["sku"].dropna().astype(str).tolist())
unique_prods  = df.drop_duplicates(subset=["ProductID"])

prods_to_ins = []
for _, row in unique_prods.iterrows():
    sku = str(row["ProductID"])
    if sku in existing_skus:
        continue
    cat_name = AMAZON_CAT.get(str(row.get("Category", "")), "Electronics")
    cat_id   = cat_name_to_id.get(cat_name)
    store_id = random.choice(store_ids) if store_ids else None
    prods_to_ins.append({
        "store_id":    int(store_id) if store_id else None,
        "category_id": int(cat_id)   if cat_id  else None,
        "sku":         sku,
        "brand":       str(row.get("Brand", ""))[:255] if pd.notna(row.get("Brand")) else None,
        "name":        str(row["ProductName"])[:255],
        "unit_price":  max(float(row["UnitPrice"]), 0.01),
        "stock":       random.randint(20, 500),
        "description": f"{row.get('Category','')} | {row.get('Brand','')} ürünü.",
        "emoji":       CAT_EMOJI.get(str(row.get("Category", "")), "📦"),
        "image_url":   None,
        "rating":      round(random.uniform(3.0, 5.0), 1),
        "created_at":  datetime.datetime.now(),
    })

if prods_to_ins:
    print(f"  ➕ {len(prods_to_ins)} ürün ekleniyor...")
    insert(pd.DataFrame(prods_to_ins), "products")
else:
    print("  ✓ Ürünler zaten mevcut.")

prods_db    = read_db("products", "id, sku")
sku_to_pid  = {str(r["sku"]): int(r["id"]) for _, r in prods_db.iterrows()}
print(f"  ✓ Toplam ürün: {count('products')}")

# ─── 4. Kullanıcıları ekle ──────────────────────────────────────────────────
print("\n[4/6] Kullanıcılar ekleniyor...")
existing_emails = set(read_db("users", "email")["email"].tolist())
unique_custs    = df.drop_duplicates(subset=["CustomerID"])

users_to_ins = []
for _, row in unique_custs.iterrows():
    email = f"{str(row['CustomerID']).lower()}@datapulse.shop"
    if email in existing_emails:
        continue
    name = str(row["CustomerName"]) if pd.notna(row.get("CustomerName")) else f"Customer {row['CustomerID']}"
    users_to_ins.append({
        "email":         email,
        "password_hash": DUMMY_HASH,
        "name":          name[:255],
        "role_type":     "INDIVIDUAL",
        "gender":        random.choice(["M", "F", None]),
        "avatar":        None,
        "status":        "ACTIVE",
        "created_at":    row["OrderDate"].to_pydatetime() if hasattr(row["OrderDate"], "to_pydatetime") else datetime.datetime.now(),
    })

if users_to_ins:
    print(f"  ➕ {len(users_to_ins)} kullanıcı ekleniyor...")
    insert(pd.DataFrame(users_to_ins), "users")

    # Customer profiles (basit)
    users_db   = read_db("users", "id, email")
    email_map  = dict(zip(users_db["email"], users_db["id"].astype(int)))
    profiles   = []
    memberships = ["GOLD", "SILVER", "BRONZE"]
    for u in users_to_ins:
        uid = email_map.get(u["email"])
        if uid:
            profiles.append({
                "user_id":         uid,
                "age":             random.randint(18, 65),
                "city":            random.choice(["İstanbul", "Ankara", "İzmir", "New York", "London"]),
                "membership_type": random.choice(memberships),
                "total_spend":     round(random.uniform(50, 5000), 2),
                "items_purchased": random.randint(1, 50),
                "avg_rating":      round(random.uniform(3.0, 5.0), 1),
                "discount_applied":random.choice([True, False]),
                "satisfaction_level": random.choice(["Satisfied", "Neutral", "Unsatisfied"]),
                "days_since_last_purchase": random.randint(1, 365),
                "state":           None,
                "country":         random.choice(["Turkey", "United States", "United Kingdom", "India"]),
            })
    if profiles:
        insert(pd.DataFrame(profiles), "customer_profiles")
else:
    print("  ✓ Kullanıcılar zaten mevcut.")

users_db   = read_db("users", "id, email")
email_to_uid = dict(zip(users_db["email"], users_db["id"].astype(int)))
print(f"  ✓ Toplam kullanıcı: {count('users')}")

# ─── 5. Siparişler + Sipariş Kalemleri ─────────────────────────────────────
print("\n[5/6] Siparişler ve sipariş kalemleri ekleniyor...")

STATUS_MAP = {
    "Delivered": "COMPLETED",
    "Shipped":   "SHIPPED",
    "Pending":   "PENDING",
    "Cancelled": "CANCELLED",
    "Returned":  "CANCELLED",
}

# Yalnızca geçerli satırları tut
valid = []
for _, row in df.iterrows():
    email  = f"{str(row['CustomerID']).lower()}@datapulse.shop"
    uid    = email_to_uid.get(email)
    pid    = sku_to_pid.get(str(row["ProductID"]))
    if uid and pid:
        valid.append({"row": row, "uid": uid, "pid": pid})

orders_rows = []
for v in valid:
    row = v["row"]
    orders_rows.append({
        "user_id":       v["uid"],
        "store_id":      random.choice(store_ids) if store_ids else None,
        "status":        STATUS_MAP.get(str(row.get("OrderStatus", "Delivered")), "COMPLETED"),
        "grand_total":   max(float(row["TotalAmount"]), 0.01),
        "payment_method":str(row.get("PaymentMethod", "Credit Card"))[:100],
        "discount":      float(row["Discount"]),
        "tax":           float(row["Tax"]),
        "shipping_cost": float(row["ShippingCost"]),
        "city":          str(row.get("City", ""))[:100]  if pd.notna(row.get("City"))  else None,
        "state":         str(row.get("State", ""))[:100] if pd.notna(row.get("State")) else None,
        "country":       str(row.get("Country", ""))[:100] if pd.notna(row.get("Country")) else None,
        "created_at":    row["OrderDate"].to_pydatetime() if hasattr(row["OrderDate"], "to_pydatetime") else datetime.datetime.now(),
    })

prev_max = max_id("orders")
print(f"  ➕ {len(orders_rows)} sipariş ekleniyor...")
insert(pd.DataFrame(orders_rows), "orders")

# Yeni eklenen order ID'leri
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
        "quantity":   int(row["Quantity"]),
        "price":      max(float(row["UnitPrice"]), 0.01),
        "discount":   float(row["Discount"]),
    })

print(f"  ➕ {len(items_rows)} sipariş kalemi ekleniyor...")
insert(pd.DataFrame(items_rows), "order_items")
print(f"  ✓ Toplam sipariş: {count('orders')} | Kalem: {count('order_items')}")

# ─── 6. Shipments (Train.csv) ───────────────────────────────────────────────
print("\n[6a/6] Gönderiler ekleniyor (Train.csv)...")

MODE_MAP = {"Flight": "FLIGHT", "Ship": "SHIP", "Road": "ROAD"}
ORDER_STATUS_TO_SHIP = {
    "COMPLETED": "DELIVERED",
    "SHIPPED":   "IN_TRANSIT",
    "PENDING":   "PENDING",
    "CANCELLED": "RETURNED",
}
CARRIERS = ["FedEx", "UPS", "DHL", "USPS", "PTT Kargo", "Yurtiçi Kargo", "MNG Kargo"]

df_train = pd.read_csv(TRAIN_CSV)
# Sayısal sütunları düzelt
for col in ["Customer_care_calls", "Customer_rating", "Prior_purchases",
            "Discount_offered", "Weight_in_gms", "Reached.on.Time_Y.N"]:
    df_train[col] = pd.to_numeric(df_train[col], errors="coerce").fillna(0)

# Sipariş durumunu al
orders_snap = pd.read_sql(
    f"SELECT id, status FROM orders WHERE id > {prev_max} ORDER BY id ASC LIMIT {len(df_train)}",
    engine
)

n_ship = min(len(orders_snap), len(df_train))
ships  = []
for i in range(n_ship):
    o = orders_snap.iloc[i]
    t = df_train.iloc[i]
    ship_status = ORDER_STATUS_TO_SHIP.get(str(o["status"]), "DELIVERED")
    ships.append({
        "order_id":           int(o["id"]),
        "warehouse":          f"Depo-{str(t['Warehouse_block'])}",
        "mode_of_shipment":   MODE_MAP.get(str(t["Mode_of_Shipment"]), "ROAD"),
        "carrier":            random.choice(CARRIERS),
        "destination":        f"Bölge-{random.randint(1, 81)}",
        "status":             ship_status,
        "tracking_number":    uuid.uuid4().hex[:12].upper(),
        "eta":                (datetime.date.today() + datetime.timedelta(days=random.randint(1, 14))),
        "customer_care_calls":int(t["Customer_care_calls"]),
        "customer_rating":    int(t["Customer_rating"]),
        "discount_offered":   float(t["Discount_offered"]),
        "weight_in_gms":      float(t["Weight_in_gms"]),
        "product_importance": str(t["Product_importance"]),
        "reached_on_time":    bool(int(t["Reached.on.Time_Y.N"])),
        "prior_purchases":    int(t["Prior_purchases"]),
    })

print(f"  ➕ {len(ships)} gönderi ekleniyor...")
insert(pd.DataFrame(ships), "shipments")
print(f"  ✓ Toplam gönderi: {count('shipments')}")

# ─── 7. Audit Logs ──────────────────────────────────────────────────────────
print("\n[6b/6] Audit loglar oluşturuluyor...")

ACTIONS = [
    ("Kullanıcı giriş yaptı",                   "INFO"),
    ("Yeni sipariş oluşturuldu",                 "SUCCESS"),
    ("Sipariş durumu SHIPPED olarak güncellendi","SUCCESS"),
    ("Sipariş durumu COMPLETED olarak güncellendi","SUCCESS"),
    ("Ürün kataloğa eklendi",                    "SUCCESS"),
    ("Başarısız giriş denemesi",                 "WARNING"),
    ("Mağaza durumu güncellendi",                "INFO"),
    ("Ödeme işlemi tamamlandı",                  "SUCCESS"),
    ("Sipariş kullanıcı tarafından iptal edildi","WARNING"),
    ("Ürün stok tükendi uyarısı",                "WARNING"),
    ("Yeni kullanıcı kaydı",                     "INFO"),
    ("Admin kullanıcı listesine erişti",         "INFO"),
    ("Toplu ürün aktarımı tamamlandı",           "SUCCESS"),
    ("Ürün fiyatı güncellendi",                  "INFO"),
    ("Veri senkronizasyonu başarıyla tamamlandı","SUCCESS"),
    ("Bağlantı zaman aşımı hatası",              "ERROR"),
    ("Yetkisiz erişim denemesi engellendi",      "WARNING"),
    ("Kullanıcı profili güncellendi",            "INFO"),
    ("Mağaza inceleme talebi onaylandı",         "SUCCESS"),
    ("Gönderim takip numarası oluşturuldu",      "SUCCESS"),
]

all_users = read_db("users", "id, name")
logs = []
now = datetime.datetime.now()
for _ in range(500):
    u        = all_users.sample(1).iloc[0]
    action, ltype = random.choice(ACTIONS)
    logs.append({
        "action":     action,
        "user_id":    int(u["id"]),
        "user_name":  str(u["name"])[:255],
        "type":       ltype,
        "created_at": now - datetime.timedelta(
            days=random.randint(0, 180),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
        ),
    })

insert(pd.DataFrame(logs), "audit_logs")
print(f"  ✓ Toplam audit log: {count('audit_logs')}")

# ─── Özet ────────────────────────────────────────────────────────────────────
print("\n" + "=" * 55)
print("  ✅  Veri tohumlama tamamlandı!")
print("=" * 55)
print(f"  📂 Kategoriler    : {count('categories')}")
print(f"  🏷️  Ürünler        : {count('products')}")
print(f"  👥 Kullanıcılar   : {count('users')}")
print(f"  📋 Siparişler     : {count('orders')}")
print(f"  🧾 Sipariş Kalemleri: {count('order_items')}")
print(f"  🚚 Gönderiler     : {count('shipments')}")
print(f"  📝 Audit Loglar   : {count('audit_logs')}")
print("=" * 55)
