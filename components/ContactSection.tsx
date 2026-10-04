"use client";
import StudioSelect from "@/components/ui/StudioSelect";
import devLog from "@/lib/dev-log";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, Mail, MapPin, Phone, Send, ShieldCheck, Star } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import TurnstileWidget from "@/components/TurnstileWidget";
import { policies } from "@/lib/policies";
import { validateEmail, validateName, validateSubject, validateMessage, sanitizeInput } from "@/lib/validation";
import { FormErrorBoundary } from "./ErrorBoundaries";

function ContactSectionContent() {
  const { settings } = useSiteSettings();
  const { settings: websiteSettings } = useWebsiteSettings();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [commentForm, setCommentForm] = useState({
    name: "",
    rating: 5,
    comment: "",
  });
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentStatus, setCommentStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const resetTurnstile = useCallback(() => {
    setTurnstileToken("");
    setTurnstileResetKey((key) => key + 1);
  }, []);

  // Fallback values
  const storeName = websiteSettings.website_name || settings.store_name || "GOSH PERFUME";
  const storeTagline =
    websiteSettings.tagline || settings.store_tagline || "Luxury Perfume Boutique";
  const email = websiteSettings.email || settings.store_email || "hello@goshperfume.com";
  const phone = websiteSettings.phone || settings.store_phone || "+1 (555) 123-4567";
  const address = websiteSettings.address || [settings.store_address, settings.city, settings.country]
    .filter(Boolean)
    .join(", ") || "123 Luxury Avenue, Beverly Hills, CA 90210, United States";
  const openingHours =
    websiteSettings.opening_hours ||
    "Monday - Friday: 10:00 AM - 8:00 PM\nSaturday: 10:00 AM - 6:00 PM\nSunday: 12:00 PM - 5:00 PM";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCommentInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setCommentForm((prev) => ({
      ...prev,
      [name]: name === "rating" ? Number(value) : value,
    }));
    setCommentStatus(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate full name
    const nameValidation = validateName(formData.fullName, "Full name");
    if (!nameValidation.isValid) {
      newErrors.fullName = nameValidation.error || "Invalid name";
    }

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error || "Invalid email";
    }

    // Validate subject
    const subjectValidation = validateSubject(formData.subject);
    if (!subjectValidation.isValid) {
      newErrors.subject = subjectValidation.error || "Invalid subject";
    }

    // Validate message
    const messageValidation = validateMessage(formData.message, 10, 5000);
    if (!messageValidation.isValid) {
      newErrors.message = messageValidation.error || "Invalid message";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormStatus(null);

    try {
      // Validate form
      if (!validateForm()) {
        setSubmitting(false);
        return;
      }

      if (!turnstileToken) {
        setFormStatus({ type: "error", text: "Please complete the security check." });
        setSubmitting(false);
        return;
      }

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: sanitizeInput(formData.fullName.trim()),
          email: sanitizeInput(formData.email.trim()),
          subject: sanitizeInput(formData.subject.trim()),
          message: sanitizeInput(formData.message.trim()),
          token: turnstileToken,
        }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not send your message.");

      setFormData({
        fullName: "",
        email: "",
        subject: "",
        message: "",
      });
      setFormStatus({ type: "success", text: "Message sent. Our team will reply soon." });
      resetTurnstile();
    } catch (error) {
      devLog.error("Contact form submit error:", error);
      setFormStatus({ type: "error", text: "Could not send your message. Please try again." });
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentStatus(null);

    const cleanName = commentForm.name.trim();
    const cleanComment = commentForm.comment.trim();

    if (!cleanName) {
      setCommentStatus({ type: "error", text: "Name is required." });
      return;
    }

    if (!cleanComment) {
      setCommentStatus({ type: "error", text: "Comment is required." });
      return;
    }

    if (commentForm.rating < 1 || commentForm.rating > 5) {
      setCommentStatus({ type: "error", text: "Rating must be between 1 and 5." });
      return;
    }

    try {
      setCommentSubmitting(true);
      const response = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sanitizeInput(cleanName),
          rating: commentForm.rating,
          comment: sanitizeInput(cleanComment),
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Could not submit your comment.");
      }

      setCommentForm({
        name: "",
        rating: 5,
        comment: "",
      });
      setCommentStatus({ type: "success", text: "Thank you for your comment!" });
    } catch (error) {
      devLog.error("Testimonial comment submit error:", error);
      setCommentStatus({ type: "error", text: "Could not submit your comment. Please try again." });
    } finally {
      setCommentSubmitting(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.98 },
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
    <section role="region" aria-label="Contact form" className="studio-contact-section relative overflow-hidden bg-[var(--site-bg)] py-8 lg:py-12">
      <div className="absolute inset-0 bg-surface-muted" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10"
        >
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-brand">
            Get In Touch
          </p>
          <h1 className="mb-6 text-3xl font-semibold text-ink sm:text-5xl lg:text-6xl">
            Contact
            <span className="block text-accent">Our Team</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted">
            Experience luxury perfumes crafted with passion. Reach out to discover your perfect scent or learn more about our exclusive collections.
          </p>
        </motion.div>

        {/* Content */}
        <motion.div 
          className="grid gap-6 lg:grid-cols-2 lg:gap-8 lg:items-start"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Contact Information */}
          <motion.div 
            variants={cardVariants} 
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col gap-6"
          >
            <div className="rounded-xl border border-line bg-surface p-5 shadow-panel sm:p-8">
              <div className="mb-6">
                <h2 className="studio-display studio-gradient text-2xl font-bold text-ink">Visit Our Boutique</h2>
                <p className="mt-2 text-sm font-medium text-accent">{storeTagline}</p>
              </div>
              
              <div className="space-y-6">
                <a
                  href={`tel:${phone}`}
                  className="flex min-w-0 items-start gap-3 rounded-xl border border-transparent p-3 transition hover:border-line hover:bg-accent-soft/50 sm:gap-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-accent-soft text-accent">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">Phone</p>
                    <p className="text-secondary">{phone}</p>
                  </div>
                </a>

                <a
                  href={`mailto:${email}`}
                  className="flex min-w-0 items-start gap-3 rounded-xl border border-transparent p-3 transition hover:border-line hover:bg-accent-soft/50 sm:gap-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-accent-soft text-accent">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">Email</p>
                    <p className="break-all text-secondary">{email}</p>
                  </div>
                </a>

                <div className="flex min-w-0 items-start gap-3 rounded-xl border border-transparent p-3 sm:gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-accent-soft text-accent">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">Address</p>
                    <p className="text-secondary" style={{ whiteSpace: "pre-line" }}>
                      {address.split(", ").join("\n")}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 items-start gap-3 rounded-xl border border-transparent p-3 sm:gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-accent-soft text-accent">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">Working Hours</p>
                    <p className="whitespace-pre-line text-secondary">
                      {openingHours}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <motion.div 
              variants={cardVariants}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="rounded-xl border border-line bg-surface-muted p-6    "
            >
              <h3 className="text-xl font-bold text-ink mb-4 ">Why Choose {storeName}?</h3>
              <ul className="space-y-3 text-secondary ">
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-brand"></div>
                  Premium luxury fragrances
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-brand"></div>
                  Expert fragrance consultation
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-brand"></div>
                  Exclusive limited editions
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-brand"></div>
                  Personalized scent matching
                </li>
              </ul>
            </motion.div>

            <motion.div
              variants={cardVariants}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="rounded-xl border border-line bg-surface p-5 shadow-panel"
            >
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-accent-soft text-accent">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="studio-display studio-gradient text-lg font-semibold text-ink">Shop Policies</h2>
                  <p className="mt-1 text-sm leading-6 text-secondary">
                    Review our Myanmar shop policies for privacy, orders, refunds, and delivery.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {policies.map((policy) => (
                  <Link
                    key={policy.href}
                    href={policy.href}
                    className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-bold text-ink transition hover:border-line hover:bg-accent-soft hover:text-accent"
                  >
                    {policy.title}
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Contact Form */}
          <motion.div 
            variants={cardVariants}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="rounded-xl border border-line bg-surface p-5 shadow-panel sm:p-8">
              <h2 className="studio-display studio-gradient text-2xl font-bold text-ink mb-6">Send us a Message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {formStatus && (
                  <div
                    role="alert"
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                      formStatus.type === "success"
                        ? "border-success bg-success-soft text-success"
                        : "border-destructive bg-destructive-soft text-destructive"
                    }`}
                  >
                    {formStatus.text}
                  </div>
                )}

                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-ink mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className={`w-full rounded-2xl border ${errors.fullName ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-line focus:border-focus focus:ring-focus/20'} bg-surface px-4 py-3 text-ink placeholder:text-faint transition focus:outline-none focus:ring-2`}
                    placeholder="Enter your full name"
                    aria-invalid={!!errors.fullName}
                    aria-describedby={errors.fullName ? "fullName-error" : undefined}
                  />
                  {errors.fullName && (
                    <p id="fullName-error" className="mt-1 text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-ink mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className={`w-full rounded-2xl border ${errors.email ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-line focus:border-focus focus:ring-focus/20'} bg-surface px-4 py-3 text-ink placeholder:text-faint transition focus:outline-none focus:ring-2`}
                    placeholder="Enter your email address"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                  {errors.email && (
                    <p id="email-error" className="mt-1 text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-semibold text-ink mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className={`w-full rounded-2xl border ${errors.subject ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-line focus:border-focus focus:ring-focus/20'} bg-surface px-4 py-3 text-ink placeholder:text-faint transition focus:outline-none focus:ring-2`}
                    placeholder="What can we help you with?"
                    aria-invalid={!!errors.subject}
                    aria-describedby={errors.subject ? "subject-error" : undefined}
                  />
                  {errors.subject && (
                    <p id="subject-error" className="mt-1 text-sm text-destructive">{errors.subject}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-ink mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={5}
                    className={`w-full rounded-2xl border ${errors.message ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-line focus:border-focus focus:ring-focus/20'} bg-surface px-4 py-3 text-ink placeholder:text-faint transition focus:outline-none focus:ring-2 resize-none`}
                    placeholder="Tell us more about your inquiry..."
                    aria-invalid={!!errors.message}
                    aria-describedby={errors.message ? "message-error" : undefined}
                  />
                  {errors.message && (
                    <p id="message-error" className="mt-1 text-sm text-destructive">{errors.message}</p>
                  )}
                </div>

                <TurnstileWidget
                  action="contact"
                  resetKey={turnstileResetKey}
                  onVerify={setTurnstileToken}
                  onExpire={resetTurnstile}
                />

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-8 py-4 font-semibold text-on-brand transition hover:bg-brand focus:outline-none focus:ring-2 focus:ring-focus/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-5 w-5 transition group-hover:translate-x-1" />
                  {submitting ? "Sending..." : "Send Message"}
                </motion.button>
              </form>
            </div>

            <div className="mt-6 rounded-xl border border-line bg-surface p-5 shadow-panel">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Share Your Experience</p>
                <h2 className="studio-display studio-gradient mt-1 text-xl font-bold text-ink">Leave a Comment</h2>
              </div>

              <form onSubmit={handleCommentSubmit} className="space-y-4">
                {commentStatus && (
                  <div
                    role="alert"
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-bold ${
                      commentStatus.type === "success"
                        ? "border-line bg-accent-soft text-ink"
                        : "border-destructive bg-destructive-soft text-destructive"
                    }`}
                  >
                    {commentStatus.type === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    )}
                    <p>{commentStatus.text}</p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                  <div>
                    <label htmlFor="testimonial-name" className="mb-2 block text-sm font-semibold text-ink">
                      Name *
                    </label>
                    <input
                      id="testimonial-name"
                      name="name"
                      value={commentForm.name}
                      onChange={handleCommentInputChange}
                      required
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-faint transition focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                      placeholder="Enter your name"
                    />
                  </div>

                  <div>
                    <label htmlFor="testimonial-rating" className="mb-2 block text-sm font-semibold text-ink">
                      Rating
                    </label>
                    <StudioSelect id="testimonial-rating" ariaLabel="Rating" value={String(commentForm.rating)} options={[5,4,3,2,1].map(value => ({ value: String(value), label: value + (value === 1 ? " star" : " stars") }))} onChange={value => { setCommentForm(prev => ({ ...prev, rating: Number(value) })); setCommentStatus(null); }} />
                  </div>
                </div>

                <div>
                  <label htmlFor="testimonial-comment" className="mb-2 block text-sm font-semibold text-ink">
                    Comment *
                  </label>
                  <textarea
                    id="testimonial-comment"
                    name="comment"
                    value={commentForm.comment}
                    onChange={handleCommentInputChange}
                    required
                    rows={3}
                    className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-faint transition focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                    placeholder="Tell us about your GOSH PERFUME experience"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={commentSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-on-brand transition hover:bg-brand focus:outline-none focus:ring-2 focus:ring-focus/50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <Star className="h-4 w-4 transition group-hover:scale-110" />
                  {commentSubmitting ? "Submitting..." : "Submit Comment"}
                </motion.button>
              </form>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}

export default function ContactSection() {
  return (
    <FormErrorBoundary context="contact-form">
      <ContactSectionContent />
    </FormErrorBoundary>
  );
}
