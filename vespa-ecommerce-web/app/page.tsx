'use client';

import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
    ShieldCheck, Package, Wrench, ArrowRight, ShoppingCart,
    ChevronDown, Zap, Sparkles, Award, Users, Truck, Headphones, Phone, Star, CheckCircle, Clock
} from "lucide-react";
import Link from "next/link";

// Mock data untuk demo
const mockProducts = [
  { id: 1, name: "CVT Belt Original Piaggio", price: 285000, image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400", rating: 4.9, reviews: 47 },
  { id: 2, name: "Brake Pad Set Vespa Primavera", price: 125000, image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400", rating: 4.8, reviews: 32 },
  { id: 3, name: "LED Headlight Assembly", price: 450000, image: "https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?w=400", rating: 5.0, reviews: 28 },
  { id: 4, name: "Shock Absorber Rear", price: 680000, image: "https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=400", rating: 4.9, reviews: 15 }
];

const testimonials = [
  { name: "Ahmad Rifky", role: "Vespa Sprint Owner", content: "Kualitas sparepart original terbaik! Vespa saya kembali performa seperti baru.", rating: 5, avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100" },
  { name: "Sari Indah", role: "Vespa Collector", content: "Pelayanan sangat memuaskan, packaging rapi dan pengiriman cepat. Highly recommended!", rating: 5, avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100" },
  { name: "Budi Santoso", role: "Workshop Owner", content: "Partner terpercaya untuk kebutuhan sparepart. Harga kompetitif dengan kualitas terjamin.", rating: 5, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" }
];

// Reusable Components
const Section = ({ children, className = "" }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });
    return (
        <motion.section
            ref={ref}
            initial={{ opacity: 0, y: 60 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`py-24 px-4 md:py-32 md:px-6 ${className}`}
        >
            {children}
        </motion.section>
    );
};

const FloatingBadge = ({ children, className = "" }) => (
    <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className={`absolute bg-white/90 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 shadow-lg ${className}`}
    >
        {children}
    </motion.div>
);

// Page-Specific Components
const HeroSection = () => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });
    const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

    return (
        <div ref={ref} className="relative w-full h-screen flex items-center justify-center text-center overflow-hidden">
            <motion.div style={{ y }} className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=2070&auto=format&fit=crop"
                    alt="Classic Vespa detail"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-[#1E2022]/80"></div>
            </motion.div>
            
            <div className="relative z-10 px-6 md:px-24 max-w-5xl">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="mb-6"
                >
                    <span className="inline-flex items-center gap-2 bg-[#C9D6DF]/20 backdrop-blur-sm border border-[#C9D6DF]/30 text-[#F0F5F9] px-6 py-3 rounded-full text-sm font-medium">
                        <Sparkles className="w-4 h-4" />
                        Trusted Vespa Parts Specialist
                    </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                  className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white drop-shadow-2xl mb-8 font-playfair"
                >
                  Anatomy of a<br />
                  <span className="text-[#C9D6DF]">Legend</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                  className="text-xl md:text-2xl text-gray-200 drop-shadow-lg max-w-3xl mx-auto mb-12 leading-relaxed"
                >
                  Setiap komponen adalah sebuah warisan. Suku cadang original yang menjaga keaslian dan menyempurnakan performa ikonik Vespa Anda.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                  className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                >
                  <button className="group relative inline-flex items-center gap-3 bg-[#C9D6DF] text-[#1E2022] font-bold py-4 px-8 rounded-lg text-lg hover:bg-white transition-all transform hover:scale-105 shadow-2xl">
                      Mulai Jelajahi 
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </button>
                  <button className="group inline-flex items-center gap-3 bg-transparent border-2 border-white text-white font-bold py-4 px-8 rounded-lg text-lg hover:bg-white hover:text-black transition-all transform hover:scale-105">
                      <Phone className="w-5 h-5" />
                      Konsultasi Gratis
                  </button>
                </motion.div>
            </div>
            <FloatingBadge className="top-20 right-10 hidden lg:flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-800">100% Original</span>
            </FloatingBadge>
            <FloatingBadge className="bottom-32 left-10 hidden lg:flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-800">10K+ Happy Customers</span>
            </FloatingBadge>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-white/70"
                >
                    <ChevronDown className="w-8 h-8" />
                </motion.div>
            </motion.div>
        </div>
    );
};

const StatsSection = () => {
    const stats = [
        { number: "15+", label: "Years Experience", icon: Clock },
        { number: "10,000+", label: "Parts Available", icon: Package },
        { number: "5,000+", label: "Happy Customers", icon: Users },
        { number: "98%", label: "Satisfaction Rate", icon: Award }
    ];

    return (
        <Section className="bg-[#52616B] text-white">
            <div className="container mx-auto">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="text-center"
                        >
                            <div className="flex justify-center mb-4">
                                <stat.icon className="w-8 h-8 text-white/80" />
                            </div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: index * 0.2 }}
                                className="text-4xl lg:text-5xl font-bold mb-2"
                            >
                                {stat.number}
                            </motion.div>
                            <p className="text-white/80 font-medium">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </Section>
    );
};

