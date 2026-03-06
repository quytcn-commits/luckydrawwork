import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen gradient-bg text-white overflow-hidden">
      {/* Decorative blurs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[128px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center font-bold text-sm">
            LD
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            LuckyDraw
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="px-4 sm:px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 text-sm font-medium backdrop-blur"
          >
            Đăng nhập
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-4xl mx-auto pt-16 sm:pt-24 pb-20 sm:pb-32">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur text-sm text-indigo-300 mb-8 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Nền tảng quay thưởng sự kiện #1 Việt Nam
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
            Tạo phòng quay thưởng{" "}
            <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent gradient-gold">
              chuyên nghiệp trong 2 phút
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-300 mb-10 leading-relaxed max-w-2xl mx-auto">
            Quay thưởng trực tuyến minh bạch cho sự kiện doanh nghiệp,
            hội nghị khách hàng và chương trình khuyến mãi.
            Người tham gia quét QR và đăng ký ngay — không cần cài app.
          </p>

          <div className="flex gap-3 sm:gap-4 justify-center flex-wrap">
            <Link href="/admin" className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
              Tạo phòng quay thưởng miễn phí
            </Link>
            <Link href="#features" className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
              Tìm hiểu thêm
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 sm:gap-12 mt-14 sm:mt-16">
            {[
              { value: "2 phút", label: "Tạo phòng" },
              { value: "Realtime", label: "Hiển thị" },
              { value: "100%", label: "Minh bạch" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs sm:text-sm text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div id="features" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-20 sm:pb-32">
          {[
            {
              icon: "📱",
              gradient: "gradient-primary",
              title: "Quét QR đăng ký",
              desc: "Người tham gia chỉ cần quét mã QR, điền form và tham gia ngay lập tức. Không cần cài ứng dụng, hỗ trợ mọi thiết bị.",
            },
            {
              icon: "⚡",
              gradient: "bg-gradient-to-r from-amber-500 to-orange-500",
              title: "Quay thưởng Realtime",
              desc: "Hiển thị danh sách người tham gia theo thời gian thực. Quay thưởng trực tiếp với animation chuyên nghiệp, kết quả minh bạch.",
            },
            {
              icon: "🎨",
              gradient: "bg-gradient-to-r from-emerald-500 to-teal-500",
              title: "Tùy chỉnh thương hiệu",
              desc: "Upload logo, ảnh KV sự kiện, tùy chỉnh màu sắc theo thương hiệu của bạn. Mỗi sự kiện mang bản sắc riêng.",
            },
            {
              icon: "🛡️",
              gradient: "bg-gradient-to-r from-blue-500 to-cyan-500",
              title: "Chống trùng lặp",
              desc: "Hệ thống tự động kiểm tra và ngăn chặn đăng ký trùng theo CCCD, số điện thoại hoặc mã nhân viên.",
            },
            {
              icon: "📊",
              gradient: "bg-gradient-to-r from-pink-500 to-rose-500",
              title: "Xuất kết quả",
              desc: "Xuất danh sách người trúng thưởng ra file Excel, PDF. Dễ dàng chia sẻ và lưu trữ kết quả sự kiện.",
            },
            {
              icon: "🔒",
              gradient: "bg-gradient-to-r from-violet-500 to-purple-500",
              title: "Bảo mật & Minh bạch",
              desc: "Sử dụng thuật toán ngẫu nhiên bảo mật cao. Ghi log toàn bộ quá trình để đảm bảo tính minh bạch tuyệt đối.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="card hover:bg-white/10 transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.gradient} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="pb-20 sm:pb-32">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">Cách hoạt động</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Chỉ 4 bước đơn giản để tổ chức quay thưởng chuyên nghiệp</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {[
              { step: "01", title: "Tạo phòng", desc: "Nhập thông tin sự kiện, cấu hình giải thưởng và form đăng ký", icon: "🏠" },
              { step: "02", title: "Chia sẻ QR", desc: "Hiển thị mã QR để người tham gia quét và đăng ký trực tiếp", icon: "📲" },
              { step: "03", title: "Quay thưởng", desc: "Đóng đăng ký, bấm quay và hệ thống chọn ngẫu nhiên người trúng", icon: "🎰" },
              { step: "04", title: "Kết quả", desc: "Xem kết quả trực tiếp, xuất file Excel và chia sẻ ngay", icon: "🏆" },
            ].map((item) => (
              <div key={item.step} className="text-center group">
                <div className="relative mx-auto mb-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl glass-strong flex items-center justify-center text-2xl sm:text-3xl mx-auto group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-xs font-bold">
                    {item.step}
                  </div>
                </div>
                <h3 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Use cases */}
        <div className="pb-20 sm:pb-32">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">Phù hợp cho mọi sự kiện</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              "🎉 Year End Party",
              "🏢 Sự kiện nội bộ công ty",
              "🤝 Hội nghị khách hàng",
              "📺 Event Livestream",
              "🛍️ Chương trình khuyến mãi",
              "🏪 Quay thưởng đại lý",
            ].map((item) => (
              <div key={item} className="glass rounded-xl px-4 py-3 sm:py-4 text-center text-sm sm:text-base hover:bg-white/10 transition-colors">
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="pb-20 sm:pb-32">
          <div className="card text-center py-12 sm:py-16 px-4">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Sẵn sàng tổ chức quay thưởng?</h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Tạo phòng quay thưởng đầu tiên miễn phí. Không cần thẻ tín dụng.
            </p>
            <Link href="/admin" className="btn-primary text-lg px-8 py-4">
              Bắt đầu ngay — Miễn phí
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md gradient-primary flex items-center justify-center font-bold text-xs">
              LD
            </div>
            <span className="font-semibold text-slate-300">LuckyDraw.work</span>
          </div>
          <p className="text-slate-500 text-sm text-center sm:text-right">
            Nền tảng quay thưởng sự kiện chuyên nghiệp
          </p>
        </div>
      </footer>
    </div>
  );
}
