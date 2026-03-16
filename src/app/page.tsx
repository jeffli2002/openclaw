"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  Brain,
  FileText,
  CheckSquare,
  Search,
  Home,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  BookOpen,
  Activity,
  Zap,
} from "lucide-react";

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://njxjuvxosvwvluxefrzg.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qeGp1dnhvc3Z3dmx1eGVmcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjkyNTUsImV4cCI6MjA4NzQwNTI1NX0.FqfMyI3uSkiHVepWVccxFU4ie5RU00VVdrF-aOr9LjI";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 类型定义
interface Memory {
  id: string;
  title: string;
  content: string;
  date: string;
  type: "long-term" | "daily" | "evolution";
}

interface Document {
  id: string;
  title: string;
  path: string;
  type: string;
  date: string;
  size: number;
}

interface Task {
  id: string;
  name: string;
  schedule: string;
  status: "ok" | "error" | "running" | "idle" | "disabled";
  lastRun: string | null;
  lastDuration: string | null;
  nextRun: string | null;
  errorCount: number;
  tokenUsage: number;
  updatedAt?: string | null;
}

interface TokenTrendPoint {
  date: string;
  totalTokens: number;
  taskBreakdown: Record<string, number>;
}

interface TokenTrendRangePoint extends TokenTrendPoint {
  agentBreakdown: Record<string, number>;
}

function addDaysToDateKey(dateKey: string, delta: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().split('T')[0];
}

function buildContinuousTrend(
  points: TokenTrendRangePoint[],
  range: 7 | 14 | 30,
  endDate?: string
): TokenTrendRangePoint[] {
  if (!points.length) return [];

  const finalDate = endDate || points[points.length - 1]?.date;
  if (!finalDate) return [];

  const byDate = new Map(points.map((point) => [point.date, point]));
  const startDate = addDaysToDateKey(finalDate, -(range - 1));

  return Array.from({ length: range }, (_, index) => {
    const date = addDaysToDateKey(startDate, index);
    return (
      byDate.get(date) || {
        date,
        totalTokens: 0,
        taskBreakdown: {},
        agentBreakdown: {},
      }
    );
  });
}

// 认证检查组件
function AuthCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem("secondbrain_auth");
    if (auth !== "true") {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// 模拟数据 - 实际应该从API获取
const mockMemories: Memory[] = [
  {
    id: "1",
    title: "2026-02-23 工作日志",
    content: "今天完成了第二大脑系统的初步架构设计...",
    date: "2026-02-23",
    type: "daily",
  },
  {
    id: "2",
    title: "2026-02-22 工作日志",
    content: "修复了日报格式问题，开始使用四大板块规范...",
    date: "2026-02-22",
    type: "daily",
  },
  {
    id: "3",
    title: "长期记忆：日报格式规范",
    content: "四大板块：今日完成、进行中、反思与改进、明日计划",
    date: "2026-02-16",
    type: "long-term",
  },
  {
    id: "4",
    title: "2026-02-22 进化报告",
    content: " EvoMap信号检测、候选方案分析...",
    date: "2026-02-22",
    type: "evolution",
  },
];

const mockDocuments: Document[] = [
  {
    id: "1",
    title: "MEMORY.md",
    path: "/root/.openclaw/workspace/MEMORY.md",
    type: "memory",
    date: "2026-02-23",
    size: 13075,
  },
  {
    id: "2",
    title: "每日工作报告 20260222",
    path: "/root/.openclaw/workspace/memory/daily_report_20260222.md",
    type: "report",
    date: "2026-02-22",
    size: 1636,
  },
  {
    id: "3",
    title: "AI日报 20260217",
    path: "/root/.openclaw/workspace/memory/ai-daily-20260217-v4.md",
    type: "newsletter",
    date: "2026-02-17",
    size: 5038,
  },
  {
    id: "4",
    title: "一人公司架构设计",
    path: "/root/.openclaw/workspace/ai-one-person-company-agent-architecture.md",
    type: "plan",
    date: "2026-02-15",
    size: 12848,
  },
  {
    id: "5",
    title: "OpenClaw课程 Phase1-2",
    path: "/root/.openclaw/workspace/memory/openclaw-course-phase1-2.md",
    type: "course",
    date: "2026-02-17",
    size: 9337,
  },
];

const mockTasks: Task[] = [
  {
    id: "1",
    name: "ai-daily-newsletter",
    schedule: "7:30 每天",
    status: "ok",
    lastRun: "2026-02-23 07:30",
    lastDuration: "159s",
    nextRun: "2026-02-24 07:30",
    errorCount: 0,
    tokenUsage: 0,
  },
  {
    id: "2",
    name: "daily-content-publish",
    schedule: "9:00 每天",
    status: "ok",
    lastRun: "2026-02-23 09:00",
    lastDuration: "44s",
    nextRun: "2026-02-24 09:00",
    errorCount: 0,
    tokenUsage: 0,
  },
  {
    id: "3",
    name: "growth-seo-keywords",
    schedule: "10:00 每天",
    status: "ok",
    lastRun: "2026-02-23 10:00",
    lastDuration: "114s",
    nextRun: "2026-02-24 10:00",
    errorCount: 0,
    tokenUsage: 0,
  },
  {
    id: "4",
    name: "ai-kol-daily-newsletter",
    schedule: "11:00 每天",
    status: "ok",
    lastRun: "2026-02-23 11:00",
    lastDuration: "122s",
    nextRun: "2026-02-24 11:00",
    errorCount: 0,
    tokenUsage: 0,
  },
  {
    id: "5",
    name: "product-competitor-analysis",
    schedule: "14:00 每天",
    status: "ok",
    lastRun: "2026-02-23 14:00",
    lastDuration: "110s",
    nextRun: "2026-02-24 14:00",
    errorCount: 0,
    tokenUsage: 0,
  },
  {
    id: "6",
    name: "chief-daily-report",
    schedule: "19:30 每天",
    status: "error",
    lastRun: "2026-02-22 19:30",
    lastDuration: "59s",
    nextRun: "2026-02-23 19:30",
    errorCount: 4,
    tokenUsage: 0,
  },
  {
    id: "7",
    name: "daily-skill-evolution",
    schedule: "22:00 每天",
    status: "ok",
    lastRun: "2026-02-22 22:00",
    lastDuration: "50s",
    nextRun: "2026-02-23 22:00",
    errorCount: 0,
    tokenUsage: 0,
  },
  {
    id: "8",
    name: "gateway-health-backup",
    schedule: "每5分钟",
    status: "error",
    lastRun: "2026-02-23 15:50",
    lastDuration: "29s",
    nextRun: "2026-02-23 15:55",
    errorCount: 23,
    tokenUsage: 0,
  },
];

// Agent 类型定义
interface Agent {
  id: string;
  name: string;
  description: string;
  status: "ok" | "error" | "running" | "idle" | "disabled";
  model: string;
  tasks: number;
  completedTasks: number;
  failedTasks: number;
  tokenUsage: number;
  lastRun: string;
}

// Agent 模拟数据
const agentDefinitions = [
  {
    id: "coding",
    name: "Coding Agent",
    description: "负责代码开发、重构、调试、技术架构与Skill进化",
    model: "MiniMax M2.5",
    taskIds: ["task-evolution"],
  },
  {
    id: "content",
    name: "Content Agent",
    description: "负责AI日报、内容发布、KOL追踪",
    model: "Kimi K2.5",
    taskIds: ["task-ai-daily", "task-content-publish", "task-kol"],
  },
  {
    id: "growth",
    name: "Growth Agent",
    description: "负责OpenClaw动态监控",
    model: "Kimi K2.5",
    taskIds: ["task-seo"],
  },
  {
    id: "product",
    name: "Product Agent",
    description: "负责竞品分析和产品规划",
    model: "Kimi K2.5",
    taskIds: ["task-product"],
  },
  {
    id: "chief",
    name: "Chief Agent",
    description: "负责每晚 Chief Agent 工作总结报告与系统巡检",
    model: "GPT-5.4",
    taskIds: ["task-chief", "task-health"],
  },
];

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const formatFullDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
};

const safeText = (value: unknown) => (typeof value === "string" ? value : "");
const matchesQuery = (query: string, ...fields: unknown[]) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return fields.some((field) => safeText(field).toLowerCase().includes(normalizedQuery));
};

const normalizeTask = (row: any): Task => ({
  id: row.id,
  name: row.name,
  schedule: row.schedule,
  status: row.status || "idle",
  lastRun: row.last_run || null,
  lastDuration: row.last_duration || null,
  nextRun: row.next_run || null,
  errorCount: row.error_count || 0,
  tokenUsage: row.token_usage || 0,
  updatedAt: row.updated_at || null,
});

const agentColorMap: Record<string, string> = {
  total: "#facc15",
  content: "#60a5fa",
  growth: "#34d399",
  product: "#f97316",
  chief: "#a78bfa",
  evo: "#f472b6",
};

type TabType = "home" | "memories" | "documents" | "tasks" | "agents" | "team" | "office";

