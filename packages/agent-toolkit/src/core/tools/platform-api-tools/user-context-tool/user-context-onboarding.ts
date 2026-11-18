import { BoardObjectType, GetUserContextQuery } from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { ONBOARDING_GUIDE, ONBOARDING_SKILL_NAME } from './onboarding-skill';

/** A user whose monday.com user was created within this many days counts as new. */
export const NEW_USER_MAX_AGE_DAYS = 14;

/**
 * A new user has the one board monday creates at signup, or two if they tried the platform
 * before coming back to the agent. More boards means the user already works in monday.com.
 */
export const NEW_USER_MAX_BOARDS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface OnboardingSignals {
  userCreatedAt: string;
  userAgeDays: number;
  boardsCount: number;
  accountCreatedAt: string | null;
}

export interface OnboardingContext {
  isLikelyNewUser: true;
  signals: OnboardingSignals;
  skill: {
    name: string;
    guide: string;
  };
}

/** Counts the parent boards in the `boards` result. Docs, sub-item boards, and custom objects are not boards here. */
export const countBoards = (boards: GetUserContextQuery['boards']): number =>
  (boards ?? []).filter((board) => board?.id && board.type === BoardObjectType.Board).length;

/**
 * Returns the onboarding context when the user is likely new to monday.com, otherwise null.
 * Both signals must hold: the user was created recently, and they have at most two boards.
 * A missing or unparsable creation date is never treated as new.
 */
export const getOnboardingContext = (
  me: NonNullable<GetUserContextQuery['me']>,
  boards: GetUserContextQuery['boards'],
  now: number = Date.now(),
): OnboardingContext | null => {
  const createdAtMs = me.created_at ? Date.parse(me.created_at) : NaN;
  if (Number.isNaN(createdAtMs)) {
    return null;
  }

  const userAgeDays = Math.max(0, Math.floor((now - createdAtMs) / DAY_MS));
  const boardsCount = countBoards(boards);

  if (userAgeDays > NEW_USER_MAX_AGE_DAYS || boardsCount > NEW_USER_MAX_BOARDS) {
    return null;
  }

  return {
    isLikelyNewUser: true,
    signals: {
      userCreatedAt: me.created_at,
      userAgeDays,
      boardsCount,
      accountCreatedAt: me.account?.created_at ?? null,
    },
    skill: {
      name: ONBOARDING_SKILL_NAME,
      guide: ONBOARDING_GUIDE,
    },
  };
};
