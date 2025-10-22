
import React from 'react';
import PageContainer from '../Layout/PageContainer';
import Leaderboard from './Leaderboard';

const LeaderboardPage: React.FC = () => {
  return (
    <PageContainer title="🏆 Leadership Board">
      <Leaderboard />
    </PageContainer>
  );
};

export default LeaderboardPage;
