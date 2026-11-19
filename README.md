# Hotel Shoreline QR Frontend Application

Next.js 15 (App Router) frontend for **Hotel Shoreline In-Room QR Dining & Hotel Management Operations Command Center**.

## 🌟 Key Features
- **In-Room Guest Experience (`/room/[token]`)**:
  - Automatically binds to room number and guest identity upon QR camera scan.
  - 24/7 Room Service menu browsing, dietary tags (Veg/Non-Veg), custom kitchen notes, and cart drawer.
  - 1-tap concierge requests: fresh towels, bottled water, room cleaning, toiletries kit, laundry pickup, maintenance.
  - Live order tracking with animated progress pipeline (*Received → Kitchen Preparing → Out for Delivery → Delivered*).
- **Admin Operations Command Center (`/admin`)**:
  - **Rooms & QR Code Studio**: Generate, preview, download, and print high-resolution room standees formatted for 4"x6" / 5"x7" acrylic desk holders.
  - **Live Room Orders Feed**: Real-time kitchen order feed with audible chime alerts and status transitions.
  - **Guest Bookings Desk**: Manage room occupancy, guest check-in, check-out, and billing.
  - **Concierge Desk**: Live housekeeping dispatch.
  - **Menu Catalog**: Instant 1-click in-stock / sold-out toggle.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Start Next.js development server
npm run dev
```

The app opens on **http://localhost:3000**.
- **Admin Portal**: `http://localhost:3000/admin` (Demo Login: `admin@hotel.com` / `admin123`)
- **Sample Guest QR Scan**: `http://localhost:3000/room/qr_room_101_v9k3a`

---

## ☁️ Deployment to Vercel

1. Import this repository into [Vercel](https://vercel.com).
2. Framework Preset: **Next.js**
3. Configure Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your Render backend API URL (e.g. `https://hotel-shoreline-backend.onrender.com/api/v1`)
   - `NEXT_PUBLIC_SOCKET_URL`: Your Render backend root URL (e.g. `https://hotel-shoreline-backend.onrender.com`)
   - `NEXT_PUBLIC_HOTEL_NAME`: `Hotel Shoreline Luxury Resort & Suites`
4. Click **Deploy**.
