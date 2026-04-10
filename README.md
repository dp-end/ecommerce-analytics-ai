# 🚀 AI-Powered E-Commerce Analytics Platform

Bu platform, karmaşık e-ticaret verilerini yapay zeka yardımıyla anlamlandırmak için tasarlanmış, uçtan uca bir analiz çözümüdür. Kullanıcıların veritabanı sorgularını teknik bilgi gerektirmeden doğal dilde (Text2SQL) gerçekleştirmesine olanak tanıyan çoklu ajanlı (multi-agent) bir AI mimarisine sahiptir.

---

## 🌟 Öne Çıkan Özellikler

- **🤖 AI Chatbot (Text2SQL):** Kullanıcıların "Geçen ay en çok satan 5 ürün hangisi?" gibi sorularını anlık olarak SQL sorgularına dönüştüren ve veritabanından veri çeken entegre yapay zeka modülü (Gemini 2.0 Flash Lite destekli).
- **📊 Çoklu Rol Yönetimi:** - **Admin:** Sistem geneli denetim ve audit log takibi.
  - **Kurumsal (Store Owner):** Satış analizleri, stok takibi ve müşteri yorum analizi.
  - **Bireysel (Customer):** Sipariş geçmişi ve profil yönetimi.
- **🛡️ Gelişmiş Güvenlik:** Role-based access control (RBAC), JWT tabanlı kimlik doğrulama ve Angular Guards ile korunan route yapıları.
- **⚡ Modern Frontend Mimari:** Angular 21'in yeni nesil özellikleriyle (Signals, Standalone Components) optimize edilmiş yüksek performanslı arayüz.

---

## 🛠️ Teknoloji Yığını

- **Frontend:** [Angular 21](https://angular.dev/) (v21.1.0), TypeScript, RxJS, Chart.js, Lucide-Angular.
- **Backend:** Java 25, Spring Boot 4.0.5, Spring Security, Spring Data JPA.
- **Veritabanı:** MySQL.
- **AI/LLM:** Multi-Agent AI Framework, Text2SQL Modeling, Google Gemini.
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
- Angular CLI (v21.1.3)
- Java 25 ve Maven
- MySQL Server (Port: 3306)

export AI_GEMINI_API_KEY="sizin_gemini_api_anahtariniz"
