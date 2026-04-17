#!/usr/bin/env python3
"""
load_all_data.py
=================
Tum veri dosyalarini veritabanina yukler:
  1. E-commerce Customer Behavior  -> customer_profiles (350 kayit)
  2. Pakistan Largest Ecommerce    -> orders, order_items, products (20K temiz kayit)
  3. amazon_reviews TSV            -> reviews (10K kayit)
  4. online_retail_II              -> orders, order_items, products (20K kayit)

Kullanim:
    cd scripts
    .venv\\Scripts\\Activate.ps1
    python load_all_data.py
"""

import random
import datetime
import uuid
import sys
import re

import pandas as pd
from sqlalchemy import create_engine, text

DB_URL     = "mysql+pymysql://root:admin@localhost:3306/ecommerce_db"
DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh3y"

engine = create_engine(DB_URL, echo=False)

def count(table):
    with engine.connect() as c:
        return c.execute(text(f"SELECT COUNT(*) FROM `{table}`")).scalar()

def read_db(table, cols="*"):
    return pd.read_sql(f"SELECT {cols} FROM `{table}`", engine)

def insert(df, table, chunk=500):
    df.to_sql(table, engine, if_exists="append", index=False, chunksize=chunk)

def max_id(table):
    with engine.connect() as c:
        return int(c.execute(text(f"SELECT COALESCE(MAX(id),0) FROM `{table}`")).scalar())

def get_store_ids():
    return read_db("stores", "id")["id"].astype(int).tolist()

def get_or_create_category(name, cat_cache):
    name = str(name)[:100].strip()
    if not name or name.lower() == "nan":
        name = "General"
    if name not in cat_cache:
        with engine.begin() as c:
            c.execute(text(
                "INSERT IGNORE INTO categories (name, description) VALUES (:n, :d)"
            ), {"n": name, "d": f"{name} category"})
        with engine.connect() as c:
            row = c.execute(text("SELECT id FROM categories WHERE name = :n"), {"n": name})
            cat_cache[name] = int(row.scalar())
    return cat_cache[name]

# ============================================================
# BOLUM 1 — E-commerce Customer Behavior CSV
# ============================================================
print("\n" + "=" * 60)
print("  BOLUM 1: E-commerce Customer Behavior CSV")
print("=" * 60)

behavior_csv = "data/E-commerce Customer Behavior - Sheet1.csv"
df_b = pd.read_csv(behavior_csv)
df_b.columns = df_b.columns.str.strip()
print(f"  {len(df_b)} musteri kaydi okundu.")

existing_emails = set(read_db("users", "email")["email"].tolist())
store_ids       = get_store_ids()

users_to_ins = []
for _, row in df_b.iterrows():
    email = f"behavior_{int(row['Customer ID'])}@datapulse.shop"
    if email in existing_emails:
        continue
    users_to_ins.append({
        "email":         email,
        "password_hash": DUMMY_HASH,
        "name":          f"Customer {int(row['Customer ID'])}",
        "role_type":     "INDIVIDUAL",
        "gender":        "F" if str(row.get("Gender","")).strip() == "Female" else "M",
        "avatar":        None,
        "status":        "ACTIVE",
        "created_at":    datetime.datetime.now(),
    })

if users_to_ins:
    print(f"  {len(users_to_ins)} yeni kullanici ekleniyor...")
    insert(pd.DataFrame(users_to_ins), "users")

users_db      = read_db("users", "id, email")
email_to_uid  = dict(zip(users_db["email"], users_db["id"].astype(int)))

MEMBERSHIP_MAP = {"Gold": "GOLD", "Silver": "SILVER", "Bronze": "BRONZE"}

profiles_to_ins = []
existing_user_ids = set(read_db("customer_profiles", "user_id")["user_id"].astype(int).tolist())

