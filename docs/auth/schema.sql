-- ============================================================
-- Explain.global — Azure SQL Identity & Auth Schema
-- Engine : Azure SQL (SQL Server 2022 compat)
-- Owner  : Percentile.One
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 0.  HOUSEKEEPING
-- ──────────────────────────────────────────────────────────
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ──────────────────────────────────────────────────────────
-- 1.  LANGUAGE & REGION
--     Referenced by Users, so must be created first.
-- ──────────────────────────────────────────────────────────

CREATE TABLE Languages (
    LanguageCode        NCHAR(5)        NOT NULL,   -- BCP-47 primary tag, e.g. 'en', 'zh-TW', 'ar'
    Name                NVARCHAR(100)   NOT NULL,
    NativeName          NVARCHAR(100)   NOT NULL,
    IsRTL               BIT             NOT NULL    DEFAULT 0,
    IsActive            BIT             NOT NULL    DEFAULT 1,
    SortOrder           SMALLINT        NOT NULL    DEFAULT 0,
    CONSTRAINT PK_Languages PRIMARY KEY (LanguageCode)
);
GO

CREATE TABLE Countries (
    CountryCode             NCHAR(2)        NOT NULL,   -- ISO 3166-1 alpha-2
    Name                    NVARCHAR(100)   NOT NULL,
    DefaultLanguageCode     NCHAR(5)        NOT NULL,
    PhonePrefix             NVARCHAR(10)    NULL,
    IsActive                BIT             NOT NULL    DEFAULT 1,
    CONSTRAINT PK_Countries         PRIMARY KEY (CountryCode),
    CONSTRAINT FK_Countries_Lang    FOREIGN KEY (DefaultLanguageCode)
                                    REFERENCES Languages(LanguageCode)
);
GO

-- Seed core languages
INSERT INTO Languages (LanguageCode, Name, NativeName, IsRTL, IsActive, SortOrder) VALUES
('en',    'English',    'English',      0, 1, 1),
('fr',    'French',     'Français',     0, 1, 2),
('de',    'German',     'Deutsch',      0, 1, 3),
('es',    'Spanish',    'Español',      0, 1, 4),
('pt',    'Portuguese', 'Português',    0, 1, 5),
('it',    'Italian',    'Italiano',     0, 1, 6),
('nl',    'Dutch',      'Nederlands',   0, 1, 7),
('pl',    'Polish',     'Polski',       0, 1, 8),
('ar',    'Arabic',     'العربية',      1, 1, 9),
('zh',    'Chinese',    '中文',          0, 1, 10),
('ja',    'Japanese',   '日本語',         0, 1, 11),
('ko',    'Korean',     '한국어',         0, 1, 12),
('hi',    'Hindi',      'हिन्दी',        0, 1, 13),
('tr',    'Turkish',    'Türkçe',       0, 1, 14),
('ru',    'Russian',    'Русский',      0, 1, 15);
GO

-- ──────────────────────────────────────────────────────────
-- 2.  TENANTS
-- ──────────────────────────────────────────────────────────

CREATE TABLE Tenants (
    TenantId        UNIQUEIDENTIFIER    NOT NULL    DEFAULT NEWSEQUENTIALID(),
    Name            NVARCHAR(200)       NOT NULL,
    Slug            NVARCHAR(100)       NOT NULL,   -- e.g. 'goldman-sachs', 'explain-global'
    Domain          NVARCHAR(255)       NULL,       -- optional custom domain
    LogoUrl         NVARCHAR(500)       NULL,
    PlanTier        NVARCHAR(50)        NOT NULL    DEFAULT 'Free',   -- Free | Pro | Enterprise
    Status          NVARCHAR(20)        NOT NULL    DEFAULT 'Active', -- Active | Suspended | Deleted
    CreatedAt       DATETIME2(3)        NOT NULL    DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(3)        NOT NULL    DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Tenants       PRIMARY KEY (TenantId),
    CONSTRAINT UQ_Tenants_Slug  UNIQUE (Slug)
);
GO

