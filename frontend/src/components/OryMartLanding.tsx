// import React, { useState } from 'react';
// import { motion, AnimatePresence, Variants } from 'framer-motion';
// import { clsx, type ClassValue } from 'clsx';
// import { twMerge } from 'tailwind-merge';
// import {
//   ShoppingCart,
//   ShieldCheck,
//   Truck,
//   Star,
//   Package,
//   Headphones,
//   Gift,
//   Globe,
//   Sparkles,
//   Gem,
//   Crown,
//   Lightbulb,
//   Check,
//   X,
//   Mail,
//   Phone,
//   MapPin,
//   Facebook,
//   Twitter,
//   Instagram,
//   Linkedin,
//   ChevronRight,
//   Menu,
// } from 'lucide-react';

// // Utility function for merging Tailwind classes
// function cn(...inputs: ClassValue[]) {
//   return twMerge(clsx(inputs));
// }

// // Reusable Glassmorphic Card component
// interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
//   children: React.ReactNode;
//   variants?: Variants;
// }

// const GlassCard: React.FC<GlassCardProps> = ({ children, className, variants, ...props }) => (
//   <motion.div
//     variants={variants}
//     className={cn(
//       'bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-lg hover:bg-white/10 transition-colors duration-300',
//       className
//     )}
//     {...props}
//   >
//     {children}
//   </motion.div>
// );

// // Animation variants
// const fadeIn: Variants = {
//   initial: { opacity: 0, y: 20 },
//   whileInView: { opacity: 1, y: 0 },
//   viewport: { once: true, amount: 0.3 } as any,
//   transition: { duration: 0.8, ease: 'easeOut' },
// };

// const staggerContainer: Variants = {
//   initial: {},
//   whileInView: {
//     transition: {
//       staggerChildren: 0.2,
//     } as any,
//   },
//   viewport: { once: true, amount: 0.3 } as any,
// };

// const itemVariants: Variants = {
//   initial: { opacity: 0, y: 20 },
//   whileInView: { opacity: 1, y: 0 },
//   viewport: { once: true, amount: 0.3 } as any,
//   transition: { duration: 0.6, ease: 'easeOut' },
// };

// interface NavLink {
//   name: string;
//   href: string;
// }

// export default function OryMartLanding() {
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

//   const navLinks: NavLink[] = [
//     { name: 'Home', href: '#hero' },
//     { name: 'Features', href: '#features' },
//     { name: 'Testimonials', href: '#testimonials' },
//     { name: 'Pricing', href: '#pricing' },
//     { name: 'Contact', href: '#footer' },
//   ];

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 text-neutral-200 font-sans antialiased overflow-x-hidden selection:bg-indigo-500/30">
//       {/* Navbar */}
//       <motion.nav
//         initial={{ y: -100, opacity: 0 }}
//         animate={{ y: 0, opacity: 1 }}
//         transition={{ duration: 0.5, ease: 'easeOut' }}
//         className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-white/5 supports-[backdrop-filter]:bg-neutral-950/60"
//         role="navigation"
//         aria-label="Main Navigation"
//       >
//         <div className="container mx-auto px-6 py-4 flex items-center justify-between">
//           <a href="#hero" className="flex items-center space-x-2 text-2xl font-bold text-white group" aria-label="OryMart Home">
//             <Sparkles className="text-indigo-400 group-hover:rotate-12 transition-transform duration-300" size={28} />
//             <span>OryMart</span>
//           </a>

//           <div className="hidden md:flex items-center space-x-8">
//             {navLinks.map((link) => (
//               <a
//                 key={link.name}
//                 href={link.href}
//                 className="text-neutral-300 hover:text-indigo-400 transition-colors duration-300 text-lg font-medium relative group"
//               >
//                 {link.name}
//                 <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-400 transition-all duration-300 group-hover:w-full"></span>
//               </a>
//             ))}
//             <motion.button
//               whileHover={{ scale: 1.05 }}
//               whileTap={{ scale: 0.95 }}
//               className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-full shadow-lg shadow-indigo-500/20 transition-all duration-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
//               aria-label="Sign In"
//             >
//               Sign In
//             </motion.button>
//           </div>

