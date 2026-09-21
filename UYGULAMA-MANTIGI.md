# YDS Monster — Uygulama Mantığı

Bu belge, uygulamanın **ne yaptığını** sade dille anlatır. Teknik altyapı yoktur. Amaç: ürün iyileştirme önerisi almak.

---

## Uygulama ne işe yarar?

**YDS Monster**, YDS / YÖKDİL’e hazırlananlar için kelime ezberleme uygulamasıdır. Kullanıcı bir **modül** seçer, alt **grup**larla çalışır; kart çevirir, quiz çözer, yarışa girer, AI ile paragraf/test yapar. İlerleme, favoriler, günlük/haftalık tekrar ve rozetlerle takip edilir. Ana özellikler giriş sonrası açılır.

---

## Kısa öğrenme akışı

1. Kullanıcı kayıt olur / giriş yapar.
2. Ana sayfada bir **modül** seçer (ör. Genel, Phrasal Verbs, Tense).
3. Modül içinde bir **alt grup** (veya tense/seviye kategorisi) seçer.
4. **Kartlar** ile kelimeleri görür: sağa kaydırınca “ezberledim”, sola “ezberleyemedim”.
5. Aynı gruptan **Quiz** çözer; yanlışlar favoriye eklenebilir.
6. İsterse **Yarış**, **AI paragraf/test**, **günlük/haftalık tekrar** veya **ezberleyemediklerim** listesiyle pekiştirir.
7. İstatistik ve rozetlerle ilerlemeyi görür.

Klasik “aralıklı tekrar algoritması” yoktur: tekrar, kullanıcının “ezberledim / ezberleyemedim” işaretlerine ve günlük-haftalık listelere dayanır.

---

## İçerik modülleri

Her modül ayrı bir kelime paketidir. Çoğunda çalışma birimi **yaklaşık 20’lik alt gruplardır**. Kullanıcı grubu bitirince ilerleme/tamamlandı işaretlenir.

| Modül | Ne yapar? |
|--------|-----------|
| **Genel** | Genel YDS kelime listesi; görselli kartlarla ezber. |
| **En Sık Çıkan** | Sınavda sık geçen kelimeler; görselli kartlar. |
| **Seviye Seviye** | Kelimeler seviye gruplarına ayrılır; seviyeye göre ilerleme. |
| **En sık çıkan fiiller** | Sık geçen fiiller paketi; görselli kartlar. |
| **En sık çıkan sıfatlar** | Sık geçen sıfatlar paketi. |
| **En sık çıkan zarflar** | Sık geçen zarflar paketi. |
| **Tense Anahtar** | Zaman/tense kategorilerine göre anahtar kelimeler + gramer **kural kartları**. Quiz bu modülde ayrı “Tense Quiz” olarak çalışır (zorluk seçimi, boşluk doldurma tarzı sorular). |
| **Phrasal Verbs** | Phrasal fiiller ve Türkçe anlamları; gruplar halinde çalışma. |
| **Irregular Verbs** | Düzensiz fiiller; kart ve quiz’de **V2 / V3** (geçmiş / past participle) yazma/öğrenme odaklı. |
| **Admin’in eklediği modüller** | Yönetici yeni paket ekleyebilir; kullanıcıda diğer modüller gibi kart/quiz/yarış akışına girer. |

---

## Ana özellikler (ne işe yarar?)

### Ana Sayfa
- Selamlama ve **Devam et** (son kaldığı modül/grup).
- Modül seçimi.
- **Günlük tekrar** kısayolu.
- **Sadece ezberleyemediklerim** filtresi.
- Kartlar / Quiz’e hızlı geçiş.
- **Günün Kelimesi** (seçili modülden günlük bir kelime).

### Kartlar
- Kaydırmalı çalışma kartı.
- **Sağ** = ezberledim, **sol** = ezberleyemedim.
- Kartı çevirme, favoriye ekleme, telaffuz dinleme.
- Tense’te önce gramer kural kartları; irregular’da V2/V3 bilgisi; bazı modüllerde arka plan görseli.

