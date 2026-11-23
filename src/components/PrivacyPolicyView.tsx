import React from 'react';
import { ArrowLeft, ShieldCheck, Lock, FileCheck2, Database } from 'lucide-react';

interface PrivacyPolicyViewProps {
  onBack: () => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="min-h-[44px] px-4 rounded-xl bg-[#05102b] border border-blue-500/30 hover:border-blue-400 text-slate-200 hover:text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-blue-400" />
        <span>Mağazaya Dön</span>
      </button>

      <article className="rounded-3xl bg-[#05102b]/95 border border-blue-500/35 kenix-neon-frame-inner p-6 sm:p-8 space-y-6 shadow-[0_18px_45px_rgba(2,6,23,0.75)]">
        <header className="space-y-2 border-b border-blue-500/20 pb-5">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300">
            <ShieldCheck className="w-4 h-4" />
            <span>KENİX STORE Veri Güvenliği</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Gizlilik Politikası ve Güvenlik İlkeleri
          </h1>
          <p className="text-xs text-slate-400">
            Son Güncelleme: 2026 · KENİX Ekosistemi
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-[#030a1e] border border-blue-500/25 p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
              <Lock className="w-4 h-4" />
              <span>1. Toplanan Hesap Verileri</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Oturum açtığınızda yalnızca kimlik doğrulaması için gerekli e-posta adresi, görünen ad,
              favori listesi, KS bakiye hareketleri ve geliştirici uygulama başvurularınız saklanır.
              Şifreleriniz tarafımızca düz metin olarak tutulmaz; Firebase Authentication tarafından güvenli biçimde işlenir.
            </p>
          </div>

          <div className="rounded-2xl bg-[#030a1e] border border-blue-500/25 p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
              <FileCheck2 className="w-4 h-4" />
              <span>2. APK Güvenliği ve Bütünlük Denetimi</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Mağazaya gönderilen tüm Android paketleri (.apk) en fazla 100 MB sınırıyla kabul edilir,
              arşiv yapısı ve çalıştırılabilir dosya taramasından geçirilir, SHA-256 özeti kaydedilir ve
              yönetici onayı olmadan karantina dışına çıkarılmaz.
            </p>
          </div>
        </div>

        <section className="space-y-3 text-sm text-slate-300 leading-relaxed">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            <span>3. Verilerin İşlenme Amaçları ve Paylaşım Politikası</span>
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-slate-100">Üçüncü Taraflara Satış Yoktur:</strong> Kullanıcı e-posta adresleri,
              indirme geçmişleri veya uygulama başvuru bilgileri reklam ağlarına satılmaz veya üçüncü taraflarla paylaşılmaz.
            </li>
            <li>
              <strong className="text-slate-100">İzolasyon ve Yetki Kontrolü:</strong> Her kullanıcı yalnızca kendi profilini,
              favorilerini ve başvuru durumunu görüntüleyebilir. Yönetici işlemleri sunucu tarafında doğrulanmış yetkili hesaplarla sınırlıdır.
            </li>
            <li>
              <strong className="text-slate-100">APK İndirme Kayıtları:</strong> İndirme ve uygulama açma sayaçları yalnızca
              popülerlik sıralaması, geliştirici istatistikleri ve tek seferlik doğrulanmış KS ödülleri için anonimleştirilmiş olaylar halinde tutulur.
            </li>
            <li>
              <strong className="text-slate-100">Hesap ve Başvuru Silme Talepleri:</strong> Onaylanmamış veya reddedilmiş
              APK dosyaları karantina dizininden temizlenir. Hesabınıza veya başvurularınıza ilişkin kaldırma talepleri
              için mağaza yöneticileriyle iletişime geçebilirsiniz.
            </li>
          </ul>
        </section>
      </article>
    </div>
  );
};
