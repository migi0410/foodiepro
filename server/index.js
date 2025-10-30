// Import các thư viện cần thiết
import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';

// Khởi tạo
const app = express();
const prisma = new PrismaClient();

// Cấu hình server
app.use(cors()); // Cho phép Front-end gọi API
app.use(express.json()); // Đọc dữ liệu JSON từ front-end

// --- API Endpoint 1: Đăng Ký (Register) ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { full_name, email, phone, password } = req.body;

        // 1. Kiểm tra xem email hoặc SĐT đã tồn tại chưa
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { phone: phone }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Email hoặc số điện thoại đã tồn tại' });
        }

        // 2. Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Lưu user vào database
        const newUser = await prisma.user.create({
            data: {
                full_name,
                email,
                phone,
                password_hash: hashedPassword
            }
        });

        res.status(201).json({ message: 'Đăng ký thành công!', user: newUser });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
});

// --- API Endpoint 2: Đăng Nhập (Login) ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email_or_phone, password } = req.body;

        // 1. Tìm người dùng bằng email hoặc SĐT
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email_or_phone },
                    { phone: email_or_phone }
                ]
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Email hoặc mật khẩu không đúng' });
        }

        // 2. So sánh mật khẩu
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
        }

        // 3. Tạo JWT Token
        // (Hãy tạo một chuỗi bí mật ngẫu nhiên và lưu vào file .env)
        const JWT_SECRET = 'YOUR_SUPER_SECRET_KEY_HERE'; // Thay thế bằng key bí mật của bạn
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' } // Token hết hạn sau 24 giờ
        );

        // 4. Trả về token
        res.status(200).json({ message: 'Đăng nhập thành công!', token: token });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
});


// --- Khởi động Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server đang chạy tại cổng ${PORT}`));