const CategoriesSection = () => {
  const categories = [
    { 
        name: 'Engine Parts', 
        icon: Wrench, 
        image: 'https://images.unsplash.com/photo-1588649816484-a3b594a1d45a?q=80&w=1974&auto=format&fit=crop',
        description: 'CVT, Piston, Gasket & more',
        items: '450+ items'
    },
    { 
        name: 'Body & Frame', 
        icon: Package, 
        image: 'https://images.unsplash.com/photo-1618386434201-b6a6e0e3784c?q=80&w=1974&auto=format&fit=crop',
        description: 'Panel, Fender, Mirror & more',
        items: '280+ items'
    },
    { 
        name: 'Electrical', 
        icon: Zap, 
        image: 'https://images.unsplash.com/photo-1555529399-66e524811746?q=80&w=1964&auto=format&fit=crop',
        description: 'LED, Battery, Wiring & more',
        items: '180+ items'
    },
    { 
        name: 'Accessories', 
        icon: Sparkles, 
        image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=2070&auto=format&fit=crop',
        description: 'Chrome, Decals, Seats & more',
        items: '320+ items'
    }
  ];

  return (
    <Section className="bg-[#F0F5F9]">
      <div className="container mx-auto">
        <div className="text-center mb-16 max-w-3xl mx-auto">
            <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-4xl sm:text-6xl font-bold text-[#1E2022] mb-6 font-playfair"
            >
                Explore Every Detail
            </motion.h2>
            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-xl text-gray-600"
            >
                Temukan komponen yang Anda butuhkan berdasarkan kategori spesifik untuk setiap bagian vital Vespa Anda.
            </motion.p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {categories.map((cat, index) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
              className="group cursor-pointer"
            >
              <div className="relative h-80 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2">
                <img 
                    src={cat.image} 
                    alt={cat.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <div className="bg-[#52616B] text-white p-3 rounded-full w-fit mb-4 group-hover:scale-110 transition-transform">
                    <cat.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[#C9D6DF] transition-colors font-playfair">
                    {cat.name}
                  </h3>
                  <p className="text-gray-300 text-sm mb-2">{cat.description}</p>
                  <p className="text-[#C9D6DF] font-medium text-sm">{cat.items}</p>
                </div>

                <div className="absolute inset-0 bg-[#1E2022]/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="text-white text-center">
                        <ArrowRight className="w-8 h-8 mx-auto mb-2" />
                        <p className="font-bold">View Category</p>
                    </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
};

const FeaturedProducts = () => {
    return (
        <Section className="bg-white">
            <div className="container mx-auto">
                <div className="flex justify-between items-center mb-16">
                    <div>
                        <h2 className="text-4xl sm:text-5xl font-bold text-[#1E2022] mb-4 font-playfair">Featured Products</h2>
                        <p className="text-lg text-gray-600">Produk pilihan dengan rating terbaik dari customer kami</p>
                    </div>
                    <Link href="/products" passHref>
                        <button className="hidden md:flex items-center gap-2 text-[#52616B] font-bold hover:text-[#1E2022] transition-colors">
                            View All <ArrowRight className="w-5 h-5" />
                        </button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {mockProducts.map((product, index) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="group cursor-pointer"
                        >
                          <Link href={`/products/${product.id}`} passHref>
                            <div className="bg-[#F0F5F9] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-1">
                                <div className="relative h-56 overflow-hidden">
                                    <img 
                                        src={product.image} 
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2">
                                        <ShoppingCart className="w-4 h-4 text-gray-600" />
                                    </div>
                                </div>
                                
                                <div className="p-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex items-center">
                                            {[...Array(5)].map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                                />
                                            ))}
                                        </div>
                                        <span className="text-sm text-gray-500">({product.reviews})</span>
                                    </div>
                                    
                                    <h3 className="font-bold text-[#1E2022] mb-3 group-hover:text-[#52616B] transition-colors">
                                        {product.name}
                                    </h3>
                                    
                                    <div className="flex justify-between items-center">
                                        <span className="text-2xl font-bold text-[#52616B]">
                                            Rp {product.price.toLocaleString('id-ID')}
                                        </span>
                                        <button className="bg-[#52616B] text-white px-4 py-2 rounded-lg hover:bg-[#1E2022] transition-colors">
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                            </div>
                          </Link>
                        </motion.div>
                    ))}
                </div>

                <div className="text-center mt-12 md:hidden">
                    <Link href="/products" passHref>
                        <button className="flex items-center gap-2 mx-auto text-[#52616B] font-bold hover:text-[#1E2022] transition-colors">
                            View All Products <ArrowRight className="w-5 h-5" />
                        </button>
                    </Link>
                </div>
            </div>
        </Section>
    );
};

const OurPromise = () => {
    const promises = [
        { 
            icon: ShieldCheck, 
            title: "100% Original", 
            description: "Jaminan keaslian dengan sertifikat distributor resmi Piaggio untuk setiap pembelian."
        },
        { 
            icon: Truck, 
            title: "Fast Delivery", 
            description: "Pengiriman cepat ke seluruh Indonesia dengan packaging khusus anti rusak."
        },
        { 
            icon: Headphones, 
            title: "Expert Support", 
            description: "Tim teknis berpengalaman siap membantu konsultasi dan instalasi."
        }
    ];
    
    return (
        <Section className="bg-gradient-to-br from-[#52616B] to-[#1E2022] text-white">
            <div className="container mx-auto">
                <div className="text-center mb-16">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-4xl sm:text-5xl font-bold mb-6 font-playfair"
                    >
                        Why Choose Us?
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-xl text-white/80 max-w-3xl mx-auto"
                    >
                        Tiga alasan utama mengapa ribuan Vespa enthusiast mempercayakan kebutuhan mereka kepada kami.
                    </motion.p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {promises.map((promise, index) => (
                         <motion.div
                            key={promise.title}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.7, delay: index * 0.2, ease: "easeOut" }}
                            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300"
                         >
                            <div className="text-white flex justify-center mb-6">
                                <promise.icon className="w-16 h-16" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 font-playfair">{promise.title}</h3>
                            <p className="text-white/80 leading-relaxed">{promise.description}</p>
                         </motion.div>
                    ))}
                </div>
            </div>
        </Section>
    );
};

const TestimonialsSection = () => {
    return (
        <Section className="bg-[#F0F5F9]">
            <div className="container mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl sm:text-5xl font-bold text-[#1E2022] mb-6 font-playfair">What Our Customers Say</h2>
                    <p className="text-xl text-gray-600">Testimoni dari para Vespa enthusiast yang telah merasakan pelayanan terbaik kami</p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={testimonial.name}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.6, delay: index * 0.2 }}
                            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow duration-300"
                        >
                            <div className="flex items-center gap-1 mb-4">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                                ))}
                            </div>
                            
                            <p className="text-gray-700 mb-6 leading-relaxed italic">
                                "{testimonial.content}"
                            </p>
                            
                            <div className="flex items-center gap-4">
                                <img 
                                    src={testimonial.avatar} 
                                    alt={testimonial.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                                <div>
                                    <p className="font-bold text-[#1E2022]">{testimonial.name}</p>
                                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </Section>
    );
};