for _, row in df_b.iterrows():
    email = f"behavior_{int(row['Customer ID'])}@datapulse.shop"
    uid   = email_to_uid.get(email)
    if not uid or uid in existing_user_ids:
        continue
    profiles_to_ins.append({
        "user_id":          uid,
        "age":              int(row["Age"]) if pd.notna(row.get("Age")) else None,
        "city":             str(row.get("City",""))[:255] if pd.notna(row.get("City")) else None,
        "membership_type":  MEMBERSHIP_MAP.get(str(row.get("Membership Type","")), "BRONZE"),
        "total_spend":      float(row["Total Spend"]) if pd.notna(row.get("Total Spend")) else 0.0,
        "items_purchased":  int(row["Items Purchased"]) if pd.notna(row.get("Items Purchased")) else 0,
        "avg_rating":       float(row["Average Rating"]) if pd.notna(row.get("Average Rating")) else 0.0,
        "discount_applied": bool(row["Discount Applied"]) if pd.notna(row.get("Discount Applied")) else False,
        "satisfaction_level": str(row.get("Satisfaction Level",""))[:255] if pd.notna(row.get("Satisfaction Level")) else None,
        "days_since_last_purchase": int(row["Days Since Last Purchase"]) if pd.notna(row.get("Days Since Last Purchase")) else None,
        "state":            None,
        "country":          "United States",
    })

if profiles_to_ins:
    print(f"  {len(profiles_to_ins)} musteri profili ekleniyor...")
    insert(pd.DataFrame(profiles_to_ins), "customer_profiles")

print(f"  Toplam customer_profiles: {count('customer_profiles')}")

# ============================================================
# BOLUM 2 — Pakistan Largest Ecommerce Dataset
# ============================================================
print("\n" + "=" * 60)
print("  BOLUM 2: Pakistan Largest Ecommerce Dataset")
print("=" * 60)

pak_csv  = "data/Pakistan Largest Ecommerce Dataset.csv"
PAK_LIMIT = 20000

print(f"  Dosya okunuyor (ilk {PAK_LIMIT} temiz kayit)...")
df_pak = pd.read_csv(pak_csv, nrows=PAK_LIMIT * 3, low_memory=False, encoding="latin-1")
df_pak = df_pak.dropna(subset=["item_id", "price", "grand_total"])
df_pak = df_pak[pd.to_numeric(df_pak["price"], errors="coerce").notna()]
df_pak = df_pak.head(PAK_LIMIT)
print(f"  {len(df_pak)} temiz satir yuklendi.")

cat_cache  = dict(zip(
    read_db("categories", "name, id")["name"].tolist(),
    read_db("categories", "name, id")["id"].astype(int).tolist()
))
store_ids  = get_store_ids()

existing_skus = set(read_db("products", "sku")["sku"].dropna().astype(str).tolist())
pak_products  = []
for _, row in df_pak.drop_duplicates(subset=["sku"]).iterrows():
    sku = str(row.get("sku", "")).strip()
    if not sku or sku == "nan" or sku in existing_skus:
        continue
    cat_name = str(row.get("category_name_1","General")).strip()[:100]
    cat_id   = get_or_create_category(cat_name, cat_cache)
    price    = abs(float(pd.to_numeric(row["price"], errors="coerce") or 1.0))
    pak_products.append({
        "store_id":    random.choice(store_ids) if store_ids else None,
        "category_id": cat_id,
        "sku":         sku[:255],
        "brand":       None,
        "name":        str(row.get("sku","Product"))[:255],
        "unit_price":  max(price, 0.01),
        "stock":       random.randint(10, 300),
        "description": f"{cat_name} urunu.",
        "emoji":       "🛍️",
        "image_url":   None,
        "rating":      round(random.uniform(3.0, 5.0), 1),
        "created_at":  datetime.datetime.now(),
    })
    existing_skus.add(sku)

if pak_products:
    print(f"  {len(pak_products)} yeni urun ekleniyor...")
    insert(pd.DataFrame(pak_products), "products")

prods_db   = read_db("products", "id, sku")
sku_to_pid = {str(r["sku"]): int(r["id"]) for _, r in prods_db.iterrows()}

