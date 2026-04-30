export type IntroContent = {
  badge: string;
  title: string;
  subtitle: string;
  body: string;
  primaryAction: string;
  secondaryAction: string;
  illustration: string;
  highlights: string[];
  articleSections: {
    id: string;
    heading: string;
    paragraphs: string[];
    bullets?: string[];
  }[];
};

export type GuideStep = {
  id: string;
  title: string;
  description: string;
  image: string;
};

export const introContent: IntroContent = {
  badge: "Q-DevCom – ERP",
  title: "Hệ thống quản trị toàn bộ hoạt động doanh nghiệp trong một phần mềm duy nhất",
  subtitle:
    "Xin chào, mình là Quay – người phát triển Q-DevCom. Ứng dụng bắt đầu từ một câu hỏi rất đơn giản: tại sao doanh nghiệp có nhiều người chăm chỉ nhưng vận hành vẫn thiếu minh bạch?",
  body:
    "Sau thời gian làm việc thực tế trong môi trường nhà máy, mình nhận ra khó khăn lớn nhất không đến từ con người, mà đến từ cách hệ thống đang vận hành: dữ liệu rời rạc, thông tin truyền miệng, quản lý phải đi hỏi từng công đoạn mỗi ngày.",
  primaryAction: "Khám phá hệ sinh thái",
  secondaryAction: "Xem hướng dẫn sử dụng",
  illustration: "/assets/introContent/intro-placeholder.svg",
  highlights: [
    "Tự động hóa quy trình – giảm thao tác thủ công, giảm sai sót",
    "Minh bạch dữ liệu theo thời gian thực trong toàn nhà máy",
    "Ghi nhận công bằng nỗ lực của người lao động bằng dữ liệu rõ ràng",
  ],
  articleSections: [
    {
      id: "problem-reality",
      heading: "Vấn đề thực tế trong nhà máy hiện nay",
      paragraphs: [
        "Rất nhiều doanh nghiệp vẫn đang vận hành bằng những cách quen thuộc. Thông tin phân tán, quy trình rời rạc khiến việc điều hành mất nhiều thời gian.",
        "Doanh nghiệp không thiếu người chăm chỉ. Họ thiếu một hệ thống đủ đơn giản để dùng mỗi ngày.",
      ],
      bullets: [
        "Quản lý cầm sổ đi hỏi từng chuyền mỗi ngày",
        "Công nhân làm việc chăm chỉ nhưng không được ghi nhận chính xác",
        "File Excel nằm rải rác khắp nơi",
        "Thông tin truyền miệng dễ sai lệch và chậm trễ",
      ],
    },
    {
      id: "core-issues",
      heading: "Những vấn đề lớn mà doanh nghiệp đang gặp",
      paragraphs: [
        "Khi dữ liệu xuất hiện thì thường đã quá muộn để xử lý. Người quản lý mất nhiều giờ để truy vết thông tin thay vì ra quyết định.",
        "Điều quan trọng nhất: đây không phải lỗi của con người, mà là lỗi của hệ thống vận hành.",
      ],
      bullets: [
        "Không có dữ liệu thời gian thực",
        "Quản lý mất thời gian “đi hỏi” tiến độ",
        "Giao tiếp nội bộ rời rạc",
        "Người lao động giỏi chưa chắc được ghi nhận đúng",
      ],
    },
    {
      id: "intro-goals",
      heading: "Q-DevCom ra đời để giải quyết điều gì?",
      paragraphs: [
        "Q-DevCom được xây dựng với 3 mục tiêu cốt lõi: tự động hóa, minh bạch dữ liệu và tạo động lực làm việc.",
        "Khi dữ liệu rõ ràng, sự ghi nhận trở nên công bằng. Đã có cố gắng thì chắc chắn được công nhận.",
      ],
      bullets: [
        "🤖 Tự động hóa quy trình",
        "🔎 Minh bạch dữ liệu theo thời gian thực",
        "💪 Tạo động lực và công bằng ghi nhận",
      ],
    },
    {
      id: "ecosystem",
      heading: "Trái tim của Q-DevCom – Hệ sinh thái cốt lõi",
      paragraphs: [
        "Q-DevCom không chỉ là phần mềm quản lý. Trái tim của hệ thống là kết nối, giao tiếp, tự động hóa và ghi nhận công sức theo thời gian thực.",
      ],
      bullets: [
        "💬 Chat nội bộ + Voice + Dịch đa ngôn ngữ",
        "🤖 Trợ lý ảo @q AI hỗ trợ tức thời",
        "📊 Quản lý sản lượng theo thời gian thực",
        "🏭 Work Order theo dõi đơn hàng",
        "📦 Smart Inventory quản lý kho thông minh",
        "⏱️ Thu nhập & tăng ca tự động",
        "🔍 QR Code nhận việc (đang phát triển)",
      ],
    },
    {
      id: "difference",
      heading: "Vì sao Q-DevCom khác ERP truyền thống?",
      paragraphs: [
        "ERP truyền thống thường phức tạp, khó dùng, tốn thời gian đào tạo và chưa phù hợp cho doanh nghiệp vừa và nhỏ.",
        "Q-DevCom đi theo triết lý 3N: Nhanh • Nhẹ • Năng suất. Không cần hệ thống phức tạp, chỉ cần đúng nhu cầu thực tế.",
      ],
    },
    {
      id: "closing",
      heading: "Lời kết",
      paragraphs: [
        "Q-DevCom được xây dựng từng ngày từ trải nghiệm thực tế cùng người lao động và doanh nghiệp.",
        "Mình sẽ tiếp tục cải tiến dựa trên phản hồi người dùng để ứng dụng ngày càng thiết thực hơn.",
        "Q-DevCom – Công nghệ phục vụ sản xuất.",
      ],
    },
  ],
};