const CTASection = () => {
    return (
        <Section className="bg-gradient-to-r from-[#52616B] to-[#1E2022] text-white">
            <div className="container mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="text-4xl sm:text-6xl font-bold mb-6 font-playfair">
                        Ready to Restore Your <span className="text-[#C9D6DF]">Legend?</span>
                    </h2>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
                        Bergabunglah dengan ribuan Vespa enthusiast yang telah mempercayakan perawatan dan restorasi Vespa mereka kepada kami.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                        <button className="group bg-[#C9D6DF] text-[#1E2022] font-bold py-4 px-8 rounded-lg text-lg hover:bg-white transition-all transform hover:scale-105 shadow-2xl flex items-center gap-3">
                            <ShoppingCart className="w-5 h-5" />
                            Start Shopping Now
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                        </button>
                        <button className="group border-2 border-white text-white font-bold py-4 px-8 rounded-lg text-lg hover:bg-white hover:text-black transition-all transform hover:scale-105 flex items-center gap-3">
                            <Phone className="w-5 h-5" />
                            Konsultasi Gratis
                        </button>
                    </div>
                </motion.div>
            </div>
        </Section>
    );
};

export default function HomePage() {
  return (
    <div className="bg-[#F0F5F9]">
      <HeroSection />
      <StatsSection />
      <CategoriesSection />
      <FeaturedProducts />
      <OurPromise />
      <TestimonialsSection />
      <CTASection />
    </div>
  );
}
