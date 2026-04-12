import pandas as pd
import random
from sqlalchemy import create_engine
from faker import Faker
import datetime

# ==========================================
# 1. VERİTABANI BAĞLANTISI VE AYARLAR
# ==========================================
# Kendi MySQL kullanıcı adın (örn: root) ve şifren ile değiştir.
DB_URL = 'mysql+pymysql://root:1234@localhost:3306/ecommerce_db'
engine = create_engine(DB_URL)
fake = Faker()

# İndirdiğin Kaggle TSV veri setinin yolu
# Dosyanın tam adına göre burayı güncelle.
FILE_PATH = 'data/Pakistan Largest Ecommerce Dataset.csv'

print("1. Veri TSV dosyasından okunuyor (Bu biraz sürebilir)...")
# Belleği ve veritabanını test etmek için ilk etapta 10.000 satır okuyoruz.
# Gerçek aktarımda nrows=10000 parametresini silebilir veya artırabilirsin.
df = pd.read_csv(FILE_PATH, sep='\t', on_bad_lines='skip', nrows=10000)

# Veriyi temizle (Boş customer_id veya product_id olanları at)
df = df.dropna(subset=['customer_id', 'product_id', 'product_title'])

# ==========================================
# 2. USERS (Kullanıcılar)
# ==========================================
print("2. Kullanıcılar (Users) oluşturuluyor...")
unique_customers = df['customer_id'].unique()

users_data = []
# Mağaza Sahipleri (CORPORATE) - Sahte Veri
for i in range(10):
    users_data.append({
        'email': fake.unique.email(),
        'password_hash': '$2a$10$dummyBCryptHashHereForMocking...', # Spring Security uyumlu sahte hash
        'name': fake.company() + " Admin",
        'role_type': 'CORPORATE',
        'gender': random.choice(['M', 'F', 'OTHER']),
        'avatar': fake.image_url(),
        'status': 'ACTIVE',
        'created_at': datetime.datetime.now()
    })

# İnceleme Yapanlar (INDIVIDUAL) - Gerçek Amazon Customer ID'lerinden
for customer_id in unique_customers:
    users_data.append({
        'email': f"{str(customer_id)}@amazon-dummy.com",
        'password_hash': '$2a$10$dummyBCryptHashHereForMocking...',
        'name': fake.name(),
        'role_type': 'INDIVIDUAL',
        'gender': random.choice(['M', 'F', None]),
        'avatar': fake.image_url(),
        'status': 'ACTIVE',
        'created_at': datetime.datetime.now()
    })

df_users = pd.DataFrame(users_data)
df_users.to_sql('users', engine, if_exists='append', index=False)

# Veritabanına eklenen kullanıcıların ID'lerini çek
saved_users = pd.read_sql("SELECT id, email, role_type FROM users", engine)
corporate_users = saved_users[saved_users['role_type'] == 'CORPORATE']['id'].tolist()

# Amazon Customer ID -> Database User ID Eşleştirmesi
saved_individuals = saved_users[saved_users['role_type'] == 'INDIVIDUAL'].copy()
saved_individuals['amazon_id'] = saved_individuals['email'].apply(lambda x: x.split('@')[0])
reviewer_to_db_id = dict(zip(saved_individuals['amazon_id'], saved_individuals['id']))

# ==========================================
# 3. STORES (Mağazalar)
# ==========================================
print("3. Mağazalar (Stores) oluşturuluyor...")
stores_data = []
for owner_id in corporate_users:
    stores_data.append({
        'name': fake.company() + " Store",
        'owner_id': owner_id,
        'status': 'OPEN',
        'category': 'Electronics', # Veri seti Electronics olduğu için
        'rating': round(random.uniform(3.5, 5.0), 1),
        'created_at': datetime.datetime.now()
    })
df_stores = pd.DataFrame(stores_data)
df_stores.to_sql('stores', engine, if_exists='append', index=False)
saved_stores = pd.read_sql("SELECT id FROM stores", engine)['id'].tolist()