export const guideSteps: GuideStep[] = [
  {
    id: "step-1",
    title: "Bối cảnh thực tế trong nhà máy",
    description:
      "Rất nhiều doanh nghiệp vẫn vận hành theo cách quen thuộc:\n- Quản lý cầm sổ đi hỏi từng chuyền mỗi ngày\n- File Excel nằm rải rác khắp nơi\n- Thông tin truyền miệng dễ sai lệch\n\nDoanh nghiệp không thiếu người chăm chỉ.\nHọ thiếu một hệ thống đủ đơn giản để dùng mỗi ngày.",
    image: "/assets/introContent/guide-step-1.svg",
  },
  {
    id: "step-2",
    title: "4 vấn đề lớn cần giải quyết",
    description:
      "1) Không có dữ liệu thời gian thực.\n2) Quản lý mất thời gian “đi hỏi” tiến độ.\n3) Giao tiếp nội bộ rời rạc.\n4) Người làm tốt chưa chắc được ghi nhận đúng.\n\nĐây không phải lỗi của con người. Đây là lỗi của hệ thống.",
    image: "/assets/introContent/guide-step-2.svg",
  },
  {
    id: "step-3",
    title: "Mục tiêu cốt lõi của Q-DevCom",
    description:
      "Q-DevCom được xây dựng với 3 mục tiêu:\n🤖 Tự động hóa\n🔎 Minh bạch dữ liệu\n💪 Tạo động lực làm việc\n\nKhi dữ liệu rõ ràng, sự ghi nhận trở nên công bằng.",
    image: "/assets/introContent/guide-step-3.svg",
  },
  {
    id: "step-4",
    title: "Chat nội bộ + Voice + Dịch đa ngôn ngữ",
    description:
      "Tích hợp mạng xã hội nội bộ ngay trong ERP:\n- Chat cá nhân & nhóm realtime\n- Gửi voice message nhanh\n- Mention, trả lời, lưu lịch sử\n\nHỗ trợ dịch tự động: Việt • Anh • Trung • Nhật • Hàn.",
    image: "/assets/introContent/guide-step-1.svg",
  },
  {
    id: "step-5",
    title: "Trợ lý ảo @q AI",
    description:
      "Chỉ cần gõ @q trong chat:\n- @q Hôm nay sản lượng chuyền A bao nhiêu?\n- @q Đơn hàng X đang ở công đoạn nào?\n- @q Tồn kho còn đủ sản xuất không?\n\nAI phản hồi nhanh, phân tích dữ liệu, hỗ trợ công việc hằng ngày.",
    image: "/assets/introContent/guide-step-2.svg",
  },
  {
    id: "step-6",
    title: "Hệ sinh thái vận hành sản xuất",
    description:
      "Các module cốt lõi:\n- Quản lý sản lượng theo thời gian thực\n- Work Order theo dõi đơn hàng\n- Smart Inventory quản lý kho thông minh\n- Thu nhập & tăng ca tự động\n- QR Code nhận việc (đang phát triển)",
    image: "/assets/introContent/guide-step-3.svg",
  },
  {
    id: "step-7",
    title: "Vì sao Q-DevCom khác ERP truyền thống",
    description:
      "Triết lý 3N: Nhanh • Nhẹ • Năng suất\n- Công nhân có thể dùng ngay\n- Quản lý nhìn là hiểu\n- Doanh nghiệp triển khai nhanh\n\nKhông cần hệ thống phức tạp, chỉ cần đúng nhu cầu thực tế.",
    image: "/assets/introContent/guide-step-1.svg",
  },
  {
    id: "step-8",
    title: "Thông điệp và định hướng",
    description:
      "Q-DevCom là cầu nối giữa doanh nghiệp và người lao động.\nDoanh nghiệp cần dữ liệu rõ ràng để phát triển.\nNgười lao động cần được ghi nhận để có động lực.\n\nQ-DevCom – Công nghệ phục vụ sản xuất.",
    image: "/assets/introContent/guide-step-2.svg",
  },
];
