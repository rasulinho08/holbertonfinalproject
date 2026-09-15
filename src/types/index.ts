export interface User {
  id: ID;
  username: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  coverPhotoUrl: string | null;
  bio: string | null;
  website: string | null;
  role: UserRole;
  createdAt: ISODate;
  followersCount: number;
  followingCount: number;
  /** Only present when the viewer is authenticated and is not this user. */
  isFollowing?: boolean;
  stats: UserStats;
  goal: ReadingGoal;
  favoriteGenres: GenreSlug[];
  favoriteAuthorIds: ID[];
  /** Platform wallet balance in AZN. */
  walletBalance: number;
  twoFactorEnabled: boolean;
  /** Set for role === 'publisher'. */
  publisherId?: ID;
  onboardingCompleted: boolean;
  /** Set for role === 'author': the writer profile this account speaks for. */
  authorId?: ID;
}