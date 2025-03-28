Here is a clean and professional `README.md` for your **Fiora** women's bag e-commerce project on GitHub:

---

# 🌸 Fiora – Women's Bag E-commerce Website

**Fiora** is a feature-rich e-commerce platform designed for modern Gen Z women to explore and shop trendy handbags. Built using the **MERN stack (EJS instead of React)**, Fiora combines elegant design with powerful backend functionalities, including authentication, payment integration, inventory management, and more.

---

## 🚀 Features

### 🛍️ User Side
- Browse, search, sort, and filter handbags
- Product details with stock left and add-to-cart
- User authentication (Email, Google, Facebook)
- User profile with order history and address management
- Add/edit/delete multiple addresses
- Place orders using Cash on Delivery (COD)
- Coupon code support (discount %, expiry)
- Wishlist functionality
- Show/hide out-of-stock items

### ⚙️ Admin Panel
- Add/edit/delete products
- Manage inventory and stock
- Order management: change status, cancel orders
- Export orders to Excel/CSV
- Generate order invoices in PDF
- Dashboard insights (optional)
- Secure login for admin

### 🖼️ Media and File Handling
- Cloudinary for image uploads
- Multer + Sharp for image processing
- CropperJS integration for image cropping

### 📦 Tech Stack
- **Frontend**: EJS, HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: Passport.js (local, Google, Facebook)
- **Payments**: Razorpay integration
- **Storage**: Cloudinary, Multer
- **PDF & Excel**: PDFKit, ExcelJS

---

## 📂 Folder Structure (Simplified)

```
fiora/
├── app.js
├── routes/
├── controllers/
├── models/
├── views/
├── public/
├── config/
├── utils/
├── middlewares/
└── README.md
```

---

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/faaasiill/fiora.git
   cd fiora
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a `.env` file** and add the following:
   ```
   PORT=3000
   MONGO_URI=your_mongodb_uri
   SESSION_SECRET=your_secret
   CLOUDINARY_CLOUD_NAME=your_name
   CLOUDINARY_API_KEY=your_key
   CLOUDINARY_API_SECRET=your_secret
   RAZORPAY_KEY_ID=your_id
   RAZORPAY_KEY_SECRET=your_secret
   ```

4. **Run the application**
   ```bash
   npm start
   ```

---

## 🔐 Admin Access

To access the admin panel, create an admin user manually in the database or set a role for an existing user.

---

## 📸 Screenshots 
![C64E8018-142F-486E-A335-DCCDD08CB8AA_1_201_a](https://github.com/user-attachments/assets/230b98c1-73ea-4515-9f23-5696ad800f17)




---

## 📃 License

This project is licensed under the **ISC License**.

---

## ✨ Author

Developed by Fasil Rahman.c – Passionate full-stack developer building elegant user experiences.

---
