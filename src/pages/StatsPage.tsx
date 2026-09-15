import React from "react";
import { Session, StreakData } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { Flame, Clock, Zap, Target, BarChart3, Calendar } from "lucide-react";

interface StatsPageProps {
  sessions: Session[];
  streak: StreakData;
}

export const StatsPage: React.FC<StatsPageProps> = ({ sessions, streak }) => {
  // Helper functions for BPM calculations
  const getSessionPeakBpm = (session: Session): number => {
    if (session.bpmsUsed && session.bpmsUsed.length > 0) {
      return Math.max(...session.bpmsUsed);
    }
    return session.highestBpm || 120;
  };

  const getSessionAverageBpm = (session: Session): number => {
    if (session.bpmsUsed && session.bpmsUsed.length > 0) {
      const sum = session.bpmsUsed.reduce((acc, val) => acc + val, 0);
      return Math.round(sum / session.bpmsUsed.length);
    }
    return session.highestBpm || 120;
  };

  // Aggregate Metrics
  const totalSeconds = sessions.reduce(
    (acc, s) => acc + (s.durationSeconds || 0),
    0,
  );
  const totalHours = (totalSeconds / 3600).toFixed(1);
  const highestOverallBpm = sessions.reduce(
    (max, s) => Math.max(max, getSessionPeakBpm(s)),
    120,
  );

  // Prepare chart data from sessions by grouping by date
  const groupedSessions = sessions.reduce(
    (acc, s) => {
      if (!acc[s.date]) {
        acc[s.date] = { seconds: 0, bpm: 0 };
      }
      acc[s.date].seconds += s.durationSeconds || 0;
      acc[s.date].bpm = Math.max(acc[s.date].bpm, getSessionPeakBpm(s));
      return acc;
    },
    {} as Record<string, { seconds: number; bpm: number }>,
  );

  const chartData = Object.entries(groupedSessions)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([date, data]) => ({
      date: date.slice(5), // MM-DD
      minutes: Math.round(data.seconds / 60),
      bpm: data.bpm,
    }));

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <BarChart3 size={32} className="text-primary" />
        </div>
        <h2 className="font-mono text-xl font-bold text-on-surface">
          No Practice Data Yet
        </h2>
        <p className="text-on-surface-variant font-mono text-sm max-w-md text-center">
          Start a practice session from the dashboard to track your consistency,
          velocity, and stamina over time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 4 Metric Cards */}
      <div data-tour="stats-metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Practice Time */}
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-5 flex flex-col gap-2 shadow">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Total Time Logged
            </span>
            <Clock size={16} className="text-primary" />
          </div>
          <span className="font-mono text-3xl font-bold text-on-surface tracking-tight">
            {totalHours}{" "}
            <span className="text-sm font-normal text-on-surface-variant">
              HRS
            </span>
          </span>
          <span className="text-[10px] font-mono text-on-surface-variant">
            {sessions.length} complete sessions
          </span>
        </div>

        {/* Current Streak */}
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-5 flex flex-col gap-2 shadow">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Current Streak
            </span>
            <Flame size={16} className="text-primary" />
          </div>
          <span className="font-mono text-3xl font-bold text-on-surface tracking-tight">
            {streak.currentStreak}{" "}
            <span className="text-sm font-normal text-on-surface-variant">
              DAYS
            </span>
          </span>
          <span className="text-[10px] font-mono text-on-surface-variant">
            Active 2-day grace buffer
          </span>
        </div>

        {/* Longest Streak */}
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-5 flex flex-col gap-2 shadow">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Longest Streak
            </span>
            <Target size={16} className="text-primary" />
          </div>
          <span className="font-mono text-3xl font-bold text-on-surface tracking-tight">
            {streak.longestStreak}{" "}
            <span className="text-sm font-normal text-on-surface-variant">
              DAYS
            </span>
          </span>
          <span className="text-[10px] font-mono text-on-surface-variant">
            All-time record
          </span>
        </div>

        {/* Peak Tempo */}
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-5 flex flex-col gap-2 shadow">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Peak Velocity
            </span>
            <Zap size={16} className="text-primary" />
          </div>
          <span className="font-mono text-3xl font-bold text-on-surface tracking-tight">
            {highestOverallBpm}{" "}
            <span className="text-sm font-normal text-on-surface-variant">
              BPM
            </span>
          </span>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Practice Duration Bar Chart */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-4">
          <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
            Daily Practice Minutes
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-outline-variant)"
                  opacity={0.4}
                />
                <XAxis
                  dataKey="date"
                  stroke="var(--color-on-surface-variant)"
                  fontSize={11}
                  fontFamily="monospace"
                />
                <YAxis
                  stroke="var(--color-on-surface-variant)"
                  fontSize={11}
                  fontFamily="monospace"
                  unit="m"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface-container-high)",
                    borderColor: "var(--color-outline-variant)",
                    borderRadius: "6px",
                  }}
                  itemStyle={{
                    color: "var(--color-primary)",
                    fontFamily: "monospace",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="minutes"
                  fill="var(--color-primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BPM Progression Curve */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-4">
          <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
            Tempo Peak Velocity (BPM)
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-outline-variant)"
                  opacity={0.4}
                />
                <XAxis
                  dataKey="date"
                  stroke="var(--color-on-surface-variant)"
                  fontSize={11}
                  fontFamily="monospace"
                />
                <YAxis
                  stroke="var(--color-on-surface-variant)"
                  fontSize={11}
                  fontFamily="monospace"
                  domain={[60, "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface-container-high)",
                    borderColor: "var(--color-outline-variant)",
                    borderRadius: "6px",
                  }}
                  itemStyle={{
                    color: "var(--color-primary)",
                    fontFamily: "monospace",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="bpm"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ fill: "var(--color-primary)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Session History Table */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-4">
        <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
          Practice Log History
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-outline-variant/30 text-on-surface-variant uppercase text-[10px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Peak BPM</th>
                <th className="py-3 px-4">Avg BPM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  className="hover:bg-outline-variant/10 transition-colors"
                >
                  <td className="py-3.5 px-4 text-on-surface font-semibold">
                    {session.date}
                  </td>
                  <td className="py-3.5 px-4 text-primary">
                    {Math.round((session.durationSeconds || 0) / 60)} min
                  </td>
                  <td className="py-3.5 px-4 text-on-surface">
                    {getSessionPeakBpm(session)} BPM
                  </td>
                  <td className="py-3.5 px-4 text-on-surface-variant">
                    {getSessionAverageBpm(session)} BPM
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