existing_emails_set = set(read_db("users", "email")["email"].tolist())
pak_users = []
unique_cust_ids = df_pak["Customer ID"].dropna().unique()
for cid in unique_cust_ids:
    email = f"pak_{str(cid).strip()[:40]}@datapulse.shop"
    if email in existing_emails_set:
        continue
    pak_users.append({
        "email":         email,
        "password_hash": DUMMY_HASH,
        "name":          f"PakCustomer {cid}",
        "role_type":     "INDIVIDUAL",
        "gender":        random.choice(["M", "F"]),
        "avatar":        None,
        "status":        "ACTIVE",
        "created_at":    datetime.datetime.now(),
    })
    existing_emails_set.add(email)

if pak_users:
    print(f"  {len(pak_users)} yeni kullanici ekleniyor...")
    insert(pd.DataFrame(pak_users), "users")

users_db      = read_db("users", "id, email")
email_to_uid  = dict(zip(users_db["email"], users_db["id"].astype(int)))

PAK_STATUS_MAP = {
    "complete":   "COMPLETED",
    "completed":  "COMPLETED",
    "canceled":   "CANCELLED",
    "cancelled":  "CANCELLED",
    "pending":    "PENDING",
    "processing": "PROCESSING",
    "shipped":    "SHIPPED",
}

pak_orders = []
pak_items  = []
prev_max   = max_id("orders")

for _, row in df_pak.iterrows():
    cid    = str(row.get("Customer ID","")).strip()
    email  = f"pak_{cid[:40]}@datapulse.shop"
    uid    = email_to_uid.get(email)
    sku    = str(row.get("sku","")).strip()
    pid    = sku_to_pid.get(sku)
    if not uid or not pid:
        continue
    status = PAK_STATUS_MAP.get(str(row.get("status","")).strip().lower(), "COMPLETED")
    try:
        total = abs(float(row["grand_total"]))
    except (ValueError, TypeError):
        total = 1.0
    try:
        disc = abs(float(row.get("discount_amount", 0) or 0))
    except (ValueError, TypeError):
        disc = 0.0
    try:
        created = pd.to_datetime(row.get("created_at"), errors="coerce")
        created = created if pd.notna(created) else datetime.datetime.now()
    except Exception:
        created = datetime.datetime.now()

    pak_orders.append({
        "user_id":        uid,
        "store_id":       random.choice(store_ids) if store_ids else None,
        "status":         status,
        "grand_total":    max(total, 0.01),
        "payment_method": str(row.get("payment_method",""))[:100] if pd.notna(row.get("payment_method")) else "Cash",
        "discount":       disc,
        "tax":            round(total * 0.05, 2),
        "shipping_cost":  round(random.uniform(5, 25), 2),
        "city":           None,
        "state":          None,
        "country":        "Pakistan",
        "created_at":     created,
    })

print(f"  {len(pak_orders)} siparis ekleniyor...")
if pak_orders:
    insert(pd.DataFrame(pak_orders), "orders")
    new_ids = pd.read_sql(
        f"SELECT id FROM orders WHERE id > {prev_max} ORDER BY id ASC",
        engine
    )["id"].astype(int).tolist()

    valid_pak = [(i, v) for i, v in enumerate(df_pak.iterrows())
                 if sku_to_pid.get(str(v[1].get("sku","")).strip())]

    for idx, (_, row) in enumerate(df_pak.iterrows()):
        if idx >= len(new_ids):
            break
        sku = str(row.get("sku","")).strip()
        pid = sku_to_pid.get(sku)
        if not pid:
            continue
        try:
            price = abs(float(pd.to_numeric(row["price"], errors="coerce") or 1.0))
        except Exception:
            price = 1.0
        try:
            qty = max(int(float(row.get("qty_ordered", 1) or 1)), 1)
        except Exception:
            qty = 1
        pak_items.append({
            "order_id":   new_ids[idx],
            "product_id": pid,
            "quantity":   qty,
            "price":      max(price, 0.01),
            "discount":   0.0,
        })

    if pak_items:
        print(f"  {len(pak_items)} siparis kalemi ekleniyor...")
        insert(pd.DataFrame(pak_items), "order_items")