-- System tenant — always present
INSERT INTO Tenants (TenantId, Name, Slug, Status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Explain.global', 'explain-global', 'Active');
GO

-- ──────────────────────────────────────────────────────────
-- 3.  USERS
-- ──────────────────────────────────────────────────────────

CREATE TABLE Users (
    UserId                  UNIQUEIDENTIFIER    NOT NULL    DEFAULT NEWSEQUENTIALID(),
    TenantId                UNIQUEIDENTIFIER    NOT NULL,

    -- Credentials
    Email                   NVARCHAR(320)       NOT NULL,
    NormalisedEmail         NVARCHAR(320)       NOT NULL,   -- UPPER(TRIM(Email)) for lookup
    PasswordHash            NVARCHAR(500)       NULL,       -- NULL when SSO-only
    PasswordSalt            NVARCHAR(200)       NULL,

    -- Verification
    IsEmailVerified         BIT                 NOT NULL    DEFAULT 0,
    PhoneNumber             NVARCHAR(30)        NULL,
    IsPhoneVerified         BIT                 NOT NULL    DEFAULT 0,

    -- Locale
    PreferredLanguageCode   NCHAR(5)            NOT NULL    DEFAULT 'en',
    PreferredCountryCode    NCHAR(2)            NOT NULL    DEFAULT 'GB',
    TimeZone                NVARCHAR(100)       NOT NULL    DEFAULT 'UTC',

    -- State
    IsActive                BIT                 NOT NULL    DEFAULT 1,
    IsLocked                BIT                 NOT NULL    DEFAULT 0,
    LockedUntil             DATETIME2(3)        NULL,
    FailedLoginCount        SMALLINT            NOT NULL    DEFAULT 0,

    CreatedAt               DATETIME2(3)        NOT NULL    DEFAULT SYSUTCDATETIME(),
    UpdatedAt               DATETIME2(3)        NOT NULL    DEFAULT SYSUTCDATETIME(),
    LastLoginAt             DATETIME2(3)        NULL,
    DeletedAt               DATETIME2(3)        NULL,       -- soft-delete

    CONSTRAINT PK_Users             PRIMARY KEY (UserId),
    CONSTRAINT FK_Users_Tenant      FOREIGN KEY (TenantId)
                                    REFERENCES Tenants(TenantId),
    CONSTRAINT FK_Users_Language    FOREIGN KEY (PreferredLanguageCode)
                                    REFERENCES Languages(LanguageCode),
    CONSTRAINT FK_Users_Country     FOREIGN KEY (PreferredCountryCode)
                                    REFERENCES Countries(CountryCode),
    CONSTRAINT UQ_Users_Email       UNIQUE (TenantId, NormalisedEmail)  -- unique per tenant
);
GO

CREATE NONCLUSTERED INDEX IX_Users_NormalisedEmail
    ON Users (NormalisedEmail)
    INCLUDE (UserId, TenantId, IsActive, IsEmailVerified);

CREATE NONCLUSTERED INDEX IX_Users_TenantId
    ON Users (TenantId)
    WHERE DeletedAt IS NULL;
GO

-- ──────────────────────────────────────────────────────────
-- 4.  USER PROFILES
-- ──────────────────────────────────────────────────────────

CREATE TABLE UserProfiles (
    UserProfileId   UNIQUEIDENTIFIER    NOT NULL    DEFAULT NEWSEQUENTIALID(),
    UserId          UNIQUEIDENTIFIER    NOT NULL,

    FirstName       NVARCHAR(100)       NULL,
    LastName        NVARCHAR(100)       NULL,
    DisplayName     NVARCHAR(200)       NULL,
    Headline        NVARCHAR(300)       NULL,   -- e.g. "Senior Software Engineer at DeepMind"
    Bio             NVARCHAR(2000)      NULL,
    AvatarUrl       NVARCHAR(500)       NULL,

    PrimaryRole     NVARCHAR(50)        NOT NULL    DEFAULT 'Candidate',
                                                    -- Candidate | Recruiter | Admin | Student | etc.
    LinkedInUrl     NVARCHAR(500)       NULL,
    GitHubUrl       NVARCHAR(500)       NULL,
    WebsiteUrl      NVARCHAR(500)       NULL,

    CreatedAt       DATETIME2(3)        NOT NULL    DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(3)        NOT NULL    DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_UserProfiles          PRIMARY KEY (UserProfileId),
    CONSTRAINT FK_UserProfiles_User     FOREIGN KEY (UserId)
                                        REFERENCES Users(UserId)
                                        ON DELETE CASCADE,
    CONSTRAINT UQ_UserProfiles_UserId   UNIQUE (UserId)   -- 1-to-1 with Users
);
GO

-- ──────────────────────────────────────────────────────────
-- 5.  EMAIL VERIFICATION TOKENS
-- ──────────────────────────────────────────────────────────

CREATE TABLE EmailVerificationTokens (
    TokenId         UNIQUEIDENTIFIER    NOT NULL    DEFAULT NEWSEQUENTIALID(),
    UserId          UNIQUEIDENTIFIER    NOT NULL,
    Token           NVARCHAR(500)       NOT NULL,   -- securely random, hashed at rest
    ExpiresAt       DATETIME2(3)        NOT NULL,
    UsedAt          DATETIME2(3)        NULL,
    CreatedAt       DATETIME2(3)        NOT NULL    DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_EmailVerificationTokens       PRIMARY KEY (TokenId),
    CONSTRAINT FK_EmailVerificationTokens_User  FOREIGN KEY (UserId)
                                                REFERENCES Users(UserId)
                                                ON DELETE CASCADE
);
GO

CREATE NONCLUSTERED INDEX IX_EVT_Token
    ON EmailVerificationTokens (Token)
    WHERE UsedAt IS NULL;
GO

-- ──────────────────────────────────────────────────────────
-- 6.  PASSWORD RESET TOKENS
-- ──────────────────────────────────────────────────────────

CREATE TABLE PasswordResetTokens (
    TokenId         UNIQUEIDENTIFIER    NOT NULL    DEFAULT NEWSEQUENTIALID(),
    UserId          UNIQUEIDENTIFIER    NOT NULL,
    Token           NVARCHAR(500)       NOT NULL,   -- hashed at rest
    ExpiresAt       DATETIME2(3)        NOT NULL,
    UsedAt          DATETIME2(3)        NULL,
    IpAddress       NVARCHAR(45)        NULL,
    CreatedAt       DATETIME2(3)        NOT NULL    DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_PasswordResetTokens      PRIMARY KEY (TokenId),
    CONSTRAINT FK_PasswordResetTokens_User FOREIGN KEY (UserId)
                                           REFERENCES Users(UserId)
                                           ON DELETE CASCADE
);
GO

CREATE NONCLUSTERED INDEX IX_PRT_Token
    ON PasswordResetTokens (Token)
    WHERE UsedAt IS NULL;
GO

-- ──────────────────────────────────────────────────────────
-- 7.  USER LOGINS  (OAuth / SSO providers)
-- ──────────────────────────────────────────────────────────

CREATE TABLE UserLogins (
    UserLoginId     UNIQUEIDENTIFIER    NOT NULL    DEFAULT NEWSEQUENTIALID(),
    UserId          UNIQUEIDENTIFIER    NOT NULL,

    LoginProvider   NVARCHAR(50)        NOT NULL,   -- 'local' | 'google' | 'linkedin' | 'microsoft' | 'github'
    ProviderKey     NVARCHAR(500)       NOT NULL,   -- provider's user ID / subject claim
    ProviderEmail   NVARCHAR(320)       NULL,       -- email returned by provider

    AccessToken     NVARCHAR(2000)      NULL,       -- encrypted at rest
    RefreshToken    NVARCHAR(2000)      NULL,       -- encrypted at rest
    TokenExpiresAt  DATETIME2(3)        NULL,

    CreatedAt       DATETIME2(3)        NOT NULL    DEFAULT SYSUTCDATETIME(),
    LastUsedAt      DATETIME2(3)        NULL,

    CONSTRAINT PK_UserLogins                PRIMARY KEY (UserLoginId),
    CONSTRAINT FK_UserLogins_User           FOREIGN KEY (UserId)
                                            REFERENCES Users(UserId)
                                            ON DELETE CASCADE,
    CONSTRAINT UQ_UserLogins_Provider       UNIQUE (LoginProvider, ProviderKey)
);
GO

-- ──────────────────────────────────────────────────────────
-- 8.  USER SESSIONS
-- ──────────────────────────────────────────────────────────

CREATE TABLE UserSessions (
    SessionId       UNIQUEIDENTIFIER    NOT NULL    DEFAULT NEWSEQUENTIALID(),
    UserId          UNIQUEIDENTIFIER    NOT NULL,
    TenantId        UNIQUEIDENTIFIER    NOT NULL,

    -- The actual bearer value is a securely random token, hashed here.
    -- The raw token is returned to the client (httpOnly cookie or Authorization header).
    TokenHash       NVARCHAR(500)       NOT NULL,

    IpAddress       NVARCHAR(45)        NULL,
    UserAgent       NVARCHAR(500)       NULL,
    DeviceType      NVARCHAR(30)        NULL,   -- 'browser' | 'mobile' | 'api'
    Portal          NVARCHAR(30)        NULL,   -- 'candidate' | 'recruiter' | 'admin'

    CreatedAt       DATETIME2(3)        NOT NULL    DEFAULT SYSUTCDATETIME(),
    ExpiresAt       DATETIME2(3)        NOT NULL,
    LastActivityAt  DATETIME2(3)        NULL,

    RevokedAt       DATETIME2(3)        NULL,
    RevokedReason   NVARCHAR(200)       NULL,   -- 'logout' | 'password_change' | 'admin' | 'expired'

    CONSTRAINT PK_UserSessions          PRIMARY KEY (SessionId),
    CONSTRAINT FK_UserSessions_User     FOREIGN KEY (UserId)
                                        REFERENCES Users(UserId)
                                        ON DELETE CASCADE,
    CONSTRAINT FK_UserSessions_Tenant   FOREIGN KEY (TenantId)
                                        REFERENCES Tenants(TenantId),
    CONSTRAINT UQ_UserSessions_Token    UNIQUE (TokenHash)
);
GO

CREATE NONCLUSTERED INDEX IX_UserSessions_UserId
    ON UserSessions (UserId)
    WHERE RevokedAt IS NULL;

CREATE NONCLUSTERED INDEX IX_UserSessions_ExpiresAt
    ON UserSessions (ExpiresAt)
    WHERE RevokedAt IS NULL;   -- used by the session cleanup job
GO

-- ──────────────────────────────────────────────────────────
-- 9.  USER LOGIN ATTEMPTS  (audit + lockout)
-- ──────────────────────────────────────────────────────────

CREATE TABLE UserLoginAttempts (
    LoginAttemptId  BIGINT              NOT NULL    IDENTITY(1,1),  -- high-volume; BIGINT
    UserId          UNIQUEIDENTIFIER    NULL,       -- NULL if email not found
    Email           NVARCHAR(320)       NOT NULL,
    IpAddress       NVARCHAR(45)        NOT NULL,
    UserAgent       NVARCHAR(500)       NULL,
    Portal          NVARCHAR(30)        NULL,

    Success         BIT                 NOT NULL    DEFAULT 0,
    FailureReason   NVARCHAR(200)       NULL,
    -- e.g. 'invalid_password' | 'account_locked' | 'email_not_verified' | 'user_not_found'

    CreatedAt       DATETIME2(3)        NOT NULL    DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_UserLoginAttempts PRIMARY KEY (LoginAttemptId)
);
GO

CREATE NONCLUSTERED INDEX IX_ULA_IpAddress_CreatedAt
    ON UserLoginAttempts (IpAddress, CreatedAt DESC);   -- rate-limiting by IP

CREATE NONCLUSTERED INDEX IX_ULA_Email_CreatedAt
    ON UserLoginAttempts (Email, CreatedAt DESC);       -- lockout check by email

CREATE NONCLUSTERED INDEX IX_ULA_UserId
    ON UserLoginAttempts (UserId)
    WHERE UserId IS NOT NULL;
GO

-- ──────────────────────────────────────────────────────────
-- 10. USER TWO-FACTOR AUTH
-- ──────────────────────────────────────────────────────────

CREATE TABLE UserTwoFactor (
    UserId              UNIQUEIDENTIFIER    NOT NULL,   -- PK = FK; one row per user

    IsEnabled           BIT                 NOT NULL    DEFAULT 0,
    Method              NVARCHAR(20)        NOT NULL    DEFAULT 'app',
                                                        -- 'app' (TOTP) | 'sms' | 'email'
    SecretKey           NVARCHAR(500)       NULL,       -- TOTP secret, encrypted at rest
    PhoneNumber         NVARCHAR(30)        NULL,       -- for SMS 2FA
    BackupCodesJson     NVARCHAR(2000)      NULL,       -- JSON array of hashed backup codes

    EnabledAt           DATETIME2(3)        NULL,
    LastUsedAt          DATETIME2(3)        NULL,
    LastUpdatedAt       DATETIME2(3)        NOT NULL    DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_UserTwoFactor     PRIMARY KEY (UserId),
    CONSTRAINT FK_UserTwoFactor_User FOREIGN KEY (UserId)
                                     REFERENCES Users(UserId)
                                     ON DELETE CASCADE
);
GO

-- ──────────────────────────────────────────────────────────
-- 11. ROLES & PERMISSIONS
-- ──────────────────────────────────────────────────────────

CREATE TABLE Roles (
    RoleId          UNIQUEIDENTIFIER    NOT NULL    DEFAULT NEWSEQUENTIALID(),
    TenantId        UNIQUEIDENTIFIER    NULL,       -- NULL = global / system role
    Name            NVARCHAR(100)       NOT NULL,
    Slug            NVARCHAR(100)       NOT NULL,   -- 'candidate' | 'recruiter' | 'admin' | 'super-admin'
    Description     NVARCHAR(500)       NULL,
    IsSystemRole    BIT                 NOT NULL    DEFAULT 0,
    CreatedAt       DATETIME2(3)        NOT NULL    DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Roles             PRIMARY KEY (RoleId),
    CONSTRAINT FK_Roles_Tenant      FOREIGN KEY (TenantId)
                                    REFERENCES Tenants(TenantId),
    CONSTRAINT UQ_Roles_TenantSlug  UNIQUE (TenantId, Slug)
);
GO

CREATE TABLE Permissions (
    PermissionId    UNIQUEIDENTIFIER    NOT NULL    DEFAULT NEWSEQUENTIALID(),
    Code            NVARCHAR(100)       NOT NULL,   -- e.g. 'CAN_VIEW_CAREERS', 'CAN_MANAGE_INTERVIEWS'
    Category        NVARCHAR(50)        NOT NULL,   -- 'Candidate' | 'Recruiter' | 'Admin' | 'Learn'
    Description     NVARCHAR(300)       NULL,

    CONSTRAINT PK_Permissions       PRIMARY KEY (PermissionId),
    CONSTRAINT UQ_Permissions_Code  UNIQUE (Code)
);
GO

CREATE TABLE RolePermissions (
    RoleId          UNIQUEIDENTIFIER    NOT NULL,
    PermissionId    UNIQUEIDENTIFIER    NOT NULL,
    GrantedAt       DATETIME2(3)        NOT NULL    DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_RolePermissions           PRIMARY KEY (RoleId, PermissionId),
    CONSTRAINT FK_RolePermissions_Role      FOREIGN KEY (RoleId)
                                            REFERENCES Roles(RoleId)
                                            ON DELETE CASCADE,
    CONSTRAINT FK_RolePermissions_Perm      FOREIGN KEY (PermissionId)
                                            REFERENCES Permissions(PermissionId)
                                            ON DELETE CASCADE
);
GO

CREATE TABLE UserRoles (
    UserId          UNIQUEIDENTIFIER    NOT NULL,
    RoleId          UNIQUEIDENTIFIER    NOT NULL,
    GrantedAt       DATETIME2(3)        NOT NULL    DEFAULT SYSUTCDATETIME(),
    GrantedBy       UNIQUEIDENTIFIER    NULL,       -- admin UserId, or NULL for self-registration

    CONSTRAINT PK_UserRoles         PRIMARY KEY (UserId, RoleId),
    CONSTRAINT FK_UserRoles_User    FOREIGN KEY (UserId)
                                    REFERENCES Users(UserId)
                                    ON DELETE CASCADE,
    CONSTRAINT FK_UserRoles_Role    FOREIGN KEY (RoleId)
                                    REFERENCES Roles(RoleId)
                                    ON DELETE CASCADE
);
GO

CREATE NONCLUSTERED INDEX IX_UserRoles_RoleId
    ON UserRoles (RoleId)
    INCLUDE (UserId);
GO

-- ──────────────────────────────────────────────────────────
-- 12. SEED: SYSTEM ROLES & PERMISSIONS
-- ──────────────────────────────────────────────────────────
--
-- Roles  : Candidate | Recruiter | Client | Admin | SuperAdmin | Student
-- Portals: Candidate | Recruiter | Client | Admin | Public Careers
--
-- Permission matrix (✓ = granted):
--
-- Permission                  | Candidate | Recruiter | Client | Admin | SuperAdmin
-- ----------------------------|-----------|-----------|--------|-------|----------
-- CAN_VIEW_CAREERS            |     ✓     |     ✓     |   ✓    |   ✓   |     ✓
-- CAN_START_INTERVIEW         |     ✓     |           |        |       |     ✓
-- CAN_PRACTICE_INTERVIEW      |     ✓     |           |        |       |     ✓
-- CAN_VIEW_INTERVIEW_RESULTS  |     ✓     |     ✓     |   ✓    |   ✓   |     ✓
-- CAN_MANAGE_INTERVIEWS       |           |     ✓     |        |   ✓   |     ✓
-- CAN_VIEW_CANDIDATE_PROFILE  |           |     ✓     |   ✓    |   ✓   |     ✓
-- CAN_VIEW_CLIENT_PORTAL      |           |           |   ✓    |   ✓   |     ✓
-- CAN_VIEW_RECRUITER_PORTAL   |           |     ✓     |        |   ✓   |     ✓
-- CAN_VIEW_ADMIN_PORTAL       |           |           |        |   ✓   |     ✓
-- CAN_EDIT_ROLES              |           |           |        |   ✓   |     ✓
-- CAN_EDIT_PERMISSIONS        |           |           |        |       |     ✓
-- CAN_VIEW_ANALYTICS          |           |     ✓     |        |   ✓   |     ✓
-- CAN_VIEW_SYSTEM_SETTINGS    |           |           |        |       |     ✓

INSERT INTO Roles (RoleId, TenantId, Name, Slug, Description, IsSystemRole) VALUES
('10000000-0000-0000-0000-000000000001', NULL, 'Candidate',   'candidate',   'Standard candidate portal access',             1),
('10000000-0000-0000-0000-000000000002', NULL, 'Recruiter',   'recruiter',   'Recruiter portal — manage interview packs',     1),
('10000000-0000-0000-0000-000000000003', NULL, 'Client',      'client',      'Client portal — read-only hiring view',         1),
('10000000-0000-0000-0000-000000000004', NULL, 'Admin',       'admin',       'Tenant admin access',                           1),
('10000000-0000-0000-0000-000000000005', NULL, 'Super Admin', 'super-admin', 'Full platform access including system settings', 1),
('10000000-0000-0000-0000-000000000006', NULL, 'Student',     'student',     'Learn Engine student access',                   1);
GO

INSERT INTO Permissions (PermissionId, Code, Category, Description) VALUES
-- Careers / Public
('20000000-0000-0000-0000-000000000001', 'CAN_VIEW_CAREERS',              'Public',    'View public careers portal listings'),
-- Candidate
('20000000-0000-0000-0000-000000000002', 'CAN_START_INTERVIEW',           'Candidate', 'Start a live AI interview session'),
('20000000-0000-0000-0000-000000000003', 'CAN_PRACTICE_INTERVIEW',        'Candidate', 'Run a practice interview session'),
('20000000-0000-0000-0000-000000000004', 'CAN_VIEW_INTERVIEW_RESULTS',    'Candidate', 'View interview results and scores'),
-- Recruiter / Management
('20000000-0000-0000-0000-000000000010', 'CAN_MANAGE_INTERVIEWS',         'Recruiter', 'Create, edit, and archive interview packs'),
('20000000-0000-0000-0000-000000000011', 'CAN_VIEW_CANDIDATE_PROFILE',    'Recruiter', 'View a candidate profile and linked results'),
('20000000-0000-0000-0000-000000000012', 'CAN_VIEW_RECRUITER_PORTAL',     'Recruiter', 'Access the recruiter portal'),
-- Client
('20000000-0000-0000-0000-000000000020', 'CAN_VIEW_CLIENT_PORTAL',        'Client',    'Access the client (hiring manager) portal'),
-- Admin
('20000000-0000-0000-0000-000000000030', 'CAN_VIEW_ADMIN_PORTAL',         'Admin',     'Access the admin portal'),
('20000000-0000-0000-0000-000000000031', 'CAN_EDIT_ROLES',                'Admin',     'Assign and revoke roles for users'),
('20000000-0000-0000-0000-000000000032', 'CAN_VIEW_ANALYTICS',            'Admin',     'View platform analytics and dashboards'),
-- Super Admin only
('20000000-0000-0000-0000-000000000040', 'CAN_EDIT_PERMISSIONS',          'SuperAdmin','Modify permission definitions and assignments'),
('20000000-0000-0000-0000-000000000041', 'CAN_VIEW_SYSTEM_SETTINGS',      'SuperAdmin','Access system-wide configuration settings');
GO

-- ── Candidate
INSERT INTO RolePermissions (RoleId, PermissionId) VALUES
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'), -- CAN_VIEW_CAREERS
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'), -- CAN_START_INTERVIEW
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003'), -- CAN_PRACTICE_INTERVIEW
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004'); -- CAN_VIEW_INTERVIEW_RESULTS

-- ── Recruiter
INSERT INTO RolePermissions (RoleId, PermissionId) VALUES
('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'), -- CAN_VIEW_CAREERS
('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004'), -- CAN_VIEW_INTERVIEW_RESULTS
('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000010'), -- CAN_MANAGE_INTERVIEWS
('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000011'), -- CAN_VIEW_CANDIDATE_PROFILE
('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000012'), -- CAN_VIEW_RECRUITER_PORTAL
('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000032'); -- CAN_VIEW_ANALYTICS

-- ── Client
INSERT INTO RolePermissions (RoleId, PermissionId) VALUES
('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001'), -- CAN_VIEW_CAREERS
('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004'), -- CAN_VIEW_INTERVIEW_RESULTS
('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000011'), -- CAN_VIEW_CANDIDATE_PROFILE
('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000020'); -- CAN_VIEW_CLIENT_PORTAL

-- ── Admin
INSERT INTO RolePermissions (RoleId, PermissionId) VALUES
('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001'), -- CAN_VIEW_CAREERS
('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004'), -- CAN_VIEW_INTERVIEW_RESULTS
('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000010'), -- CAN_MANAGE_INTERVIEWS
('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000011'), -- CAN_VIEW_CANDIDATE_PROFILE
('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000012'), -- CAN_VIEW_RECRUITER_PORTAL
('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000020'), -- CAN_VIEW_CLIENT_PORTAL
('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000030'), -- CAN_VIEW_ADMIN_PORTAL
('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000031'), -- CAN_EDIT_ROLES
('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000032'); -- CAN_VIEW_ANALYTICS

-- ── Super Admin — all permissions
INSERT INTO RolePermissions (RoleId, PermissionId)
SELECT '10000000-0000-0000-0000-000000000005', PermissionId FROM Permissions;
GO

-- ──────────────────────────────────────────────────────────
-- 13. STORED PROCEDURES  (core auth flows)
-- ──────────────────────────────────────────────────────────

-- 13a. RegisterUser
-- Called during registration. Creates user, profile, session.
CREATE OR ALTER PROCEDURE dbo.usp_RegisterUser
    @TenantId               UNIQUEIDENTIFIER,
    @Email                  NVARCHAR(320),
    @PasswordHash           NVARCHAR(500),
    @PasswordSalt           NVARCHAR(200),
    @FirstName              NVARCHAR(100)   = NULL,
    @LastName               NVARCHAR(100)   = NULL,
    @PreferredLanguageCode  NCHAR(5)        = 'en',
    @PreferredCountryCode   NCHAR(2)        = 'GB',
    @IpAddress              NVARCHAR(45)    = NULL,
    @UserAgent              NVARCHAR(500)   = NULL,
    @Portal                 NVARCHAR(30)    = 'candidate',
    @SessionTokenHash       NVARCHAR(500),
    @SessionExpiresAt       DATETIME2(3),
    @NewUserId              UNIQUEIDENTIFIER OUTPUT,
    @NewSessionId           UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY

        SET @NewUserId    = NEWID();
        SET @NewSessionId = NEWID();

        -- 1. Insert user
        INSERT INTO Users (
            UserId, TenantId, Email, NormalisedEmail,
            PasswordHash, PasswordSalt,
            PreferredLanguageCode, PreferredCountryCode,
            IsActive, IsEmailVerified
        ) VALUES (
            @NewUserId, @TenantId, @Email, UPPER(TRIM(@Email)),
            @PasswordHash, @PasswordSalt,
            @PreferredLanguageCode, @PreferredCountryCode,
            1, 0
        );

        -- 2. Insert profile (1-to-1)
        INSERT INTO UserProfiles (UserId, FirstName, LastName, DisplayName, PrimaryRole)
        VALUES (@NewUserId, @FirstName, @LastName,
                TRIM(ISNULL(@FirstName, '') + ' ' + ISNULL(@LastName, '')),
                'Candidate');

        -- 3. Assign default Candidate role
        INSERT INTO UserRoles (UserId, RoleId)
        VALUES (@NewUserId, '10000000-0000-0000-0000-000000000001');

        -- 4. Create initial session
        INSERT INTO UserSessions (
            SessionId, UserId, TenantId, TokenHash,
            IpAddress, UserAgent, Portal,
            ExpiresAt
        ) VALUES (
            @NewSessionId, @NewUserId, @TenantId, @SessionTokenHash,
            @IpAddress, @UserAgent, @Portal,
            @SessionExpiresAt
        );

        -- 5. Record registration as successful login attempt
        INSERT INTO UserLoginAttempts (UserId, Email, IpAddress, UserAgent, Portal, Success)
        VALUES (@NewUserId, @Email, ISNULL(@IpAddress, '0.0.0.0'), @UserAgent, @Portal, 1);

        -- 6. Initialise 2FA row (disabled)
        INSERT INTO UserTwoFactor (UserId, IsEnabled)
        VALUES (@NewUserId, 0);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- 13b. ValidateLogin
-- Returns the user row + session if credentials valid; records attempt either way.
CREATE OR ALTER PROCEDURE dbo.usp_ValidateLogin
    @TenantId           UNIQUEIDENTIFIER,
    @Email              NVARCHAR(320),
    @IpAddress          NVARCHAR(45),
    @UserAgent          NVARCHAR(500)   = NULL,
    @Portal             NVARCHAR(30)    = 'candidate',
    @SessionTokenHash   NVARCHAR(500),
    @SessionExpiresAt   DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;

    -- Returns the user row for password verification in application code.
    -- Application must: 1) verify hash, 2) call usp_RecordLoginResult.
    SELECT
        u.UserId,
        u.TenantId,
        u.Email,
        u.PasswordHash,
        u.PasswordSalt,
        u.IsActive,
        u.IsLocked,
        u.LockedUntil,
        u.IsEmailVerified,
        u.FailedLoginCount,
        u.PreferredLanguageCode,
        u.PreferredCountryCode,
        u.TimeZone,
        tf.IsEnabled    AS TwoFactorEnabled,
        tf.Method       AS TwoFactorMethod
    FROM Users u
    LEFT JOIN UserTwoFactor tf ON tf.UserId = u.UserId
    WHERE u.TenantId = @TenantId
      AND u.NormalisedEmail = UPPER(TRIM(@Email))
      AND u.DeletedAt IS NULL;
