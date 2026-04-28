"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function ContactSection() {
  const { settings } = useSiteSettings();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: "",
  });

  // Fallback values
  const storeName = settings.store_name || "GOSH PERFUME";
  const storeTagline = settings.store_tagline || "Luxury Perfume Boutique";
  const email = settings.store_email || "hello@goshperfume.com";
  const phone = settings.store_phone || "+1 (555) 123-4567";
  const address = [settings.store_address, settings.city, settings.country]
    .filter(Boolean)
    .join(", ") || "123 Luxury Avenue, Beverly Hills, CA 90210, United States";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect to Supabase later
    console.log("Form submitted:", formData);
    // Reset form after submission
    setFormData({
      fullName: "",
      email: "",
      subject: "",
      message: "",
    });
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 }
  };

  const staggerContainer = {
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  return (
    <section className="relative overflow-hidden bg-white py-8 lg:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.08),transparent_50%)]" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10"
        >
          <p className="text-sm uppercase tracking-[0.35em] text-yellow-600 mb-4">
            Get In Touch
          </p>
          <h1 className="text-3xl font-black text-black sm:text-5xl lg:text-6xl mb-6">
            Contact
            <span className="block text-yellow-600">Our Team</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-600">
            Experience luxury perfumes crafted with passion. Reach out to discover your perfect scent or learn more about our exclusive collections.
          </p>
        </motion.div>

        {/* Content */}
        <motion.div 
          className="grid gap-8 lg:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Contact Information */}
          <motion.div 
            variants={cardVariants} 
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_20px_80px_rgba(0,0,0,0.08)]">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-black">Visit Our Boutique</h2>
                <p className="mt-2 text-sm font-medium text-yellow-600">{storeTagline}</p>
              </div>
              
              <div className="space-y-6">
                <a
                  href={`tel:${phone}`}
                  className="flex items-start gap-4 rounded-2xl border border-transparent p-3 transition hover:border-yellow-200 hover:bg-yellow-50/50"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-100 text-yellow-600">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-black">Phone</p>
                    <p className="text-zinc-600">{phone}</p>
                  </div>
                </a>

                <a
                  href={`mailto:${email}`}
                  className="flex items-start gap-4 rounded-2xl border border-transparent p-3 transition hover:border-yellow-200 hover:bg-yellow-50/50"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-100 text-yellow-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-black">Email</p>
                    <p className="break-all text-zinc-600">{email}</p>
                  </div>
                </a>

                <div className="flex items-start gap-4 rounded-2xl border border-transparent p-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-100 text-yellow-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-black">Address</p>
                    <p className="text-zinc-600" style={{ whiteSpace: "pre-line" }}>
                      {address.split(", ").join("\n")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl border border-transparent p-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-100 text-yellow-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-black">Working Hours</p>
                    <div className="text-zinc-600">
                      <p>Monday - Friday: 10:00 AM - 8:00 PM</p>
                      <p>Saturday: 10:00 AM - 6:00 PM</p>
                      <p>Sunday: 12:00 PM - 5:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <motion.div 
              variants={cardVariants}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="rounded-3xl border border-yellow-400/30 bg-gradient-to-br from-yellow-50 to-yellow-100 p-8"
            >
              <h3 className="text-xl font-bold text-black mb-4">Why Choose {storeName}?</h3>
              <ul className="space-y-3 text-zinc-700">
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                  Premium luxury fragrances
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                  Expert fragrance consultation
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                  Exclusive limited editions
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                  Personalized scent matching
                </li>
              </ul>
            </motion.div>
          </motion.div>

          {/* Contact Form */}
          <motion.div 
            variants={cardVariants}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_20px_80px_rgba(0,0,0,0.08)]">
              <h2 className="text-2xl font-bold text-black mb-6">Send us a Message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-black mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-black placeholder-zinc-400 transition focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-black mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-black placeholder-zinc-400 transition focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                    placeholder="Enter your email address"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-semibold text-black mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-black placeholder-zinc-400 transition focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                    placeholder="What can we help you with?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-black mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={5}
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-black placeholder-zinc-400 transition focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/20 resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-8 py-4 font-semibold text-black transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                >
                  <Send className="h-5 w-5 transition group-hover:translate-x-1" />
                  Send Message
                </motion.button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}