print(f"  Toplam siparis: {count('orders')} | Kalem: {count('order_items')}")

# ============================================================
# BOLUM 3 — Amazon Reviews TSV
# ============================================================
print("\n" + "=" * 60)
print("  BOLUM 3: Amazon Reviews TSV (ilk 10K kayit)")
print("=" * 60)

tsv_path   = "data/amazon_reviews_multilingual_US_v1_00.tsv"
REV_LIMIT  = 10000

print("  TSV okunuyor...")
df_rev = pd.read_csv(
    tsv_path, sep="\t", nrows=REV_LIMIT,
    on_bad_lines="skip", encoding="utf-8",
    dtype=str
)
df_rev = df_rev.dropna(subset=["customer_id", "star_rating"])
print(f"  {len(df_rev)} yorum satirr yuklendi.")

existing_emails_set = set(read_db("users", "email")["email"].tolist())
rev_users = []
for cid in df_rev["customer_id"].unique():
    email = f"rev_{str(cid).strip()[:40]}@datapulse.shop"
    if email in existing_emails_set:
        continue
    rev_users.append({
        "email":         email,
        "password_hash": DUMMY_HASH,
        "name":          f"Reviewer {cid}",
        "role_type":     "INDIVIDUAL",
        "gender":        random.choice(["M", "F"]),
        "avatar":        None,
        "status":        "ACTIVE",
        "created_at":    datetime.datetime.now(),
    })
    existing_emails_set.add(email)

if rev_users:
    print(f"  {len(rev_users)} yeni kullanici ekleniyor...")
    insert(pd.DataFrame(rev_users), "users")

users_db     = read_db("users", "id, email")
email_to_uid = dict(zip(users_db["email"], users_db["id"].astype(int)))

existing_skus = set(read_db("products", "sku")["sku"].dropna().astype(str).tolist())
rev_products  = []
for _, row in df_rev.drop_duplicates(subset=["product_id"]).iterrows():
    sku = str(row.get("product_id","")).strip()
    if not sku or sku in existing_skus:
        continue
    cat_name = str(row.get("product_category","Books")).strip()[:100]
    cat_id   = get_or_create_category(cat_name, cat_cache)
    rev_products.append({
        "store_id":    random.choice(store_ids) if store_ids else None,
        "category_id": cat_id,
        "sku":         sku[:255],
        "brand":       None,
        "name":        str(row.get("product_title","Product"))[:255],
        "unit_price":  round(random.uniform(5.0, 100.0), 2),
        "stock":       random.randint(10, 200),
        "description": "",
        "emoji":       "📦",
        "image_url":   None,
        "rating":      0.0,
        "created_at":  datetime.datetime.now(),
    })
    existing_skus.add(sku)

if rev_products:
    print(f"  {len(rev_products)} yeni urun ekleniyor...")
    insert(pd.DataFrame(rev_products), "products")

prods_db   = read_db("products", "id, sku")
sku_to_pid = {str(r["sku"]): int(r["id"]) for _, r in prods_db.iterrows()}

