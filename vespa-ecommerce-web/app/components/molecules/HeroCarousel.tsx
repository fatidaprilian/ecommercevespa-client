'use client'

import * as React from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

// Data dummy berdasarkan desain di PDF
const carouselItems = [
  {
    id: 1,
    image: "/JSSLogo.svg", // Nanti diganti dengan gambar banner asli
    title: "Racing Cylinder SIP Performance 125cc",
    year: "2025",
    description: "Aluminium Vespa Largeframe",
  },
  {
    id: 2,
    image: "/JSSLogo.svg", // Nanti diganti dengan gambar banner asli
    title: "AKRAPOVIĆ",
    year: "New Arrival",
    description: "Exhaust System",
  },
  {
    id: 3,
    image: "/JSSLogo.svg", // Nanti diganti dengan gambar banner asli
    title: "PIAGGIO PARTS",
    year: "Original",
    description: "Genuine Spare Parts",
  },
]

export function HeroCarousel() {
  return (
    <section className="w-full bg-brand-gray py-8 md:py-12">
      <Carousel
        opts={{
          loop: true,
        }}
        className="w-full max-w-6xl mx-auto"
      >
        <CarouselContent>
          {carouselItems.map((item) => (
            <CarouselItem key={item.id}>
              <div className="p-1">
                <Card className="bg-transparent border-none shadow-none rounded-lg overflow-hidden">
                  <CardContent className="flex flex-col md:flex-row items-center justify-between p-6 gap-8 aspect-video md:aspect-[16/5]">
                    {/* Kolom Teks */}
                    <div className="text-white text-center md:text-left w-full md:w-1/2 order-2 md:order-1">
                      <p className="text-lg text-gray-300 mb-2">{item.year}</p>
                      <h2 className="text-3xl lg:text-5xl font-bold text-brand-orange leading-tight">{item.title}</h2>
                      <p className="text-xl lg:text-2xl mt-4">{item.description}</p>
                    </div>
                    {/* Kolom Gambar */}
                    <div className="relative w-full h-48 md:h-full md:w-1/2 order-1 md:order-2">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        style={{ objectFit: "contain" }}
                        className="invert" // Hapus jika logo sudah berwarna terang
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex ml-14 text-white" />
        <CarouselNext className="hidden md:flex mr-14 text-white" />
      </Carousel>
    </section>
  )
}