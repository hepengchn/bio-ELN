import React from 'react';
import { ExperimentStatus } from '../types';
import { Circle, CheckCircle2, PauseCircle } from 'lucide-react';

interface Props {
  status: ExperimentStatus;
}

const StatusBadge: React.FC<Props> = ({ status }) => {
  switch (status) {
    case ExperimentStatus.COMPLETED:
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} />
          Completed
        </span>
      );
    case ExperimentStatus.IN_PROGRESS:
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
          <Circle size={12} className="animate-pulse" />
          In Progress
        </span>
      );
    case ExperimentStatus.PAUSED:
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
          <PauseCircle size={12} />
          Paused
        </span>
      );
    default:
      return null;
  }
};

export default StatusBadge;
