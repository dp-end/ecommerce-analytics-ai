#!/usr/bin/env python3
"""
DataPulse – Veri Tohumlama Scripti
=====================================
Amazon.csv   → stores (SellerID'den), products, users (customers), orders, order_items
Train.csv.xls → shipments

Kullanım:
    cd scripts
    python data_seeder.py
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
ORDER_LIMIT = 2000
TOP_SELLERS = 20   # Kaç satıcı için mağaza oluşturulsun
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
print(f"\n[1/7] Amazon.csv okunuyor (ilk {ORDER_LIMIT} satır)...")
df = pd.read_csv(AMAZON_CSV, nrows=ORDER_LIMIT)
df = df.dropna(subset=["ProductID", "CustomerID", "SellerID"])
df["CustomerID"] = df["CustomerID"].astype(str).str.strip()
df["ProductID"]  = df["ProductID"].astype(str).str.strip()
df["SellerID"]   = df["SellerID"].astype(str).str.strip()
df["OrderDate"]  = pd.to_datetime(df["OrderDate"], errors="coerce")
df.loc[df["OrderDate"].isna(), "OrderDate"] = datetime.datetime.now() - datetime.timedelta(days=random.randint(1, 365))
print(f"  {len(df)} satır yüklendi.")

# ─── 2. Kategorileri ekle ───────────────────────────────────────────────────
print("\n[2/7] Kategoriler kontrol ediliyor...")
cats_db        = read_db("categories")
existing_names = set(cats_db["name"].tolist())
new_cats = [
    {"name": c, "description": f"{c} category items"}
    for c in df["Category"].dropna().unique()
    if c not in existing_names
]
if new_cats:
    print(f"  {len(new_cats)} yeni kategori ekleniyor...")
    insert(pd.DataFrame(new_cats), "categories")

cats_db        = read_db("categories")
cat_name_to_id = dict(zip(cats_db["name"], cats_db["id"].astype(int)))
print(f"  Toplam kategori: {count('categories')}")

CAT_EMOJI = {
    "Electronics":    "💻",
    "Books":          "📚",
    "Clothing":       "👗",
    "Home & Kitchen": "🏠",
    "Sports & Outdoors": "⚽",
    "Toys & Games":   "🎮",
    "Health":         "💊",
}

CAT_STORE_SUFFIX = {
    "Books":             "Books",
    "Clothing":          "Fashion",
    "Home & Kitchen":    "Home",
    "Sports & Outdoors": "Sports",
    "Electronics":       "Tech",
    "Toys & Games":      "Toys",
}

# ─── 3. Mağazaları (Satıcılar) ekle ─────────────────────────────────────────
print(f"\n[3/7] Top {TOP_SELLERS} satıcıdan mağazalar oluşturuluyor...")

top_sellers = df["SellerID"].value_counts().head(TOP_SELLERS).index.tolist()

# Her satıcının ana kategorisini bul
seller_main_cat = (
    df[df["SellerID"].isin(top_sellers)]
    .groupby("SellerID")["Category"]
    .agg(lambda x: x.value_counts().idxmax())
    .to_dict()
)

existing_emails = set(read_db("users", "email")["email"].tolist())

# Satıcı kullanıcıları oluştur (CORPORATE)
new_seller_users = []
for seller_id in top_sellers:
    email = f"{seller_id.lower()}@datapulse.shop"
    if email not in existing_emails:
        cat    = seller_main_cat.get(seller_id, "General")
        suffix = CAT_STORE_SUFFIX.get(cat, "Store")
        new_seller_users.append({
            "email":         email,
            "password_hash": DUMMY_HASH,
            "name":          f"{seller_id} {suffix}",
            "role_type":     "CORPORATE",
            "status":        "ACTIVE",
            "created_at":    datetime.datetime.now(),
        })
        existing_emails.add(email)

if new_seller_users:
    print(f"  {len(new_seller_users)} satıcı kullanıcısı ekleniyor...")
    insert(pd.DataFrame(new_seller_users), "users")

# Kullanıcı ID'lerini al
users_db         = read_db("users", "id, email")
email_to_uid_all = dict(zip(users_db["email"], users_db["id"].astype(int)))

# Satıcı kullanıcılar için customer_profile oluştur (varsa atla)
seller_profiles = []
for seller_id in top_sellers:
    email = f"{seller_id.lower()}@datapulse.shop"
    uid   = email_to_uid_all.get(email)
    if uid:
        with engine.connect() as c:
            exists = c.execute(
                text("SELECT COUNT(*) FROM customer_profiles WHERE user_id = :uid"), {"uid": uid}
            ).scalar()
        if not exists:
            seller_profiles.append({"user_id": uid})
if seller_profiles:
    insert(pd.DataFrame(seller_profiles), "customer_profiles")

# Mağazaları oluştur (sahibi olan satıcılar için tekrar oluşturma)
stores_db = read_db("stores", "id, name, owner_id")
existing_owner_ids = set(stores_db["owner_id"].astype(int).tolist()) if len(stores_db) > 0 else set()

new_stores = []
for seller_id in top_sellers:
    email = f"{seller_id.lower()}@datapulse.shop"
    uid   = email_to_uid_all.get(email)
    if uid and uid not in existing_owner_ids:
        cat    = seller_main_cat.get(seller_id, "General")
        suffix = CAT_STORE_SUFFIX.get(cat, "Store")
        new_stores.append({
            "name":     f"{seller_id} {suffix}",
            "owner_id": uid,
            "category": cat,
            "status":   "OPEN",
            "rating":   round(random.uniform(3.5, 5.0), 1),
        })
        existing_owner_ids.add(uid)

if new_stores:
    print(f"  {len(new_stores)} mağaza ekleniyor...")
    insert(pd.DataFrame(new_stores), "stores")

# Satıcı → Mağaza ID eşlemesini kur
stores_db       = read_db("stores", "id, owner_id")
owner_to_store  = dict(zip(stores_db["owner_id"].astype(int), stores_db["id"].astype(int)))
all_store_ids   = stores_db["id"].astype(int).tolist()

seller_to_store_id = {}
for seller_id in top_sellers:
    email = f"{seller_id.lower()}@datapulse.shop"
    uid   = email_to_uid_all.get(email)
    if uid and uid in owner_to_store:
        seller_to_store_id[seller_id] = owner_to_store[uid]

print(f"  Toplam mağaza: {count('stores')}")
print(f"  Seller→Store eşleşmesi: {len(seller_to_store_id)} satıcı")

# ─── 4. Ürünleri ekle ───────────────────────────────────────────────────────
print("\n[4/7] Ürünler ekleniyor...")

existing_skus = (
    set(read_db("products", "sku")["sku"].dropna().astype(str).tolist())
    if count("products") > 0 else set()
)

# Her ürünün birincil satıcısını belirle
product_seller = (
    df.groupby("ProductID")["SellerID"]
    .agg(lambda x: x.value_counts().idxmax())
    .to_dict()
)

unique_prods = df.drop_duplicates(subset=["ProductID"])
prods_to_ins = []
for _, row in unique_prods.iterrows():
    sku = str(row["ProductID"])
    if sku in existing_skus:
        continue
    cat      = str(row.get("Category", ""))
    cat_id   = cat_name_to_id.get(cat)
    seller_id = product_seller.get(sku)
    store_id  = seller_to_store_id.get(seller_id) if seller_id else None
    if not store_id and all_store_ids:
        store_id = random.choice(all_store_ids)
    prods_to_ins.append({
        "store_id":    int(store_id) if store_id else None,
        "category_id": int(cat_id)   if cat_id  else None,
        "sku":         sku,
        "brand":       str(row.get("Brand", ""))[:100] if pd.notna(row.get("Brand")) else None,
        "name":        str(row["ProductName"])[:255],
        "unit_price":  float(row["UnitPrice"]) if pd.notna(row.get("UnitPrice")) else 9.99,
        "stock":       random.randint(20, 500),
        "description": "",
        "emoji":       CAT_EMOJI.get(cat, "📦"),
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

# ─── 5. Kullanıcıları ekle ──────────────────────────────────────────────────
print("\n[5/7] Müşteri kullanıcıları ekleniyor...")
existing_emails_set = set(read_db("users", "email")["email"].tolist())
unique_custs        = df.drop_duplicates(subset=["CustomerID"])

users_to_ins = []
for _, row in unique_custs.iterrows():
    email = f"{str(row['CustomerID']).lower()[:50]}@datapulse.shop"
    if email in existing_emails_set:
        continue
    name = str(row["CustomerName"])[:255] if pd.notna(row.get("CustomerName")) else f"User {row['CustomerID']}"
    order_date = row["OrderDate"] if pd.notna(row["OrderDate"]) else datetime.datetime.now()
    users_to_ins.append({
        "email":         email,
        "password_hash": DUMMY_HASH,
        "name":          name,
        "role_type":     "INDIVIDUAL",
        "gender":        random.choice(["M", "F", None]),
        "status":        "ACTIVE",
        "created_at":    order_date,
    })
    existing_emails_set.add(email)

if users_to_ins:
    print(f"  {len(users_to_ins)} müşteri ekleniyor...")
    insert(pd.DataFrame(users_to_ins), "users")

    users_db  = read_db("users", "id, email")
    email_map = dict(zip(users_db["email"], users_db["id"].astype(int)))
    profiles  = []
    for u in users_to_ins:
        uid = email_map.get(u["email"])
        if uid:
            profiles.append({
                "user_id":                  uid,
                "age":                      random.randint(18, 65),
                "city":                     random.choice(["Istanbul", "Ankara", "Izmir", "New York", "London"]),
                "membership_type":          random.choice(["GOLD", "SILVER", "BRONZE"]),
                "total_spend":              round(random.uniform(50, 5000), 2),
                "items_purchased":          random.randint(1, 50),
                "avg_rating":               round(random.uniform(3.0, 5.0), 1),
                "discount_applied":         random.choice([True, False]),
                "satisfaction_level":       random.choice(["Satisfied", "Neutral", "Unsatisfied"]),
                "days_since_last_purchase": random.randint(1, 365),
                "state":                    None,
                "country":                  random.choice(["Turkey", "United States", "United Kingdom", "India"]),
            })
    if profiles:
        insert(pd.DataFrame(profiles), "customer_profiles")
else:
    print("  Müşteriler zaten mevcut.")

users_db     = read_db("users", "id, email")
email_to_uid = dict(zip(users_db["email"], users_db["id"].astype(int)))
print(f"  Toplam kullanıcı: {count('users')}")

# ─── 6. Siparişler + Sipariş Kalemleri ─────────────────────────────────────
print("\n[6/7] Siparişler ve sipariş kalemleri ekleniyor...")

STATUS_MAP = {
    "Delivered":  "COMPLETED",
    "Shipped":    "SHIPPED",
    "Cancelled":  "CANCELLED",
    "Returned":   "CANCELLED",
    "Processing": "PENDING",
    "Pending":    "PENDING",
}

valid = []
for _, row in df.iterrows():
    email     = f"{str(row['CustomerID']).lower()[:50]}@datapulse.shop"
    uid       = email_to_uid.get(email)
    pid       = sku_to_pid.get(str(row["ProductID"]))
    seller_id = str(row["SellerID"])
    store_id  = seller_to_store_id.get(seller_id)
    if not store_id and all_store_ids:
        store_id = random.choice(all_store_ids)
    if uid and pid:
        valid.append({"row": row, "uid": uid, "pid": pid, "store_id": store_id})

orders_rows = []
for v in valid:
    row        = v["row"]
    total      = float(row["TotalAmount"])  if pd.notna(row.get("TotalAmount"))  else 9.99
    tax        = float(row["Tax"])          if pd.notna(row.get("Tax"))          else round(total * 0.08, 2)
    disc       = float(row["Discount"])     if pd.notna(row.get("Discount"))     else 0.0
    ship       = float(row["ShippingCost"]) if pd.notna(row.get("ShippingCost")) else round(random.uniform(5, 30), 2)
    status     = STATUS_MAP.get(str(row.get("OrderStatus", "")), "PENDING")
    order_date = row["OrderDate"] if pd.notna(row["OrderDate"]) else datetime.datetime.now()
    orders_rows.append({
        "user_id":        v["uid"],
        "store_id":       v["store_id"],
        "status":         status,
        "grand_total":    max(total, 0.01),
        "payment_method": str(row.get("PaymentMethod", "Credit Card"))[:50],
        "discount":       round(disc, 2),
        "tax":            round(tax, 2),
        "shipping_cost":  round(ship, 2),
        "city":           str(row.get("City",    ""))[:100] if pd.notna(row.get("City"))    else "",
        "state":          str(row.get("State",   ""))[:100] if pd.notna(row.get("State"))   else None,
        "country":        str(row.get("Country", ""))[:100] if pd.notna(row.get("Country")) else "",
        "created_at":     order_date,
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
    row   = v["row"]
    qty   = int(row["Quantity"]) if pd.notna(row.get("Quantity")) else random.randint(1, 3)
    price = float(row["UnitPrice"]) if pd.notna(row.get("UnitPrice")) else 9.99
    disc  = float(row["Discount"])  if pd.notna(row.get("Discount"))  else 0.0
    items_rows.append({
        "order_id":   new_order_ids[i],
        "product_id": v["pid"],
        "quantity":   qty,
        "price":      price,
        "discount":   round(disc / qty if qty > 0 else disc, 2),
    })

print(f"  {len(items_rows)} sipariş kalemi ekleniyor...")
insert(pd.DataFrame(items_rows), "order_items")
print(f"  Toplam sipariş: {count('orders')} | Kalem: {count('order_items')}")

# ─── 7. Shipments (Train.csv.xls) ───────────────────────────────────────────
print("\n[7a/7] Gönderiler ekleniyor (Train.csv.xls)...")

MODE_MAP = {"Flight": "FLIGHT", "Ship": "SHIP", "Road": "ROAD"}
ORDER_STATUS_TO_SHIP = {
    "COMPLETED": "DELIVERED",
    "SHIPPED":   "IN_TRANSIT",
    "PENDING":   "PENDING",
    "CANCELLED": "RETURNED",
}
CARRIERS = ["FedEx", "UPS", "DHL", "USPS", "PTT Kargo", "Yurtiçi Kargo", "MNG Kargo"]

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

# ─── 8. Audit Logs ──────────────────────────────────────────────────────────
print("\n[7b/7] Audit loglar oluşturuluyor...")

ACTIONS = [
    ("Kullanici giris yapti",                      "INFO"),
    ("Yeni siparis olusturuldu",                   "SUCCESS"),
    ("Siparis durumu SHIPPED olarak guncellendi",  "SUCCESS"),
    ("Siparis durumu COMPLETED olarak guncellendi","SUCCESS"),
    ("Urun katalonuya eklendi",                    "SUCCESS"),
    ("Basarisiz giris denemesi",                   "WARNING"),
    ("Magaza durumu guncellendi",                  "INFO"),
    ("Odeme islemi tamamlandi",                    "SUCCESS"),
    ("Siparis kullanici tarafindan iptal edildi",  "WARNING"),
    ("Urun stok tukendi uyarisi",                  "WARNING"),
    ("Yeni kullanici kaydi",                       "INFO"),
    ("Admin kullanici listesine eristti",          "INFO"),
    ("Toplu urun aktarimi tamamlandi",             "SUCCESS"),
    ("Urun fiyati guncellendi",                    "INFO"),
    ("Veri senkronizasyonu basariyla tamamlandi",  "SUCCESS"),
    ("Baglanti zaman asimi hatasi",                "ERROR"),
    ("Yetkisiz erisim denemesi engellendi",        "WARNING"),
    ("Kullanici profili guncellendi",              "INFO"),
    ("Magaza inceleme talebi onaylandi",           "SUCCESS"),
    ("Gonderi takip numarasi olusturuldu",         "SUCCESS"),
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
print(f"  Mağazalar        : {count('stores')}")
print(f"  Ürünler          : {count('products')}")
print(f"  Kullanıcılar     : {count('users')}")
print(f"  Siparişler       : {count('orders')}")
print(f"  Sipariş Kalemleri: {count('order_items')}")
print(f"  Gönderiler       : {count('shipments')}")
print(f"  Audit Loglar     : {count('audit_logs')}")
print("=" * 55)