END;
GO

-- 13c. RecordLoginResult
-- Called after application-layer password verification.
CREATE OR ALTER PROCEDURE dbo.usp_RecordLoginResult
    @UserId             UNIQUEIDENTIFIER,
    @Email              NVARCHAR(320),
    @TenantId           UNIQUEIDENTIFIER,
    @Success            BIT,
    @FailureReason      NVARCHAR(200)   = NULL,
    @IpAddress          NVARCHAR(45),
    @UserAgent          NVARCHAR(500)   = NULL,
    @Portal             NVARCHAR(30)    = 'candidate',
    @SessionTokenHash   NVARCHAR(500)   = NULL,
    @SessionExpiresAt   DATETIME2(3)    = NULL,
    @NewSessionId       UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @NewSessionId = NULL;
    BEGIN TRANSACTION;
    BEGIN TRY

        -- 1. Record attempt
        INSERT INTO UserLoginAttempts (UserId, Email, IpAddress, UserAgent, Portal, Success, FailureReason)
        VALUES (@UserId, @Email, @IpAddress, @UserAgent, @Portal, @Success, @FailureReason);

        IF @Success = 1
        BEGIN
            -- 2a. Reset lockout counters
            UPDATE Users
            SET FailedLoginCount = 0,
                IsLocked         = 0,
                LockedUntil      = NULL,
                LastLoginAt      = SYSUTCDATETIME(),
                UpdatedAt        = SYSUTCDATETIME()
            WHERE UserId = @UserId;

            -- 2b. Create new session
            SET @NewSessionId = NEWID();
            INSERT INTO UserSessions (
                SessionId, UserId, TenantId, TokenHash,
                IpAddress, UserAgent, Portal, ExpiresAt
            ) VALUES (
                @NewSessionId, @UserId, @TenantId, @SessionTokenHash,
                @IpAddress, @UserAgent, @Portal, @SessionExpiresAt
            );
        END
        ELSE
        BEGIN
            -- 2c. Increment failure; lock after 5 failures
            UPDATE Users
            SET FailedLoginCount = FailedLoginCount + 1,
                IsLocked         = CASE WHEN FailedLoginCount + 1 >= 5 THEN 1 ELSE IsLocked END,
                LockedUntil      = CASE WHEN FailedLoginCount + 1 >= 5
                                        THEN DATEADD(MINUTE, 15, SYSUTCDATETIME())
                                        ELSE LockedUntil END,
                UpdatedAt        = SYSUTCDATETIME()
            WHERE UserId = @UserId;
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- 13d. ValidateSession
-- Called on every authenticated API request.
CREATE OR ALTER PROCEDURE dbo.usp_ValidateSession
    @TokenHash  NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.SessionId,
        s.UserId,
        s.TenantId,
        s.Portal,
        s.ExpiresAt,
        u.Email,
        u.IsActive,
        u.PreferredLanguageCode,
        u.PreferredCountryCode,
        u.TimeZone,
        up.FirstName,
        up.LastName,
        up.DisplayName,
        up.AvatarUrl,
        up.PrimaryRole
    FROM UserSessions s
    INNER JOIN Users        u  ON u.UserId       = s.UserId
    INNER JOIN UserProfiles up ON up.UserId       = s.UserId
    WHERE s.TokenHash   = @TokenHash
      AND s.RevokedAt   IS NULL
      AND s.ExpiresAt   > SYSUTCDATETIME()
      AND u.IsActive    = 1
      AND u.DeletedAt   IS NULL;

    -- Refresh LastActivityAt
    UPDATE UserSessions
    SET LastActivityAt = SYSUTCDATETIME()
    WHERE TokenHash = @TokenHash
      AND RevokedAt IS NULL;
