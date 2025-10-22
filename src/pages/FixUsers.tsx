import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callSetUserCustomClaims } from '../../services/cloudFunctions';

interface UserToFix {
  id: string;
  email: string;
  name: string;
  tenantId?: string;
  isPlatformAdmin?: boolean;
  roleName?: string;
  status: 'pending' | 'fixing' | 'success' | 'error';
  message?: string;
}

export default function FixUsers() {
  const [users, setUsers] = useState<UserToFix[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList: UserToFix[] = [];

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        usersList.push({
          id: doc.id,
          email: userData.email,
          name: userData.name,
          tenantId: userData.tenantId,
          isPlatformAdmin: userData.isPlatformAdmin || false,
          roleName: userData.roleName,
          status: 'pending',
        });
      });

      setUsers(usersList);
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading users:', error);
      setLoading(false);
    }
  };

  const fixUser = async (user: UserToFix) => {
    setUsers(users.map(u => 
      u.id === user.id ? { ...u, status: 'fixing' as const } : u
    ));

    try {
      await callSetUserCustomClaims({
        userId: user.id,
        tenantId: user.isPlatformAdmin ? undefined : user.tenantId,
        isPlatformAdmin: user.isPlatformAdmin || false
      });

      setUsers(users.map(u => 
        u.id === user.id 
          ? { ...u, status: 'success' as const, message: 'Claims set! Ask user to re-login.' }
          : u
      ));
    } catch (error: any) {
      setUsers(users.map(u => 
        u.id === user.id 
          ? { 
              ...u, 
              status: 'error' as const, 
              message: error.message.includes('user-not-found') 
                ? 'No Firebase Auth account - user needs to be recreated'
                : error.message 
            }
          : u
      ));
    }
  };

  const fixAllUsers = async () => {
    for (const user of users) {
      if (user.status === 'pending' || user.status === 'error') {
        await fixUser(user);
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between calls
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🔧 Fix Existing Users
          </h1>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <p className="text-blue-700">
              <strong>ℹ️ What This Does:</strong><br />
              This tool sets custom claims (tenantId, isPlatformAdmin) for existing users so they can login.<br />
              After setting claims, users must <strong>logout and login again</strong> to get a fresh token.
            </p>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="text-yellow-700">
              <strong>⚠️ Important:</strong><br />
              This only works for users who have Firebase Auth accounts.<br />
              If a user shows "No Firebase Auth account", they must be recreated using the dashboard.
            </p>
          </div>

          <div className="mb-6">
            <button
              onClick={fixAllUsers}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              🚀 Fix All Users
            </button>
          </div>

          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className={`border rounded-lg p-4 ${
                  user.status === 'success' ? 'bg-green-50 border-green-200' :
                  user.status === 'error' ? 'bg-red-50 border-red-200' :
                  user.status === 'fixing' ? 'bg-blue-50 border-blue-200' :
                  'bg-white border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">{user.name}</h3>
                    <p className="text-gray-600">{user.email}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {user.isPlatformAdmin ? (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-purple-100 text-purple-800">
                          Platform Admin
                        </span>
                      ) : (
                        <>
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 mr-2">
                            {user.roleName || 'Employee'}
                          </span>
                          <span className="text-gray-400">TenantId: {user.tenantId}</span>
                        </>
                      )}
                    </p>
                    <p className="text-sm font-medium mt-2">
                      {user.status === 'pending' && (
                        <span className="text-gray-600">Ready to fix</span>
                      )}
                      {user.status === 'fixing' && (
                        <span className="text-blue-600">⏳ Setting claims...</span>
                      )}
                      {user.status === 'success' && (
                        <span className="text-green-600">✅ {user.message}</span>
                      )}
                      {user.status === 'error' && (
                        <span className="text-red-600">❌ {user.message}</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => fixUser(user)}
                    disabled={user.status === 'fixing' || user.status === 'success'}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      user.status === 'success'
                        ? 'bg-green-100 text-green-800 cursor-not-allowed'
                        : user.status === 'fixing'
                        ? 'bg-blue-100 text-blue-800 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {user.status === 'success' ? '✓ Done' : 
                     user.status === 'fixing' ? 'Fixing...' : 
                     user.status === 'error' ? 'Retry' :
                     'Fix User'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">📝 After Setting Claims:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Ask each user to <strong>logout completely</strong> from the app</li>
              <li>Clear browser cache/cookies (optional but recommended)</li>
              <li><strong>Login again</strong> with their credentials</li>
              <li>✅ Custom claims will now be in their token!</li>
            </ol>
          </div>

          <div className="mt-6 bg-yellow-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">⚠️ If "No Firebase Auth Account" Error:</h3>
            <p className="text-gray-700 mb-2">
              This means the user was created only in Firestore, not in Firebase Auth.
            </p>
            <p className="text-gray-700">
              <strong>Solution:</strong> Go to Users → Add User in your dashboard and recreate them with a password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