//           <div className="md:hidden">
//             <button
//               onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
//               className="text-white focus:outline-none p-2 rounded-lg hover:bg-white/10 transition-colors"
//               aria-label={isMobileMenuOpen ? "Close Menu" : "Open Menu"}
//               aria-expanded={isMobileMenuOpen}
//             >
//               {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
//             </button>
//           </div>
//         </div>

//         <AnimatePresence>
//           {isMobileMenuOpen && (
//             <motion.div
//               initial={{ opacity: 0, height: 0 }}
//               animate={{ opacity: 1, height: 'auto' }}
//               exit={{ opacity: 0, height: 0 }}
//               transition={{ duration: 0.3, ease: 'easeOut' }}
//               className="md:hidden bg-neutral-900/95 backdrop-blur-lg border-b border-white/5 overflow-hidden"
//             >
//               <div className="flex flex-col items-center space-y-4 py-6">
//                 {navLinks.map((link) => (
//                   <a
//                     key={link.name}
//                     href={link.href}
//                     onClick={() => setIsMobileMenuOpen(false)}
//                     className="text-neutral-300 hover:text-indigo-400 transition-colors duration-300 text-lg font-medium py-2 w-full text-center hover:bg-white/5"
//                   >
//                     {link.name}
//                   </a>
//                 ))}
//                 <motion.button
//                   whileHover={{ scale: 1.05 }}
//                   whileTap={{ scale: 0.95 }}
//                   className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-full shadow-lg transition-all duration-300 w-fit mt-4"
//                   onClick={() => setIsMobileMenuOpen(false)}
//                 >
//                   Sign In
//                 </motion.button>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </motion.nav>

//       <main>
//         {/* Hero Section */}
//         <motion.section
//           id="hero"
//           className="relative min-h-screen flex items-center justify-center text-center overflow-hidden pt-24"
//           initial="initial"
//           whileInView="whileInView"
//           viewport={{ once: true, amount: 0.5 }}
//         >
//           <div
//             className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-105"
//             style={{
//               backgroundImage:
//                 "url('https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
//             }}
//             aria-hidden="true"
//           >
//             <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-[2px] bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent"></div>
//           </div>

//           <div className="relative z-10 container mx-auto px-6 max-w-5xl">
//             <motion.div
//               variants={fadeIn}
//               className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8 text-neutral-300 text-sm font-medium"
//             >
//               <span className="relative flex h-2 w-2">
//                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
//                 <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
//               </span>
//               New Collection Available Now
//             </motion.div>

//             <motion.h1
//               variants={fadeIn}
//               className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-tight text-white mb-8 drop-shadow-2xl tracking-tight"
//             >
//               Elevate Your <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Digital Lifestyle</span>
//             </motion.h1>
            
//             <motion.p
//               variants={fadeIn}
//               transition={{ delay: 0.2, ...fadeIn.transition }}
//               className="text-xl md:text-2xl text-neutral-300 mb-12 max-w-3xl mx-auto leading-relaxed font-light"
//             >
//               Discover premium electronics, curated fashion, and smart home essentials. 
//               Seamless shopping, secure checkout, <span className="text-white font-medium">exceptional quality</span>.
//             </motion.p>
            
//             <motion.div
//               variants={fadeIn}
//               transition={{ delay: 0.4, ...fadeIn.transition }}
//               className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6"
//             >
//               <motion.a
//                 href="#features"
//                 whileHover={{ scale: 1.05, boxShadow: '0 20px 40px -10px rgba(79, 70, 229, 0.4)' }}
//                 whileTap={{ scale: 0.95 }}
//                 className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-10 rounded-full text-lg transition-all duration-300 flex items-center justify-center w-full sm:w-auto shadow-xl shadow-indigo-600/20"
//                 role="button"
//               >
//                 Shop Now <ChevronRight className="ml-2" size={20} />
//               </motion.a>
//               <motion.a
//                 href="#pricing"
//                 whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
//                 whileTap={{ scale: 0.95 }}
//                 className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-4 px-10 rounded-full text-lg transition-all duration-300 flex items-center justify-center w-full sm:w-auto backdrop-blur-sm"
//                 role="button"
//               >
//                 View Plans
//               </motion.a>
//             </motion.div>
//           </div>
          
