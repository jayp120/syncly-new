import React from 'react';
import { useNavigate } from 'react-router-dom';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center space-x-3 group"
            >
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-2.5 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-infinity text-2xl"></i>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Syncly
              </span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Home
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-8 text-center">About Syncly</h1>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-8">
          <div>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              Syncly is a cutting-edge, AI-powered team collaboration platform designed to revolutionize how 
              modern teams work together. Founded with a vision to make productivity tools intelligent and 
              intuitive, we combine advanced artificial intelligence with beautiful, minimalistic design.
            </p>
          </div>
          
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              To empower teams worldwide with intelligent tools that enhance productivity, foster collaboration, 
              and provide actionable insights through AI. We believe work should be smarter, not harder.
            </p>
          </div>
          
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What We Offer</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200">
                <i className="fas fa-brain text-cyan-600 text-2xl mt-1"></i>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">AI-Powered EOD Reports</h3>
                  <p className="text-gray-600">Intelligent end-of-day reporting with automated summaries and insights</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                <i className="fas fa-calendar-check text-emerald-600 text-2xl mt-1"></i>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Smart Meeting Assistant</h3>
                  <p className="text-gray-600">Seamless Google Calendar integration with live memos and action item tracking</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                <i className="fas fa-chart-line text-purple-600 text-2xl mt-1"></i>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Consistency Tracker</h3>
                  <p className="text-gray-600">AI-driven habit tracking that helps teams maintain productivity streaks</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
                <i className="fas fa-trophy text-orange-600 text-2xl mt-1"></i>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Performance Hub</h3>
                  <p className="text-gray-600">Gamification with intelligent badges, leaderboards, and performance analytics</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Syncly?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
                <div className="text-3xl mb-3">🔒</div>
                <h3 className="font-bold text-gray-900 mb-2">Enterprise-Grade Security</h3>
                <p className="text-gray-600">Multi-tenant architecture with complete data isolation and role-based access control</p>
              </div>
              
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-xl border border-cyan-200">
                <div className="text-3xl mb-3">🤖</div>
                <h3 className="font-bold text-gray-900 mb-2">Real AI Integration</h3>
                <p className="text-gray-600">Not just buzzwords—actual machine learning that learns from your team</p>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-200">
                <div className="text-3xl mb-3">📱</div>
                <h3 className="font-bold text-gray-900 mb-2">Mobile-First Design</h3>
                <p className="text-gray-600">Progressive Web App that works seamlessly across all devices</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200">
                <div className="text-3xl mb-3">🌍</div>
                <h3 className="font-bold text-gray-900 mb-2">Built for Scale</h3>
                <p className="text-gray-600">From startups to enterprises—our platform grows with you</p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="border-t border-gray-200 pt-8 mt-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Get in Touch</h2>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 rounded-2xl text-center">
              <p className="text-lg mb-6 font-semibold">
                Have questions or want to learn more about Syncly?
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-3">
                  <i className="fas fa-envelope text-xl"></i>
                  <a href="mailto:syncly19@gmail.com" className="text-lg hover:text-indigo-200 transition-colors underline">
                    syncly19@gmail.com
                  </a>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <i className="fas fa-phone text-xl"></i>
                  <a href="tel:+919270279703" className="text-lg hover:text-indigo-200 transition-colors underline">
                    +91 92702 79703
                  </a>
                </div>
              </div>
              <p className="text-indigo-200 mt-6 text-sm">
                Our team is ready to help you transform your team's productivity
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center pt-8">
            <button
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center"
            >
              <i className="fas fa-rocket mr-2"></i>
              Start Free Trial
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm">© 2025 Syncly. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