export default function SecondBrain() {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [draftSearchQuery, setDraftSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Memory | Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{start: string; end: string}>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // 真实数据状态
  const [memories, setMemories] = useState<Memory[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tokenTrend, setTokenTrend] = useState<TokenTrendPoint[]>([]);
  const [trendRange, setTrendRange] = useState<7 | 14 | 30>(14);

  // 从Supabase获取数据
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [memRes, docRes, taskRes, trendRes] = await Promise.all([
          supabase.from("memories").select("*").order("date", { ascending: false }),
          supabase.from("documents").select("*").order("date", { ascending: false }),
          supabase.from("tasks").select("*"),
          fetch("/api/token-trend").then((res) => res.json()).catch(() => ({ trend: [] })),
        ]);

        if (memRes.data) setMemories(memRes.data as Memory[]);
        if (docRes.data) setDocuments(docRes.data as Document[]);
        if (taskRes.data) setTasks(taskRes.data.map(normalizeTask));
        if (trendRes?.trend) setTokenTrend(trendRes.trend as TokenTrendPoint[]);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 获取今天的日期
  const getToday = () => new Date().toISOString().split('T')[0];
  
  // 获取本周第一天
  const getWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    return new Date(now.setDate(diff)).toISOString().split('T')[0];
  };
  
  // 获取本月第一天
  const getMonthStart = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  };

  // 过滤数据 - 按日期范围筛选 (空范围=显示全部)
  const filteredMemories = memories.filter(
    (m) =>
      (m.type === "long-term" ||
        !dateRange.start ||
        !dateRange.end ||
        (m.date >= dateRange.start && m.date <= dateRange.end)) &&
      matchesQuery(searchQuery, m.title, m.content)
  );

  const filteredDocuments = documents.filter(
    (d) =>
      (!dateRange.start || !dateRange.end || (d.date >= dateRange.start && d.date <= dateRange.end)) &&
      matchesQuery(searchQuery, d.title, d.path, d.type)
  );

  const filteredTasks = tasks.filter((t) => matchesQuery(searchQuery, t.name, t.schedule, t.status));

  const searchedMemories = memories.filter((m) => matchesQuery(searchQuery, m.title, m.content));
  const searchedDocuments = documents.filter((d) => matchesQuery(searchQuery, d.title, d.path, d.type));
  const searchedTasks = tasks.filter((t) => matchesQuery(searchQuery, t.name, t.schedule, t.status));

  // 统计
  const stats = {
    totalMemories: memories.length,
    totalDocuments: documents.length,
    activeTasks: tasks.filter((t) => t.status === "ok" || t.status === "running").length,
    errorTasks: tasks.filter((t) => t.status === "error").length,
  };

  const agentCards = agentDefinitions.map((agent) => {
    const agentTasks = tasks.filter((task) => agent.taskIds.includes(task.id));
    const lastRunTimestamps = agentTasks
      .map((task) => (task.lastRun ? new Date(task.lastRun).getTime() : 0))
      .filter((value) => value > 0);

    const status = agentTasks.some((task) => task.status === "running")
      ? "running"
      : agentTasks.some((task) => task.status === "error")
      ? "error"
      : agentTasks.some((task) => task.status === "ok")
      ? "ok"
      : "idle";

    return {
      ...agent,
      status,
      tasks: agentTasks.length,
      completedTasks: agentTasks.filter((task) => task.status === "ok").length,
      failedTasks: agentTasks.filter((task) => task.status === "error").length,
      tokenUsage: agentTasks.reduce((sum, task) => sum + task.tokenUsage, 0),
      lastRun: lastRunTimestamps.length
        ? formatDateTime(new Date(Math.max(...lastRunTimestamps)).toISOString())
        : "—",
    };
  });

  const taskToAgent = Object.fromEntries(
    agentDefinitions.flatMap((agent) => agent.taskIds.map((taskId) => [taskId, agent.id]))
  ) as Record<string, string>;

  const trendData: TokenTrendRangePoint[] = tokenTrend.map((point) => {
    const agentBreakdown: Record<string, number> = {};
    Object.entries(point.taskBreakdown || {}).forEach(([taskId, value]) => {
      const agentId = taskToAgent[taskId] || "unknown";
      agentBreakdown[agentId] = (agentBreakdown[agentId] || 0) + value;
    });
    return { ...point, agentBreakdown };
  });

  const todayDate = new Date().toISOString().split('T')[0];
  const latestTrendDate = trendData[trendData.length - 1]?.date;
  const trendEndDate = latestTrendDate && latestTrendDate > todayDate ? latestTrendDate : todayDate;
  const displayTrend = buildContinuousTrend(trendData, trendRange, trendEndDate);
  const totalRangeTokens = displayTrend.reduce((sum, point) => sum + point.totalTokens, 0);
  const rangeTokenUsageByAgent = Object.fromEntries(
    agentDefinitions.map((agent) => [
      agent.id,
      displayTrend.reduce((sum, point) => sum + (point.agentBreakdown[agent.id] || 0), 0),
    ])
  ) as Record<string, number>;
  const tokenTrendMax = Math.max(...displayTrend.map((point) => point.totalTokens), 1);
  const lineSeries = [
    {
      key: "total",
      label: "总Token",
      color: agentColorMap.total,
      values: displayTrend.map((point) => point.totalTokens),
    },
    ...agentDefinitions.map((agent) => ({
      key: agent.id,
      label: agent.name,
      color: agentColorMap[agent.id] || "#94a3b8",
      values: displayTrend.map((point) => point.agentBreakdown[agent.id] || 0),
    })),
  ];

  const tokenDistribution = agentCards
    .map((agent) => ({
      id: agent.id,
      label: agent.name,
      value: rangeTokenUsageByAgent[agent.id] || 0,
      color: agentColorMap[agent.id] || "#94a3b8",
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const tokenDistributionMax = Math.max(...tokenDistribution.map((item) => item.value), 1);
  const latestSupabaseSyncAt = tasks.reduce<string | null>((latest, task) => {
    if (!task.updatedAt) return latest;
    if (!latest) return task.updatedAt;
    return new Date(task.updatedAt).getTime() > new Date(latest).getTime() ? task.updatedAt : latest;
  }, null);

  const handleSearchInputChange = (value: string) => {
    setDraftSearchQuery(value);
    if (!value.trim()) {
      setSearchQuery("");
    }
  };

  const commitSearch = () => {
    setSearchQuery(draftSearchQuery.trim());
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commitSearch();
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ok":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "running":
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case "idle":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "disabled":
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  // 获取记忆类型图标
  const getMemoryTypeIcon = (type: string) => {
    switch (type) {
      case "long-term":
        return <Brain className="w-4 h-4 text-purple-400" />;
      case "daily":
        return <Calendar className="w-4 h-4 text-blue-400" />;
      case "evolution":
        return <Activity className="w-4 h-4 text-green-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  // 获取文档类型图标
  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case "memory":
        return <Brain className="w-4 h-4 text-purple-400" />;
      case "report":
        return <FileText className="w-4 h-4 text-blue-400" />;
      case "newsletter":
        return <BookOpen className="w-4 h-4 text-green-400" />;
      case "plan":
        return <FileText className="w-4 h-4 text-orange-400" />;
      case "course":
        return <BookOpen className="w-4 h-4 text-yellow-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // 渲染侧边栏
  const renderSidebar = () => (
    <aside className="w-64 bg-[#141416] border-r border-[#27272a] flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-[#27272a]">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-blue-500" />
          第二大脑
        </h1>
        <p className="text-xs text-[#a1a1aa] mt-1">知识管理 · 记忆提取 · 任务追踪</p>
      </div>

      {/* 日期筛选 */}
      <div className="p-4 border-b border-[#27272a]">
        <label className="text-xs text-[#a1a1aa] block mb-2">日期范围</label>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              max={dateRange.end}
              className="flex-1 bg-[#27272a] border border-[#3f3f46] rounded-lg px-2 py-2 text-white text-xs"
            />
            <span className="text-[#71717a] self-center">-</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              min={dateRange.start}
              max={getToday()}
              className="flex-1 bg-[#27272a] border border-[#3f3f46] rounded-lg px-2 py-2 text-white text-xs"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setDateRange({start: getToday(), end: getToday()})}
              className="flex-1 bg-blue-500/20 text-blue-400 px-2 py-1.5 rounded text-xs hover:bg-blue-500/30"
            >
              今天
            </button>
            <button
              onClick={() => setDateRange({start: getWeekStart(), end: getToday()})}
              className="flex-1 bg-purple-500/20 text-purple-400 px-2 py-1.5 rounded text-xs hover:bg-purple-500/30"
            >
              本周
            </button>
            <button
              onClick={() => setDateRange({start: getMonthStart(), end: getToday()})}
              className="flex-1 bg-green-500/20 text-green-400 px-2 py-1.5 rounded text-xs hover:bg-green-500/30"
            >
              本月
            </button>
            <button
              onClick={() => setDateRange({start: "", end: ""})}
              className="flex-1 bg-[#27272a] text-[#71717a] px-2 py-1.5 rounded text-xs hover:bg-[#3f3f46]"
            >
              清除
            </button>
          </div>
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => setActiveTab("home")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === "home"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white"
              }`}
            >
              <Home className="w-5 h-5" />
              <span>仪表盘</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab("memories")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === "memories"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white"
              }`}
            >
              <Brain className="w-5 h-5" />
              <span>记忆库</span>
              <span className="ml-auto bg-[#27272a] px-2 py-0.5 rounded text-xs">
                {stats.totalMemories}
              </span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab("documents")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === "documents"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white"
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>文档库</span>
              <span className="ml-auto bg-[#27272a] px-2 py-0.5 rounded text-xs">
                {stats.totalDocuments}
              </span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === "tasks"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white"
              }`}
            >
              <CheckSquare className="w-5 h-5" />
              <span>任务中心</span>
              {stats.errorTasks > 0 && (
                <span className="ml-auto bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs">
                  {stats.errorTasks}
                </span>
              )}
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab("agents")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === "agents"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white"
              }`}
            >
              <Activity className="w-5 h-5" />
              <span>Agent中心</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab("team")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === "team"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Team</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab("office")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === "office"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18" />
                <path d="M5 21V7l8-4v18" />
                <path d="M19 21V11l-6-4" />
                <path d="M9 9v.01" />
                <path d="M9 12v.01" />
                <path d="M9 15v.01" />
                <path d="M9 18v.01" />
              </svg>
              <span>Office</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* 底部状态 */}
      <div className="p-4 border-t border-[#27272a]">
        <div className="flex items-center gap-2 text-xs text-[#a1a1aa]">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>系统正常运行</span>
        </div>
      </div>
    </aside>
  );

  // Agent 状态类型（真实来源：OpenClaw cron）
  type AgentStatus = 'running' | 'ok' | 'error' | 'idle' | 'loading' | 'external';

  interface TeamAgent {
    id: string;
    name: string;
    role: string;
    icon: string;
    status: AgentStatus;
    lastActive: string;
    currentTask: string;
    taskProgress: number;
    totalTasks: number;
    okTasks: number;
    errorTasks: number;
    runningTasks: number;
    isExternal?: boolean;
  }

  interface TeamAgentDefinition {
    id: string;
    name: string;
    role: string;
    icon: string;
    isExternal?: boolean;
  }

  interface AgentStatusApiAgent {
    id: string;
    status: 'running' | 'ok' | 'error' | 'idle';
    tasks: number;
    completedTasks: number;
    failedTasks: number;
    runningTasks: number;
    idleTasks: number;
    lastRun: string | null;
  }

  interface OfficeActivity {
    id: string;
    agentId: string;
    agentName: string;
    agentIcon: string;
    status: AgentStatus;
    message: string;
    timestamp: string;
  }

  const TEAM_AGENT_DEFINITIONS: TeamAgentDefinition[] = [
    { id: 'chief', name: 'Chief Agent', role: '主 Agent', icon: '👑' },
    { id: 'content', name: 'Content Agent', role: '内容创作', icon: '📝' },
    { id: 'growth', name: 'Growth Agent', role: '增长营销', icon: '📈' },
    { id: 'coding', name: 'Coding Agent', role: '技术开发', icon: '💻' },
    { id: 'product', name: 'Product Agent', role: '产品经理', icon: '🎯' },
    { id: 'finance', name: 'Finance Agent', role: '财务管理', icon: '💰' },
    { id: 'abby', name: '阿比', role: '个人生活助理', icon: '🤖', isExternal: true },
  ];

  function formatRelativeTime(value?: string | null) {
    if (!value) return '从未运行';

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return '时间未知';

    const diffMs = Date.now() - timestamp;
    if (diffMs < 60 * 1000) return '刚刚';

    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}小时前`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}天前`;
  }

  function buildCurrentTaskSummary(agent?: AgentStatusApiAgent) {
    if (!agent || agent.tasks === 0) return '暂无绑定 cron 任务';
    if (agent.status === 'running') return `${agent.runningTasks} 个 cron 正在运行`;
    if (agent.status === 'error') return `${agent.failedTasks} 个 cron 异常`;
    if (agent.status === 'ok') return `${agent.completedTasks}/${agent.tasks} 个 cron 正常`;
    return `${agent.idleTasks || 0} 个 cron 等待执行`;
  }

  function buildOfficeActivityMessage(agent: TeamAgent) {
    if (agent.isExternal) {
      return '外部通道在线，负责个人生活与外部协作事项';
    }

    if (agent.status === 'running') {
      return `正在执行：${agent.currentTask}`;
    }

    if (agent.status === 'error') {
      return `需要处理：${agent.currentTask}`;
    }

    if (agent.status === 'ok') {
      return `执行正常：${agent.currentTask}`;
    }

    if (agent.status === 'idle') {
      return `待命中：${agent.currentTask}`;
    }

    return agent.currentTask;
  }

  function createOfficeActivity(agent: TeamAgent): OfficeActivity {
    return {
      id: `${agent.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      agentId: agent.id,
      agentName: agent.name,
      agentIcon: agent.icon,
      status: agent.status,
      message: buildOfficeActivityMessage(agent),
      timestamp: new Date().toISOString(),
    };
  }

  function createInitialTeamAgents(): TeamAgent[] {
    return TEAM_AGENT_DEFINITIONS.map((agent) => {
      if (agent.isExternal) {
        return {
          ...agent,
          status: 'external' as AgentStatus,
          lastActive: '外部系统',
          currentTask: '不受 OpenClaw cron 管理',
          taskProgress: 0,
          totalTasks: 0,
          okTasks: 0,
          errorTasks: 0,
          runningTasks: 0,
        };
      }

      return {
        ...agent,
        status: 'loading' as AgentStatus,
        lastActive: '同步中',
        currentTask: '正在读取 OpenClaw 实时状态',
        taskProgress: 0,
        totalTasks: 0,
        okTasks: 0,
        errorTasks: 0,
        runningTasks: 0,
      };
    });
  }

  const [teamAgents, setTeamAgents] = useState<TeamAgent[]>(createInitialTeamAgents);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [selectedOfficeAgentId, setSelectedOfficeAgentId] = useState('chief');
  const [officeActivities, setOfficeActivities] = useState<OfficeActivity[]>([]);
  const officeActivitySnapshotRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;

    const refreshAgentStatus = async () => {
      try {
        const response = await fetch('/api/agent-status', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`status api failed: ${response.status}`);
        }

        const data = await response.json();
        const apiAgents = ((data.agents || []) as AgentStatusApiAgent[]);
        const agentsById = new Map<string, AgentStatusApiAgent>(apiAgents.map((agent) => [agent.id, agent]));
        
        // 获取活跃的 subagent 会话
        const activeSessions = data.activeSessions || [];
        const activeAgentIds = new Set(activeSessions.map((s: any) => s.agentId));

        if (cancelled) return;

        setTeamAgents(
          TEAM_AGENT_DEFINITIONS.map((agent) => {
            if (agent.isExternal) {
              return {
                ...agent,
                status: 'external' as AgentStatus,
                lastActive: '外部系统',
                currentTask: '不受 OpenClaw cron 管理',
                taskProgress: 0,
                totalTasks: 0,
                okTasks: 0,
                errorTasks: 0,
                runningTasks: 0,
              };
            }

            const realAgent = agentsById.get(agent.id);
            const totalTasks = realAgent?.tasks || 0;
            const okTasks = realAgent?.completedTasks || 0;
            const errorTasks = realAgent?.failedTasks || 0;
            const runningTasks = realAgent?.runningTasks || 0;
            
            // 如果有活跃的 subagent 会话，状态为 running
            const isSubAgentRunning = activeAgentIds.has(agent.id);
            const status = isSubAgentRunning ? 'running' : (realAgent?.status || 'idle');

            return {
              ...agent,
              status: status as AgentStatus,
              lastActive: formatRelativeTime(realAgent?.lastRun),
              currentTask: isSubAgentRunning 
                ? `活跃会话: ${activeSessions.find((s: any) => s.agentId === agent.id)?.key?.split(':').pop() || '工作中'}`
                : buildCurrentTaskSummary(realAgent),
              taskProgress: totalTasks > 0 ? Math.round((okTasks / totalTasks) * 100) : 0,
              totalTasks,
              okTasks,
              errorTasks,
              runningTasks: isSubAgentRunning ? runningTasks + 1 : runningTasks,
            };
          })
        );
      } catch (error) {
        console.error('Failed to refresh agent status:', error);
        if (cancelled) return;

        setTeamAgents(
          TEAM_AGENT_DEFINITIONS.map((agent) => {
            if (agent.isExternal) {
              return {
                ...agent,
                status: 'external' as AgentStatus,
                lastActive: '外部系统',
                currentTask: '不受 OpenClaw cron 管理',
                taskProgress: 0,
                totalTasks: 0,
                okTasks: 0,
                errorTasks: 0,
                runningTasks: 0,
              };
            }

            return {
              ...agent,
              status: 'loading' as AgentStatus,
              lastActive: '状态获取失败',
              currentTask: '无法连接 /api/agent-status',
              taskProgress: 0,
              totalTasks: 0,
              okTasks: 0,
              errorTasks: 0,
              runningTasks: 0,
            };
          })
        );
      } finally {
        if (!cancelled) {
          setIsLoadingAgents(false);
        }
      }
    };

    refreshAgentStatus();
    const intervalId = window.setInterval(refreshAgentStatus, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (isLoadingAgents || teamAgents.length === 0) {
      return;
    }

    const nextSnapshot = new Map<string, string>();
    const changedActivities: OfficeActivity[] = [];

    teamAgents.forEach((agent) => {
      const signature = [
        agent.status,
        agent.currentTask,
        agent.runningTasks,
        agent.errorTasks,
        agent.okTasks,
        agent.totalTasks,
      ].join('|');

      nextSnapshot.set(agent.id, signature);

      const previousSignature = officeActivitySnapshotRef.current.get(agent.id);
      if (previousSignature && previousSignature !== signature) {
        changedActivities.push(createOfficeActivity(agent));
      }
    });

    officeActivitySnapshotRef.current = nextSnapshot;

    setOfficeActivities((previous) => {
      if (previous.length === 0) {
        return [...teamAgents]
          .sort((a, b) => {
            const priority = { running: 0, error: 1, ok: 2, idle: 3, loading: 4, external: 5 } as const;
            return priority[a.status] - priority[b.status];
          })
          .map((agent) => createOfficeActivity(agent))
          .slice(0, 12);
      }

      if (changedActivities.length === 0) {
        return previous;
      }

      return [...changedActivities.reverse(), ...previous].slice(0, 18);
    });
  }, [teamAgents, isLoadingAgents]);

  // 状态映射
  const statusMap: Record<AgentStatus, { label: string; color: string; bgColor: string; icon: string }> = {
    running: { label: 'working', color: 'text-green-300', bgColor: 'bg-green-500', icon: '🟢' },
    ok: { label: 'ready', color: 'text-emerald-300', bgColor: 'bg-emerald-500', icon: '🟢' },
    error: { label: 'error', color: 'text-red-400', bgColor: 'bg-red-500', icon: '🔴' },
    idle: { label: 'idle', color: 'text-yellow-300', bgColor: 'bg-yellow-500', icon: '🟡' },
    loading: { label: '同步中', color: 'text-purple-400', bgColor: 'bg-purple-500', icon: '🟣' },
    external: { label: 'external', color: 'text-slate-400', bgColor: 'bg-slate-500', icon: '⚪️' },
  };

  // 获取状态样式
  const getStatusStyle = (status: AgentStatus) => statusMap[status] || statusMap.loading;

  // 渲染 Agent 卡片
  const renderAgentCard = (agent: TeamAgent, size: 'large' | 'medium' | 'small' = 'medium') => {
    const statusStyle = getStatusStyle(agent.status);
    const cardWidth = size === 'large' ? 'w-72' : size === 'medium' ? 'w-56' : 'w-48';

    return (
      <div
        key={agent.id}
        className={`${cardWidth} bg-[#141416] rounded-xl border-2 ${
          agent.isExternal ? 'border-dashed border-[#3f3f46]' : 'border-[#27272a]'
        } hover:border-purple-500/50 transition-all cursor-pointer group relative`}
      >
        {/* 状态徽章 */}
        <div className={`absolute -top-2 -right-2 ${statusStyle.bgColor} rounded-full px-2 py-0.5 text-xs flex items-center gap-1`}>
          <span>{statusStyle.icon}</span>
          <span className="text-white text-xs">{statusStyle.label}</span>
        </div>

        <div className="p-4">
          {/* Agent 图标和名称 */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{agent.icon}</span>
            <div>
              <h3 className="font-semibold text-white">{agent.name}</h3>
              <p className="text-xs text-[#71717a]">{agent.role}</p>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-[#27272a] my-3"></div>

          {/* 状态信息 */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#71717a]">状态</span>
              <span className={statusStyle.color}>{statusStyle.icon} {statusStyle.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#71717a]">最后活跃</span>
              <span className="text-[#a1a1aa]">{agent.lastActive}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#71717a] shrink-0">状态摘要</span>
              <span className="text-[#a1a1aa] truncate max-w-[120px] text-right">{agent.currentTask}</span>
            </div>
          </div>

          {/* 悬停显示任务详情 */}
          <div className="absolute left-full top-0 ml-2 w-64 bg-[#1a1a1c] rounded-xl border border-[#27272a] p-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
              {agent.isExternal ? '📋 外部 Agent' : '📋 OpenClaw 实时状态'}
            </h4>
            <div className="border-t border-[#27272a] my-2"></div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-[#71717a]">状态摘要</p>
                <p className="text-sm text-white">{agent.currentTask}</p>
              </div>

              {!agent.isExternal && agent.totalTasks > 0 && (
                <div>
                  <p className="text-xs text-[#71717a] mb-1">正常率</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[#27272a] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                        style={{ width: `${agent.taskProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-[#a1a1aa]">{agent.taskProgress}%</span>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-[#71717a]">运行中 cron</p>
                <p className="text-sm text-white">{agent.isExternal ? '不适用' : `${agent.runningTasks} 个`}</p>
              </div>

              <div className="border-t border-[#27272a] my-2"></div>

              <div>
                <p className="text-xs text-[#71717a] mb-1">📊 当前统计</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#27272a] rounded py-1">
                    <p className="text-lg font-bold text-white">{agent.totalTasks}</p>
                    <p className="text-[10px] text-[#71717a]">绑定 cron</p>
                  </div>
                  <div className="bg-[#27272a] rounded py-1">
                    <p className="text-lg font-bold text-white">{agent.okTasks}</p>
                    <p className="text-[10px] text-[#71717a]">正常</p>
                  </div>
                  <div className="bg-[#27272a] rounded py-1">
                    <p className="text-lg font-bold text-white">{agent.errorTasks}</p>
                    <p className="text-[10px] text-[#71717a]">异常</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 指向箭头 */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#1a1a1c] border-l-0 border-b-0 border-[#27272a] rotate-45"></div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染 Team 页面
  const renderTeam = () => {
    return (
    <div className="p-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <svg className="w-7 h-7 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Team 架构
        </h2>
        <div className="flex items-center gap-2 text-sm text-[#71717a]">
          <span className={`w-2 h-2 rounded-full ${isLoadingAgents ? 'bg-purple-500' : 'bg-green-500'} ${isLoadingAgents ? '' : 'animate-pulse'}`}></span>
          <span>{isLoadingAgents ? '正在同步实时状态' : '10秒轮询更新'}</span>
        </div>
      </div>

      {/* 架构图 */}
      <div className="flex flex-col items-center gap-8">
        {/* Chief Agent */}
        <div className="flex flex-col items-center">
          {renderAgentCard(teamAgents.find(a => a.id === 'chief')!, 'large')}
        </div>

        {/* 连接线 */}
        <div className="flex items-center justify-center w-full max-w-4xl">
          <div className="h-8 w-px bg-gradient-to-b from-purple-500 to-transparent"></div>
        </div>

        {/* 第一层 Sub Agents */}
        <div className="flex flex-wrap justify-center gap-6 w-full max-w-4xl">
          {renderAgentCard(teamAgents.find(a => a.id === 'content')!, 'medium')}
          {renderAgentCard(teamAgents.find(a => a.id === 'growth')!, 'medium')}
          {renderAgentCard(teamAgents.find(a => a.id === 'coding')!, 'medium')}
        </div>

        {/* 连接线 */}
        <div className="flex items-center justify-center w-full max-w-4xl">
          <div className="h-8 w-px bg-gradient-to-b from-blue-500 to-transparent"></div>
        </div>

        {/* 第二层 Sub Agents */}
        <div className="flex flex-wrap justify-center gap-6 w-full max-w-4xl">
          {renderAgentCard(teamAgents.find(a => a.id === 'product')!, 'medium')}
          {renderAgentCard(teamAgents.find(a => a.id === 'finance')!, 'medium')}
        </div>

        {/* 外部 Agent - 并行显示 */}
        <div className="mt-8">
          <p className="text-center text-xs text-[#71717a] mb-2">并行关系（外部 Agent）</p>
          {renderAgentCard(teamAgents.find(a => a.id === 'abby')!, 'small')}
        </div>
      </div>

      {/* 外部 Agent 提示 */}
      <div className="mt-8 p-4 bg-[#141416] rounded-xl border border-[#27272a]">
        <div className="flex items-center gap-2 text-yellow-400">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="font-semibold">注意</span>
        </div>
        <p className="text-sm text-[#a1a1aa] mt-2">
          阿比（外部 Agent）不受 OpenClaw cron 管理，因此这里只显示 external 标记，不参与真实 cron 状态聚合。
        </p>
      </div>

      {/* 图例 */}
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {Object.entries(statusMap).map(([status, style]) => (
          <div key={status} className="flex items-center gap-2 text-sm">
            <span className={`w-3 h-3 rounded-full ${style.bgColor}`}></span>
            <span className="text-[#a1a1aa]">{style.icon} {style.label}</span>
          </div>
        ))}
      </div>
    </div>
    );
  };

  // 渲染 Office 页面
  const renderOffice = () => {
    const workspaceAgentIds = ['chief', 'content', 'growth', 'coding', 'product', 'finance'] as const;

    const officeAgentThemes: Record<
      string,
      {
        surface: string;
        border: string;
        text: string;
        hair: string;
        body: string;
      }
    > = {
      chief: {
        surface: 'bg-violet-500/10',
        border: 'border-violet-400/30',
        text: 'text-violet-200',
        hair: 'bg-violet-950',
        body: 'bg-violet-500/85',
      },
      content: {
        surface: 'bg-sky-500/10',
        border: 'border-sky-400/30',
        text: 'text-sky-200',
        hair: 'bg-sky-950',
        body: 'bg-sky-500/85',
      },
      growth: {
        surface: 'bg-emerald-500/10',
        border: 'border-emerald-400/30',
        text: 'text-emerald-200',
        hair: 'bg-emerald-950',
        body: 'bg-emerald-500/85',
      },
      coding: {
        surface: 'bg-cyan-500/10',
        border: 'border-cyan-400/30',
        text: 'text-cyan-200',
        hair: 'bg-cyan-950',
        body: 'bg-cyan-500/85',
      },
      product: {
        surface: 'bg-amber-500/10',
        border: 'border-amber-400/30',
        text: 'text-amber-200',
        hair: 'bg-amber-950',
        body: 'bg-amber-500/85',
      },
      finance: {
        surface: 'bg-lime-500/10',
        border: 'border-lime-400/30',
        text: 'text-lime-200',
        hair: 'bg-lime-950',
        body: 'bg-lime-500/85',
      },
      abby: {
        surface: 'bg-rose-500/10',
        border: 'border-rose-400/30',
        text: 'text-rose-200',
        hair: 'bg-rose-950',
        body: 'bg-rose-500/85',
      },
    };

    type OfficePose = 'seated' | 'standing' | 'walking' | 'reception';

    interface OfficePlacement {
      zone: string;
      left: string;
      top: string;
      pose: OfficePose;
      onDesk?: boolean;
    }

    interface DeskSlot {
      ownerId: (typeof workspaceAgentIds)[number];
      label: string;
      left: string;
      top: string;
    }

    const deskSlots: DeskSlot[] = [
      { ownerId: 'chief', label: 'Desk 1', left: '60%', top: '39%' },
      { ownerId: 'content', label: 'Desk 2', left: '72%', top: '39%' },
      { ownerId: 'growth', label: 'Desk 3', left: '84%', top: '39%' },
      { ownerId: 'coding', label: 'Desk 4', left: '60%', top: '59%' },
      { ownerId: 'product', label: 'Desk 5', left: '72%', top: '59%' },
      { ownerId: 'finance', label: 'Desk 6', left: '84%', top: '59%' },
    ];

    const awaySpots: OfficePlacement[] = [
      { zone: 'Break Area · Sofa', left: '16%', top: '51%', pose: 'standing' },
      { zone: 'Break Area · Coffee Bar', left: '27%', top: '55%', pose: 'standing' },
      { zone: 'Central Aisle · Walking', left: '45%', top: '45%', pose: 'walking' },
      { zone: 'Central Aisle · Walking', left: '49%', top: '61%', pose: 'walking' },
      { zone: 'Meeting Hall · Walking', left: '55%', top: '24%', pose: 'walking' },
      { zone: 'Reception Lounge', left: '31%', top: '79%', pose: 'standing' },
    ];

    const findOfficeAgent = (agentId: string) => teamAgents.find((agent) => agent.id === agentId);

    const getOfficeIndicatorClasses = (status: AgentStatus) => {
      switch (status) {
        case 'running':
          return 'bg-green-400 shadow-[0_0_16px_rgba(74,222,128,0.75)]';
        case 'ok':
          return 'bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.55)]';
        case 'error':
          return 'bg-red-400 shadow-[0_0_14px_rgba(248,113,113,0.65)]';
        case 'idle':
          return 'bg-yellow-300 shadow-[0_0_12px_rgba(253,224,71,0.55)]';
        case 'external':
          return 'bg-slate-300 shadow-[0_0_12px_rgba(203,213,225,0.35)]';
        default:
          return 'bg-purple-400 shadow-[0_0_12px_rgba(192,132,252,0.45)]';
      }
    };

    const shouldBeAtDesk = (agent?: TeamAgent) => {
      if (!agent || agent.isExternal) return false;
      return agent.status === 'running' || agent.status === 'error' || agent.status === 'loading';
    };

    const officePlacementMap = new Map<string, OfficePlacement>();

    deskSlots.forEach((slot) => {
      const agent = findOfficeAgent(slot.ownerId);
      if (shouldBeAtDesk(agent)) {
        officePlacementMap.set(slot.ownerId, {
          zone: `Open Workspace · ${slot.label}`,
          left: slot.left,
          top: slot.top,
          pose: 'seated',
          onDesk: true,
        });
      }
    });

    let awayIndex = 0;
    teamAgents.forEach((agent) => {
      if (officePlacementMap.has(agent.id)) return;

      if (agent.id === 'abby') {
        officePlacementMap.set(agent.id, {
          zone: 'Reception · Front Desk',
          left: '24%',
          top: '79%',
          pose: 'reception',
        });
        return;
      }

      const fallbackSpot = awaySpots[Math.min(awayIndex, awaySpots.length - 1)] || awaySpots[awaySpots.length - 1];
      awayIndex += 1;
      officePlacementMap.set(agent.id, fallbackSpot);
    });

    const renderAreaLabel = (title: string, subtitle: string, className: string) => (
      <div className={`absolute rounded-full border border-white/10 bg-[#0f1014]/85 px-3 py-1.5 backdrop-blur-sm ${className}`}>
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#cbd5e1]">{title}</p>
        <p className="text-[11px] text-[#71717a] mt-0.5">{subtitle}</p>
      </div>
    );

    const renderOfficeAvatar = (
      agent: TeamAgent | undefined,
      options?: { pose?: OfficePose; size?: 'sm' | 'md'; compactLabel?: boolean }
    ) => {
      const resolvedAgent = agent ?? findOfficeAgent('chief');
      const theme = officeAgentThemes[resolvedAgent?.id || 'chief'] || officeAgentThemes.chief;
      const status = resolvedAgent?.status || 'loading';
      const size = options?.size || 'sm';
      const pose = options?.pose || 'standing';
      const compactLabel = options?.compactLabel ?? false;

      const frameClass = size === 'md' ? 'h-20 w-14' : 'h-14 w-11';
      const headClass = size === 'md' ? 'h-7 w-7' : 'h-5.5 w-5.5';
      const bodyClass = size === 'md' ? 'h-9 w-8.5' : 'h-6.5 w-6';
      const legHeight = pose === 'seated' ? (size === 'md' ? 'h-3' : 'h-2') : size === 'md' ? 'h-5' : 'h-3.5';
      const labelClass = compactLabel ? 'text-[9px]' : size === 'md' ? 'text-[10px]' : 'text-[9px]';
      const walkingTilt = pose === 'walking' ? '-rotate-6' : pose === 'reception' ? 'rotate-0' : 'rotate-0';

      return (
        <div className={`relative ${frameClass}`}>
          <div className="absolute inset-x-2 bottom-1 h-2.5 rounded-full bg-black/30 blur-sm" />
          <div className={`absolute left-1/2 top-1.5 -translate-x-1/2 rounded-full border border-white/35 bg-[radial-gradient(circle_at_35%_35%,#fff7ed_0%,#fde68a_58%,#f59e0b_100%)] ${headClass}`} />
          <div className={`absolute left-1/2 top-1.5 -translate-x-1/2 rounded-t-full border border-white/10 ${theme.hair} ${size === 'md' ? 'h-3.5 w-7' : 'h-2.5 w-5.5'}`} />

          {pose === 'seated' && (
            <>
              <div className="absolute left-1/2 bottom-5 h-2.5 w-7 -translate-x-1/2 rounded-full border border-white/10 bg-white/12" />
              <div className="absolute left-1/2 bottom-7 h-5 w-1 -translate-x-1/2 rounded-full bg-white/10" />
            </>
          )}

          <div className={`absolute left-1/2 top-[32%] -translate-x-1/2 rounded-[14px_14px_11px_11px] border border-white/15 ${theme.body} ${bodyClass} ${walkingTilt}`} />
          <div className={`absolute left-[18%] top-[37%] rounded-full border border-white/10 bg-white/12 ${size === 'md' ? 'h-3.5 w-1.5' : 'h-2.5 w-1'}`} />
          <div className={`absolute right-[18%] top-[37%] rounded-full border border-white/10 bg-white/12 ${size === 'md' ? 'h-3.5 w-1.5' : 'h-2.5 w-1'}`} />
          <div className={`absolute left-[37%] bottom-[22%] rounded-full bg-slate-900/80 ${legHeight} ${size === 'md' ? 'w-1.5' : 'w-1'}`} />
          <div className={`absolute right-[37%] bottom-[22%] rounded-full bg-slate-900/80 ${legHeight} ${size === 'md' ? 'w-1.5' : 'w-1'}`} />
          <div className={`absolute right-0 top-0 h-3 w-3 rounded-full border border-white/30 ${getOfficeIndicatorClasses(status)}`} />
          <div className="absolute left-1/2 top-[46%] -translate-x-1/2 text-[10px]">{resolvedAgent?.icon || '🤖'}</div>
          <div className={`absolute inset-x-0 bottom-0 rounded-full bg-black/45 px-1 py-0.5 text-center font-medium text-white/90 ${labelClass}`}>
            {resolvedAgent?.name?.split(' ')[0] || 'Agent'}
          </div>
        </div>
      );
    };

    const renderMeetingTable = (variant: 'small' | 'large') => {
      const seats = variant === 'large'
        ? [
            { left: '16%', top: '50%' },
            { left: '30%', top: '22%' },
            { left: '50%', top: '14%' },
            { left: '70%', top: '22%' },
            { left: '84%', top: '50%' },
            { left: '50%', top: '86%' },
          ]
        : [
            { left: '18%', top: '50%' },
            { left: '50%', top: '16%' },
            { left: '82%', top: '50%' },
            { left: '50%', top: '84%' },
          ];

      return (
        <div className={`absolute ${variant === 'large' ? 'h-[20%] w-[24%] right-[9%] top-[9%]' : 'h-[17%] w-[17%] left-[42%] top-[11%]'}`}>
          <div className="relative h-full w-full">
            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[999px] border border-white/15 bg-white/[0.06] shadow-[inset_0_-10px_0_rgba(0,0,0,0.16)] ${variant === 'large' ? 'h-[56%] w-[72%]' : 'h-[52%] w-[70%]'}`} />
            {seats.map((seat, index) => (
              <div
                key={`${variant}-seat-${index}`}
                className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12 bg-white/[0.08]"
                style={{ left: seat.left, top: seat.top }}
              />
            ))}
          </div>
        </div>
      );
    };

    const renderDesk = (slot: DeskSlot, index: number) => {
      const owner = findOfficeAgent(slot.ownerId);
      const theme = officeAgentThemes[slot.ownerId] || officeAgentThemes.chief;
      const placement = officePlacementMap.get(slot.ownerId);
      const occupied = !!placement?.onDesk;
      const isSelected = selectedOfficeAgentId === slot.ownerId;
      const awayLabel = owner?.status === 'idle' ? '散步中' : owner?.status === 'ok' ? '休息中' : '暂离';

      return (
        <button
          key={slot.ownerId}
          type="button"
          onClick={() => setSelectedOfficeAgentId(slot.ownerId)}
          className={`absolute h-[13%] w-[11%] -translate-x-1/2 -translate-y-1/2 rounded-[24px] transition-all ${
            isSelected ? 'ring-2 ring-white/20' : ''
          }`}
          style={{ left: slot.left, top: slot.top }}
        >
          <div className={`relative h-full w-full rounded-[24px] border ${theme.border} bg-black/10`}>
            <div className="absolute inset-x-[12%] top-[10%] h-[44%] rounded-[16px] border border-white/15 bg-white/[0.08] shadow-[inset_0_-8px_0_rgba(0,0,0,0.18)]">
              <div className="absolute left-1/2 top-[18%] h-[26%] w-[34%] -translate-x-1/2 rounded-md bg-slate-900/75" />
              <div className="absolute left-1/2 top-[52%] h-[8%] w-[24%] -translate-x-1/2 rounded-full bg-white/25" />
              <div className="absolute left-[18%] bottom-0 h-[24%] w-[4%] rounded-full bg-white/18" />
              <div className="absolute right-[18%] bottom-0 h-[24%] w-[4%] rounded-full bg-white/18" />
            </div>
            <div className="absolute left-1/2 bottom-[8%] h-[18%] w-[30%] -translate-x-1/2 rounded-full border border-white/12 bg-white/[0.07]" />
            <div className="absolute left-[8%] top-[8%] rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-[#d4d4d8]">
              {slot.label}
            </div>
            <div className="absolute right-[8%] top-[8%] h-2.5 w-2.5 rounded-full border border-white/30">
              <div className={`h-full w-full rounded-full ${getOfficeIndicatorClasses(owner?.status || 'loading')}`} />
            </div>
            <div className="absolute inset-x-0 bottom-0 rounded-b-[22px] bg-black/30 px-2 py-1 text-center text-[9px] text-white/85">
              {owner?.name?.replace(' Agent', '') || 'Agent'}
            </div>
            {occupied ? (
              <div className="absolute left-1/2 top-[47%] -translate-x-1/2">
                {renderOfficeAvatar(owner, { pose: 'seated', compactLabel: true })}
              </div>
            ) : (
              <div className={`absolute left-1/2 top-[53%] -translate-x-1/2 rounded-full border px-2 py-1 text-[9px] ${theme.border} ${theme.surface} ${theme.text}`}>
                {awayLabel}
              </div>
            )}
          </div>
        </button>
      );
    };

    const selectedOfficeAgent = teamAgents.find((agent) => agent.id === selectedOfficeAgentId) ?? teamAgents[0];
    const selectedPlacement = officePlacementMap.get(selectedOfficeAgent?.id || 'chief');
    const selectedOfficeStatusStyle = selectedOfficeAgent ? getStatusStyle(selectedOfficeAgent.status) : statusMap.loading;
    const selectedTheme = officeAgentThemes[selectedOfficeAgent?.id || 'chief'] || officeAgentThemes.chief;
    const runningCount = teamAgents.filter((agent) => !agent.isExternal && agent.status === 'running').length;
    const errorCount = teamAgents.filter((agent) => !agent.isExternal && agent.status === 'error').length;
    const idleCount = teamAgents.filter((agent) => !agent.isExternal && agent.status === 'idle').length;
    const seatedCount = workspaceAgentIds.filter((agentId) => officePlacementMap.get(agentId)?.onDesk).length;
    const awayCount = teamAgents.filter((agent) => !officePlacementMap.get(agent.id)?.onDesk).length;

    const presenceCards = teamAgents.map((agent) => ({
      agent,
      placement: officePlacementMap.get(agent.id),
    }));

    return (
      <div className="p-6 lg:p-8 pb-12 animate-fadeIn">
        <div className="flex flex-col gap-4 mb-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <svg className="w-7 h-7 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18" />
                <path d="M5 21V7l8-4v18" />
                <path d="M19 21V11l-6-4" />
                <path d="M9 9v.01" />
                <path d="M9 12v.01" />
                <path d="M9 15v.01" />
                <path d="M9 18v.01" />
              </svg>
              Second Brain Office
            </h2>
            <p className="text-sm text-[#71717a] mt-2 max-w-3xl leading-6">
              改成同一平面里的办公室鸟瞰图：人物和桌面都缩小，开放工位与休息区之间留出中央过道；工作中的 Agent 坐在工位，空闲中的 Agent 会去休息区或走动。
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <div className="px-3 py-2 rounded-xl border border-[#27272a] bg-[#141416] text-[#a1a1aa]">无横向滚动</div>
            <div className="px-3 py-2 rounded-xl border border-[#27272a] bg-[#141416] text-[#a1a1aa]">中央过道留白</div>
            <div className="px-3 py-2 rounded-xl border border-green-500/20 bg-green-500/10 text-green-200">{runningCount} 个 Agent 正在工位</div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <div className="space-y-5 min-w-0">
            <div className="rounded-3xl border border-[#27272a] bg-[#101012] p-4 sm:p-5 shadow-[0_24px_60px_rgba(0,0,0,0.32)]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-white">Flat Office Overview</h3>
                  <p className="text-xs text-[#71717a] mt-1 leading-5">
                    直接在一个平面上摆放会议桌、工位、沙发和前台，不再按区域做大框分块。点击工位或人物可查看右侧详情。
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#71717a]">
                  <span className={`w-2 h-2 rounded-full ${isLoadingAgents ? 'bg-purple-500' : 'bg-green-500'} ${isLoadingAgents ? '' : 'animate-pulse'}`}></span>
                  <span>{isLoadingAgents ? '同步中' : '10 秒轮询更新'}</span>
                </div>
              </div>

              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[28px] border border-[#1f1f22] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.07),transparent_26%),linear-gradient(180deg,#0b0b0d_0%,#111216_100%)]">
                <div className="absolute inset-[2.8%] rounded-[26px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]" />
                <div className="absolute left-[39%] top-[18%] h-[58%] w-[15%] rounded-[44px] border border-dashed border-white/8 bg-white/[0.015]" />
                <div className="absolute left-[44%] top-[28%] h-[38%] w-[5%] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]" />

                {renderAreaLabel('PRINT / STORAGE', '打印与储物', 'left-[5%] top-[5%]')}
                {renderAreaLabel('MEETING B', '小会议桌', 'left-[41%] top-[4.5%]')}
                {renderAreaLabel('MEETING A', '评审 / 讨论', 'right-[10%] top-[4.5%]')}
                {renderAreaLabel('BREAK AREA', '休息 / 咖啡', 'left-[7%] top-[33%]')}
                {renderAreaLabel('CENTRAL AISLE', '过道留白', 'left-[40.5%] bottom-[12%]')}
                {renderAreaLabel('OPEN WORKSPACE', '工作中的 Agent 在此', 'left-[58%] top-[27%]')}
                {renderAreaLabel('RECEPTION', 'Abby 前台', 'left-[12%] bottom-[8%]')}
                {renderAreaLabel('WC', '洗手间', 'right-[5%] bottom-[16%]')}
                {renderAreaLabel('ENTRANCE', '访客入口', 'left-[4%] bottom-[17%]')}

                <div className="absolute left-[6%] top-[13%] h-[12%] w-[10%] rounded-[18px] border border-white/12 bg-white/[0.06] shadow-[inset_0_-8px_0_rgba(0,0,0,0.16)]">
                  <div className="absolute left-[16%] top-[18%] h-[22%] w-[48%] rounded-md bg-slate-900/75" />
                  <div className="absolute left-[16%] top-[48%] h-[24%] w-[40%] rounded-[10px] border border-white/12 bg-white/[0.08]" />
                  <div className="absolute right-[16%] top-[22%] h-[46%] w-[12%] rounded-full bg-white/12" />
                </div>
                <div className="absolute left-[17%] top-[12%] h-[14%] w-[7%] rounded-[18px] border border-white/10 bg-white/[0.04] p-2">
                  <div className="h-[20%] rounded-full bg-white/10" />
                  <div className="mt-2 h-[20%] rounded-full bg-amber-400/12" />
                  <div className="mt-2 h-[20%] rounded-full bg-sky-400/12" />
                </div>
                <div className="absolute left-[11%] top-[27%] flex gap-2">
                  <div className="h-6 w-6 rounded-[10px] border border-white/10 bg-amber-500/10" />
                  <div className="h-7 w-7 rounded-[11px] border border-white/10 bg-emerald-500/10" />
                  <div className="h-5 w-5 rounded-[9px] border border-white/10 bg-violet-500/10" />
                </div>

                {renderMeetingTable('small')}
                {renderMeetingTable('large')}

                <div className="absolute left-[9%] top-[46%] h-[11%] w-[16%] rounded-[24px] border border-white/14 bg-white/[0.07] shadow-[inset_0_-8px_0_rgba(0,0,0,0.16)]">
                  <div className="absolute inset-x-[8%] top-[14%] h-[24%] rounded-[14px] bg-white/10" />
                  <div className="absolute left-0 top-[28%] h-[38%] w-[10%] rounded-l-[12px] bg-white/16" />
                  <div className="absolute right-0 top-[28%] h-[38%] w-[10%] rounded-r-[12px] bg-white/16" />
                </div>
                <div className="absolute left-[23%] top-[49%] h-[8%] w-[9%] rounded-[999px] border border-white/12 bg-amber-200/10" />
                <div className="absolute left-[12%] top-[62%] h-[7%] w-[9%] rounded-[18px] border border-white/12 bg-white/[0.05]">
                  <div className="absolute left-[18%] top-[18%] h-[18%] w-[44%] rounded-full bg-white/10" />
                  <div className="absolute left-[18%] top-[48%] h-[16%] w-[30%] rounded-full bg-white/10" />
                </div>
                <div className="absolute left-[28%] top-[41%] text-2xl">🪴</div>
                <div className="absolute left-[29%] top-[65%] text-xl">☕</div>

                <div className="absolute left-[8%] bottom-[10%] h-[10%] w-[20%] rounded-[999px] border border-white/12 bg-white/[0.06] shadow-[inset_0_-10px_0_rgba(0,0,0,0.18)]">
                  <div className="absolute left-[10%] top-[18%] h-[16%] w-[28%] rounded-full bg-white/10" />
                  <div className="absolute left-[10%] top-[46%] h-[10%] w-[20%] rounded-full bg-white/10" />
                  <div className="absolute right-[12%] bottom-[18%] h-[24%] w-[14%] rounded-[10px] border border-white/12 bg-white/[0.08]" />
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOfficeAgentId('abby')}
                  className={`absolute left-[24%] top-[79%] -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-[1.02] ${selectedOfficeAgentId === 'abby' ? 'ring-2 ring-white/20 rounded-full' : ''}`}
                >
                  {renderOfficeAvatar(findOfficeAgent('abby'), { pose: 'reception', size: 'md' })}
                </button>
                <div className="absolute left-[33%] top-[80%] h-6 w-6 rounded-full border border-white/10 bg-white/[0.06]" />
                <div className="absolute left-[6%] bottom-[12%] h-[10%] w-[5%] rounded-[14px] border border-white/12 bg-white/[0.05]" />
                <div className="absolute left-[12%] bottom-[12%] flex items-center gap-2 text-amber-200 text-sm">
                  <span className="text-lg">➡️</span>
                  <span>to reception</span>
                </div>

                <div className="absolute right-[5%] bottom-[17%] h-[20%] w-[7.5%] rounded-[22px] border border-white/12 bg-white/[0.04]">
                  <div className="absolute left-1/2 top-[14%] h-[22%] w-[48%] -translate-x-1/2 rounded-[14px] border border-white/12 bg-white/[0.08]">
                    <div className="absolute left-1/2 top-[18%] h-[28%] w-[56%] -translate-x-1/2 rounded-full border border-white/10 bg-[#0b0b0d]" />
                  </div>
                  <div className="absolute left-1/2 bottom-[12%] h-[20%] w-[64%] -translate-x-1/2 rounded-[16px] border border-white/12 bg-white/[0.06]" />
                </div>

                {deskSlots.map((slot, index) => renderDesk(slot, index))}

                {presenceCards
                  .filter(({ placement }) => placement && !placement.onDesk)
                  .map(({ agent, placement }) => (
                    <button
                      key={`${agent.id}-presence`}
                      type="button"
                      onClick={() => setSelectedOfficeAgentId(agent.id)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-[1.03] ${
                        selectedOfficeAgentId === agent.id ? 'ring-2 ring-white/20 rounded-full' : ''
                      }`}
                      style={{ left: placement?.left, top: placement?.top }}
                    >
                      {renderOfficeAvatar(agent, { pose: placement?.pose || 'standing', size: agent.id === 'abby' ? 'md' : 'sm' })}
                    </button>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[#27272a] bg-[#141416] p-4">
                <p className="text-xs text-[#71717a] mb-2">工位占用</p>
                <p className="text-2xl font-semibold text-white">{seatedCount}/6</p>
                <p className="text-xs text-[#a1a1aa] mt-2">只有工作中 / 错误处理中的 Agent 会在桌前。</p>
              </div>
              <div className="rounded-2xl border border-[#27272a] bg-[#141416] p-4">
                <p className="text-xs text-[#71717a] mb-2">休息 / 走动</p>
                <p className="text-2xl font-semibold text-white">{awayCount}</p>
                <p className="text-xs text-[#a1a1aa] mt-2">空闲 Agent 会被分配到休息区、前台或中央过道。</p>
              </div>
              <div className="rounded-2xl border border-[#27272a] bg-[#141416] p-4">
                <p className="text-xs text-[#71717a] mb-2">中央过道</p>
                <p className="text-sm text-[#d4d4d8] leading-6">办公区和休息区之间故意留白，保证空间感，不再挤成一整坨。</p>
              </div>
              <div className="rounded-2xl border border-[#27272a] bg-[#141416] p-4">
                <p className="text-xs text-[#71717a] mb-2">图例</p>
                <div className="space-y-2 text-xs text-[#d4d4d8]">
                  <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-green-400"></span><span>绿色 = 工作中</span></div>
                  <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-yellow-300"></span><span>黄色 = 空闲 / 散步</span></div>
                  <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-400"></span><span>红色 = 处理异常</span></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {presenceCards.map(({ agent, placement }) => {
                const theme = officeAgentThemes[agent.id] || officeAgentThemes.chief;
                const statusStyle = getStatusStyle(agent.status);
                const isSelected = selectedOfficeAgentId === agent.id;
                return (
                  <button
                    key={`presence-card-${agent.id}`}
                    type="button"
                    onClick={() => setSelectedOfficeAgentId(agent.id)}
                    className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                      isSelected ? `${theme.surface} ${theme.border} ring-2 ring-white/15` : 'border-[#27272a] bg-[#141416] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{agent.icon}</span>
                          <p className="text-sm font-medium text-white truncate">{agent.name}</p>
                        </div>
                        <p className="text-[11px] text-[#71717a] mt-2 truncate">{placement?.zone || agent.role}</p>
                      </div>
                      <span className={`text-[11px] shrink-0 ${statusStyle.color}`}>{statusStyle.icon} {statusStyle.label}</span>
                    </div>
                    <p className="text-[11px] text-[#a1a1aa] mt-3 truncate">{agent.currentTask}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="xl:sticky xl:top-6 space-y-6">
            <div className={`rounded-3xl border overflow-hidden ${selectedTheme.border} bg-[#141416] shadow-[0_24px_60px_rgba(0,0,0,0.32)]`}>
              <div className="p-5 border-b border-[#27272a]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#71717a]">Selected Agent</p>
                    <h3 className="text-lg font-semibold text-white mt-2">{selectedOfficeAgent?.name || 'Agent'}</h3>
                    <p className="text-xs text-[#a1a1aa] mt-1">{selectedPlacement?.zone || 'Office floor'}</p>
                  </div>
                  <div className="shrink-0">
                    {renderOfficeAvatar(selectedOfficeAgent, {
                      pose: selectedPlacement?.pose || 'standing',
                      size: 'md',
                    })}
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#71717a] text-sm">实时状态</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${selectedOfficeStatusStyle.color} bg-black/20`}>
                    <span>{selectedOfficeStatusStyle.icon}</span>
                    <span>{selectedOfficeStatusStyle.label}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#71717a]">角色</span>
                  <span className="text-[#e4e4e7]">{selectedOfficeAgent?.role || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#71717a]">最后活跃</span>
                  <span className="text-[#e4e4e7]">{selectedOfficeAgent?.lastActive || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#71717a]">办公室位置</span>
                  <span className="text-[#e4e4e7] text-right max-w-[60%]">{selectedPlacement?.zone || 'Office floor'}</span>
                </div>
                <div className="rounded-2xl border border-[#27272a] bg-[#101012] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#71717a] mb-2">Current Task</p>
                  <p className="text-sm text-[#e4e4e7] leading-6">{selectedOfficeAgent?.currentTask || '暂无任务信息'}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl border border-[#27272a] bg-[#101012] p-3">
                    <div className="text-lg font-semibold text-white">{selectedOfficeAgent?.totalTasks || 0}</div>
                    <div className="text-[11px] text-[#71717a] mt-1">任务数</div>
                  </div>
                  <div className="rounded-2xl border border-[#27272a] bg-[#101012] p-3">
                    <div className="text-lg font-semibold text-green-300">{selectedOfficeAgent?.runningTasks || 0}</div>
                    <div className="text-[11px] text-[#71717a] mt-1">运行中</div>
                  </div>
                  <div className="rounded-2xl border border-[#27272a] bg-[#101012] p-3">
                    <div className="text-lg font-semibold text-red-300">{selectedOfficeAgent?.errorTasks || 0}</div>
                    <div className="text-[11px] text-[#71717a] mt-1">异常</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#27272a] bg-[#141416] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
              <div className="p-5 border-b border-[#27272a] flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Live Activities</h3>
                  <p className="text-xs text-[#71717a] mt-1">根据状态变化自动生成，保留最近 18 条。</p>
                </div>
                <div className="text-right text-xs text-[#71717a]">
                  <div>{isLoadingAgents ? '同步中' : 'Auto Refresh'}</div>
                  <div className="mt-1">10 sec</div>
                </div>
              </div>

              <div className="max-h-[560px] overflow-auto divide-y divide-[#27272a]">
                {officeActivities.map((activity) => {
                  const activityStatusStyle = getStatusStyle(activity.status);
                  const activityTheme = officeAgentThemes[activity.agentId] || officeAgentThemes.chief;
                  return (
                    <div key={activity.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 shrink-0 rounded-2xl border flex items-center justify-center text-xl ${activityTheme.border} ${activityTheme.surface}`}>
                          {activity.agentIcon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-white truncate">{activity.agentName}</p>
                            <span className={`text-[11px] ${activityStatusStyle.color}`}>{formatRelativeTime(activity.timestamp)}</span>
                          </div>
                          <p className="text-sm text-[#cbd5e1] leading-6 mt-1">{activity.message}</p>
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-[#71717a]">
                            <span>{activityStatusStyle.icon}</span>
                            <span>{activityStatusStyle.label}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-[#27272a] bg-[#141416] p-5">
              <h3 className="text-base font-semibold text-white">Office Pulse</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-[#71717a]">Working at desks</span><span className="text-green-300">{runningCount}</span></div>
                <div className="flex items-center justify-between"><span className="text-[#71717a]">Idle / away</span><span className="text-yellow-300">{idleCount}</span></div>
                <div className="flex items-center justify-between"><span className="text-[#71717a]">Errors</span><span className="text-red-300">{errorCount}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };


  // 渲染首页
  const renderHome = () => (
    <div className="p-8 animate-fadeIn">
      <h2 className="text-2xl font-bold mb-6">仪表盘概览</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#141416] p-6 rounded-xl border border-[#27272a]">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <span className="text-[#a1a1aa]">记忆总数</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalMemories}</p>
        </div>
        <div className="bg-[#141416] p-6 rounded-xl border border-[#27272a]">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span className="text-[#a1a1aa]">文档总数</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalDocuments}</p>
        </div>
        <div className="bg-[#141416] p-6 rounded-xl border border-[#27272a]">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-[#a1a1aa]">运行中任务</span>
          </div>
          <p className="text-3xl font-bold">{stats.activeTasks}</p>
        </div>
        <div className="bg-[#141416] p-6 rounded-xl border border-[#27272a]">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-[#a1a1aa]">异常任务</span>
          </div>
          <p className="text-3xl font-bold">{stats.errorTasks}</p>
        </div>
      </div>

      {/* 最近活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近记忆 */}
        <div className="bg-[#141416] rounded-xl border border-[#27272a]">
          <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              最近记忆
            </h3>
            <button
              onClick={() => setActiveTab("memories")}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              查看全部 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {memories.slice(0, 3).map((memory) => (
              <div
                key={memory.id}
                className="p-3 bg-[#1f1f22] rounded-lg hover:bg-[#27272a] cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedItem(memory);
                  setActiveTab("memories");
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getMemoryTypeIcon(memory.type)}
                  <span className="text-sm font-medium">{memory.title}</span>
                </div>
                <p className="text-xs text-[#a1a1aa] line-clamp-2">{memory.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 最近任务 */}
        <div className="bg-[#141416] rounded-xl border border-[#27272a]">
          <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-400" />
              任务状态
            </h3>
            <button
              onClick={() => setActiveTab("tasks")}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              查看全部 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {tasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="p-3 bg-[#1f1f22] rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(task.status)}
                  <span className="text-sm font-medium">{task.name}</span>
                </div>
                <span className="text-xs text-[#a1a1aa]">{task.schedule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染记忆库
  const renderMemories = () => (
    <div className="p-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-7 h-7 text-purple-400" />
          记忆库
        </h2>
      </div>

      {/* 搜索 */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a1a1aa]" />
        <input
          type="text"
          placeholder="搜索记忆（按回车执行）..."
          value={draftSearchQuery}
          onChange={(e) => handleSearchInputChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full bg-[#141416] border border-[#27272a] rounded-lg pl-12 pr-4 py-3 text-white placeholder-[#a1a1aa] focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* 记忆列表 */}
      <div className="space-y-3">
        {filteredMemories.map((memory) => (
          <div
            key={memory.id}
            className="bg-[#141416] p-4 rounded-xl border border-[#27272a] hover:border-purple-500/50 cursor-pointer transition-colors"
            onClick={() => setSelectedItem(memory)}
          >
            <div className="flex items-center gap-3 mb-2">
              {getMemoryTypeIcon(memory.type)}
              <h3 className="font-semibold">{memory.title}</h3>
              <span className="text-xs text-[#a1a1aa] ml-auto">{memory.date}</span>
            </div>
            <p className="text-sm text-[#a1a1aa] line-clamp-2">{memory.content}</p>
          </div>
        ))}
      </div>

      {/* 详情模态框 - 记忆 */}
      {selectedItem && "content" in selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#141416] rounded-xl border border-[#27272a] max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-[#27272a] flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {"type" in selectedItem && getMemoryTypeIcon(selectedItem.type)}
                {selectedItem.title}
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-[#a1a1aa] hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {/* 元信息 */}
              <div className="flex gap-4 mb-4 text-sm">
                <span className="text-[#71717a]">
                  类型: {"type" in selectedItem && (
                    <span className="text-blue-400">{selectedItem.type === 'long-term' ? '长期记忆' : selectedItem.type === 'daily' ? '日记' : '进化'}</span>
                  )}
                </span>
                <span className="text-[#71717a]">
                  日期: <span className="text-white">{selectedItem.date}</span>
                </span>
              </div>
              {/* 详细内容 */}
              <div className="border-t border-[#27272a] pt-4">
                <pre className="text-[#d4d4d8] whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {selectedItem.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 渲染文档库
  const renderDocuments = () => (
    <div className="p-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-7 h-7 text-blue-400" />
          文档库
        </h2>
      </div>

      {/* 搜索 */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a1a1aa]" />
        <input
          type="text"
          placeholder="搜索文档（按回车执行）..."
          value={draftSearchQuery}
          onChange={(e) => handleSearchInputChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full bg-[#141416] border border-[#27272a] rounded-lg pl-12 pr-4 py-3 text-white placeholder-[#a1a1aa] focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* 文档列表 */}
      <div className="space-y-3">
        {filteredDocuments.map((doc) => (
          <div
            key={doc.id}
            className="bg-[#141416] p-4 rounded-xl border border-[#27272a] hover:border-blue-500/50 cursor-pointer transition-colors"
            onClick={() => setSelectedItem(doc)}
          >
            <div className="flex items-center gap-3 mb-2">
              {getDocumentTypeIcon(doc.type)}
              <h3 className="font-semibold">{doc.title}</h3>
              <span className="text-xs bg-[#27272a] px-2 py-1 rounded text-[#a1a1aa]">
                {doc.type}
              </span>
              <span className="text-xs text-[#a1a1aa] ml-auto">{doc.date}</span>
            </div>
            <p className="text-xs text-[#a1a1aa] truncate">{doc.path}</p>
            <p className="text-xs text-[#a1a1aa] mt-1">{formatSize(doc.size)}</p>
          </div>
        ))}
      </div>

      {/* 详情模态框 - 文档 */}
      {selectedItem && "path" in selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#141416] rounded-xl border border-[#27272a] max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-[#27272a] flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {"type" in selectedItem && getDocumentTypeIcon(selectedItem.type)}
                {selectedItem.title}
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-[#a1a1aa] hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {/* 元信息 */}
              <div className="bg-[#0a0a0c] rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#71717a] text-xs">文件路径</p>
                    <p className="text-[#d4d4d8] truncate mt-1">{selectedItem.path}</p>
                  </div>
                  <div>
                    <p className="text-[#71717a] text-xs">文件类型</p>
                    <p className="text-blue-400 mt-1">{selectedItem.type}</p>
                  </div>
                  <div>
                    <p className="text-[#71717a] text-xs">文件大小</p>
                    <p className="text-white mt-1">{formatSize(selectedItem.size)}</p>
                  </div>
                  <div>
                    <p className="text-[#71717a] text-xs">创建日期</p>
                    <p className="text-white mt-1">{selectedItem.date}</p>
                  </div>
                </div>
              </div>
              {/* 提示 */}
              <p className="text-xs text-[#71717a] text-center">
                文件预览功能开发中...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTokenTrendChart = () => {
    if (!displayTrend.length) {
      return (
        <div className="bg-[#141416] rounded-xl border border-[#27272a] p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold">Token 日趋势</h3>
          </div>
          <p className="text-sm text-[#71717a]">暂无可用的历史 token 数据，下面仍会显示当前 Agent 的 token 分布。</p>
        </div>
      );
    }

    const chartWidth = 920;
    const chartHeight = 280;
    const paddingX = 28;
    const paddingY = 20;
    const innerWidth = chartWidth - paddingX * 2;
    const innerHeight = chartHeight - paddingY * 2;
    const xFor = (index: number) =>
      displayTrend.length === 1 ? chartWidth / 2 : paddingX + (index / (displayTrend.length - 1)) * innerWidth;
    const yFor = (value: number) => paddingY + innerHeight - (value / tokenTrendMax) * innerHeight;
    const buildPolyline = (values: number[]) =>
      values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(" ");

    return (
      <div className="bg-[#141416] rounded-xl border border-[#27272a] p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Token 日趋势
            </h3>
            <p className="text-xs text-[#71717a] mt-1">
              按日查看总 Token 折线与各 Agent 消耗拆解（最近 {trendRange} 个自然日，含无数据日期）
            </p>
            <p className="text-xs text-cyan-300 mt-1">
              Token 数据截止：{formatFullDateTime(latestSupabaseSyncAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-[#71717a]">近 {trendRange} 天总量</p>
              <p className="text-xl font-bold text-yellow-400">{(totalRangeTokens / 1000).toFixed(1)}k</p>
            </div>
            <div className="flex bg-[#0f0f10] border border-[#27272a] rounded-lg p-1">
              {[7, 14, 30].map((range) => (
                <button
                  key={range}
                  onClick={() => setTrendRange(range as 7 | 14 | 30)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    trendRange === range ? "bg-yellow-500/20 text-yellow-300" : "text-[#a1a1aa] hover:text-white"
                  }`}
                >
                  {range}天
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#0f0f10] rounded-xl border border-[#27272a] p-4">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-[320px] overflow-visible">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = paddingY + innerHeight - innerHeight * ratio;
              return (
                <g key={ratio}>
                  <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={6} y={y + 4} fill="#71717a" fontSize="10">
                    {Math.round((tokenTrendMax * ratio) / 1000)}k
                  </text>
                </g>
              );
            })}

            {displayTrend.map((point, index) => (
              <text key={point.date} x={xFor(index)} y={chartHeight - 4} textAnchor="middle" fill="#a1a1aa" fontSize="10">
                {point.date.slice(5)}
              </text>
            ))}

            {lineSeries.map((series) => (
              <g key={series.key}>
                <polyline
                  fill="none"
                  stroke={series.color}
                  strokeWidth={series.key === "total" ? 3 : 2}
                  points={buildPolyline(series.values)}
                  opacity={series.key === "total" ? 1 : 0.85}
                />
                {series.values.map((value, index) => (
                  <circle
                    key={`${series.key}-${index}`}
                    cx={xFor(index)}
                    cy={yFor(value)}
                    r={series.key === "total" ? 4 : 2.5}
                    fill={series.color}
                  >
                    <title>{`${series.label} · ${displayTrend[index].date} · ${value.toLocaleString()} tokens`}</title>
                  </circle>
                ))}
              </g>
            ))}
          </svg>

          <div className="mt-4 flex flex-wrap gap-3">
            {lineSeries.map((series) => (
              <div key={series.key} className="flex items-center gap-2 text-xs text-[#d4d4d8] bg-[#141416] rounded-lg px-3 py-1.5 border border-[#27272a]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: series.color }} />
                <span>{series.label}</span>
                <span className="text-[#71717a]">{(series.values.reduce((sum, value) => sum + value, 0) / 1000).toFixed(1)}k</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTokenDistributionChart = () => {
    return (
      <div className="bg-[#141416] rounded-xl border border-[#27272a] p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-orange-400" />
          <h3 className="font-semibold">Token 分布（近 {trendRange} 天）</h3>
        </div>
        <p className="text-xs text-[#71717a] mb-4">基于当前所选时间范围内的历史 Token 聚合，和上方趋势图保持同一时间维度。</p>

        {!tokenDistribution.length ? (
          <p className="text-sm text-[#71717a]">暂无可展示的 token 数据。</p>
        ) : (
          <div className="space-y-4">
            {tokenDistribution.map((item) => (
              <div key={item.id}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2 text-[#d4d4d8]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[#f4f4f5] font-medium">{(item.value / 1000).toFixed(1)}k</span>
                </div>
                <div className="h-3 bg-[#0f0f10] rounded-full overflow-hidden border border-[#27272a]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max((item.value / tokenDistributionMax) * 100, 6)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 渲染Agent中心
  const renderAgents = () => {
    const totalTasks = agentCards.reduce((sum, a) => sum + a.tasks, 0);
    const totalCompleted = agentCards.reduce((sum, a) => sum + a.completedTasks, 0);
    const totalFailed = agentCards.reduce((sum, a) => sum + a.failedTasks, 0);
    const totalTokens = totalRangeTokens;

    return (
      <div className="p-8 animate-fadeIn">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-7 h-7 text-purple-400" />
            Agent中心
          </h2>
        </div>

        {renderTokenTrendChart()}
        {renderTokenDistributionChart()}

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-[#141416] p-4 rounded-xl border border-[#27272a]">
            <div className="flex items-center gap-3 mb-2">
              <CheckSquare className="w-5 h-5 text-blue-400" />
              <span className="text-[#a1a1aa] text-sm">总任务</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalTasks}</p>
          </div>
          <div className="bg-[#141416] p-4 rounded-xl border border-[#27272a]">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-[#a1a1aa] text-sm">已完成</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{totalCompleted}</p>
          </div>
          <div className="bg-[#141416] p-4 rounded-xl border border-[#27272a]">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-[#a1a1aa] text-sm">失败</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{totalFailed}</p>
          </div>
          <div className="bg-[#141416] p-4 rounded-xl border border-[#27272a]">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-[#a1a1aa] text-sm">近{trendRange}天 Token</span>
            </div>
            <p className="text-2xl font-bold text-yellow-400">{(totalTokens / 1000).toFixed(1)}k</p>
          </div>
        </div>

        {/* Agent列表 */}
        <div className="space-y-4">
          {agentCards.map((agent) => (
            <div
              key={agent.id}
              className="bg-[#141416] p-5 rounded-xl border border-[#27272a] hover:border-purple-500/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-white">{agent.name}</h3>
                  {getStatusIcon(agent.status)}
                </div>
                <span className="text-xs text-[#71717a]">{agent.lastRun}</span>
              </div>
              <p className="text-sm text-[#a1a1aa] mb-4">{agent.description}</p>
              <div className="grid grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-[#71717a] text-xs">模型</p>
                  <p className="text-blue-400 text-xs">{agent.model}</p>
                </div>
                <div>
                  <p className="text-[#71717a] text-xs">任务数</p>
                  <p className="text-white">{agent.tasks}</p>
                </div>
                <div>
                  <p className="text-[#71717a] text-xs">完成</p>
                  <p className="text-green-400">{agent.completedTasks}</p>
                </div>
                <div>
                  <p className="text-[#71717a] text-xs">失败</p>
                  <p className="text-red-400">{agent.failedTasks}</p>
                </div>
                <div>
                  <p className="text-[#71717a] text-xs">近{trendRange}天 Token</p>
                  <p className="text-yellow-400">{((rangeTokenUsageByAgent[agent.id] || 0) / 1000).toFixed(1)}k</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染任务中心
  const renderTasks = () => (
    <div className="p-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CheckSquare className="w-7 h-7 text-green-400" />
          任务中心
        </h2>
        <div className="text-right">
          <p className="text-xs text-[#71717a]">Supabase 最近同步</p>
          <p className="text-sm text-cyan-300 font-medium">{formatFullDateTime(latestSupabaseSyncAt)}</p>
        </div>
      </div>

      {/* 搜索 */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a1a1aa]" />
        <input
          type="text"
          placeholder="搜索任务（按回车执行）..."
          value={draftSearchQuery}
          onChange={(e) => handleSearchInputChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full bg-[#141416] border border-[#27272a] rounded-lg pl-12 pr-4 py-3 text-white placeholder-[#a1a1aa] focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* 任务统计 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#141416] p-4 rounded-xl border border-[#27272a] flex items-center gap-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <div>
            <p className="text-2xl font-bold">{stats.activeTasks}</p>
            <p className="text-xs text-[#a1a1aa]">正常运行</p>
          </div>
        </div>
        <div className="bg-[#141416] p-4 rounded-xl border border-[#27272a] flex items-center gap-4">
          <XCircle className="w-8 h-8 text-red-500" />
          <div>
            <p className="text-2xl font-bold">{stats.errorTasks}</p>
            <p className="text-xs text-[#a1a1aa]">异常任务</p>
          </div>
        </div>
        <div className="bg-[#141416] p-4 rounded-xl border border-[#27272a] flex items-center gap-4">
          <Clock className="w-8 h-8 text-blue-500" />
          <div>
            <p className="text-2xl font-bold">{tasks.length}</p>
            <p className="text-xs text-[#a1a1aa]">总任务数</p>
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className={`bg-[#141416] p-4 rounded-xl border transition-colors ${
              task.status === "error"
                ? "border-red-500/30 hover:border-red-500/50"
                : "border-[#27272a] hover:border-green-500/50"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {getStatusIcon(task.status)}
                <h3 className="font-semibold">{task.name}</h3>
                {task.errorCount > 0 && (
                  <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs">
                    {task.errorCount}次错误
                  </span>
                )}
              </div>
              <span className="text-xs text-[#a1a1aa] bg-[#27272a] px-2 py-1 rounded">
                {task.schedule}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[#a1a1aa] text-xs">上次运行</p>
                <p className="text-white">{formatDateTime(task.lastRun)}</p>
              </div>
              <div>
                <p className="text-[#a1a1aa] text-xs">运行时长</p>
                <p className="text-white">{task.lastDuration || "—"}</p>
              </div>
              <div>
                <p className="text-[#a1a1aa] text-xs">下次运行</p>
                <p className="text-white">{formatDateTime(task.nextRun)}</p>
              </div>
              <div>
                <p className="text-[#a1a1aa] text-xs">Token</p>
                <p className="text-yellow-400">{task.tokenUsage.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AuthCheck>
    <div className="flex min-h-screen bg-[#0a0a0b]">
      {renderSidebar()}
      <main className="flex-1 overflow-y-auto">
        {/* 全局搜索区域 */}
        {searchQuery && (
          <div className="p-8 animate-fadeIn">
            <div className="mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                <Search className="w-7 h-7 text-blue-400" />
                搜索结果
              </h2>
              <p className="text-[#71717a]">关键词: "{searchQuery}"</p>
            </div>

            {/* 记忆搜索结果 */}
            {searchedMemories.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-[#a1a1aa] mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  记忆 ({searchedMemories.length})
                </h3>
                <div className="space-y-3">
                  {searchedMemories.map((m) => (
                    <div key={m.id} onClick={() => {setSelectedItem(m); setActiveTab("memories");}} className="bg-[#141416] p-4 rounded-xl border border-[#27272a] hover:border-purple-500/50 cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        {getMemoryTypeIcon(m.type)}
                        <span className="font-semibold">{m.title}</span>
                        <span className="text-xs text-[#71717a] ml-auto">{m.date}</span>
                      </div>
                      <p className="text-sm text-[#a1a1aa] line-clamp-2">{m.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 文档搜索结果 */}
            {searchedDocuments.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-[#a1a1aa] mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  文档 ({searchedDocuments.length})
                </h3>
                <div className="space-y-3">
                  {searchedDocuments.map((d) => (
                    <div key={d.id} onClick={() => {setSelectedItem(d); setActiveTab("documents");}} className="bg-[#141416] p-4 rounded-xl border border-[#27272a] hover:border-blue-500/50 cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        {getDocumentTypeIcon(d.type)}
                        <span className="font-semibold">{d.title}</span>
                        <span className="text-xs text-[#71717a] ml-auto">{d.date}</span>
                      </div>
                      <p className="text-sm text-[#a1a1aa] truncate">{d.path}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 任务搜索结果 */}
            {searchedTasks.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-[#a1a1aa] mb-4 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5" />
                  任务 ({searchedTasks.length})
                </h3>
                <div className="space-y-3">
                  {searchedTasks.map((t) => (
                    <div key={t.id} onClick={() => setActiveTab("tasks")} className="bg-[#141416] p-4 rounded-xl border border-[#27272a] hover:border-green-500/50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(t.status)}
                        <span className="font-semibold">{t.name}</span>
                        <span className="text-xs text-[#71717a] ml-auto">{t.schedule}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 无结果 */}
            {searchedMemories.length === 0 && searchedDocuments.length === 0 && searchedTasks.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-[#3f3f46] mx-auto mb-4" />
                <p className="text-[#71717a]">未找到相关结果</p>
              </div>
            )}
          </div>
        )}

        {!searchQuery && (
          <>
            {activeTab === "home" && renderHome()}
            {activeTab === "memories" && renderMemories()}
            {activeTab === "documents" && renderDocuments()}
            {activeTab === "tasks" && renderTasks()}
            {activeTab === "agents" && renderAgents()}
            {activeTab === "team" && renderTeam()}
            {activeTab === "office" && renderOffice()}
          </>
        )}
      </main>
    </div>
    </AuthCheck>
  );
}
