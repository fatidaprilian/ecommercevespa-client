# Dockerfile untuk aplikasi Next.js (Admin Panel)

FROM node:22-alpine
WORKDIR /app

# Salin file package.json dan lock file terlebih dahulu
# Ini penting untuk memanfaatkan cache Docker
COPY package*.json ./

# Jalankan instalasi dependensi
RUN npm install

# Salin sisa kode aplikasi Anda
COPY . .

# Perintah default untuk menjalankan server development
# Server akan berjalan di port 3003 sesuai package.json
CMD ["npm", "run", "dev"]