# FocusLearn Lite

**FocusLearn Lite** là ứng dụng hỗ trợ học tập toàn diện dành cho sinh viên, kết hợp quản lý thời gian, AI và gamification để nâng cao hiệu quả học tập.

## Tổng quan

FocusLearn Lite được thiết kế như một "Study OS" - hệ điều hành học tập cá nhân, giúp sinh viên:
- Tập trung học tập với kỹ thuật Pomodoro
- Quản lý công việc và dự án học tập
- Ôn tập thông minh với flashcards và quiz AI
- Theo dõi tiến độ và phân tích thói quen học

## Tính năng chính

| Tính năng | Mô tả |
|-----------|-------|
| **Dashboard** | Tổng quan hoạt động, thống kê nhanh, lời chào theo thời gian |
| **Focus Timer** | Đồng hồ Pomodoro với chế độ Zen, ghi nhận distraction |
| **Tasks & Projects** | Quản lý công việc theo dự án, priority, status |
| **Todo List** | Checklist đơn giản kiểu Notion |
| **Notes** | Ghi chú Markdown với hỗ trợ `[[backlinks]]` |
| **Flashcards** | Thẻ ghi nhớ với thuật toán SM-2 spaced repetition |
| **Quiz** | Quiz do AI tạo tự động như phần thưởng sau mỗi phiên học |
| **AI Chat** | Trợ lý AI (Google Gemini) hỗ trợ học tập |
| **Analytics** | Phân tích thói quen học, streak, thống kê chi tiết |
| **Sessions** | Lịch sử các phiên học tập |

## Công nghệ sử dụng

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS
- **AI:** Google Gemini API
- **Charts:** Recharts
- **Icons:** Lucide React

## Đa ngôn ngữ & Themes

- Hỗ trợ **Tiếng Anh** và **Tiếng Việt**
- 4 themes: Light, Dark, Navy, Forest

## Cấu trúc dự án

```
├── components/     # UI components (Sidebar, Timer, Quiz, ...)
├── pages/          # Các trang chính (Dashboard, Tasks, Notes, ...)
├── context/        # State management (GlobalContext)
├── services/       # Tích hợp AI (Gemini)
├── i18n/           # Đa ngôn ngữ
├── lib/            # Utilities & storage
└── types.ts        # Type definitions
```

## Điểm nổi bật

- **Zen Mode:** Chế độ tập trung tối giản, ẩn hết distraction
- **Distraction Logging:** Ghi lại lý do mất tập trung để tự cải thiện
- **Break Activities:** Hoạt động giải lao có mục đích (quiz, flashcards, ...)
- **Spaced Repetition:** Thuật toán SM-2 giúp ôn tập hiệu quả
- **AI-Powered:** Quiz và flashcards được tạo tự động bởi AI
- **Offline-First:** Dữ liệu lưu local, hoạt động không cần internet

---

*FocusLearn Lite - Học thông minh, không học nhiều.*
