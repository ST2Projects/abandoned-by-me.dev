/**
 * Badge and achievement system for abandoned repos
 * @typedef {Object} Badge
 * @property {string} id - Unique badge identifier
 * @property {string} name - Display name
 * @property {string} icon - Emoji icon
 * @property {string} description - Sarcastic description
 * @property {function} check - Function to check if badge is earned
 */

/**
 * Available badges in the system
 * @type {Badge[]}
 */
export const badges = [
  {
    id: "serial-abandoner",
    name: "Serial Abandoner",
    icon: "🔪",
    description: "Abandoned 10+ repositories. Commitment isn't your thing.",
    check: (stats) => stats.abandonedCount >= 10,
  },
  {
    id: "one-hit-wonder",
    name: "One-Hit Wonder",
    icon: "🎸",
    description: "You have exactly one active project. All eggs, one basket.",
    check: (stats) => stats.activeCount === 1 && stats.totalCount > 5,
  },
  {
    id: "graveyard-keeper",
    name: "Graveyard Keeper",
    icon: "🪦",
    description:
      "More than 50% of your repos are abandoned. At least you're consistent.",
    check: (stats) =>
      stats.totalCount > 0 && stats.abandonedCount / stats.totalCount > 0.5,
  },
  {
    id: "ghost-town",
    name: "Ghost Town",
    icon: "👻",
    description:
      "You have a repo with 0 commits after creation. Bold strategy.",
    check: (stats) => stats.hasEmptyRepos,
  },
  {
    id: "collector",
    name: "Repo Collector",
    icon: "📦",
    description: "You have 25+ repos. Quantity over quality, we respect it.",
    check: (stats) => stats.totalCount >= 25,
  },
  {
    id: "hoarder",
    name: "Digital Hoarder",
    icon: "🐀",
    description: "You have 50+ repos. You know you can delete things, right?",
    check: (stats) => stats.totalCount >= 50,
  },
  {
    id: "ancient-ruins",
    name: "Ancient Ruins",
    icon: "🏛️",
    description: "You have a repo abandoned for 2+ years. A true artifact.",
    check: (stats) => stats.hasAncientRepo,
  },
  {
    id: "readme-driven",
    name: "README Driven Development",
    icon: "📝",
    description:
      "Multiple repos where README.md was the last (and first) commit.",
    check: (stats) => stats.readmeOnlyCount >= 3,
  },
  {
    id: "fork-collector",
    name: "Fork Collector",
    icon: "🍴",
    description:
      "You've forked 10+ repos. Contributing back is optional, apparently.",
    check: (stats) => stats.forkCount >= 10,
  },
  {
    id: "polyglot",
    name: "Indecisive Polyglot",
    icon: "🌍",
    description:
      "Abandoned repos in 5+ different languages. Can't pick a favorite?",
    check: (stats) => stats.languageCount >= 5,
  },
  {
    id: "star-collector",
    name: "Abandoned Star Child",
    icon: "⭐",
    description: "An abandoned repo still has 10+ stars. They believed in you.",
    check: (stats) => stats.hasAbandonedWithStars,
  },
  {
    id: "issue-ignorer",
    name: "Issue? What Issue?",
    icon: "🙈",
    description:
      "Abandoned repo with 5+ open issues. Bless their hearts for trying.",
    check: (stats) => stats.hasAbandonedWithIssues,
  },
  {
    id: "clean-slate",
    name: "Clean Slate",
    icon: "✨",
    description: "All your repos are active! How did you even find this app?",
    check: (stats) => stats.totalCount > 0 && stats.abandonedCount === 0,
  },
  {
    id: "weekend-warrior",
    name: "Weekend Warrior",
    icon: "🗓️",
    description: "Most of your repos were created on weekends. We see you.",
    check: (stats) => stats.weekendRepoRatio > 0.6,
  },
  {
    id: "january-jones",
    name: "January Enthusiast",
    icon: "🎆",
    description:
      "Multiple repos created in January. New year, new abandoned projects.",
    check: (stats) => stats.januaryRepoCount >= 3,
  },
];

/**
 * Calculate stats needed for badge evaluation
 * @param {Array} repositories - Array of repository objects
 * @param {number} thresholdMonths - Abandonment threshold in months
 * @returns {Object} Stats object for badge checking
 */
