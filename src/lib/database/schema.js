import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

// ============================================================
// better-auth managed tables
// These tables are required by better-auth for authentication.
// The table and column names must match what better-auth expects.
// ============================================================

// better-auth: user table
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

// better-auth: session table
export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

// better-auth: account table
export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

// better-auth: verification table
export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

// ============================================================
// Application tables
// ============================================================

// User configurations table
export const userConfigs = sqliteTable(
  "user_configs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    abandonmentThresholdMonths: integer("abandonment_threshold_months")
      .default(1)
      .notNull(),
    dashboardPublic: integer("dashboard_public", { mode: "boolean" })
      .default(false)
      .notNull(),
    dashboardSlug: text("dashboard_slug").unique(),
    scanPrivateRepos: integer("scan_private_repos", { mode: "boolean" })
      .default(false)
      .notNull(),
    autoRefresh: integer("auto_refresh", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => {
    return {
      userIdUnique: uniqueIndex("user_configs_user_id_unique").on(table.userId),
      dashboardSlugIdx: index("idx_user_configs_dashboard_slug").on(
        table.dashboardSlug,
      ),
    };
  },
);

// Repositories table
export const repositories = sqliteTable(
  "repositories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    githubId: integer("github_id").notNull(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    description: text("description"),
    private: integer("private", { mode: "boolean" }).default(false).notNull(),
    htmlUrl: text("html_url").notNull(),
    cloneUrl: text("clone_url"),
    lastCommitDate: integer("last_commit_date", { mode: "timestamp" }),
    lastPushDate: integer("last_push_date", { mode: "timestamp" }),
    isFork: integer("is_fork", { mode: "boolean" }).default(false).notNull(),
    isArchived: integer("is_archived", { mode: "boolean" })
      .default(false)
      .notNull(),
    defaultBranch: text("default_branch").default("main").notNull(),
    language: text("language"),
    starsCount: integer("stars_count").default(0).notNull(),
    forksCount: integer("forks_count").default(0).notNull(),
    openIssuesCount: integer("open_issues_count").default(0).notNull(),
    sizeKb: integer("size_kb").default(0).notNull(),
    respectsCount: integer("respects_count").default(0).notNull(),
    upForAdoption: integer("up_for_adoption", { mode: "boolean" })
      .default(false)
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    lastScannedAt: integer("last_scanned_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => {
    return {
      userGithubUnique: uniqueIndex("repositories_user_id_github_id_unique").on(
        table.userId,
        table.githubId,
      ),
      userIdIdx: index("idx_repositories_user_id").on(table.userId),
      lastCommitDateIdx: index("idx_repositories_last_commit_date").on(
        table.lastCommitDate,
      ),
      githubIdIdx: index("idx_repositories_github_id").on(table.githubId),
    };
  },
);

// Scan history table
export const scanHistory = sqliteTable(
  "scan_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    scanStartedAt: integer("scan_started_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    scanCompletedAt: integer("scan_completed_at", { mode: "timestamp" }),
    reposScanned: integer("repos_scanned").default(0).notNull(),
    reposAdded: integer("repos_added").default(0).notNull(),
    reposUpdated: integer("repos_updated").default(0).notNull(),
    errorsCount: integer("errors_count").default(0).notNull(),
    errorDetails: text("error_details", { mode: "json" }),
    status: text("status").default("running").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => {
    return {
      userIdIdx: index("idx_scan_history_user_id").on(table.userId),
      createdAtIdx: index("idx_scan_history_created_at").on(table.createdAt),
    };
  },
);