//           {/* Scroll Indicator */}
//           <motion.div 
//             className="absolute bottom-10 left-1/2 -translate-x-1/2 text-neutral-500 flex flex-col items-center gap-2"
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1, y: [0, 10, 0] }}
//             transition={{ delay: 1, duration: 2, repeat: Infinity }}
//           >
//             <span className="text-xs uppercase tracking-widest">Scroll</span>
//             <div className="w-px h-12 bg-gradient-to-b from-neutral-500 to-transparent"></div>
//           </motion.div>
//         </motion.section>

//         {/* Features Section */}
//         <motion.section
//           id="features"
//           className="py-32 bg-neutral-900 relative"
//           variants={staggerContainer}
//           initial="initial"
//           whileInView="whileInView"
//           viewport={{ once: true, amount: 0.2 }}
//         >
//           {/* Background Grid */}
//           <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)] pointer-events-none"></div>

//           <div className="container mx-auto px-6 relative z-10">
//             <div className="text-center mb-20">
//               <motion.h2 variants={fadeIn} className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
//                 Why Choose <span className="text-indigo-400">OryMart</span>?
//               </motion.h2>
//               <motion.p variants={fadeIn} className="text-xl text-neutral-400 max-w-3xl mx-auto leading-relaxed">
//                 Experience a new standard in online shopping with our unparalleled features and commitment to excellence.
//               </motion.p>
//             </div>

//             <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" variants={staggerContainer}>
//               {[
//                 { icon: Package, color: 'text-indigo-400', title: 'Curated Selection', desc: 'Hand-picked products from top brands, ensuring quality in every purchase.' },
//                 { icon: ShieldCheck, color: 'text-cyan-400', title: 'Secure Payments', desc: 'Shop with confidence using our encrypted payment gateway.' },
//                 { icon: Truck, color: 'text-purple-400', title: 'Fast & Reliable Shipping', desc: 'Get your orders delivered quickly & safely to your doorstep.' },
//                 { icon: Headphones, color: 'text-green-400', title: '24/7 Support', desc: 'Our dedicated team is ready to assist you day and night.' },
//                 { icon: Gift, color: 'text-rose-400', title: 'Exclusive Deals', desc: 'Access special promotions available only to OryMart members.' },
//                 { icon: Globe, color: 'text-yellow-400', title: 'Global Reach', desc: 'Delivering premium products to customers worldwide.' },
//               ].map((feature, idx) => (
//                 <GlassCard key={idx} variants={itemVariants} className="flex flex-col items-center text-center p-8 group hover:-translate-y-2 transition-transform duration-300 border-white/5 hover:border-indigo-500/30">
//                   <div className={`p-4 rounded-2xl bg-white/5 mb-6 group-hover:scale-110 transition-transform duration-300 ${feature.color}`}>
//                     <feature.icon size={40} strokeWidth={1.5} />
//                   </div>
//                   <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">{feature.title}</h3>
//                   <p className="text-neutral-400 group-hover:text-neutral-300 transition-colors leading-relaxed">
//                     {feature.desc}
//                   </p>
//                 </GlassCard>
//               ))}
//             </motion.div>
//           </div>
//         </motion.section>

//         {/* Testimonials Section */}
//         <motion.section
//           id="testimonials"
//           className="py-32 bg-neutral-950 border-t border-white/5"
//           variants={staggerContainer}
//           initial="initial"
//           whileInView="whileInView"
//           viewport={{ once: true, amount: 0.2 }}
//         >
//           <div className="container mx-auto px-6 text-center">
//             <motion.h2 variants={fadeIn} className="text-4xl md:text-5xl font-extrabold text-white mb-6">
//               What Our Customers Say
//             </motion.h2>
//             <motion.p variants={fadeIn} className="text-xl text-neutral-400 mb-20 max-w-3xl mx-auto">
//               Hear directly from the people who love shopping with OryMart.
//             </motion.p>