export function calculateBadgeStats(repositories, thresholdMonths = 6) {
  const now = new Date();
  const thresholdDate = new Date();
  thresholdDate.setMonth(thresholdDate.getMonth() - thresholdMonths);

  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const abandoned = repositories.filter((repo) => {
    if (repo.is_archived) return false;
    const lastActivity = repo.last_commit_date || repo.last_push_date;
    if (!lastActivity) return true;
    return new Date(lastActivity) < thresholdDate;
  });

  const active = repositories.filter(
    (repo) => !abandoned.some((a) => a.id === repo.id),
  );

  const languages = new Set(abandoned.map((r) => r.language).filter(Boolean));

  const forks = repositories.filter((r) => r.is_fork);

  const hasAncient = abandoned.some((repo) => {
    const lastActivity = repo.last_commit_date || repo.last_push_date;
    return lastActivity && new Date(lastActivity) < twoYearsAgo;
  });

  const abandonedWithStars = abandoned.some((r) => r.stars_count >= 10);
  const abandonedWithIssues = abandoned.some((r) => r.open_issues_count >= 5);

  // Check for empty repos (no commits after creation)
  const hasEmpty = repositories.some((repo) => !repo.last_commit_date);

  // Weekend repos (simplified check - would need creation date)
  const weekendRepos = repositories.filter((repo) => {
    const created = new Date(repo.created_at);
    const day = created.getDay();
    return day === 0 || day === 6;
  });

  // January repos
  const januaryRepos = repositories.filter((repo) => {
    const created = new Date(repo.created_at);
    return created.getMonth() === 0;
  });

  return {
    totalCount: repositories.length,
    abandonedCount: abandoned.length,
    activeCount: active.length,
    languageCount: languages.size,
    forkCount: forks.length,
    hasAncientRepo: hasAncient,
    hasAbandonedWithStars: abandonedWithStars,
    hasAbandonedWithIssues: abandonedWithIssues,
    hasEmptyRepos: hasEmpty,
    readmeOnlyCount: hasEmpty
      ? Math.min(3, repositories.filter((r) => !r.last_commit_date).length)
      : 0,
    weekendRepoRatio:
      repositories.length > 0 ? weekendRepos.length / repositories.length : 0,
    januaryRepoCount: januaryRepos.length,
  };
}

/**
 * Get all earned badges for a user
 * @param {Array} repositories - User's repositories
 * @param {number} thresholdMonths - Abandonment threshold
 * @returns {Badge[]} Array of earned badges
 */
export function getEarnedBadges(repositories, thresholdMonths = 6) {
  const stats = calculateBadgeStats(repositories, thresholdMonths);
  return badges.filter((badge) => badge.check(stats));
}

/**
 * Get all available badges (for showing locked ones)
 * @returns {Badge[]} All badges
 */
export function getAllBadges() {
  return badges;
}

/**
 * Random excuses for abandoned repos
 */
export const excuses = [
  "I was going to finish it, but then I learned a new framework",
  "It works on my machine",
  "The tests pass if you don't run them",
  "It's not abandoned, it's 'feature complete'",
  "I'll get back to it after this one quick project",
  "The real treasure was the commits we made along the way",
  "I'm just waiting for the right moment... for 2 years",
  "It's a minimalist project - minimal code, minimal updates",
  "I'm practicing sustainable development - very slow, very sustainable",
  "It's an art installation about digital impermanence",
  "I'm building anticipation for the big v2.0 release",
  "The dependencies went out of date, and at that point...",
  "I pivoted to a different project (47 times)",
  "It's in stealth mode. Very stealth. Even I can't find it.",
  "I'm doing agile - I just haven't gotten back to this sprint yet",
];

/**
 * Get a random excuse
 * @returns {string} A random excuse
 */
export function getRandomExcuse() {
  return excuses[Math.floor(Math.random() * excuses.length)];
}

/**
 * Sarcastic stat messages based on abandonment percentage
 * @param {number} abandonedCount - Number of abandoned repos
 * @param {number} totalCount - Total number of repos
 * @returns {string} A sarcastic message
 */
