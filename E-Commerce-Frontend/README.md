# 🚀 AI-Powered E-Commerce Analytics Platform

Bu platform, karmaşık e-ticaret verilerini yapay zeka yardımıyla anlamlandırmak için tasarlanmış, uçtan uca bir analiz çözümüdür. Kullanıcıların veritabanı sorgularını teknik bilgi gerektirmeden doğal dilde (Text2SQL) gerçekleştirmesine olanak tanıyan çoklu ajanlı (multi-agent) bir AI mimarisine sahiptir.

---

## 🌟 Öne Çıkan Özellikler

- **🤖 AI Chatbot (Text2SQL):** Kullanıcıların "Geçen ay en çok satan 5 ürün hangisi?" gibi sorularını anlık olarak SQL sorgularına dönüştüren ve veritabanından veri çeken entegre yapay zeka modülü.
- **📊 Çoklu Rol Yönetimi:** - **Admin:** Sistem geneli denetim ve audit log takibi.
  - **Kurumsal (Store Owner):** Satış analizleri, stok takibi ve müşteri yorum analizi.
  - **Bireysel (Customer):** Sipariş geçmişi ve profil yönetimi.
- **🛡️ Gelişmiş Güvenlik:** Role-based access control (RBAC) ve Angular Guards ile korunan route yapıları.
- **⚡ Modern Frontend Mimari:** Angular 19'un yeni nesil özellikleriyle (Signals, Standalone Components) optimize edilmiş yüksek performanslı arayüz.

---

## 🛠️ Teknoloji Yığını

- **Frontend:** [Angular 19](https://angular.dev/), TypeScript, RxJS, CSS3.
- **Backend:** Spring Boot (Java), PostgreSQL.
- **AI/LLM:** Multi-Agent AI Framework, Text2SQL Modeling.
- **Araçlar:** Git, VS Code, Docker.

---

## 🏗️ Proje Mimarisi

Proje, sürdürülebilirlik ve ölçeklenebilirlik için modüler bir yapıda kurgulanmıştır:

- **Core:** Authentication, Interceptors, Guards ve merkezi servisler.
- **Features:** İşlevsel modüller (Admin dashboard, Chatbot, Analytics).
- **Shared:** Reusable UI bileşenleri (Navbar, Sidebar, Stat-cards).



---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js (v18+)
- Angular CLI

### Adımlar
1. Projeyi klonlayın:
   ```bash
   git clone [https://github.com/dp-end/ecommerce-analytics-ai.git](https://github.com/dp-end/ecommerce-analytics-ai.git)
