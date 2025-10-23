import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicyPage: React.FC = () => {
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
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 text-center">Privacy Policy</h1>
        <p className="text-center text-gray-600 mb-12 text-lg">Last Updated: October 23, 2025</p>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Syncly collects information to provide, maintain, and improve our services. We collect:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Account Information:</strong> Name, email address, company name, and phone number</li>
              <li><strong>Usage Data:</strong> EOD reports, tasks, meeting notes, and performance metrics</li>
              <li><strong>Technical Data:</strong> IP address, browser type, device information, and access logs</li>
              <li><strong>Google Calendar Data:</strong> Calendar events and meeting schedules (with your explicit permission)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>To provide and maintain our AI-powered collaboration services</li>
              <li>To analyze usage patterns and improve our AI algorithms</li>
              <li>To send you service updates and important notifications</li>
              <li>To provide customer support and respond to your inquiries</li>
              <li>To detect and prevent fraud, abuse, or security issues</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Data Security</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>End-to-end encryption for data transmission</li>
              <li>Multi-tenant architecture with complete data isolation</li>
              <li>Regular security audits and penetration testing</li>
              <li>Role-based access control (RBAC) for team members</li>
              <li>Secure cloud infrastructure with Firebase and Google Cloud</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Sharing</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We do not sell your personal information. We may share data only in these circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>With Your Consent:</strong> When you explicitly authorize data sharing</li>
              <li><strong>Service Providers:</strong> Third-party services that help us operate (Google Cloud, Firebase)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In case of merger, acquisition, or asset sale</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Your Rights</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Access your personal data and download a copy</li>
              <li>Request correction of inaccurate or incomplete data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Opt-out of marketing communications</li>
              <li>Withdraw consent for Google Calendar integration</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide services. 
              Upon account deletion, we permanently remove your data within 30 days, except where required 
              by law to retain certain information.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Cookies and Tracking</h2>
            <p className="text-gray-700 leading-relaxed">
              We use cookies and similar technologies to enhance user experience, analyze usage patterns, 
              and maintain session security. You can control cookie preferences through your browser settings.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              For privacy-related questions or to exercise your rights:
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

export default PrivacyPolicyPage;