export function getSarcasticMessage(abandonedCount, totalCount) {
  if (totalCount === 0) {
    return "No repos yet? The journey of a thousand abandoned projects begins with a single 'git init'.";
  }

  const percentage = (abandonedCount / totalCount) * 100;

  if (percentage === 0) {
    return "All your repos are active? Are you sure you're a developer?";
  } else if (percentage < 25) {
    return (
      "Only " +
      percentage.toFixed(0) +
      "% abandoned? You're practically a project manager."
    );
  } else if (percentage < 50) {
    return (
      percentage.toFixed(0) +
      "% abandoned. You're right in the sweet spot of 'enthusiastic starter'."
    );
  } else if (percentage < 75) {
    return (
      percentage.toFixed(0) +
      "% abandoned. You've mastered the art of knowing when to quit."
    );
  } else if (percentage < 100) {
    return (
      percentage.toFixed(0) +
      "% abandoned. At this point, it's basically a hobby."
    );
  } else {
    return "100% abandoned. You've achieved enlightenment. Why finish what you can simply start?";
  }
}

// ──────────────────────────────────────────────────
// User Titles / Ranks
// ──────────────────────────────────────────────────

/**
 * Get a humorous title based on total abandoned repo count
 * @param {number} abandonedCount
 * @returns {{ title: string, emoji: string }}
 */
export function getUserTitle(abandonedCount) {
  if (abandonedCount >= 51)
    return { title: "Tenured Professor of Abandonware", emoji: "🎓" };
  if (abandonedCount >= 36)
    return { title: "CEO of Unfinished Business", emoji: "👔" };
  if (abandonedCount >= 21)
    return { title: "Distinguished Quitter", emoji: "🏅" };
  if (abandonedCount >= 11)
    return { title: "Professional Procrastinator", emoji: "💼" };
  if (abandonedCount >= 6) return { title: "Serial Starter", emoji: "🔄" };
  if (abandonedCount >= 3)
    return { title: "Apprentice Abandoner", emoji: "🌱" };
  return { title: "Hopeful Beginner", emoji: "✨" };
}

/**
 * Get progress towards the next title
 * @param {number} abandonedCount
 * @returns {{ remaining: number, nextTitle: string } | null}
 */
export function getNextTitle(abandonedCount) {
  const thresholds = [3, 6, 11, 21, 36, 51];
  const next = thresholds.find((t) => t > abandonedCount);
  if (!next) return null;
  const remaining = next - abandonedCount;
  return { remaining, nextTitle: getUserTitle(next).title };
}

// ──────────────────────────────────────────────────
// Language-Specific Badges
// ──────────────────────────────────────────────────

export const LANGUAGE_BADGES = {
  JavaScript: {
    name: "JavaScare",
    emoji: "👻",
    description: "Abandoned a JavaScript project",
  },
  TypeScript: {
    name: "TypeSkipped",
    emoji: "⏭️",
    description: "Abandoned a TypeScript project",
  },
  Python: {
    name: "Pythoff",
    emoji: "🐍",
    description: "Abandoned a Python project",
  },
  Rust: {
    name: "Rusty Rust",
    emoji: "🦀",
    description: "Abandoned a Rust project",
  },
  Go: { name: "Go Away", emoji: "🚪", description: "Abandoned a Go project" },
  Java: {
    name: "Java-nah",
    emoji: "☕",
    description: "Abandoned a Java project",
  },
  "C++": {
    name: "See-Ya-Plus-Plus",
    emoji: "👋",
    description: "Abandoned a C++ project",
  },
  Ruby: {
    name: "Ruby Tombstone",
    emoji: "💎",
    description: "Abandoned a Ruby project",
  },
  PHP: {
    name: "PH-Porgotten",
    emoji: "🐘",
    description: "Abandoned a PHP project",
  },
  Shell: {
    name: "Shell Shocked",
    emoji: "🐚",
    description: "Abandoned a Shell project",
  },
  "C#": {
    name: "C-Sharply Departed",
    emoji: "🎵",
    description: "Abandoned a C# project",
  },
  Swift: {
    name: "Swiftly Forgotten",
    emoji: "🦅",
    description: "Abandoned a Swift project",
  },
};

/**
 * Get language-specific badges earned from abandoned repos
 * @param {Array} repos - Repository objects (snake_case or camelCase)
 * @param {number} abandonmentThresholdMonths
 * @returns {Array<{ name: string, emoji: string, description: string, language: string }>}
 */
