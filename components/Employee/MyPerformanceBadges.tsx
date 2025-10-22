import React from 'react';
import { UserBadgeRecord, BadgeType } from '../../types';
import { BADGE_DEFINITIONS } from '../../constants';
import Card from '../Common/Card';
import { formatDateDDMonYYYY } from '../../utils/dateUtils';


interface MyPerformanceBadgesProps {
  earnedBadges: UserBadgeRecord[];
}

const MyPerformanceBadges: React.FC<MyPerformanceBadgesProps> = ({ earnedBadges }) => {

  const getLatestEarnedDateForBadgeType = (badgeType: BadgeType): string | null => {
    const badgesOfType = earnedBadges
      .filter(b => b.badgeType === badgeType)
      .sort((a, b) => new Date(b.earnedDate).getTime() - new Date(a.earnedDate).getTime());
    return badgesOfType.length > 0 ? badgesOfType[0].earnedDate : null;
  };
  
  const getDisplayTooltip = (badgeType: BadgeType, definition: typeof BADGE_DEFINITIONS[BadgeType]): string => {
      const earnedInfo = earnedBadges.find(b => b.badgeType === badgeType);
      if (earnedInfo) {
          return `${definition.earnedTooltipText} (Earned on ${formatDateDDMonYYYY(earnedInfo.earnedDate)})`;
      }
      return definition.defaultTooltip;
  };

  return (
    <Card title="🏅 My Performance Badges" titleIcon={<i className="fas fa-award"></i>} className="mt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(BADGE_DEFINITIONS).map(([type, definition]) => {
          const badgeKey = type as BadgeType;
          const hasEarned = earnedBadges.some(b => b.badgeType === badgeKey);
          const latestEarnedDate = hasEarned ? getLatestEarnedDateForBadgeType(badgeKey) : null;

          return (
            <div
              key={badgeKey}
              title={getDisplayTooltip(badgeKey, definition)}
              className={`p-4 rounded-lg shadow-md flex flex-col items-center text-center transition-all duration-300 ease-in-out transform hover:scale-105
                ${hasEarned ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-amber-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 opacity-70'}`}
            >
              <span className="text-5xl mb-2" aria-hidden="true">{definition.icon}</span>
              <h4 className={`text-md font-semibold ${hasEarned ? 'text-amber-800' : 'text-slate-700 dark:text-slate-300'}`}>{definition.title}</h4>
              {hasEarned && latestEarnedDate ? (
                <p className="text-xs mt-1">
                  Earned: {formatDateDDMonYYYY(latestEarnedDate)}
                </p>
              ) : <p className="text-xs mt-1 italic">Not yet earned</p>}
            </div>
          );
        })}
      </div>
       <p className="text-xs text-slate-500 dark:text-slate-500 mt-4 text-center">
        Hover over a badge to see how to earn it or when you earned it. Keep up the great work!
      </p>
    </Card>
  );
};

export default MyPerformanceBadges;
