import React from 'react';
// FIX: Corrected react-router-dom import to use a standard named import.
import { useLocation, useNavigate } from "react-router-dom";
import Button from '../Common/Button';
import { useAuth } from '../Auth/AuthContext';


interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth(); 

  const rootDashboardPaths = [
    '/', 
    '/dashboard'
  ];

  const showBackButton = !rootDashboardPaths.includes(location.pathname);
  
  // A "deep" page is one that's not directly off the root, e.g., /edit-eod/123.
  // A "top-level" page is one like /my-reports.
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const isDeepPage = pathSegments.length > 1;

  const handleBackButtonClick = () => {
    // For deep pages, conventional "back" is usually desired (e.g., from an edit form back to a list).
    // For top-level pages, navigating "back" to the main dashboard provides a consistent anchor.
    if (isDeepPage) {
      navigate(-1);
    } else {
      // Navigate to the root, and the router will direct to the correct dashboard based on role.
      navigate('/');
    }
  };
  
  const backButtonAriaLabel = isDeepPage ? "Go back to previous page" : "Go back to Dashboard";
  const backButtonTitle = isDeepPage ? "Back" : "Dashboard";

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center mb-6">
        {showBackButton && (
          <Button
            onClick={handleBackButtonClick}
            variant="ghost"
            size="sm"
            className="mr-3 bg-surface-secondary dark:bg-dark-surface-secondary hover:bg-surface-hover dark:hover:bg-dark-surface-hover text-text-secondary dark:text-dark-text-secondary"
            aria-label={backButtonAriaLabel}
            title={backButtonTitle}
            icon={<i className="fas fa-arrow-left"></i>}
          >
            Back
          </Button>
        )}
        {title && <h1 className="text-2xl md:text-3xl font-bold text-text-primary dark:text-dark-text">{title}</h1>}
      </div>
      {children}
    </div>
  );
};

export default PageContainer;