//             <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" variants={staggerContainer}>
//               {[
//                 {
//                   img: "https://images.unsplash.com/photo-1507003211169-e695c6edd65d?q=80&w=250&auto=format&fit=crop",
//                   text: "OryMart has completely changed my online shopping experience. The product quality is unmatched!",
//                   name: "Jane Doe",
//                   role: "Tech Enthusiast",
//                   borderColor: "border-indigo-500"
//                 },
//                 {
//                   img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=250&auto=format&fit=crop",
//                   text: "The customer service is outstanding! They resolved my issue quickly and efficiently.",
//                   name: "John Smith",
//                   role: "Fashion Blogger",
//                   borderColor: "border-cyan-500"
//                 },
//                 {
//                   img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=250&auto=format&fit=crop",
//                   text: "I'm always finding unique and high-quality items on OryMart. It's my go-to store.",
//                   name: "Emily White",
//                   role: "Creative Director",
//                   borderColor: "border-purple-500"
//                 }
//               ].map((testimonial, idx) => (
//                 <GlassCard key={idx} variants={itemVariants} className="flex flex-col items-center text-center p-8 relative overflow-hidden group">
//                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                  
//                   <div className="relative mb-8">
//                     <div className={`absolute inset-0 rounded-full blur-lg opacity-50 bg-current ${testimonial.borderColor.replace('border-', 'text-')}`}></div>
//                     <img
//                       src={testimonial.img}
//                       alt={`Avatar of ${testimonial.name}`}
//                       className={`relative w-24 h-24 rounded-full object-cover border-4 ${testimonial.borderColor} shadow-2xl`}
//                       loading="lazy"
//                     />
//                   </div>
                  
//                   <p className="text-lg italic text-neutral-300 mb-6 leading-relaxed">"{testimonial.text}"</p>
                  
//                   <div className="flex items-center justify-center mb-6 gap-1">
//                     {[...Array(5)].map((_, i) => (
//                       <Star key={i} className="text-yellow-400 fill-yellow-400 drop-shadow-md" size={18} />
//                     ))}
//                   </div>
                  
//                   <div>
//                     <p className="font-bold text-white text-xl">{testimonial.name}</p>
//                     <p className="text-neutral-500 text-sm font-medium uppercase tracking-wider mt-1">{testimonial.role}</p>
//                   </div>
//                 </GlassCard>
//               ))}
//             </motion.div>
//           </div>
//         </motion.section>

//         {/* Pricing Section */}
//         <motion.section
//           id="pricing"
//           className="py-32 bg-neutral-900 border-t border-white/5"
//           variants={staggerContainer}
//           initial="initial"
//           whileInView="whileInView"
//           viewport={{ once: true, amount: 0.2 }}
//         >
//           <div className="container mx-auto px-6 text-center">
//             <motion.h2 variants={fadeIn} className="text-4xl md:text-5xl font-extrabold text-white mb-6">
//               Unlock More with <span className="text-indigo-400">OryMart Plus</span>
//             </motion.h2>
//             <motion.p variants={fadeIn} className="text-xl text-neutral-400 mb-20 max-w-3xl mx-auto">
//               Choose a plan that fits your shopping habits and enjoy exclusive benefits.
//             </motion.p>

//             <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto" variants={staggerContainer}>
//               {/* Basic Plan */}
//               <GlassCard variants={itemVariants} className="flex flex-col p-10 text-left border-white/5">
//                 <div className="flex items-center space-x-4 mb-6">
//                   <div className="p-3 bg-indigo-500/10 rounded-xl">
//                     <Lightbulb className="text-indigo-400" size={32} />
//                   </div>
//                   <h3 className="text-3xl font-bold text-white">Starter</h3>
//                 </div>
//                 <p className="text-neutral-400 mb-8 border-b border-white/5 pb-8">Perfect for occasional shoppers getting started.</p>
//                 <div className="text-white mb-8">
//                   <span className="text-5xl font-extrabold tracking-tight">$0</span>
//                   <span className="text-lg text-neutral-500 font-medium">/month</span>
//                 </div>
//                 <ul className="space-y-4 text-neutral-300 flex-grow mb-10 text-sm">
//                   {[
//                     { text: 'Standard Shipping', active: true },
//                     { text: 'Basic Customer Support', active: true },
//                     { text: 'Access to Sales Events', active: true },
//                     { text: 'Free Returns', active: false },
//                     { text: 'Exclusive Discounts', active: false },
//                   ].map((feature, i) => (
//                     <li key={i} className={`flex items-center ${feature.active ? 'text-white' : 'text-neutral-600'}`}>
//                       {feature.active ? <Check className="text-green-400 mr-3 flex-shrink-0" size={18} /> : <X className="text-neutral-700 mr-3 flex-shrink-0" size={18} />}
//                       {feature.text}
//                     </li>
//                   ))}
//                 </ul>
//                 <motion.button
//                   whileHover={{ scale: 1.02 }}
//                   whileTap={{ scale: 0.98 }}
//                   className="mt-auto w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all duration-300"
//                 >
//                   Current Plan
//                 </motion.button>
//               </GlassCard>

