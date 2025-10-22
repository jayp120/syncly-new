# Firebase Storage Security Rules

## Overview
Firebase Storage is used to store file attachments for EOD reports (images, PDFs, DOCX files). This document outlines the security rules required to protect user data while maintaining multi-tenant isolation.

## Storage Structure

```
storage/
└── tenants/
    └── {tenantId}/
        └── reports/
            └── {reportId}/
                └── attachments/
                    ├── 1234567890_photo.jpg
                    ├── 1234567891_document.pdf
                    └── ...
```

## Security Rules

Add these rules to your Firebase Storage security rules (Firebase Console → Storage → Rules):

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper function to get user's tenant ID from custom claims
    function getUserTenantId() {
      return request.auth.token.tenantId;
    }
    
    // Helper function to check if user is platform admin
    function isPlatformAdmin() {
      return request.auth != null 
        && request.auth.token.isPlatformAdmin == true;
    }
    
    // Tenant-scoped report attachments
    match /tenants/{tenantId}/reports/{reportId}/attachments/{fileName} {
      
      // READ: Users can read files from their own tenant, platform admin can read all
      allow read: if isPlatformAdmin() 
                  || (request.auth != null && getUserTenantId() == tenantId);
      
      // WRITE (create/update): Users can write to their own tenant only
      allow write: if isPlatformAdmin() 
                   || (request.auth != null && getUserTenantId() == tenantId);
      
      // DELETE: Users can delete from their own tenant, platform admin can delete all
      allow delete: if isPlatformAdmin() 
                    || (request.auth != null && getUserTenantId() == tenantId);
    }
    
    // Deny all other paths
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Key Security Features

### 1. Multi-Tenant Isolation
- Files are organized by `tenantId` in the path structure
- Users can only access files from their own tenant
- Cross-tenant access is prevented

### 2. Authentication Required
- All operations require authentication (`request.auth != null`)
- Custom claims are used to verify tenant membership

### 3. Platform Admin Override
- Platform admins (`isPlatformAdmin == true`) can access all tenants' files
- Useful for support and administrative purposes

### 4. File Type Validation (Application-Level)
- File type validation is enforced in the application code (EODReportForm.tsx)
- Allowed types: JPEG, PNG, PDF, DOCX
- Maximum 3 attachments per report

## Deployment Instructions

1. **Navigate to Firebase Console**:
   - Go to https://console.firebase.google.com/
   - Select your project

2. **Open Storage Rules**:
   - Click "Storage" in the left sidebar
   - Click the "Rules" tab

3. **Update Rules**:
   - Replace the existing rules with the rules above
   - Click "Publish"

4. **Verify Rules**:
   - Test file upload from the application
   - Verify users can only access their tenant's files
   - Verify platform admin can access all files

## Testing Checklist

- [ ] Employee can upload attachments to their EOD report
- [ ] Employee can view their own uploaded attachments
- [ ] Manager can view attachments from reports in their tenant
- [ ] Users from different tenants cannot access each other's files
- [ ] Platform admin can access files from all tenants
- [ ] Unauthenticated users cannot access any files

## File Size Limits

- **Firebase Storage Max**: 5 TB per file
- **Application Limit**: Recommended max 10 MB per file (for performance)
- **Firestore Document Limit**: 1 MB (why we moved to Storage!)

## Cost Optimization

### Storage Costs (Firebase Storage)
- **Storage**: $0.026/GB/month
- **Download**: $0.12/GB
- **Upload**: Free

### Comparison vs Firestore
- **Firestore**: $0.18/GB/month (7x more expensive!)
- **Read Operations**: $0.36 per million
- Large files in Firestore also count against read/write operations

**Example Savings**:
- 100 reports/month with 2 MB attachments each = 200 MB
- **Storage Cost**: 200 MB × $0.026/GB = $0.005/month
- **Old Firestore Cost**: 200 MB × $0.18/GB = $0.036/month
- **Savings**: 86% reduction in storage costs!

## Migration Notes

### Backward Compatibility
The application supports both:
1. **Legacy Format**: Base64 strings in Firestore (old reports)
2. **New Format**: Firebase Storage URLs (new reports)

The `getAttachmentDisplayUrl()` helper automatically handles both formats:
```typescript
// In storageService.ts
export const getAttachmentDisplayUrl = (attachment: {
  dataUrl?: string;
  storageUrl?: string;
}): string => {
  return attachment.storageUrl || attachment.dataUrl || '';
};
```

### No Breaking Changes
- Existing reports with base64 attachments will continue to work
- New reports automatically use Firebase Storage
- No data migration required!

## Troubleshooting

### Issue: "Permission denied" when uploading
**Solution**: Verify Firebase Storage rules are published and user has valid custom claims

### Issue: Attachments not appearing
**Solution**: Check browser console for CORS errors, verify Storage bucket is configured

### Issue: Upload fails
**Solution**: 
1. Check file size (must be < 10 MB recommended)
2. Verify file type is allowed
3. Check Firebase quota limits

## Support

For issues or questions about Firebase Storage integration, check:
1. Firebase Console → Storage → Files (verify files are being uploaded)
2. Firebase Console → Storage → Rules (verify rules are published)
3. Browser console (check for error messages)
4. Network tab (verify upload requests)
