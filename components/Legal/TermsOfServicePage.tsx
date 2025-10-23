import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsOfServicePage: React.FC = () => {
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
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 text-center">Terms of Service</h1>
        <p className="text-center text-gray-600 mb-12 text-lg">Last Updated: October 23, 2025</p>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using Syncly's services, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Service Description</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Syncly provides an AI-powered team collaboration platform that includes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>End-of-Day (EOD) reporting with AI summaries</li>
              <li>Task management and Kanban boards</li>
              <li>Smart meeting assistant with Google Calendar integration</li>
              <li>Performance tracking and gamification</li>
              <li>AI-powered consistency tracking</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Account Registration</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              To use Syncly, you must:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Be at least 18 years old or have parental consent</li>
              <li>Notify us immediately of any unauthorized account access</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Subscription and Payment</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              <strong>Free Trial:</strong> New users receive a 14-day free trial with full access to all features.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Paid Plans:</strong> After the trial, you may subscribe to our Starter, Professional, or Enterprise plans.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Subscriptions are billed monthly or annually</li>
              <li>Payments are non-refundable except as required by law</li>
              <li>You may cancel your subscription at any time</li>
              <li>Price changes will be communicated 30 days in advance</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Acceptable Use Policy</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You agree NOT to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Use the service for any illegal or unauthorized purpose</li>
              <li>Violate any laws or regulations</li>
              <li>Impersonate any person or entity</li>
              <li>Transmit viruses, malware, or harmful code</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Scrape, spider, or data mine our platform</li>
              <li>Interfere with other users' access to the service</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Intellectual Property</h2>
            <p className="text-gray-700 leading-relaxed">
              All content, features, and functionality of Syncly are owned by us and are protected by 
              copyright, trademark, and other intellectual property laws. You may not copy, modify, 
              distribute, or reverse engineer any part of our services.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Ownership</h2>
            <p className="text-gray-700 leading-relaxed">
              You retain all rights to your data (reports, tasks, meeting notes, etc.). We do not claim 
              ownership of your content. However, you grant us a license to use, store, and process your 
              data to provide our services and improve our AI algorithms.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Service Availability</h2>
            <p className="text-gray-700 leading-relaxed">
              We strive for 99.9% uptime but do not guarantee uninterrupted service. We may perform 
              maintenance, updates, or experience downtime. We are not liable for any losses resulting 
              from service interruptions.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed">
              Syncly is provided "as is" without warranties of any kind. We are not liable for any indirect, 
              incidental, or consequential damages arising from your use of our services. Our total liability 
              shall not exceed the amount you paid us in the past 12 months.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Termination</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to suspend or terminate your account if you violate these terms. 
              You may terminate your account at any time through your account settings. Upon termination, 
              your data will be deleted within 30 days.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update these Terms of Service from time to time. We will notify you of material 
              changes via email or in-app notification. Continued use of our services after changes 
              constitutes acceptance of the new terms.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms are governed by the laws of India. Any disputes shall be resolved in the courts 
              of the appropriate jurisdiction.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              For questions about these Terms of Service:
            </p>
            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <i className="fas fa-envelope text-indigo-600"></i>
                  <span className="text-gray-700">Email: <a href="mailto:syncly19@gmail.com" className="text-indigo-600 hover:underline font-semibold">syncly19@gmail.com</a></span>
                </div>
                <div className="flex items-center space-x-3">
                  <i className="fas fa-phone text-indigo-600"></i>
                  <span className="text-gray-700">Phone: <a href="tel:+919270279703" className="text-indigo-600 hover:underline font-semibold">+91 92702 79703</a></span>
                </div>
              </div>
            </div>
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

export default TermsOfServicePage;
