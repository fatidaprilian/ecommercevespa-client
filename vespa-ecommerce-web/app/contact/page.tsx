'use client';

import { motion } from 'framer-motion';
// Impor ikon, 'MapPin' telah dihapus
import { Phone, Mail, Instagram } from 'lucide-react';

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

const slideInUp = {
  hidden: { y: 50, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } },
};

export default function ContactPage() {
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
            kami melalui informasi di bawah ini.
          </motion.p>
        </motion.div>

        <div className="mt-16 flex justify-center">
          <motion.div
            className="bg-white p-8 rounded-lg shadow-lg space-y-8 w-full max-w-lg"
            initial="hidden"
            animate="show"
            variants={slideInUp}
          >
            <h2 className="text-2xl font-bold text-gray-800">
              Informasi Kontak
            </h2>
            <div className="space-y-6">

              {/* Telepon/WhatsApp */}
              <div className="flex items-start gap-4">
                <div className="bg-green-50 p-3 rounded-full">
                  <Phone className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">WhatsApp</h3>
                  <a
                    href="https://wa.me/628131010025"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-green-600 transition-colors"
                  >
                    +628131010025
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="bg-purple-50 p-3 rounded-full">
                  <Mail className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Email</h3>
                  <a
                    href="mailto:Jakartascootershop@gmail.com"
                    className="text-gray-600 hover:text-purple-600 transition-colors"
                  >
                    Jakartascootershop@gmail.com
                  </a>
                </div>
              </div>

              {/* Instagram */}
              <div className="flex items-start gap-4">
                <div className="bg-pink-50 p-3 rounded-full">
                  <Instagram className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Instagram</h3>
                  <a
                    href="https://instagram.com/jakartascootershop"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-pink-600 transition-colors"
                  >
                    @JAKARTASCOOTERSHOP
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}