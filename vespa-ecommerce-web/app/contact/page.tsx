'use client';

import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Send } from 'lucide-react';
import { useState } from 'react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5 } },
};

const slideInLeft = {
  hidden: { x: -100, opacity: 0 },
  show: { x: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } },
};

const slideInRight = {
  hidden: { x: 100, opacity: 0 },
  show: { x: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } },
};

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Terima kasih! Pesan Anda telah kami terima.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="bg-gray-50 min-h-screen overflow-x-hidden">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          initial="hidden"
          animate="show"
          variants={containerVariants}
        >
          <motion.h1
            className="text-4xl md:text-5xl font-extrabold text-[#1E2022] mb-4"
            variants={itemVariants}
          >
            Hubungi Kami
          </motion.h1>
          <motion.p
            className="text-lg text-gray-600"
            variants={itemVariants}
          >
            Punya pertanyaan atau butuh bantuan? Jangan ragu untuk menghubungi
            kami melalui informasi di bawah atau isi formulir kontak.
          </motion.p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12">
          <motion.div
            className="bg-white p-8 rounded-lg shadow-lg space-y-8"
            initial="hidden"
            animate="show"
            variants={slideInLeft}
          >
            <h2 className="text-2xl font-bold text-gray-800">
              Informasi Kontak
            </h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-50 p-3 rounded-full">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Alamat</h3>
                  <p className="text-gray-600">
                    Jl. Raya Vespa No. 123, Cibinong, Bogor, Jawa Barat, 16911
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-green-50 p-3 rounded-full">
                  <Phone className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Telepon</h3>
                  <p className="text-gray-600">(021) 123-4567</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-purple-50 p-3 rounded-full">
                  <Mail className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Email</h3>
                  <p className="text-gray-600">dukungan@vespaparts.com</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white p-8 rounded-lg shadow-lg"
            initial="hidden"
            animate="show"
            variants={slideInRight}
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Kirim Pesan
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nama Lengkap Anda"
                className="w-full p-3 border rounded-md focus:ring-2 focus:ring-[#52616B] focus:border-transparent transition"
                required
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Alamat Email Anda"
                className="w-full p-3 border rounded-md focus:ring-2 focus:ring-[#52616B] focus:border-transparent transition"
                required
              />
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="Subjek Pesan"
                className="w-full p-3 border rounded-md focus:ring-2 focus:ring-[#52616B] focus:border-transparent transition"
                required
              />
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Tulis pesan Anda di sini..."
                rows={5}
                className="w-full p-3 border rounded-md focus:ring-2 focus:ring-[#52616B] focus:border-transparent transition"
                required
              ></textarea>
              <button
                type="submit"
                className="w-full bg-[#52616B] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#1E2022] transition-colors flex items-center justify-center gap-2"
              >
                <Send size={18} />
                <span>Kirim Pesan</span>
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
