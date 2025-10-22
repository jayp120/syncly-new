import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    {
      icon: 'fa-chart-line',
      title: 'EOD Reporting',
      description: 'Streamline daily work updates with intelligent End-of-Day reports and AI-powered summaries.',
      gradient: 'from-blue-500 to-cyan-500',
      delay: '0ms'
    },
    {
      icon: 'fa-tasks',
      title: 'Task Management',
      description: 'Organize work with Kanban boards, personal tasks, and team collaboration tools.',
      gradient: 'from-purple-500 to-pink-500',
      delay: '100ms'
    },
    {
      icon: 'fa-video',
      title: 'Smart Meetings',
      description: 'Live memos, action items, and seamless Google Calendar integration.',
      gradient: 'from-green-500 to-emerald-500',
      delay: '200ms'
    },
    {
      icon: 'fa-trophy',
      title: 'Performance Hub',
      description: 'Gamification, badges, leaderboards, and AI insights to boost engagement.',
      gradient: 'from-orange-500 to-red-500',
      delay: '300ms'
    },
    {
      icon: 'fa-shield-alt',
      title: 'Enterprise Security',
      description: 'Multi-tenant architecture with complete data isolation and RBAC.',
      gradient: 'from-indigo-500 to-purple-500',
      delay: '400ms'
    },
    {
      icon: 'fa-mobile-alt',
      title: 'Mobile Ready',
      description: 'Progressive Web App for seamless experience across all devices.',
      gradient: 'from-pink-500 to-rose-500',
      delay: '500ms'
    }
  ];

  const plans = [
    {
      name: 'Starter',
      price: '$99',
      period: '/month',
      users: 'Up to 10 users',
      features: [
        'EOD Reports & Analytics',
        'Task Management',
        'Team Calendar',
        'Basic Integrations',
        'Email Support'
      ],
      highlighted: false,
      delay: '0ms'
    },
    {
      name: 'Professional',
      price: '$299',
      period: '/month',
      users: 'Up to 50 users',
      features: [
        'Everything in Starter',
        'Smart Meeting Assistant',
        'Performance Hub & Gamification',
        'Advanced Analytics',
        'Priority Support',
        'Custom Integrations'
      ],
      highlighted: true,
      delay: '150ms'
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      users: 'Unlimited users',
      features: [
        'Everything in Professional',
        'Dedicated Account Manager',
        'Custom Workflows',
        'Advanced Security',
        'SLA Guarantee',
        'White-label Options'
      ],
      highlighted: false,
      delay: '300ms'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'VP of Operations',
      company: 'TechCorp',
      image: 'https://i.pravatar.cc/150?img=1',
      quote: 'Syncly transformed how our team collaborates. The EOD reports save us hours every week.',
      delay: '0ms'
    },
    {
      name: 'Michael Chen',
      role: 'Engineering Manager',
      company: 'InnovateLabs',
      image: 'https://i.pravatar.cc/150?img=3',
      quote: 'The performance hub keeps our team motivated. Best productivity tool we\'ve adopted.',
      delay: '150ms'
    },
    {
      name: 'Emma Davis',
      role: 'CEO',
      company: 'StartupXYZ',
      image: 'https://i.pravatar.cc/150?img=5',
      quote: 'Finally, a platform that brings everything together. Perfect for managing multiple teams.',
      delay: '300ms'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-white/90 backdrop-blur-lg shadow-lg' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div 
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-2.5 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-infinity text-2xl"></i>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Syncly
              </span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('features')}
                className="font-medium text-gray-700 hover:text-indigo-600 transition-colors duration-300"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="font-medium text-gray-700 hover:text-indigo-600 transition-colors duration-300"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection('testimonials')}
                className="font-medium text-gray-700 hover:text-indigo-600 transition-colors duration-300"
              >
                Testimonials
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/login')}
                className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-300"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden min-h-screen flex items-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-float-delayed"></div>
        </div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg">
            <span className="text-indigo-700 font-semibold text-sm">✨ The Future of Team Collaboration</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
            Work Smarter,
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              In Sync
            </span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Transform your team's productivity with AI-powered EOD reports, intelligent task management, 
            and seamless collaboration—all in one beautiful platform.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <button 
              onClick={() => navigate('/login')}
              className="group bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center"
            >
              Start Free Trial
              <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform duration-300"></i>
            </button>
            <button 
              onClick={() => scrollToSection('features')}
              className="bg-white text-gray-700 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl border-2 border-gray-200 hover:border-indigo-300 transition-all duration-300"
            >
              Explore Features
            </button>
          </div>

          {/* Hero Preview */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-2xl opacity-20 transform scale-105"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl p-4 border-4 border-white">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8 aspect-video flex items-center justify-center">
                <div className="text-center">
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                    <i className="fas fa-infinity text-5xl"></i>
                  </div>
                  <p className="text-gray-600 font-semibold text-lg">Your Team Dashboard</p>
                  <p className="text-gray-500 text-sm mt-2">Real-time collaboration, simplified</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10,000+', label: 'Active Users', icon: 'fa-users' },
              { value: '98%', label: 'Satisfaction', icon: 'fa-star' },
              { value: '50K+', label: 'Reports', icon: 'fa-file-alt' },
              { value: '24/7', label: 'Support', icon: 'fa-headset' }
            ].map((stat, index) => (
              <div 
                key={index}
                className="text-center p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <i className={`fas ${stat.icon}`}></i>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              Everything Your Team Needs
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to streamline workflows and boost productivity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-indigo-200 hover:scale-105 hover:-translate-y-2"
                style={{ animationDelay: feature.delay }}
              >
                <div className={`bg-gradient-to-br ${feature.gradient} text-white w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}>
                  <i className={`fas ${feature.icon} text-2xl`}></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the perfect plan for your team. 14-day free trial included.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div 
                key={index}
                className={`relative bg-white rounded-2xl shadow-xl p-8 transition-all duration-500 hover:shadow-2xl hover:scale-105 ${
                  plan.highlighted ? 'ring-4 ring-indigo-600 scale-105' : ''
                }`}
                style={{ animationDelay: plan.delay }}
              >
                {plan.highlighted && (
                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-5xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 text-lg">{plan.period}</span>
                  </div>
                  <p className="text-gray-600 font-medium">{plan.users}</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center text-gray-700">
                      <i className="fas fa-check-circle text-indigo-600 mr-3"></i>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => navigate('/login')}
                  className={`w-full py-3 px-6 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.highlighted ? 'Start Free Trial' : 'Get Started'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              Loved by Teams Worldwide
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See what our customers have to say about Syncly
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:scale-105"
                style={{ animationDelay: testimonial.delay }}
              >
                <div className="flex items-center mb-6">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role} at {testimonial.company}</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed italic mb-4">"{testimonial.quote}"</p>
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <i key={i} className="fas fa-star"></i>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Ready to Transform Your Team?
          </h2>
          <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">
            Join thousands of teams already working smarter with Syncly. Start your free trial today.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="bg-white text-indigo-600 px-10 py-4 rounded-xl font-bold text-lg shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center"
          >
            Start Free 14-Day Trial
            <i className="fas fa-arrow-right ml-2"></i>
          </button>
          <p className="text-indigo-200 mt-4 text-sm">No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-2 rounded-lg">
                  <i className="fas fa-infinity text-xl"></i>
                </div>
                <span className="text-xl font-bold text-white">Syncly</span>
              </div>
              <p className="text-sm">The Future. In Sync.</p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-indigo-400 transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-indigo-400 transition-colors">Pricing</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-indigo-400 transition-colors">Sign In</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Careers</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm mb-4 md:mb-0">© 2025 Syncly. All rights reserved.</p>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-indigo-400 transition-colors">
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a href="#" className="hover:text-indigo-400 transition-colors">
                <i className="fab fa-linkedin text-xl"></i>
              </a>
              <a href="#" className="hover:text-indigo-400 transition-colors">
                <i className="fab fa-github text-xl"></i>
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-20px) translateX(20px); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float 6s ease-in-out infinite 3s;
        }

        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
