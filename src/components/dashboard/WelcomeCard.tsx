
import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface WelcomeCardProps {
  currentTime: Date;
}

export default function WelcomeCard({ currentTime }: WelcomeCardProps) {
  const getTimeOfDay = (date: Date): string => {
    const hours = date.getHours();
    if (hours < 12) return 'Morning';
    if (hours < 18) return 'Afternoon';
    return 'Evening';
  };

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Good {getTimeOfDay(currentTime)},</h2>
            <p className="text-muted-foreground">Here's your business overview</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formattedTime}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
