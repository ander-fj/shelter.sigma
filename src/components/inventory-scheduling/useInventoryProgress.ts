import { useMemo } from 'react';
import { InventorySchedule, ActivityStatus } from '../../types';

export function useInventoryProgress(schedule: InventorySchedule | null) {
  const progress = useMemo(() => {
    if (!schedule) {
      return { totalActivities: 0, completedActivities: 0, percentage: 0 };
    }

    // Garante que mesmo agendamentos antigos sem `activityStatus` funcionem.
    const normalizedActivities: ActivityStatus[] =
      Array.isArray(schedule.activityStatus) && schedule.activityStatus.length > 0
        ? schedule.activityStatus
        : Array.isArray(schedule.activities)
        ? schedule.activities.map((text) =>
            typeof text === 'string' ? { text, completed: false } : text
          )
        : [];

    const totalActivities = normalizedActivities.length;
    const completedActivities = normalizedActivities.filter((a) => a.completed).length;
    const percentage =
      totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

    return {
      totalActivities,
      completedActivities,
      percentage: Math.round(percentage),
    };
  }, [schedule]);

  return progress;
}