//               {/* Pro Plan */}
//               <GlassCard variants={itemVariants} className="flex flex-col p-10 text-left border-2 border-indigo-500 shadow-2xl shadow-indigo-500/10 relative z-10 scale-105">
//                 <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg">Most Popular</div>
//                 <div className="flex items-center space-x-4 mb-6">
//                   <div className="p-3 bg-indigo-500/20 rounded-xl">
//                     <Gem className="text-indigo-400" size={32} />
//                   </div>
//                   <h3 className="text-3xl font-bold text-white">Premium</h3>
//                 </div>
//                 <p className="text-neutral-400 mb-8 border-b border-white/5 pb-8">For regular shoppers seeking maximum value.</p>
//                 <div className="text-white mb-8">
//                   <span className="text-5xl font-extrabold tracking-tight">$9</span>
//                   <span className="text-lg text-neutral-500 font-medium">/month</span>
//                 </div>
//                 <ul className="space-y-4 text-neutral-300 flex-grow mb-10 text-sm">
//                    {[
//                     { text: 'Free Express Shipping', active: true, bold: true },
//                     { text: 'Priority Customer Support', active: true },
//                     { text: 'Early Access to Sales', active: true },
//                     { text: 'Free Returns', active: true, bold: true },
//                     { text: 'Dedicated Account Manager', active: false },
//                   ].map((feature, i) => (
//                     <li key={i} className={`flex items-center ${feature.active ? 'text-white' : 'text-neutral-600'}`}>
//                       {feature.active ? <Check className="text-green-400 mr-3 flex-shrink-0" size={18} /> : <X className="text-neutral-700 mr-3 flex-shrink-0" size={18} />}
//                       <span className={feature.bold ? 'font-bold' : ''}>{feature.text}</span>
//                     </li>
//                   ))}
//                 </ul>
//                 <motion.button
//                   whileHover={{ scale: 1.02 }}
//                   whileTap={{ scale: 0.98 }}
//                   className="mt-auto w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/25 transition-all duration-300"
//                 >
//                   Get Premium
//                 </motion.button>
//               </GlassCard>

//               {/* Enterprise Plan */}
//               <GlassCard variants={itemVariants} className="flex flex-col p-10 text-left border-white/5">
//                 <div className="flex items-center space-x-4 mb-6">
//                   <div className="p-3 bg-purple-500/10 rounded-xl">
//                     <Crown className="text-purple-400" size={32} />
//                   </div>
//                   <h3 className="text-3xl font-bold text-white">VIP</h3>
//                 </div>
//                 <p className="text-neutral-400 mb-8 border-b border-white/5 pb-8">The ultimate experience for power users.</p>
//                 <div className="text-white mb-8">
//                   <span className="text-5xl font-extrabold tracking-tight">$29</span>
//                   <span className="text-lg text-neutral-500 font-medium">/month</span>
//                 </div>
//                 <ul className="space-y-4 text-neutral-300 flex-grow mb-10 text-sm">
//                    {[
//                     { text: 'Free Overnight Shipping', active: true, bold: true },
//                     { text: '24/7 VIP Support', active: true },
//                     { text: 'Exclusive Product Launches', active: true, bold: true },
//                     { text: 'Free Returns & Exchanges', active: true },
//                     { text: 'Dedicated Account Manager', active: true },
//                   ].map((feature, i) => (
//                     <li key={i} className={`flex items-center ${feature.active ? 'text-white' : 'text-neutral-600'}`}>
//                       {feature.active ? <Check className="text-green-400 mr-3 flex-shrink-0" size={18} /> : <X className="text-neutral-700 mr-3 flex-shrink-0" size={18} />}
//                       <span className={feature.bold ? 'font-bold' : ''}>{feature.text}</span>
//                     </li>
//                   ))}
//                 </ul>
//                 <motion.button
//                   whileHover={{ scale: 1.02 }}
//                   whileTap={{ scale: 0.98 }}
//                   className="mt-auto w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all duration-300"
//                 >
//                   Go VIP
//                 </motion.button>
//               </GlassCard>
//             </motion.div>
//           </div>
//         </motion.section>
//       </main>