END;
GO

-- 13e. GetUserPermissions
-- Returns all permission codes for a user — called once on session create,
-- then cached in the session token / Redis.
CREATE OR ALTER PROCEDURE dbo.usp_GetUserPermissions
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT p.Code
    FROM UserRoles       ur
    INNER JOIN RolePermissions rp ON rp.RoleId       = ur.RoleId
    INNER JOIN Permissions     p  ON p.PermissionId  = rp.PermissionId
    WHERE ur.UserId = @UserId;
END;
GO

-- 13f. RevokeSession
CREATE OR ALTER PROCEDURE dbo.usp_RevokeSession
    @SessionId      UNIQUEIDENTIFIER,
    @RevokedReason  NVARCHAR(200) = 'logout'
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE UserSessions
    SET RevokedAt     = SYSUTCDATETIME(),
        RevokedReason = @RevokedReason
    WHERE SessionId = @SessionId
      AND RevokedAt IS NULL;
END;
GO

-- 13g. RevokeAllUserSessions  (password change, admin action)
CREATE OR ALTER PROCEDURE dbo.usp_RevokeAllUserSessions
    @UserId         UNIQUEIDENTIFIER,
    @ExceptSessionId UNIQUEIDENTIFIER = NULL,
    @RevokedReason  NVARCHAR(200)    = 'password_change'
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE UserSessions
    SET RevokedAt     = SYSUTCDATETIME(),
        RevokedReason = @RevokedReason
    WHERE UserId    = @UserId
      AND RevokedAt IS NULL
      AND (@ExceptSessionId IS NULL OR SessionId <> @ExceptSessionId);
END;
GO

-- ──────────────────────────────────────────────────────────
-- 14. MAINTENANCE: expired session cleanup
--     Run as a SQL Agent job daily.
-- ──────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE dbo.usp_PurgeExpiredSessions
    @RetentionDays INT = 30
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM UserSessions
    WHERE ExpiresAt < DATEADD(DAY, -@RetentionDays, SYSUTCDATETIME());
END;
GO