reviews_to_ins = []
for _, row in df_rev.iterrows():
    email = f"rev_{str(row['customer_id']).strip()[:40]}@datapulse.shop"
    uid   = email_to_uid.get(email)
    pid   = sku_to_pid.get(str(row.get("product_id","")).strip())
    if not uid or not pid:
        continue
    try:
        star = int(float(row["star_rating"]))
    except Exception:
        star = 3
    star = max(1, min(5, star))
    sentiment = "POSITIVE" if star >= 4 else "NEGATIVE" if star <= 2 else "NEUTRAL"
    try:
        helpful = int(float(row.get("helpful_votes", 0) or 0))
    except Exception:
        helpful = 0
    try:
        total_v = int(float(row.get("total_votes", 0) or 0))
    except Exception:
        total_v = 0
    vine     = str(row.get("vine","N")).strip().upper() == "Y"
    verified = str(row.get("verified_purchase","N")).strip().upper() == "Y"
    rev_text = str(row.get("review_body",""))[:2000]
    if rev_text.lower() == "nan":
        rev_text = ""
    headline = str(row.get("review_headline",""))[:500]
    if headline.lower() == "nan":
        headline = ""
    try:
        created = pd.to_datetime(row.get("review_date"), errors="coerce")
        created = created if pd.notna(created) else datetime.datetime.now()
    except Exception:
        created = datetime.datetime.now()

    reviews_to_ins.append({
        "user_id":           uid,
        "product_id":        pid,
        "star_rating":       star,
        "review_text":       rev_text,
        "review_headline":   headline,
        "helpful":           helpful,
        "helpful_votes":     helpful,
        "total_votes":       total_v,
        "sentiment":         sentiment,
        "vine":              vine,
        "verified_purchase": verified,
        "marketplace":       str(row.get("marketplace","US"))[:50],
        "created_at":        created,
    })

if reviews_to_ins:
    print(f"  {len(reviews_to_ins)} yorum ekleniyor...")
    insert(pd.DataFrame(reviews_to_ins), "reviews", chunk=1000)

print(f"  Toplam reviews: {count('reviews')}")

# ============================================================
# BOLUM 4 — Online Retail II
# ============================================================
print("\n" + "=" * 60)
print("  BOLUM 4: Online Retail II CSV")
print("=" * 60)

retail_csv  = "data/online_retail_II.csv"
RETAIL_LIMIT = 50000

print(f"  Dosya okunuyor (ilk {RETAIL_LIMIT} satir)...")
df_ret = pd.read_csv(retail_csv, nrows=RETAIL_LIMIT, encoding="utf-8",
                     dtype={"StockCode": str, "Customer ID": str})
df_ret = df_ret.dropna(subset=["Invoice", "StockCode", "Price"])
df_ret = df_ret[pd.to_numeric(df_ret["Price"], errors="coerce") > 0]
df_ret = df_ret[pd.to_numeric(df_ret["Quantity"], errors="coerce") > 0]
print(f"  {len(df_ret)} temiz satir yuklendi.")

existing_skus = set(read_db("products", "sku")["sku"].dropna().astype(str).tolist())
cat_cache_ret = dict(cat_cache)
ret_products  = []
for _, row in df_ret.drop_duplicates(subset=["StockCode"]).iterrows():
    sku = str(row["StockCode"]).strip()
    if not sku or sku in existing_skus:
        continue
    cat_id = get_or_create_category("Home & Retail", cat_cache_ret)
    price  = abs(float(row["Price"]))
    desc   = str(row.get("Description",""))[:255] if pd.notna(row.get("Description")) else ""
    ret_products.append({
        "store_id":    random.choice(store_ids) if store_ids else None,
        "category_id": cat_id,
        "sku":         sku[:255],
        "brand":       None,
        "name":        desc[:255] or sku,
        "unit_price":  max(price, 0.01),
        "stock":       random.randint(10, 500),
        "description": desc,
        "emoji":       "🛒",
        "image_url":   None,
        "rating":      round(random.uniform(3.0, 5.0), 1),
        "created_at":  datetime.datetime.now(),
    })
    existing_skus.add(sku)

if ret_products:
    print(f"  {len(ret_products)} yeni urun ekleniyor...")
    insert(pd.DataFrame(ret_products), "products")

prods_db   = read_db("products", "id, sku")
sku_to_pid = {str(r["sku"]): int(r["id"]) for _, r in prods_db.iterrows()}

existing_emails_set = set(read_db("users", "email")["email"].tolist())
ret_users = []
for cid in df_ret["Customer ID"].dropna().unique():
    email = f"retail_{str(cid).strip()[:40]}@datapulse.shop"
    if email in existing_emails_set:
        continue
    ret_users.append({
        "email":         email,
        "password_hash": DUMMY_HASH,
        "name":          f"RetailCustomer {cid}",
        "role_type":     "INDIVIDUAL",
        "gender":        random.choice(["M", "F"]),
        "avatar":        None,
        "status":        "ACTIVE",
        "created_at":    datetime.datetime.now(),
    })
    existing_emails_set.add(email)

