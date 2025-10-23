import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('monthly');

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

  const aiFeatures = [
    {
      icon: 'fa-brain',
      title: 'AI-Powered EOD Reports',
      description: 'Intelligent summaries that extract key insights from your daily work. Our AI analyzes patterns and highlights what matters most.',
      gradient: 'from-cyan-500 via-blue-500 to-indigo-600',
      accentColor: 'cyan',
      benefits: ['Smart summaries', 'Pattern recognition', 'Auto-categorization']
    },
    {
      icon: 'fa-chart-line',
      title: 'Consistency Tracker',
      description: 'AI-powered habit tracking that learns your work patterns and helps you maintain productivity streaks across all activities.',
      gradient: 'from-indigo-500 via-purple-500 to-pink-600',
      accentColor: 'purple',
      benefits: ['Habit analysis', 'Streak tracking', 'Smart reminders']
    },
    {
      icon: 'fa-trophy',
      title: 'Performance Hub',
      description: 'Gamification meets AI insights. Real-time performance analytics, intelligent badges, and personalized growth recommendations.',
      gradient: 'from-orange-500 via-red-500 to-pink-600',
      accentColor: 'orange',
      benefits: ['AI insights', 'Smart badges', 'Leaderboards']
    },
    {
      icon: 'fa-robot',
      title: 'AI Task Generation',
      description: 'Automatically generate tasks from meetings, EOD reports, and conversations. Never miss action items again.',
      gradient: 'from-green-500 via-emerald-500 to-teal-600',
      accentColor: 'emerald',
      benefits: ['Auto-generation', 'Smart prioritization', 'Context-aware']
    }
  ];

  const operationalFeatures = [
    {
      icon: 'fa-tasks',
      title: 'Advanced Task Management',
      description: 'Kanban boards, personal tasks, team collaboration, and employee mention system.',
      gradient: 'from-slate-600 to-slate-800'
    },
    {
      icon: 'fa-shield-alt',
      title: 'Enterprise Security',
      description: 'Multi-tenant architecture with complete data isolation and role-based access control.',
      gradient: 'from-slate-600 to-slate-800'
    },
    {
      icon: 'fa-mobile-alt',
      title: 'Progressive Web App',
      description: 'Seamless experience across desktop, tablet, and mobile with offline capabilities.',
      gradient: 'from-slate-600 to-slate-800'
    }
  ];

  const plans = [
    {
      name: 'Starter',
      monthlyPrice: 19,
      annualPrice: 12,
      users: 'Up to 10 users',
      features: [
        'AI-Powered EOD Reports',
        'Task Management',
        'Team Calendar',
        'Basic Analytics',
        'Email Support'
      ],
      highlighted: false
    },
    {
      name: 'Professional',
      monthlyPrice: 49,
      annualPrice: 35,
      users: 'Up to 50 users',
      features: [
        'Everything in Starter',
        'Smart Meeting Assistant',
        'Google Calendar Integration',
        'Performance Hub & Gamification',
        'AI Consistency Tracker',
        'Priority Support'
      ],
      highlighted: true
    },
    {
      name: 'Enterprise',
      monthlyPrice: null,
      annualPrice: null,
      users: 'Unlimited users',
      features: [
        'Everything in Professional',
        'Dedicated Account Manager',
        'Custom AI Workflows',
        'Advanced Security & SLA',
        'White-label Options',
        'On-premise Deployment'
      ],
      highlighted: false
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Mitchell',
      role: 'VP of Engineering',
      company: 'TechFlow Inc',
      quote: 'The AI-powered insights transformed how we track team productivity. Consistency tracker alone saved us 10 hours weekly.',
      rating: 5
    },
    {
      name: 'David Chen',
      role: 'Director of Operations',
      company: 'Innovate Labs',
      quote: 'Google Calendar integration is seamless. Meeting memos with AI summaries have eliminated our post-meeting email threads.',
      rating: 5
    },
    {
      name: 'Emma Rodriguez',
      role: 'CEO',
      company: 'GrowthMetrics',
      quote: 'Finally, a platform that actually uses AI meaningfully. The performance hub keeps our distributed team engaged and motivated.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-lg shadow-lg' 
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
                onClick={() => scrollToSection('ai-features')}
                className="font-medium text-gray-700 hover:text-indigo-600 transition-colors duration-300"
              >
                AI Features
              </button>
              <button
                onClick={() => scrollToSection('meetings')}
                className="font-medium text-gray-700 hover:text-indigo-600 transition-colors duration-300"
              >
                Meetings
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="font-medium text-gray-700 hover:text-indigo-600 transition-colors duration-300"
              >
                Pricing
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
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-[90vh] flex items-center">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-500/30 rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-orange-500/20 rounded-full blur-3xl animate-float-slow"></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 mb-6 px-4 py-2 bg-gradient-to-r from-cyan-50 to-indigo-50 border border-indigo-200/50 rounded-full">
              <div className="w-2 h-2 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-full animate-pulse"></div>
              <span className="text-indigo-700 font-semibold text-sm">AI-Powered Team Collaboration Platform</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
              Work Smarter with
              <br />
              <span className="bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AI Intelligence
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-600 mb-10 leading-relaxed">
              Transform your team's productivity with AI-powered EOD reports, intelligent consistency tracking, 
              smart meeting assistance with Google Calendar, and performance insights—all in one beautiful platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button 
                onClick={() => navigate('/login')}
                className="group bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center"
              >
                Start Free Trial
                <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform duration-300"></i>
              </button>
              <button 
                onClick={() => scrollToSection('ai-features')}
                className="bg-white/80 backdrop-blur-sm text-gray-700 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl border-2 border-gray-200 hover:border-indigo-300 transition-all duration-300"
              >
                Explore AI Features
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-8 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <i className="fas fa-check-circle text-green-500"></i>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-shield-alt text-indigo-500"></i>
                <span>Enterprise security</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-users text-purple-500"></i>
                <span>10,000+ teams</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-slate-50 to-slate-100 border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="fade-slide">
              <div className="text-4xl font-extrabold bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent mb-1">10K+</div>
              <div className="text-sm text-gray-600 font-medium">Active Users</div>
            </div>
            <div className="fade-slide" style={{ animationDelay: '100ms' }}>
              <div className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">98%</div>
              <div className="text-sm text-gray-600 font-medium">Satisfaction Rate</div>
            </div>
            <div className="fade-slide" style={{ animationDelay: '200ms' }}>
              <div className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">50K+</div>
              <div className="text-sm text-gray-600 font-medium">Daily Reports</div>
            </div>
            <div className="fade-slide" style={{ animationDelay: '300ms' }}>
              <div className="text-4xl font-extrabold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-1">99.9%</div>
              <div className="text-sm text-gray-600 font-medium">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Command Center Section */}
      <section id="ai-features" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFmMjkzNyIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 mb-4 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20 rounded-full backdrop-blur-sm">
              <i className="fas fa-sparkles text-cyan-400"></i>
              <span className="text-cyan-300 font-semibold text-sm">Powered by Advanced AI</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
              AI Command Center
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Intelligent features that learn from your team's patterns and deliver actionable insights
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {aiFeatures.map((feature, index) => (
              <div 
                key={index}
                className="group relative fade-slide"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
                
                {/* Card */}
                <div className="relative bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-500 h-full">
                  <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}>
                    <i className={`fas ${feature.icon} text-2xl text-white`}></i>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-cyan-300 group-hover:to-indigo-300 transition-all duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-slate-300 leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {feature.benefits.map((benefit, bIndex) => (
                      <span 
                        key={bIndex}
                        className={`px-3 py-1 text-xs font-semibold bg-${feature.accentColor}-500/10 text-${feature.accentColor}-300 border border-${feature.accentColor}-500/20 rounded-full`}
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button 
              onClick={() => navigate('/login')}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              <i className="fas fa-rocket mr-2"></i>
              Experience AI Intelligence
            </button>
          </div>
        </div>
      </section>

      {/* Smart Meeting Assistant Section */}
      <section id="meetings" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white via-emerald-50/30 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="fade-slide">
              <div className="inline-flex items-center space-x-2 mb-4 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
                <i className="fas fa-calendar-check text-emerald-600"></i>
                <span className="text-emerald-700 font-semibold text-sm">Google Calendar Integration</span>
              </div>
              
              <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6">
                Smart Meeting
                <br />
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Assistant
                </span>
              </h2>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Seamlessly integrate with Google Calendar for intelligent meeting scheduling, 
                live memos, automated action items, and real-time collaboration.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { icon: 'fa-sync', title: 'Two-Way Sync', desc: 'Automatic synchronization with Google Calendar' },
                  { icon: 'fa-edit', title: 'Live Memos', desc: 'Collaborative notes during meetings with AI summaries' },
                  { icon: 'fa-tasks', title: 'Auto Action Items', desc: 'AI extracts tasks and assigns them automatically' },
                  { icon: 'fa-clock', title: 'Smart Scheduling', desc: 'Find optimal meeting times across timezones' }
                ].map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-start space-x-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-lg flex items-center justify-center">
                      <i className={`fas ${item.icon}`}></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => navigate('/login')}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <i className="fab fa-google mr-2"></i>
                Connect Google Calendar
              </button>
            </div>

            {/* Right: Visual */}
            <div className="relative fade-slide" style={{ animationDelay: '300ms' }}>
              <div className="relative">
                {/* Calendar card mockup */}
                <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <i className="fab fa-google text-2xl text-gray-400"></i>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { time: '09:00 AM', title: 'Team Standup', color: 'blue', live: true },
                      { time: '11:30 AM', title: 'Product Review', color: 'purple', live: false },
                      { time: '02:00 PM', title: 'Client Meeting', color: 'emerald', live: false },
                      { time: '04:30 PM', title: 'Sprint Planning', color: 'orange', live: false }
                    ].map((meeting, index) => (
                      <div 
                        key={index}
                        className={`flex items-center space-x-4 p-4 bg-gradient-to-r from-${meeting.color}-50 to-${meeting.color}-100/50 rounded-xl border border-${meeting.color}-200 hover:scale-105 transition-all duration-300`}
                      >
                        <div className={`w-2 h-12 bg-gradient-to-b from-${meeting.color}-500 to-${meeting.color}-600 rounded-full`}></div>
                        <div className="flex-grow">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-bold text-gray-900">{meeting.title}</span>
                            {meeting.live && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full animate-pulse">
                                LIVE
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-600">{meeting.time}</span>
                        </div>
                        <i className="fas fa-video text-gray-400"></i>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Floating AI badge */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-full shadow-xl flex items-center space-x-2 animate-float">
                  <i className="fas fa-robot"></i>
                  <span className="text-sm font-bold">AI Powered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Operational Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              Built for Production
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Enterprise-grade features for teams of all sizes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {operationalFeatures.map((feature, index) => (
              <div 
                key={index}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-gray-200 fade-slide"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className={`bg-gradient-to-br ${feature.gradient} text-white w-14 h-14 rounded-xl flex items-center justify-center mb-6`}>
                  <i className={`fas ${feature.icon} text-2xl`}></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See how teams are transforming productivity with Syncly
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="bg-gradient-to-br from-white to-slate-50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 border border-slate-100 hover:scale-105 fade-slide"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="flex text-yellow-400 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <i key={i} className="fas fa-star"></i>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed italic mb-6">"{testimonial.quote}"</p>
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                  <p className="text-sm text-gray-500">{testimonial.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              Production-Ready Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Choose the perfect plan for your team. All plans include 14-day free trial.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className={`text-lg font-medium ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annually' : 'monthly')}
                className={`relative w-16 h-8 rounded-full transition-all duration-300 ${
                  billingPeriod === 'annually' ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                    billingPeriod === 'annually' ? 'translate-x-8' : ''
                  }`}
                />
              </button>
              <span className={`text-lg font-medium ${billingPeriod === 'annually' ? 'text-gray-900' : 'text-gray-500'}`}>
                Annually
              </span>
              {billingPeriod === 'annually' && (
                <span className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
                  Save up to 37%
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => {
              const currentPrice = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
              const monthlySavings = plan.monthlyPrice && plan.annualPrice ? plan.monthlyPrice - plan.annualPrice : 0;
              const savingsPercent = plan.monthlyPrice && plan.annualPrice 
                ? Math.round(((plan.monthlyPrice - plan.annualPrice) / plan.monthlyPrice) * 100) 
                : 0;

              return (
                <div 
                  key={index}
                  className={`relative bg-white rounded-2xl shadow-xl p-8 transition-all duration-500 hover:shadow-2xl hover:scale-105 fade-slide ${
                    plan.highlighted ? 'ring-4 ring-indigo-600 scale-105' : ''
                  }`}
                  style={{ animationDelay: `${index * 150}ms` }}
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
                    <div className="mb-2">
                      {currentPrice !== null ? (
                        <>
                          <span className="text-5xl font-extrabold text-gray-900">${currentPrice}</span>
                          <span className="text-gray-600 text-lg">/month</span>
                        </>
                      ) : (
                        <span className="text-5xl font-extrabold text-gray-900">Custom</span>
                      )}
                    </div>
                    {billingPeriod === 'annually' && currentPrice !== null && (
                      <div className="text-sm text-green-600 font-semibold mb-2">
                        Save ${monthlySavings}/mo ({savingsPercent}% off)
                      </div>
                    )}
                    {billingPeriod === 'annually' && currentPrice !== null && (
                      <div className="text-xs text-gray-500">
                        ${currentPrice * 12}/year billed annually
                      </div>
                    )}
                    <p className="text-gray-600 font-medium mt-3">{plan.users}</p>
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
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Ready to Transform Your Team?
          </h2>
          <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join 10,000+ teams already working smarter with AI-powered collaboration. 
            Start your free trial today—no credit card required.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="bg-white text-indigo-600 px-10 py-4 rounded-xl font-bold text-lg shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center"
          >
            <i className="fas fa-rocket mr-2"></i>
            Start Free 14-Day Trial
          </button>
          <p className="text-indigo-200 mt-6 text-sm">
            <i className="fas fa-check mr-2"></i>
            No credit card required • Cancel anytime • 24/7 Support
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-2 rounded-lg">
                  <i className="fas fa-infinity text-xl"></i>
                </div>
                <span className="text-xl font-bold text-white">Syncly</span>
              </div>
              <p className="text-sm mb-4 max-w-md">
                AI-Powered Team Collaboration Platform. Transform your team's productivity with intelligent 
                EOD reports, smart meetings, and performance insights.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-envelope text-indigo-400"></i>
                  <a href="mailto:syncly19@gmail.com" className="hover:text-indigo-400 transition-colors">
                    syncly19@gmail.com
                  </a>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-phone text-indigo-400"></i>
                  <a href="tel:+919270279703" className="hover:text-indigo-400 transition-colors">
                    +91 92702 79703
                  </a>
                </div>
              </div>
            </div>
            
            {/* Product Links */}
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => scrollToSection('ai-features')} className="hover:text-indigo-400 transition-colors text-left">
                    AI Features
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('meetings')} className="hover:text-indigo-400 transition-colors text-left">
                    Smart Meetings
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('pricing')} className="hover:text-indigo-400 transition-colors text-left">
                    Pricing
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/login')} className="hover:text-indigo-400 transition-colors text-left">
                    Sign In
                  </button>
                </li>
              </ul>
            </div>
            
            {/* Company & Legal */}
            <div>
              <h4 className="text-white font-bold mb-4">Company & Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => navigate('/about')} className="hover:text-indigo-400 transition-colors text-left">
                    About Us
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/privacy')} className="hover:text-indigo-400 transition-colors text-left">
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/terms')} className="hover:text-indigo-400 transition-colors text-left">
                    Terms of Service
                  </button>
                </li>
                <li>
                  <a href="mailto:syncly19@gmail.com" className="hover:text-indigo-400 transition-colors">
                    Contact Support
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-sm text-center md:text-left">
                © 2025 Syncly. All rights reserved. Built with ❤️ for teams worldwide.
              </p>
              <div className="flex items-center space-x-6">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors" aria-label="Twitter">
                  <i className="fab fa-twitter text-xl"></i>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors" aria-label="LinkedIn">
                  <i className="fab fa-linkedin text-xl"></i>
                </a>
                <a href="mailto:syncly19@gmail.com" className="hover:text-indigo-400 transition-colors" aria-label="Email">
                  <i className="fas fa-envelope text-xl"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-20px) translateX(20px); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-30px) translateX(-20px); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          50% { transform: translateY(20px) translateX(30px) scale(1.1); }
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite;
        }
        
        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
        }

        @keyframes fadeSlide {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .fade-slide {
          animation: fadeSlide 0.8s ease-out forwards;
          opacity: 0;
        }

        html {
          scroll-behavior: smooth;
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
