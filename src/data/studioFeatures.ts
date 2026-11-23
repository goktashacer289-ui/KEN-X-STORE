export interface StudioFeature {
  id: number;
  name: string;
  category: string;
  tier: 'NORMAL' | 'PLUS';
  description: string;
}

export const STUDIO_FEATURES: StudioFeature[] = [
  // 1–10: Oyun oluşturma
  { id: 1, name: '2D oyun oluşturma', category: 'Oyun Oluşturma', tier: 'NORMAL', description: 'İki boyutlu piksel ve vektörel oyun dünyaları inşa etme motoru.' },
  { id: 2, name: '3D oyun oluşturma', category: 'Oyun Oluşturma', tier: 'NORMAL', description: 'Üç boyutlu derinlikli çevreler ve 3D kamera kontrolleri.' },
  { id: 3, name: 'Platform oyunu oluşturma', category: 'Oyun Oluşturma', tier: 'NORMAL', description: 'Klasik engelli zıplama ve bölüm sonu canavarlı platform şablonu.' },
  { id: 4, name: 'Yarış oyunu oluşturma', category: 'Oyun Oluşturma', tier: 'NORMAL', description: 'Hızlı araç fiziği, drift mekanikleri ve kontrol noktaları.' },
  { id: 5, name: 'Korku oyunu oluşturma', category: 'Oyun Oluşturma', tier: 'NORMAL', description: 'Karanlık atmosfer, gerilim sesleri ve anlık korku tetikleyicileri.' },
  { id: 6, name: 'Macera oyunu oluşturma', category: 'Oyun Oluşturma', tier: 'NORMAL', description: 'Hikaye odaklı keşif, etkileşimli NPC ve diyalog ağları.' },
  { id: 7, name: 'Simülasyon oyunu oluşturma', category: 'Oyun Oluşturma', tier: 'NORMAL', description: 'Gerçekçi fizik, kaynak döngüsü ve yönetim simülasyonları.' },
  { id: 8, name: 'Bulmaca oyunu oluşturma', category: 'Oyun Oluşturma', tier: 'NORMAL', description: 'Mantık ve zeka tabanlı bulmaca mekanizmaları ve kilitler.' },
  { id: 9, name: 'Savaş oyunu oluşturma', category: 'Oyun Oluşturma', tier: 'NORMAL', description: 'Arena çatışmaları, mermi fiziği ve taktiksel siper mekanikleri.' },
  { id: 10, name: 'Açık dünya oyunu oluşturma', category: 'Oyun Oluşturma', tier: 'PLUS', description: 'Devasa kesintisiz harita akışı, uzak çizim mesafesi ve serbest keşif.' },

  // 11–20: Tasarım araçları
  { id: 11, name: 'Karakter tasarımı', category: 'Tasarım Araçları', tier: 'PLUS', description: 'Gelişmiş kemik iskelet giydirme ve çok katmanlı 3D karakter modelleme.' },
  { id: 12, name: 'Harita tasarımı', category: 'Tasarım Araçları', tier: 'NORMAL', description: 'Standart fırça araçlarıyla arazi yükseltme ve yüzey boyama.' },
  { id: 13, name: 'Bina oluşturma', category: 'Tasarım Araçları', tier: 'NORMAL', description: 'Modüler duvar, çatı ve temel parçalarıyla bina yerleştirme.' },
  { id: 14, name: 'Araç tasarımı', category: 'Tasarım Araçları', tier: 'PLUS', description: 'Motor gücü, tekerlek süspansiyonu ve aerodinamik araç gövdesi oluşturma.' },
  { id: 15, name: 'Silah tasarımı', category: 'Tasarım Araçları', tier: 'PLUS', description: 'Ateş hızı, geri tepme, şarjör ve özel silah görünümleri tanımlama.' },
  { id: 16, name: 'Hayvan oluşturma', category: 'Tasarım Araçları', tier: 'NORMAL', description: 'Evcil ve vahşi hayvan yapay zeka hareket kalıpları ve modelleri.' },
  { id: 17, name: 'Kostüm tasarımı', category: 'Tasarım Araçları', tier: 'NORMAL', description: 'Karakterler için kıyafet, kask ve pelerin gibi görsel özelleştirmeler.' },
  { id: 18, name: 'Oyun logosu oluşturma', category: 'Tasarım Araçları', tier: 'NORMAL', description: 'Tipografik ve ikonik oyun marka amblemleri tasarlama aracı.' },
  { id: 19, name: 'Oyun kapak görseli oluşturma', category: 'Tasarım Araçları', tier: 'NORMAL', description: 'Mağaza için 16:9 vitrin afişi ve banner kompozisyonu düzenleyici.' },
  { id: 20, name: 'Özel efekt tasarımı', category: 'Tasarım Araçları', tier: 'PLUS', description: 'GPU hızlandırmalı kıvılcım, duman, alev ve portal parçacık sistemleri.' },

  // 21–30: Karakter sistemleri
  { id: 21, name: 'Karakter yürüme sistemi', category: 'Karakter Sistemleri', tier: 'NORMAL', description: 'WASD ve yön tuşlarıyla akıcı adım ve yön değiştirme fiziği.' },
  { id: 22, name: 'Koşma animasyonu', category: 'Karakter Sistemleri', tier: 'NORMAL', description: 'Shift tuşuna basılı tutulduğunda hızlanma ve kamera sarsıntısı.' },
  { id: 23, name: 'Zıplama sistemi', category: 'Karakter Sistemleri', tier: 'NORMAL', description: 'Zemin algılama, zıplama kuvveti ve havada kontrol ayarı.' },
  { id: 24, name: 'Uçma sistemi', category: 'Karakter Sistemleri', tier: 'PLUS', description: '6 serbestlik derecesinde havada süzülme ve jetpack mekanikleri.' },
  { id: 25, name: 'Karakter konuşmaları', category: 'Karakter Sistemleri', tier: 'NORMAL', description: 'NPC yaklaştığında beliren konuşma balonları ve metin pencereleri.' },
  { id: 26, name: 'Karakter yüz ifadeleri', category: 'Karakter Sistemleri', tier: 'NORMAL', description: 'Mutlu, öfkeli, şaşkın gibi temel mimik ve göz animasyonları.' },
  { id: 27, name: 'Karakter güçleri', category: 'Karakter Sistemleri', tier: 'PLUS', description: 'Işınlanma, zaman yavaşlatma, telekinezi gibi süper güç modülleri.' },
  { id: 28, name: 'Karakter seviye sistemi', category: 'Karakter Sistemleri', tier: 'PLUS', description: 'Deneyim puanı (XP) kazandıkça artan statü ve yetenek ağaçları.' },
  { id: 29, name: 'Karakter envanteri', category: 'Karakter Sistemleri', tier: 'NORMAL', description: 'Slot tabanlı eşya toplama, donanım taşıma ve bırakma sistemi.' },
  { id: 30, name: 'Karakter özelleştirme', category: 'Karakter Sistemleri', tier: 'NORMAL', description: 'Ten rengi, saç stili ve boy oranı gibi fiziksel görünüm seçenekleri.' },

  // 31–40: Dünya ve harita sistemleri
  { id: 31, name: 'Dağlar ve ormanlar oluşturma', category: 'Dünya & Harita', tier: 'NORMAL', description: 'Yükseklik haritasıyla tepe, vadi ve sık ağaç örtüleri ekleme.' },
  { id: 32, name: 'Şehir oluşturma', category: 'Dünya & Harita', tier: 'NORMAL', description: 'Sokak ızgaraları, trafik yolları ve kentsel çevre elemanları.' },
  { id: 33, name: 'Evler ve iç mekânlar oluşturma', category: 'Dünya & Harita', tier: 'PLUS', description: 'Detaylı oda mimarisi, mobilya yerleşimi ve kapı etkileşimleri.' },
  { id: 34, name: 'Deniz ve göller oluşturma', category: 'Dünya & Harita', tier: 'NORMAL', description: 'Dinamik dalgalı su gövdeleri, yüzme alanı ve su altı sisi.' },
  { id: 35, name: 'Hava durumu sistemi', category: 'Dünya & Harita', tier: 'PLUS', description: 'Yağmur, kar, fırtına, şimşek ve rüzgar fiziği simülatörü.' },
  { id: 36, name: 'Gece-gündüz döngüsü', category: 'Dünya & Harita', tier: 'NORMAL', description: 'Güneş açısı ve ay evrelerine bağlı gökyüzü renk değişimi.' },
  { id: 37, name: 'Işıklandırma sistemi', category: 'Dünya & Harita', tier: 'PLUS', description: 'Gerçek zamanlı gölgeler, noktasal ışıklar ve hacimsel sis ışıkları.' },
  { id: 38, name: 'Yer çekimi ayarı', category: 'Dünya & Harita', tier: 'NORMAL', description: 'Dünya, Ay veya sıfır yerçekimi değerlerini kolayca yapılandırma.' },
  { id: 39, name: 'Harita sınırları belirleme', category: 'Dünya & Harita', tier: 'NORMAL', description: 'Görünmez duvarlar veya ölüm bariyerleriyle harita sınırlarını çizme.' },
  { id: 40, name: 'Gizli bölgeler oluşturma', category: 'Dünya & Harita', tier: 'PLUS', description: 'Yalnızca gizli anahtar veya özel güçle açılan gizemli mekanlar.' },

  // 41–50: Oyun mekanikleri
  { id: 41, name: 'Can sistemi', category: 'Oyun Mekanikleri', tier: 'NORMAL', description: 'Karakterin can barı, hasar alma animasyonu ve can yenilenmesi.' },
  { id: 42, name: 'Enerji sistemi', category: 'Oyun Mekanikleri', tier: 'NORMAL', description: 'Koşma ve zıplamada harcanan dayanıklılık (stamina) göstergesi.' },
  { id: 43, name: 'Oyun içi para sistemi', category: 'Oyun Mekanikleri', tier: 'PLUS', description: 'Oyun içinde toplanabilen sanal altın, elmas veya puan ekonomisi.' },
  { id: 44, name: 'Mağaza sistemi', category: 'Oyun Mekanikleri', tier: 'PLUS', description: 'Oyuncuların topladığı para ile eşya ve güçlendirme alabileceği dükkan.' },
  { id: 45, name: 'Görev sistemi', category: 'Oyun Mekanikleri', tier: 'NORMAL', description: 'Hedef belirleme, kontrol noktaları ve görev takip penceresi.' },
  { id: 46, name: 'Ödül sistemi', category: 'Oyun Mekanikleri', tier: 'NORMAL', description: 'Bölüm tamamlandığında veya sandık açıldığında verilen ödüller.' },
  { id: 47, name: 'Seviye atlama sistemi', category: 'Oyun Mekanikleri', tier: 'PLUS', description: 'Seviye artışlarında dinamik zorluk ve yeni kilit açma mekaniği.' },
  { id: 48, name: 'Düşman yapay zekâsı', category: 'Oyun Mekanikleri', tier: 'NORMAL', description: 'Görüş açısına giren oyuncuyu kovalayan ve saldıran temel AI.' },
  { id: 49, name: 'Boss savaşları', category: 'Oyun Mekanikleri', tier: 'NORMAL', description: 'Özel can barına sahip, aşamalı saldırı düzeni olan güçlü patronlar.' },
  { id: 50, name: 'Kontrol ve hareket ayarları', category: 'Oyun Mekanikleri', tier: 'PLUS', description: 'Klavye, fare ve gamepad tuş haritalarını tamamen özelleştirme.' },

  // 51–60: Ses ve animasyon
  { id: 51, name: 'Arka plan müziği ekleme', category: 'Ses & Animasyon', tier: 'NORMAL', description: 'Sahneye göre değişen döngüsel ambient ve tema müzikleri yükleme.' },
  { id: 52, name: 'Karakter sesleri ekleme', category: 'Ses & Animasyon', tier: 'PLUS', description: 'Saldırı, darbe alma, zafer çığlığı gibi özel ses bankaları.' },
  { id: 53, name: 'Ayak sesi efektleri', category: 'Ses & Animasyon', tier: 'NORMAL', description: 'Toprak, çim, metal veya tahta zeminlerde farklı adım sesleri.' },
  { id: 54, name: 'Patlama efektleri', category: 'Ses & Animasyon', tier: 'PLUS', description: 'Yıkım anlarında çok kanallı patlama ve yankı ses efektleri.' },
  { id: 55, name: 'Özel animasyonlar', category: 'Ses & Animasyon', tier: 'PLUS', description: 'Keyframe tabanlı özel dövüş ve etkileşim animasyonları oluşturma.' },
  { id: 56, name: 'Sinematik sahneler oluşturma', category: 'Ses & Animasyon', tier: 'PLUS', description: 'Kamera geçişli ve altyazılı hikaye ara sahneleri (Cutscene).' },
  { id: 57, name: 'Ses düzenleme aracı', category: 'Ses & Animasyon', tier: 'NORMAL', description: 'Ses dalgalarını kırpma, fade-in ve fade-out uygulama.' },
  { id: 58, name: 'Ses seviyesi ayarları', category: 'Ses & Animasyon', tier: 'NORMAL', description: 'Müzik, efekt ve diyalog kanallarını ayrı ayrı kontrol eden mikser.' },
  { id: 59, name: 'Animasyon editörü', category: 'Ses & Animasyon', tier: 'PLUS', description: 'Zaman çizelgesi (timeline) üzerinde kemik ve poz haritalama.' },
  { id: 60, name: 'Oyun içi diyalog sistemi', category: 'Ses & Animasyon', tier: 'NORMAL', description: 'Çoktan seçmeli cevaplar sunan ağaç yapılı diyalog editörü.' },

  // 61–70: Yapay zekâ sistemleri
  { id: 61, name: 'Yapay zekâ ile oyun fikri oluşturma', category: 'Yapay Zekâ Sistemleri', tier: 'PLUS', description: 'Tek cümlelik prompt ile benzersiz oyun hikayesi ve tür konseptleri üretme.' },
  { id: 62, name: 'Yapay zekâ ile karakter oluşturma', category: 'Yapay Zekâ Sistemleri', tier: 'PLUS', description: 'AI ile karakter arka plan hikayesi, kişiliği ve görsel referansları üretme.' },
  { id: 63, name: 'Yapay zekâ ile harita oluşturma', category: 'Yapay Zekâ Sistemleri', tier: 'NORMAL', description: 'Prosedürel zindan, labirent ve ada taslaklarını otomatik çizme.' },
  { id: 64, name: 'Yapay zekâ ile görev yazma', category: 'Yapay Zekâ Sistemleri', tier: 'NORMAL', description: 'Yan görevler, ödül dengeleri ve diyalog metinlerini otomatik tamamlama.' },
  { id: 65, name: 'Yapay zekâ ile hata bulma', category: 'Yapay Zekâ Sistemleri', tier: 'PLUS', description: 'Çarpışma hatalarını, mantık açıklarını ve performans darboğazlarını tarama.' },
  { id: 66, name: 'Yapay zekâ kodlama asistanı', category: 'Yapay Zekâ Sistemleri', tier: 'PLUS', description: 'Oyun mekanikleri için Lua/TypeScript kod bloklarını anında üretme.' },
  { id: 67, name: 'Görselden 3D model oluşturma', category: 'Yapay Zekâ Sistemleri', tier: 'NORMAL', description: 'Yüklenen 2D fotoğraftan temel 3D geometri ve kaplama türetme.' },
  { id: 68, name: 'Otomatik oyun açıklaması oluşturma', category: 'Yapay Zekâ Sistemleri', tier: 'NORMAL', description: 'Mağaza için çekici vitrin açıklaması ve etiketleri tek tıkla yazma.' },
  { id: 69, name: 'Oyun test asistanı', category: 'Yapay Zekâ Sistemleri', tier: 'PLUS', description: 'Otonom AI botlarıyla oyunu test edip zorluk derecesini puanlama.' },
  { id: 70, name: 'Akıllı oyun önerileri', category: 'Yapay Zekâ Sistemleri', tier: 'PLUS', description: 'Oyuncu tutma oranını artıracak mekanik ve denge tavsiyeleri.' },

  // 71–80: Yayınlama ve oyun yönetimi
  { id: 71, name: "Kenix STORE'a oyun yayınlama", category: 'Yayınlama & Yönetim', tier: 'NORMAL', description: '50 KS karşılığında oyunu doğrudan Kenix STORE mağaza vitrinine sürme.' },
  { id: 72, name: 'Oyun taslaklarını kaydetme', category: 'Yayınlama & Yönetim', tier: 'PLUS', description: 'Çalışmanızı sunucu bulutunda taslak olarak güvenle saklayıp devam etme.' },
  { id: 73, name: 'Oyunu güncelleme', category: 'Yayınlama & Yönetim', tier: 'PLUS', description: 'Yayınlanmış oyuna yeni harita, özellik ve düzeltmeler gönderme.' },
  { id: 74, name: 'Sürüm geçmişi', category: 'Yayınlama & Yönetim', tier: 'PLUS', description: 'Önceki sürümleri (v1.0.0, v1.1.0) listeleme ve değişiklik günlüğü tutma.' },
  { id: 75, name: 'Oyun kapağı seçme', category: 'Yayınlama & Yönetim', tier: 'NORMAL', description: 'Kütüphaneden veya özel URL ile oyun kapak afişini belirleme.' },
  { id: 76, name: 'Oyun açıklaması ekleme', category: 'Yayınlama & Yönetim', tier: 'NORMAL', description: 'Oyuncuları bilgilendiren detaylı hikaye ve mekanik açıklaması.' },
  { id: 77, name: 'Oyun kategorisi seçme', category: 'Yayınlama & Yönetim', tier: 'NORMAL', description: 'Aksiyon, Macera, RPG, Strateji veya Arcade gibi doğru kategori eşleme.' },
  { id: 78, name: 'Yaş sınırı belirleme', category: 'Yayınlama & Yönetim', tier: 'NORMAL', description: 'Genel (3+), Genç (12+) veya Yetişkin (16+/18+) yaş etiketi tanımlama.' },
  { id: 79, name: 'Yayın öncesi kontrol', category: 'Yayınlama & Yönetim', tier: 'NORMAL', description: 'Eksik alanları, kapak çözünürlüğünü ve bakiye yeterliliğini denetleme.' },
  { id: 80, name: 'Yayınlanan oyun istatistikleri', category: 'Yayınlama & Yönetim', tier: 'NORMAL', description: 'Oyunun beğeni, beğenmeme ve toplam indirme sayılarını izleme.' },

  // 81–90: PLUS özel geliştirme araçları
  { id: 81, name: 'PLUS özel tasarım araçları', category: 'PLUS Özel Araçlar', tier: 'PLUS', description: 'Ultra yüksek çözünürlüklü materyal dokuları ve PBR shader kütüphanesi.' },
  { id: 82, name: 'Gelişmiş 3D grafikler', category: 'PLUS Özel Araçlar', tier: 'NORMAL', description: 'Pürüzsüz çokgen optimizasyonu ve modern WebGL/WebGPU render.' },
  { id: 83, name: 'Yüksek kaliteli animasyonlar', category: 'PLUS Özel Araçlar', tier: 'PLUS', description: '60 FPS akıcı geçişli hareket haritaları ve fiziksel bez simülasyonu.' },
  { id: 84, name: 'Gelişmiş ışıklandırma', category: 'PLUS Özel Araçlar', tier: 'PLUS', description: 'Gerçek zamanlı ışık izleme (RayTracing) simülasyonu ve parıltı (Bloom).' },
  { id: 85, name: 'Daha detaylı karakterler', category: 'PLUS Özel Araçlar', tier: 'PLUS', description: 'Yüksek detaylı poligon modelleri ve çok katmanlı kıyafet fiziği.' },
  { id: 86, name: 'Gelişmiş yapay zekâ desteği', category: 'PLUS Özel Araçlar', tier: 'PLUS', description: 'KenixAI LLM modelleriyle tam entegre otonom karar verici ajanlar.' },
  { id: 87, name: 'Profesyonel ses araçları', category: 'PLUS Özel Araçlar', tier: 'PLUS', description: '3D uzamsal ses (Spatial Audio) ve dinamik reverb odaları.' },
  { id: 88, name: 'Büyük harita desteği', category: 'PLUS Özel Araçlar', tier: 'PLUS', description: '4096x4096 devasa arazi parçaları ve seviye akışı (Level Streaming).' },
  { id: 89, name: 'Gelişmiş oyun optimizasyonu', category: 'PLUS Özel Araçlar', tier: 'PLUS', description: 'Doku sıkıştırma, LOD kademelendirme ve bellek sızıntısı önleyici.' },
  { id: 90, name: 'Özel PLUS oyun şablonları', category: 'PLUS Özel Araçlar', tier: 'PLUS', description: 'AAA kalitede hazır açık dünya, battle royale ve soulslike şablonları.' },

  // 91–100: Geliştirici topluluğu
  { id: 91, name: 'Geliştirici profili', category: 'Geliştirici Topluluğu', tier: 'PLUS', description: 'Rozetlerinizi, portföyünüzü ve takipçi sayınızı sergileyen özel profil.' },
  { id: 92, name: 'Oyun geliştirme başarımları', category: 'Geliştirici Topluluğu', tier: 'NORMAL', description: 'İlk oyun, 100 beğeni gibi kilometre taşlarında kazanılan başarılar.' },
  { id: 93, name: 'Geliştirici rozetleri', category: 'Geliştirici Topluluğu', tier: 'PLUS', description: 'Toplulukta ve mağaza sayfalarında gösterilen VIP PLUS geliştirici rozeti.' },
  { id: 94, name: 'Oyun taslaklarını paylaşma', category: 'Geliştirici Topluluğu', tier: 'NORMAL', description: 'Taslak bağlantısını diğer geliştiricilerle salt okunur paylaşma.' },
  { id: 95, name: 'Birlikte oyun geliştirme', category: 'Geliştirici Topluluğu', tier: 'PLUS', description: 'Aynı oyun sahnesinde çoklu geliştirici ile anlık ortak çalışma.' },
  { id: 96, name: 'Geliştirici ekipleri kurma', category: 'Geliştirici Topluluğu', tier: 'PLUS', description: 'Stüdyo ekibi kurarak rol tabanlı yetkilendirme ve gelir paylaşımı.' },
  { id: 97, name: 'Oyun testçileri sistemi', category: 'Geliştirici Topluluğu', tier: 'NORMAL', description: 'Yayın öncesi oyunu Kenix topluluğu testçilerine özel açma.' },
  { id: 98, name: 'Geliştirici istatistikleri', category: 'Geliştirici Topluluğu', tier: 'NORMAL', description: 'Oyunlarınızın günlük oyuncu sayısı, ortalama oynama süresi grafiği.' },
  { id: 99, name: 'Özel oyun etkinlikleri', category: 'Geliştirici Topluluğu', tier: 'PLUS', description: 'Ödüllü Kenix Game Jam ve sezonluk geliştirici yarışmalarına katılım.' },
  { id: 100, name: 'Kenix Studio Akademisi', category: 'Geliştirici Topluluğu', tier: 'NORMAL', description: 'Oyun yapımı, mekanik kodlama ve bölüm tasarımı video eğitimleri.' }
];