//       {/* Footer */}
//       <motion.footer
//         id="footer"
//         className="bg-neutral-950 py-20 border-t border-white/5 relative overflow-hidden"
//         initial="initial"
//         whileInView="whileInView"
//         viewport={{ once: true, amount: 0.2 }}
//         variants={fadeIn}
//       >
//         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30"></div>
        
//         <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left relative z-10">
//           <motion.div variants={itemVariants} className="flex flex-col items-center md:items-start">
//             <a href="#hero" className="flex items-center space-x-2 text-3xl font-bold text-white mb-6 group">
//               <Sparkles className="text-indigo-400 group-hover:rotate-12 transition-transform duration-300" size={32} />
//               <span>OryMart</span>
//             </a>
//             <p className="text-neutral-400 mb-8 max-w-xs text-sm leading-relaxed">
//               Your ultimate destination for premium products and an unparalleled shopping experience.
//             </p>
//             <div className="flex space-x-4">
//               {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
//                 <motion.a
//                   key={i}
//                   href="#"
//                   whileHover={{ scale: 1.2, color: '#818cf8' }}
//                   className="text-neutral-500 hover:text-indigo-400 transition-colors p-2 bg-white/5 rounded-full"
//                   aria-label={`Visit our ${Icon.name} page`}
//                 >
//                   <Icon size={20} />
//                 </motion.a>
//               ))}
//             </div>
//           </motion.div>

//           {[
//             { title: "Quick Links", links: ["Features", "Testimonials", "OryMart Plus", "Blog"] },
//             { title: "Support", links: ["Help Center", "FAQs", "Shipping & Returns", "Privacy Policy", "Terms of Service"] },
//           ].map((column, idx) => (
//             <motion.div key={idx} variants={itemVariants}>
//               <h4 className="text-lg font-bold text-white mb-6 uppercase tracking-wider text-xs">{column.title}</h4>
//               <ul className="space-y-4 text-sm">
//                 {column.links.map((link, i) => (
//                   <li key={i}>
//                     <a href="#" className="text-neutral-400 hover:text-indigo-400 transition-colors block hover:translate-x-1 duration-300">
//                       {link}
//                     </a>
//                   </li>
//                 ))}
//               </ul>
//             </motion.div>
//           ))}

//           <motion.div variants={itemVariants}>
//             <h4 className="text-lg font-bold text-white mb-6 uppercase tracking-wider text-xs">Contact Us</h4>
//             <ul className="space-y-4 text-sm">
//               <li className="flex items-center justify-center md:justify-start group">
//                 <div className="p-2 bg-indigo-500/10 rounded-lg mr-3 group-hover:bg-indigo-500/20 transition-colors">
//                   <Mail className="text-indigo-400" size={18} />
//                 </div>
//                 <a href="mailto:support@orymart.com" className="text-neutral-400 hover:text-white transition-colors">
//                   support@orymart.com
//                 </a>
//               </li>
//               <li className="flex items-center justify-center md:justify-start group">
//                 <div className="p-2 bg-indigo-500/10 rounded-lg mr-3 group-hover:bg-indigo-500/20 transition-colors">
//                   <Phone className="text-indigo-400" size={18} />
//                 </div>
//                 <a href="tel:+1234567890" className="text-neutral-400 hover:text-white transition-colors">
//                   +1 (234) 567-890
//                 </a>
//               </li>
//               <li className="flex items-start justify-center md:justify-start group">
//                  <div className="p-2 bg-indigo-500/10 rounded-lg mr-3 mt-1 group-hover:bg-indigo-500/20 transition-colors">
//                   <MapPin className="text-indigo-400" size={18} />
//                 </div>
//                 <span className="text-neutral-400 max-w-[200px] text-left">123 E-commerce St, Suite 100, Digital City, DC 90210</span>
//               </li>
//             </ul>
//           </motion.div>
//         </div>

//         <motion.div
//           variants={fadeIn}
//           className="container mx-auto px-6 mt-16 pt-8 border-t border-white/5 text-center text-neutral-600 text-xs font-medium uppercase tracking-widest"
//         >
//           <p>&copy; {new Date().getFullYear()} OryMart. All rights reserved.</p>
//         </motion.div>
//       </motion.footer>
//     </div>
//   );
// }