### Quiz
- Çoğu modülde: İngilizce kelime → **4 şıklı Türkçe anlam**.
- **Tense Quiz**: ayrı akış (zorluk + soru sayısı).
- **Irregular**: yazmalı V2/V3.
- Yanlışlar favoriye eklenebilir; ilerleme kaydedilir.
- Practice: ezberleyemedikler / özel listeden quiz.

### Yarış (Passaparola tarzı)
- Seçili modül grubundan harf çemberi; Türkçe ipucu → İngilizce kelime.
- Süre ve harf sayısı sınırlı.
- **Antrenman** (tek kişi) veya **rakiple yarış** (davet / aynı kelime seti).
- Sonuç, puan, yanlış/pas özeti; karakter seçimi.

### AI Stüdyo
- **Paragraf**: Ezberleyemediğin kelimelerden seç → AI İngilizce paragraf (+ Türkçe). Kelimeye dokununca anlam; paragraftan “ezberledim” işaretlenebilir.
- **Test**: Günlük/haftalık ezber eşiği dolunca AI **boşluk doldurma** testi; yanlışlar favoriye eklenebilir.

### Günlük / Haftalık Tekrar
- O gün veya son 7 günde **“ezberledim”** dediğin kelimeleri kartla yeniden çalıştırır.

### Ezberleyemediklerim
- Sola kaydırılan kelimelerin listesi (modül modül).
- Listeden kart veya quiz practice başlatılabilir.

### Favoriler
- Yıldızlanan kelimeler; liste veya kart modu; telaffuz; favoriden çıkarma.

### İstatistikler
- Toplam ezberlenen kelime, **günlük seri**, rozet özeti.
- Günlük/haftalık listeler ve ezberleyemediklerim girişi.
- Yarış galibiyet/puanı, son yarışlar.
- Kelime / seri / grup rozet vitrinleri.

### Profil
- Toplam kelime, seri, rozet.
- Haftalık grafik.
- Ezber ve aktivite sıralaması (quiz/yarış dahil).
- Çıkış.

### Tekrar Et (çoklu pratik)
- Birden fazla modülden rastgele N kelime seçip kart veya quiz ile pratik.

### Rozetler
- Belirli kelime sayıları (ör. 50’şer), seri günleri, tamamlanan alt gruplar için rozet; kazanınca kutlama.

### PWA
- Telefona “Ana ekrana ekle” ile uygulama gibi kullanım.

### Hesap
- Kayıt, e-posta doğrulama, giriş, şifre sıfırlama.

### Yönetici (sadece admin)
- Kelime / modül ekleme–düzenleme.
- Kullanıcı listesi ve aktivite.
- Toplu istatistik.

---

## ChatGPT’ye yapıştırılacak prompt

Aşağıyı (ve üstteki belgeyi) birlikte ver:

```
Aşağıda YDS / YÖKDİL kelime ezberleme uygulaması “YDS Monster”ın ürün mantığı var.
Teknik öneri isteme. Ürün / öğrenme deneyimi odaklı düşün.

Şunları iste:
1) Güçlü yanlar (kısa)
2) Zayıf / eksik yanlar (öğrenme, motivasyon, akış, netlik)
3) Öncelikli 8–12 iyileştirme önerisi (etki × kolaylık; her biri 2–3 cümle)
4) Modüller arası tutarsızlıklar (kart / quiz / tense / irregular / AI)
5) “Tekrar” mantığını güçlendirmek için ürün fikirleri (spaced repetition demeden, kullanıcı dilinde)
6) İlk açılış ve günlük alışkanlık için UX önerileri
7) Yapılmaması gerekenler (karmaşıklık artırır, odak dağıtır)

Cevabı Türkçe, maddeli ve uygulanabilir tut. Kod veya mimari yazma.
```
