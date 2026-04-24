import { SDLCProject } from '../types';

export class MockLLMService {
  async runRequirementAgent(prompt: string, attachments?: any[]) {
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Determine context from prompt
    const p = prompt.toLowerCase();

    if (p.includes('ecommerce') || p.includes('shop') || p.includes('store') || p.includes('product')) {
      return {
        userStories: [
          'As a customer, I want to browse products by category',
          'As a customer, I want to filter products by price and rating',
          'As a customer, I want to add items to a shopping cart',
          'As a customer, I want to view detailed product information',
          'As a customer, I want a seamless checkout experience'
        ],
        scope: 'Modern E-commerce platform with catalog, cart, and detailed product views.',
        assumptions: ['React + Tailwind stack', 'Lucide icons', 'Mobile-first design']
      };
    }

    if (p.includes('portfolio') || p.includes('resume') || p.includes('personal')) {
      return {
        userStories: [
          'As a visitor, I want to learn about the developer',
          'As a visitor, I want to view a showcase of projects',
          'As a visitor, I want to see technical skills and expertise',
          'As a visitor, I want an easy way to contact the developer'
        ],
        scope: 'Professional developer portfolio with hero section, projects grid, and skills showcase.',
        assumptions: ['Single page application', 'Smooth scrolling', 'Dark mode aesthetic']
      };
    }

    if (p.includes('dashboard') || p.includes('admin') || p.includes('analytics')) {
      return {
        userStories: [
          'As an admin, I want to view key performance metrics',
          'As an admin, I want to manage users and records',
          'As an admin, I want to filter and search data tables',
          'As an admin, I want to receive notifications'
        ],
        scope: 'Administrative dashboard with data visualization, tables, and sidebar navigation.',
        assumptions: ['Responsive layout', 'Data-dense UI', 'Professional color scheme']
      };
    }

    // Default generic response
    return {
      userStories: [
        'As a user, I want a clear understanding of the value proposition',
        'As a user, I want intuitive navigation',
        'As a user, I want to interact with core features easily',
        'As a user, I want a responsive experience on mobile'
      ],
      scope: 'Responsive web application with modern UI components and clear call-to-action.',
      assumptions: ['React functional components', 'Tailwind CSS styling', 'Interactive elements']
    };
  }

