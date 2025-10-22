# Platform Super Admin Setup Guide

## ✅ Platform Admin Created Partially

**Good News:** Firebase Auth user already created!
- **UID:** `lmROVJvdxmbIgPFCDXvONH8C8fM2`
- **Email:** `superadmin@syncly.com`
- **Password:** `SuperAdmin2025!`

**Issue:** Firestore document creation blocked by security rules (chicken-and-egg problem)

---

## 🔧 Complete the Setup Manually (2 Minutes)

### Step 1: Go to Firebase Console
1. Open: https://console.firebase.google.com/project/syncly-473404/firestore
2. You should see your Firestore Database

### Step 2: Create Platform Admin User Document

Click "Start Collection" or go to the `users` collection, then:

**1. Create a document with ID:**
```
lmROVJvdxmbIgPFCDXvONH8C8fM2
```
(This MUST match the Firebase Auth UID!)

**2. Add these fields:**

| Field | Type | Value |
|-------|------|-------|
| `id` | string | `lmROVJvdxmbIgPFCDXvONH8C8fM2` |
| `isPlatformAdmin` | boolean | `true` ⭐ |
| `email` | string | `superadmin@syncly.com` |
| `notificationEmail` | string | `superadmin@syncly.com` |
| `name` | string | `Syncly Platform Admin` |
| `roleId` | string | `platform_super_admin` |
| `roleName` | string | `Platform Super Admin` |
| `status` | string | `Active` |
| `designation` | string | `Platform Owner` |

**Important:** Do NOT add `tenantId` field - platform admins don't belong to any tenant!

### Step 3: Create Platform Super Admin Role

Go to `roles` collection, create document with ID:
```
platform_super_admin
```

**Add these fields:**

| Field | Type | Value |
|-------|------|-------|
| `id` | string | `platform_super_admin` |
| `name` | string | `Platform Super Admin` |
| `description` | string | `Syncly platform owner with access to all tenants` |
| `permissions` | array | See below ⬇️ |

**Permissions array (add these strings):**
```
PLATFORM_ADMIN
CAN_MANAGE_TENANTS
CAN_VIEW_ALL_TENANTS
CAN_MANAGE_USERS
CAN_CREATE_USER
CAN_EDIT_USER
CAN_ARCHIVE_USER
CAN_DELETE_ARCHIVED_USER
CAN_MANAGE_ROLES
```

**Important:** Do NOT add `tenantId` field to this role!

---

## 🚀 Login and Test

### Step 1: Login as Platform Admin
```
Email:    superadmin@syncly.com
Password: SuperAdmin2025!
```

### Step 2: Access Super Admin Panel
- Click "Admin Setup" button at bottom of login page
- Enter code: `SYNCLY2025`
- You'll be taken to the Super Admin panel

### Step 3: Create Your First Tenant

Fill in the form:
```
Company Name:     Test Company
Plan:             Professional

Tenant Admin Name:  John Doe
Admin Email:        admin@testcompany.com  
Password:           Admin123!
```

Click "Create Tenant" - this creates:
- ✅ Tenant document
- ✅ Tenant Admin user (Firebase Auth + Firestore)
- ✅ Default roles for that tenant
- ✅ Default business units

### Step 4: Test Tenant Admin Login

Logout, then login as:
```
Email:    admin@testcompany.com
Password: Admin123!
```

You should see the **Company Admin Dashboard** (not Platform Admin)

The tenant admin can then create Managers and Employees for their company!

---

## ⚠️ Security Notes

1. **Change the password** after first login
2. **Guard the secret code** `SYNCLY2025` - only you should know it
3. **Platform admin has god-mode** - full access to all tenants
4. **Tenant admins are isolated** - they can only manage their own company

---

## ✨ Architecture Summary

```
Platform Super Admin (you)
├── No tenantId
├── Full access to all tenants
├── Creates Tenant Admins
└── Manages platform

Tenant Admin (company admin)
├── Has tenantId
├── Access to their company only
├── Creates Managers/Employees
└── Manages their company

Manager/Employee
├── Has tenantId
├── Access to their company only
└── Created by Tenant Admin
```

This is the **industry-standard multi-tenant SaaS architecture**! 🎯