# ==========================================
# 4. CATEGORIES (Kategoriler)
# ==========================================
print("4. Kategoriler (Categories) oluşturuluyor...")
# Kaggle setinde kategori 'product_category' kolonunda bulunur
categories = df['product_category'].dropna().unique()

cat_data = [{'name': str(c)[:255], 'description': f'{c} category items'} for c in categories]
df_cat = pd.DataFrame(cat_data)
df_cat.drop_duplicates(subset=['name'], inplace=True)
df_cat.to_sql('categories', engine, if_exists='append', index=False)

saved_categories = pd.read_sql("SELECT id, name FROM categories", engine)
cat_to_db_id = dict(zip(saved_categories['name'], saved_categories['id']))

# ==========================================
# 5. PRODUCTS (Ürünler)
# ==========================================
print("5. Ürünler (Products) oluşturuluyor...")
products_data = []
# Aynı ürünü defalarca eklememek için DataFrame'i product_id'ye göre tekilleştiriyoruz
unique_products_df = df.drop_duplicates(subset=['product_id'])

for _, row in unique_products_df.iterrows():
    product_id = str(row['product_id'])
    title = str(row['product_title'])[:255]
    cat_name = str(row['product_category'])

    category_id = cat_to_db_id.get(cat_name)

    products_data.append({
        'store_id': random.choice(saved_stores),
        'category_id': category_id,
        'sku': product_id,
        'name': title,
        'unit_price': round(random.uniform(10.0, 500.0), 2), # Kaggle setinde fiyat yok, mockluyoruz
        'stock': random.randint(10, 500),
        'description': fake.text(max_nb_chars=800), # Kaggle setinde açıklama yok, mockluyoruz
        'emoji': '📱',
        'image_url': fake.image_url(), # Mock
        'rating': 0.0,
        'created_at': datetime.datetime.now()
    })

df_products = pd.DataFrame(products_data)
df_products.to_sql('products', engine, if_exists='append', index=False)

saved_products = pd.read_sql("SELECT id, sku FROM products", engine)
asin_to_db_id = dict(zip(saved_products['sku'], saved_products['id']))

# ==========================================
# 6. REVIEWS (Değerlendirmeler)
# ==========================================
print("6. Yorumlar (Reviews) oluşturuluyor...")
reviews_data = []

for _, row in df.iterrows():
    amazon_product_id = str(row['product_id'])
    amazon_customer_id = str(row['customer_id'])

    db_product_id = asin_to_db_id.get(amazon_product_id)
    db_user_id = reviewer_to_db_id.get(amazon_customer_id)

    if pd.isna(db_product_id) or pd.isna(db_user_id):
        continue

    # Kaggle setinde helpful_votes ve total_votes hazır kolon olarak gelir
    helpful_votes = int(row.get('helpful_votes', 0))
    total_votes = int(row.get('total_votes', 0))
    star_rating = int(row.get('star_rating', 5))

    # NaN değerleri veya çok uzun metinleri kontrol et
    review_text = str(row.get('review_body', ''))[:2000]
    if review_text.lower() == 'nan':
        review_text = "No review text provided."

    sentiment = "POSITIVE" if star_rating >= 4 else "NEGATIVE" if star_rating <= 2 else "NEUTRAL"

    reviews_data.append({
        'user_id': db_user_id,
        'product_id': db_product_id,
        'star_rating': star_rating,
        'review_text': review_text,
        'helpful': helpful_votes,
        'helpful_votes': helpful_votes,
        'total_votes': total_votes,
        'sentiment': sentiment,
        'created_at': datetime.datetime.now()
    })

# Belleği rahatlatmak için yorumları parçalar halinde (chunk) yazdırabiliriz
df_final_reviews = pd.DataFrame(reviews_data)
df_final_reviews.to_sql('reviews', engine, if_exists='append', index=False, chunksize=5000)

print("🎉 İşlem başarıyla tamamlandı! Veriler veritabanına aktarıldı.")