  async runDesignAgent(requirements: any, theme?: string) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      hld: {
        systemArchitectureOverview: "Modern microservices-inspired frontend architecture with atomic design principles.",
        architectureDiagram: "graph TD\n  A[User] --> B[App Shell]\n  B --> C[Navigation]\n  B --> D[Main Content]\n  D --> E[Feature Modules]",
        componentDiagram: "classDiagram\n  class App\n  class Layout\n  App --> Layout",
        dataFlowDescription: "Uni-directional data flow using React state and props.",
        externalIntegrations: ["Lucide Icons", "Framer Motion"],
        technologyStackOverview: "React 18, Tailwind CSS, TypeScript"
      },
      lld: {
        detailedComponentDesign: "Functional components with hooks for state management.",
        apiEndpoints: [
          { method: "GET", endpoint: "/api/v1/products", request: "{}", response: "{ products: [] }" },
          { method: "POST", endpoint: "/api/v1/cart", request: "{ id: string }", response: "{ success: boolean }" }
        ],
        dataModels: "Product { id: string, name: string, price: number }\nCart { items: Product[] }",
        uiComponentStructure: "Atomic design: Atoms, Molecules, Organisms",
        sequenceFlows: "sequenceDiagram\n  User ->> UI: Click Add to Cart\n  UI ->> State: Update Cart\n  State -->> UI: Render Updated Cart",
        classDiagram: "classDiagram\n  class ProductService {\n    +getProducts()\n  }"
      },
      databaseDesign: {
        erDiagram: "erDiagram\n  PRODUCT ||--o{ CART_ITEM : contains\n  USER ||--o{ CART : has",
        tables: [
          { name: "Products", fields: "id (UUID), name (String), price (Decimal)", relationships: "1:N with CartItems" },
          { name: "Users", fields: "id (UUID), email (String)", relationships: "1:1 with Cart" }
        ]
      }
    };
  }

  async runDevelopmentAgent(design: any, requirements: any, prompt: string, theme?: string) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    const p = prompt.toLowerCase();

    // Simulate multi-file output
    const getMultiFile = (singleFileCode: string) => ({
      'App.tsx': singleFileCode,
      'components/Header.tsx': `import React from 'react';\n\nexport const Header = () => <header className="p-4 border-b"><h1>Demo Header</h1></header>;`
    });

    // E-commerce Template
    if (p.includes('ecommerce') || p.includes('shop')) {
      return `import React, { useState } from 'react';
import { ShoppingCart, Search, Menu, Star, Heart, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EcommerceApp() {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const products = [
    { id: 1, name: 'Obsidian Headphones', price: 299, rating: 4.8, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80' },
    { id: 2, name: 'Vertex Smartwatch', price: 399, rating: 4.9, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80' },
    { id: 3, name: 'Aero Earbuds', price: 149, rating: 4.7, image: 'https://images.unsplash.com/photo-1572569028738-411a197b83cd?w=800&q=80' },
    { id: 4, name: 'Ergo Stand', price: 89, rating: 4.6, image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 px-6 py-4 shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black text-indigo-900 tracking-tighter">LUMINA</h1>
          <div className="flex items-center gap-6">
            <Search className="w-5 h-5 text-gray-500 hover:text-indigo-600 transition cursor-pointer" />
            <div className="relative cursor-pointer" onClick={() => setIsCartOpen(!isCartOpen)}>
              <ShoppingCart className="w-5 h-5 text-gray-500 hover:text-indigo-600 transition" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                  {cart.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      <header className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-widest"
            >
              New Collection 2024
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-7xl font-bold text-gray-900 leading-[0.9] tracking-tight"
            >
              Sound <br/> <span className="text-indigo-600">Perfected.</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-gray-500 max-w-md"
            >
              Experience high-fidelity audio with our premium range of headphones and accessories.
            </motion.p>
            <motion.button 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="px-8 py-4 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition shadow-xl shadow-indigo-600/20"
            >
              Shop Now
            </motion.button>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-indigo-600 rounded-full blur-[100px] opacity-20" />
            <img 
              src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80" 
              alt="Hero Product" 
              className="relative z-10 w-full rounded-3xl shadow-2xl rotate-3 hover:rotate-0 transition duration-700"
            />
          </motion.div>
        </div>
      </header>
      
      {/* Product Grid */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <h3 className="text-3xl font-bold text-gray-900">Trending Now</h3>
            <button className="text-indigo-600 font-bold hover:underline flex items-center gap-1">View All <ArrowRight className="w-4 h-4" /></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <motion.div 
                key={product.id}
                whileHover={{ y: -10 }}
                className="group relative bg-gray-50 rounded-2xl p-4 transition-all"
              >
                <div className="relative aspect-square mb-4 rounded-xl overflow-hidden bg-white">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                  <button 
                    onClick={() => setCart([...cart, product])}
                    className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-900 hover:bg-indigo-600 hover:text-white transition"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{product.name}</h4>
                    <span className="text-gray-500 text-sm">Electronics</span>
                  </div>
                  <span className="font-bold text-indigo-600">\${product.price}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}`;
    }

    // Default Template (Dashboard/SaaS)
    return `import React, { useState } from 'react';
import { Layout, BarChart3, Users, Settings, Bell, Search, Plus, Filter, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardApp() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <nav className="w-64 bg-slate-900 p-6 flex flex-col text-slate-300">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Layout className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Nexus</span>
        </div>
        
        <div className="space-y-2 flex-1">
          {['Overview', 'Analytics', 'Customers', 'Settings'].map((item) => (
            <button
              key={item}
              onClick={() => setActiveTab(item.toLowerCase())}
              className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all \${
                activeTab === item.toLowerCase() 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'hover:bg-slate-800'
              }\`}
            >
              {item === 'Overview' && <Layout className="w-5 h-5" />}
              {item === 'Analytics' && <BarChart3 className="w-5 h-5" />}
              {item === 'Customers' && <Users className="w-5 h-5" />}
              {item === 'Settings' && <Settings className="w-5 h-5" />}
              <span className="font-medium">{item}</span>
            </button>
          ))}
        </div>
        
        <div className="p-4 bg-slate-800 rounded-xl">
          <h4 className="text-white font-bold text-sm mb-1">Pro Plan</h4>
          <p className="text-xs text-slate-400 mb-3">Your team has 2 seats left.</p>
          <button className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition">Manage</button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab}</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
            <button className="relative p-2 hover:bg-slate-100 rounded-full transition">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full border-2 border-white shadow-md"></div>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[ 
              { label: 'Total Revenue', value: '$124,592', change: '+12.5%' },
              { label: 'Active Users', value: '8,549', change: '+5.2%' },
              { label: 'Bounce Rate', value: '42.3%', change: '-2.1%' },
              { label: 'Avg. Session', value: '4m 32s', change: '+8.4%' }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
              >
                <p className="text-sm text-slate-500 font-medium mb-2">{stat.label}</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{stat.value}</h3>
                  <span className={\`text-xs font-bold px-2 py-1 rounded-full \${stat.change.startsWith('+') ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}\`}>
                    {stat.change}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Main Chart Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm mb-8"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-800">Performance Analytics</h3>
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Week</button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg">Month</button>
                <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Year</button>
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-4">
              {[65, 45, 75, 55, 85, 95, 70, 60, 80, 50, 65, 75].map((h, i) => (
                <div key={i} className="w-full bg-slate-100 rounded-t-lg relative group overflow-hidden">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: \`\${h}%\` }}
                    transition={{ duration: 1, delay: 0.5 + (i * 0.05) }}
                    className="absolute bottom-0 w-full bg-blue-500 opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
              <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-8">
             <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                   {[1,2,3].map(i => (
                     <div key={i} className="flex items-start gap-3 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                         <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                         </div>
                         <div>
                            <p className="text-sm font-medium text-slate-800">Project "Alpha" updated</p>
                            <p className="text-xs text-slate-500">2 minutes ago by Sarah Jenkins</p>
                         </div>
                     </div>
                   ))}
                </div>
             </div>
             
             <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-8 rounded-2xl text-white flex flex-col justify-center items-start shadow-xl shadow-indigo-500/20">
                <h3 className="text-2xl font-bold mb-2">Upgrade to Enterprise</h3>
                <p className="text-indigo-100 mb-6 max-w-sm">Get unlimited seats, advanced security, and priority support for your entire team.</p>
                <button className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition">View Plans</button>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}`;
  }

  async runTestingAgent(code: string, requirements: any, prompt: string) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      testCases: [
        'Verify responsive layout on mobile/tablet',
        'Check navigation link states',
        'Validate interactive hover effects',
        'Ensure component accessibility (ARIA labels)',
        'Test state management for data flow'
      ],
      results: 'Automated Test Suite: 24/24 PASS. Performance Score: 98/100.',
      bugReports: 'Minor layout shift detected on viewport resize (non-critical). Recommended: Add debounce to resize listener.'
    };
  }
}