if ret_users:
    print(f"  {len(ret_users)} yeni kullanici ekleniyor...")
    insert(pd.DataFrame(ret_users), "users")

users_db     = read_db("users", "id, email")
email_to_uid = dict(zip(users_db["email"], users_db["id"].astype(int)))

prev_max    = max_id("orders")
ret_orders  = []
ret_items   = []
invoice_uid = {}

for invoice, grp in df_ret.groupby("Invoice"):
    cid = str(grp["Customer ID"].iloc[0]).strip() if pd.notna(grp["Customer ID"].iloc[0]) else None
    email = f"retail_{cid[:40]}@datapulse.shop" if cid else None
    uid   = email_to_uid.get(email) if email else None
    if not uid:
        continue
    try:
        created = pd.to_datetime(grp["InvoiceDate"].iloc[0], errors="coerce")
        created = created if pd.notna(created) else datetime.datetime.now()
    except Exception:
        created = datetime.datetime.now()

    total = float(sum(
        float(r["Price"]) * int(float(r["Quantity"]))
        for _, r in grp.iterrows()
        if pd.notna(r["Price"]) and pd.notna(r["Quantity"])
    ))
    country = str(grp["Country"].iloc[0])[:100] if pd.notna(grp["Country"].iloc[0]) else "United Kingdom"
    ret_orders.append({
        "user_id":        uid,
        "store_id":       random.choice(store_ids) if store_ids else None,
        "status":         "COMPLETED",
        "grand_total":    max(round(total, 2), 0.01),
        "payment_method": "Credit Card",
        "discount":       0.0,
        "tax":            round(total * 0.20, 2),
        "shipping_cost":  round(random.uniform(3, 15), 2),
        "city":           None,
        "state":          None,
        "country":        country,
        "created_at":     created,
    })
    invoice_uid[str(invoice)] = (uid, grp)

print(f"  {len(ret_orders)} siparis ekleniyor...")
if ret_orders:
    insert(pd.DataFrame(ret_orders), "orders")
    new_ids = pd.read_sql(
        f"SELECT id FROM orders WHERE id > {prev_max} ORDER BY id ASC",
        engine
    )["id"].astype(int).tolist()

    for idx, (invoice_key, (uid, grp)) in enumerate(invoice_uid.items()):
        if idx >= len(new_ids):
            break
        order_id = new_ids[idx]
        for _, row in grp.iterrows():
            sku = str(row["StockCode"]).strip()
            pid = sku_to_pid.get(sku)
            if not pid:
                continue
            try:
                qty   = max(int(float(row["Quantity"])), 1)
                price = max(float(row["Price"]), 0.01)
            except Exception:
                continue
            ret_items.append({
                "order_id":   order_id,
                "product_id": pid,
                "quantity":   qty,
                "price":      price,
                "discount":   0.0,
            })

    if ret_items:
        print(f"  {len(ret_items)} siparis kalemi ekleniyor...")
        insert(pd.DataFrame(ret_items), "order_items", chunk=1000)

print(f"  Toplam siparis: {count('orders')} | Kalem: {count('order_items')}")

# ============================================================
# OZET
# ============================================================
print("\n" + "=" * 60)
print("  TUM YUKLEMELER TAMAMLANDI!")
print("=" * 60)
print(f"  Kategoriler      : {count('categories')}")
print(f"  Urunler          : {count('products')}")
print(f"  Kullanicilar     : {count('users')}")
print(f"  Musteriprofilleri: {count('customer_profiles')}")
print(f"  Siparisler       : {count('orders')}")
print(f"  Siparis Kalemleri: {count('order_items')}")
print(f"  Gonderiler       : {count('shipments')}")
print(f"  Yorumlar         : {count('reviews')}")
print(f"  Audit Loglar     : {count('audit_logs')}")
print("=" * 60)