export function getLanguageBadges(repos, abandonmentThresholdMonths = 1) {
  const thresholdDate = new Date();
  thresholdDate.setMonth(thresholdDate.getMonth() - abandonmentThresholdMonths);

  const abandoned = repos.filter((repo) => {
    if (repo.is_archived || repo.isArchived) return false;
    const lastActivity =
      repo.last_commit_date ||
      repo.lastCommitDate ||
      repo.last_push_date ||
      repo.lastPushDate;
    if (!lastActivity) return true;
    return new Date(lastActivity) < thresholdDate;
  });

  const abandonedLanguages = new Set(
    abandoned.map((r) => r.language).filter(Boolean),
  );

  return Array.from(abandonedLanguages)
    .filter((lang) => LANGUAGE_BADGES[lang])
    .map((lang) => ({ ...LANGUAGE_BADGES[lang], language: lang }));
}

// ──────────────────────────────────────────────────
// Language Stats
// ──────────────────────────────────────────────────

/**
 * Calculate language-based abandonment statistics
 * @param {Array} repos - Repository objects
 * @param {number} abandonmentThresholdMonths
 * @returns {{ stats: Array, mostAbandoned: string|null, safest: string|null }}
 */
export function getLanguageStats(repos, abandonmentThresholdMonths = 1) {
  const thresholdDate = new Date();
  thresholdDate.setMonth(thresholdDate.getMonth() - abandonmentThresholdMonths);

  const langMap = {};

  for (const repo of repos) {
    const lang = repo.language;
    if (!lang) continue;

    if (!langMap[lang])
      langMap[lang] = { language: lang, abandonedCount: 0, totalCount: 0 };
    langMap[lang].totalCount++;

    const isArchived = repo.is_archived || repo.isArchived;
    if (!isArchived) {
      const lastActivity =
        repo.last_commit_date ||
        repo.lastCommitDate ||
        repo.last_push_date ||
        repo.lastPushDate;
      const isAbandoned =
        !lastActivity || new Date(lastActivity) < thresholdDate;
      if (isAbandoned) langMap[lang].abandonedCount++;
    }
  }

  const stats = Object.values(langMap)
    .map((s) => ({
      ...s,
      percentage:
        s.totalCount > 0
          ? Math.round((s.abandonedCount / s.totalCount) * 100)
          : 0,
    }))
    .sort((a, b) => b.abandonedCount - a.abandonedCount);

  const withAbandoned = stats.filter((s) => s.abandonedCount > 0);
  const mostAbandoned =
    withAbandoned.length > 0 ? withAbandoned[0].language : null;

  const withRepos = stats.filter((s) => s.totalCount > 0);
  const safest =
    withRepos.length > 0
      ? withRepos.reduce(
          (min, s) => (s.abandonedCount < min.abandonedCount ? s : min),
          withRepos[0],
        ).language
      : null;

  return { stats, mostAbandoned, safest };
}

/**
 * Days since last commit message generator
 * @param {Date|string} lastCommitDate - The last commit date
 * @returns {string} A humorous message about days since last commit
 */
export function getDaysSinceMessage(lastCommitDate) {
  if (!lastCommitDate) {
    return "This repo has never seen a commit. Truly aspirational.";
  }

  const days = Math.floor(
    (new Date() - new Date(lastCommitDate)) / (1000 * 60 * 60 * 24),
  );

  if (days === 0) {
    return "Last commit: today. Enjoy it while it lasts.";
  } else if (days === 1) {
    return "Days since last commit: 1. The countdown begins.";
  } else if (days < 7) {
    return `Days since last commit: ${days}. Still warm.`;
  } else if (days < 30) {
    return `Days since last commit: ${days}. Getting suspicious.`;
  } else if (days < 90) {
    return `Days since last commit: ${days}. It's complicated.`;
  } else if (days < 180) {
    return `Days since last commit: ${days}. On a break.`;
  } else if (days < 365) {
    return `Days since last commit: ${days}. We need to talk.`;
  } else if (days < 730) {
    return `Days since last commit: ${days}. It's not you, it's me.`;
  } else {
    return `Days since last commit: ${days}. This relationship is over.`;
  }
}
