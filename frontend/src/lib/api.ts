const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function getImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  let finalUrl = url;
  if (!url.startsWith("http")) {
    // If API_URL is relative (e.g., "/api/v1"), fallback to localhost:8000
    let baseUrl = API_URL.replace("/api/v1", "");
    if (!baseUrl) {
      baseUrl = "http://localhost:8000";
    }
    finalUrl = `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  
  // If we are on HTTPS, ensure the media URLs also use HTTPS
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    finalUrl = finalUrl.replace(/^http:\/\//i, "https://");
  }
  
  return finalUrl;
}

/** Converts a DRF error response (could be field-level dict, array, or plain string) into a human-readable message. */
function parseDRFError(error: Record<string, unknown>): string {
  if (typeof error.detail === "string") return error.detail;
  if (typeof error.message === "string") return error.message;
  // Field-level errors: { fieldName: ["msg1", "msg2"], ... } or { fieldName: "msg" }
  const parts: string[] = [];
  for (const [field, value] of Object.entries(error)) {
    const msgs = Array.isArray(value) ? value.join(", ") : String(value);
    parts.push(field === "non_field_errors" ? msgs : `${field}: ${msgs}`);
  }
  return parts.join(" | ") || "Request failed";
}

export async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_superuser?: boolean;
  phone?: string;
  avatar?: string | null;
  role?: { id: number; name: string; slug: string; is_leadership: boolean; priority: number };
  college?: string;
  branch?: string;
  batch?: string;
  year?: string;
  skills?: string[];
  github?: string;
  linkedin?: string;
  portfolio?: string;
  bio?: string;
  enrollment_number?: string;
  is_email_verified?: boolean;
  last_active?: string | null;
  date_joined?: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DashboardStats {
  today_tasks: number;
  pending_tasks: number;
  completed_tasks: number;
  has_daily_update_today: boolean;
  upcoming_meetings: { id: number; title: string; start_time: string }[];
  announcements: { id: number; title: string; priority: string }[];
}

export function getStoredTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("humorphic_tokens");
  return raw ? JSON.parse(raw) : null;
}

export function setStoredTokens(tokens: AuthTokens | null) {
  if (tokens) localStorage.setItem("humorphic_tokens", JSON.stringify(tokens));
  else localStorage.removeItem("humorphic_tokens");
}

export function setStoredUser(user: User | null) {
  if (user) localStorage.setItem("humorphic_user", JSON.stringify(user));
  else localStorage.removeItem("humorphic_user");
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("humorphic_user");
  return raw ? JSON.parse(raw) : null;
}

async function refreshAccessToken(refresh: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const tokens = getStoredTokens();
    if (tokens) setStoredTokens({ ...tokens, access: data.access });
    return data.access;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const tokens = getStoredTokens();
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };
  if (tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401 && tokens?.refresh) {
    const newAccess = await refreshAccessToken(tokens.refresh);
    if (newAccess) {
      headers.Authorization = `Bearer ${newAccess}`;
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }
  if (res.status === 401) {
    setStoredTokens(null);
    setStoredUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(parseDRFError(error));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function list<T>(path: string): Promise<T[]> {
  const data = await apiFetch<Paginated<T> | T[]>(path);
  return Array.isArray(data) ? data : data.results ?? [];
}

// ── Auth ──
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ tokens: AuthTokens; user: User }>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (data: FormData | Record<string, any>) =>
    apiFetch<User>("/auth/register/", { method: "POST", body: data instanceof FormData ? data : JSON.stringify(data) }),
  googleLogin: (id_token: string) =>
    apiFetch<{ tokens: AuthTokens; user: User }>("/auth/google/", {
      method: "POST",
      body: JSON.stringify({ id_token }),
    }),
  config: () => apiFetch<{ google_enabled: boolean; google_client_id: string | null }>("/auth/config/"),
  me: () => apiFetch<User>("/auth/me/"),
  updateMe: (data: FormData | Record<string, any>) =>
    apiFetch<User>("/auth/me/", { method: "PATCH", body: data instanceof FormData ? data : JSON.stringify(data) }),
  updateProfile: (data: FormData | Record<string, any>) =>
    apiFetch<User>("/auth/me/profile/", { method: "PATCH", body: data instanceof FormData ? data : JSON.stringify(data) }),
  permissions: () => apiFetch<PermissionsPayload>("/auth/permissions/"),
  roles: () => list<Role>("/auth/roles/"),
  updateUserRole: (userId: number, roleId: number) =>
    apiFetch<User>(`/auth/users/${userId}/role/`, {
      method: "PATCH",
      body: JSON.stringify({ role: roleId }),
    }),
  dashboard: () => apiFetch<DashboardStats>("/auth/dashboard/"),
  users: () => list<User>("/auth/users/"),
  auditLogs: () => list<AuditLog>("/auth/audit-logs/"),
};

export const membersApi = {
  list: () => authApi.users(),
  get: (id: number) => apiFetch<User>(`/auth/users/${id}/`),
  create: (data: Record<string, any>) => apiFetch<User>("/auth/users/", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`/auth/users/${id}/`, { method: "DELETE" }),
};

export const rolesApi = {
  list: () => apiFetch<any[]>("/auth/roles/"),
};

// ── Core ──
export const tasksApi = {
  list: () => list<Task>("/tasks/"),
  myTasks: () => list<Task>("/tasks/my_tasks/"),
  kanban: (project?: number) =>
    apiFetch<Record<string, Task[]>>(`/tasks/kanban/${project ? `?project=${project}` : ""}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<Task>("/tasks/", { method: "POST", body: JSON.stringify(data) }),
  updateStatus: (id: number, status: string) =>
    apiFetch<Task>(`/tasks/${id}/status/`, { method: "PATCH", body: JSON.stringify({ status }) }),
  uploadAttachment: (taskId: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("task", String(taskId));
    return apiFetch<TaskAttachment>(`/tasks/${taskId}/attachments/`, { method: "POST", body: fd });
  },
  addComment: (taskId: number, content: string) =>
    apiFetch<any>(`/tasks/${taskId}/comments/`, { method: "POST", body: JSON.stringify({ content }) }),
};

export const projectsApi = {
  list: () => list<Project>("/projects/"),
  get: (slug: string) =>
    apiFetch<any>(`/projects/${slug}/`),
  create: (data: Partial<Project>) =>
    apiFetch<Project>("/projects/", { method: "POST", body: JSON.stringify(data) }),
  update: (slug: string, data: Partial<Project>) =>
    apiFetch<Project>(`/projects/${slug}/`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (slug: string) =>
    apiFetch<void>(`/projects/${slug}/`, { method: "DELETE" }),
  removeMember: (slug: string, userId: number) =>
    apiFetch<void>(`/projects/${slug}/remove_member/`, { method: "POST", body: JSON.stringify({ user_id: userId }) }),
  listJoinRequests: () => list<any>("/projects/join-requests/"),
  createJoinRequest: (projectId: number, teamId?: number) =>
    apiFetch<any>("/projects/join-requests/", { method: "POST", body: JSON.stringify({ project: projectId, team: teamId }) }),
  approveJoinRequest: (requestId: number) =>
    apiFetch<any>(`/projects/join-requests/${requestId}/approve/`, { method: "POST" }),
  rejectJoinRequest: (requestId: number) =>
    apiFetch<any>(`/projects/join-requests/${requestId}/reject/`, { method: "POST" }),
};
export const departmentsApi = {
  list: () => list<Department>("/departments/"),
  get: (slug: string) => apiFetch<any>(`/departments/${slug}/`),
  create: (data: Partial<Department>) =>
    apiFetch<Department>("/departments/", { method: "POST", body: JSON.stringify(data) }),
  update: (slug: string, data: Partial<Department>) =>
    apiFetch<Department>(`/departments/${slug}/`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (slug: string) =>
    apiFetch<void>(`/departments/${slug}/`, { method: "DELETE" }),
  join: (slug: string) =>
    apiFetch<{ status: string }>(`/departments/${slug}/join/`, { method: "POST" }),
  leave: (slug: string) =>
    apiFetch<{ status: string }>(`/departments/${slug}/leave/`, { method: "POST" }),
  listJoinRequests: () => list<any>("/departments/join-requests/"),
  approveJoinRequest: (requestId: number) =>
    apiFetch<any>(`/departments/join-requests/${requestId}/approve/`, { method: "POST" }),
  rejectJoinRequest: (requestId: number) =>
    apiFetch<any>(`/departments/join-requests/${requestId}/reject/`, { method: "POST" }),
};
export const teamsApi = {
  list: () => list<Team>("/teams/"),
  create: (data: Partial<Team>) =>
    apiFetch<Team>("/teams/", { method: "POST", body: JSON.stringify(data) }),
  update: (slug: string, data: Partial<Team>) =>
    apiFetch<Team>(`/teams/${slug}/`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (slug: string) =>
    apiFetch<void>(`/teams/${slug}/`, { method: "DELETE" }),
  join: (slug: string) =>
    apiFetch<{ status: string }>(`/teams/${slug}/join/`, { method: "POST" }),
  leave: (slug: string) =>
    apiFetch<{ status: string }>(`/teams/${slug}/leave/`, { method: "POST" }),
};

export const projectPhasesApi = {
  create: (data: any) =>
    apiFetch<any>("/projects/phases/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    apiFetch<any>(`/projects/phases/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    apiFetch<void>(`/projects/phases/${id}/`, { method: "DELETE" }),
};

export const subStagesApi = {
  create: (data: any) =>
    apiFetch<any>("/projects/substages/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    apiFetch<any>(`/projects/substages/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    apiFetch<void>(`/projects/substages/${id}/`, { method: "DELETE" }),
};

export const subLevelsApi = {
  create: (data: any) =>
    apiFetch<any>("/projects/sublevels/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    apiFetch<any>(`/projects/sublevels/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    apiFetch<void>(`/projects/sublevels/${id}/`, { method: "DELETE" }),
};

export const dailyUpdatesApi = {
  today: () => apiFetch<DailyUpdate | null>("/daily-updates/today/"),
  create: (data: Partial<DailyUpdate>) =>
    apiFetch<DailyUpdate>("/daily-updates/", { method: "POST", body: JSON.stringify(data) }),
  compliance: () => apiFetch<ComplianceStats>("/daily-updates/compliance/"),
};

export const meetingsApi = {
  list: () => list<Meeting>("/meetings/"),
  upcoming: () => apiFetch<Meeting[]>("/meetings/upcoming/"),
  create: (data: Partial<Meeting>) =>
    apiFetch<Meeting>("/meetings/", { method: "POST", body: JSON.stringify(data) }),
  markAttendance: (meetingId: number, userId?: number, status = "present") =>
    apiFetch(`/meetings/${meetingId}/attendance/`, {
      method: "POST",
      body: JSON.stringify({ user: userId, status }),
    }),
};

export const announcementsApi = {
  list: () => list<Announcement>("/announcements/"),
  create: (data: Partial<Announcement>) =>
    apiFetch<Announcement>("/announcements/", { method: "POST", body: JSON.stringify(data) }),
};

export const notificationsApi = {
  list: () => list<Notification>("/notifications/"),
  read: (id: number) => apiFetch<Notification>(`/notifications/${id}/read/`, { method: "POST" }),
  unreadCount: () => apiFetch<{ count: number }>("/notifications/unread_count/"),
  readAll: () => apiFetch<{ marked_read: number }>("/notifications/read_all/", { method: "POST" }),
  getPreferences: () => apiFetch<NotificationPreference>("/notifications/preferences/"),
  updatePreferences: (data: Partial<NotificationPreference>) =>
    apiFetch<NotificationPreference>("/notifications/preferences/", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  broadcast: (data: {
    title: string;
    message: string;
    target_type: "all" | "department" | "team" | "user";
    target_id?: number | null;
    priority?: string;
    notification_type?: string;
    link?: string;
  }) => apiFetch<{ detail: string }>("/notifications/broadcast/", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  sendTestEmail: (data: {
    email_type: "primary" | "secondary";
    recipient: string;
    subject?: string;
    body?: string;
  }) => apiFetch<{ detail: string }>("/notifications/send_test_email/", {
    method: "POST",
    body: JSON.stringify(data),
  }),
};

export const reportsApi = {
  list: () => list<Report>("/reports/"),
  generateDaily: () => apiFetch<Report>("/reports/generate_daily/", { method: "POST" }),
  generateWeekly: () => apiFetch<Report>("/reports/generate_weekly/", { method: "POST" }),
  generateAttendance: () => apiFetch<Report>("/reports/generate_attendance/", { method: "POST" }),
  generateProject: () => apiFetch<Report>("/reports/generate_project/", { method: "POST" }),
  generatePerformance: () => apiFetch<Report>("/reports/generate_performance/", { method: "POST" }),
  leadershipSummary: () => apiFetch<Record<string, unknown>>("/reports/leadership_summary/"),
  exportReport: (id: number, format: "json" | "csv" | "pdf" = "json") =>
    apiFetch<Report>(`/reports/${id}/export/?format=${format}`),
  downloadReport: async (id: number, format: "pdf" | "csv" = "pdf") => {
    const tokens = getStoredTokens();
    const res = await fetch(`${API_URL}/reports/${id}/export/?format=${format}`, {
      headers: tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {},
    });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${id}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  },
  triggerDailyReminder: () => apiFetch<{ detail: string }>("/reports/trigger_daily_reminder/", { method: "POST" }),
  triggerDeadlineReminder: () => apiFetch<{ detail: string }>("/reports/trigger_deadline_reminder/", { method: "POST" }),
};

// ── Phase 2 ──
export const attendanceApi = {
  mark: () => apiFetch<AttendanceRecord>("/attendance/records/mark/", { method: "POST" }),
  records: (params?: string | { date?: string; user?: number; no_pagination?: boolean }) => {
    const q = new URLSearchParams();
    if (typeof params === "string") {
      if (params) q.set("date", params);
    } else if (params) {
      if (params.date) q.set("date", params.date);
      if (params.user) q.set("user", String(params.user));
      if (params.no_pagination) q.set("no_pagination", "true");
    }
    const qs = q.toString();
    return list<AttendanceRecord>(`/attendance/records/${qs ? `?${qs}` : ""}`);
  },
  analytics: () => apiFetch<{ total: number; by_status: { status: string; count: number }[] }>("/attendance/records/analytics/"),
  holidays: () => list<Holiday>("/attendance/holidays/"),
  leaves: () => list<LeaveRequest>("/attendance/leaves/"),
  requestLeave: (data: Partial<LeaveRequest>) =>
    apiFetch<LeaveRequest>("/attendance/leaves/", { method: "POST", body: JSON.stringify(data) }),
  approveLeave: (id: number) =>
    apiFetch<LeaveRequest>(`/attendance/leaves/${id}/approve/`, { method: "POST" }),
  rejectLeave: (id: number) =>
    apiFetch<LeaveRequest>(`/attendance/leaves/${id}/reject/`, { method: "POST" }),
  faceCheckin: (image: File) => {
    const formData = new FormData();
    formData.append("image", image);
    return apiFetch<AttendanceRecord>("/attendance/records/face_checkin/", {
      method: "POST",
      body: formData,
    });
  },
};

export const inventoryApi = {
  components: () => list<Component>("/inventory/components/"),
  lowStock: () => apiFetch<Component[]>("/inventory/components/low_stock/"),
  equipment: () => list<Equipment>("/inventory/equipment/"),
  labBookings: () => list<LabBooking>("/inventory/lab-bookings/"),
  createLabBooking: (data: Partial<LabBooking>) =>
    apiFetch<LabBooking>("/inventory/lab-bookings/", { method: "POST", body: JSON.stringify(data) }),
};

export const knowledgeApi = {
  list: () => list<KnowledgeArticle>("/knowledge/"),
  get: (slug: string) => apiFetch<KnowledgeArticle>(`/knowledge/${slug}/`),
  create: (data: FormData | Partial<KnowledgeArticle>) =>
    apiFetch<KnowledgeArticle>("/knowledge/", { 
      method: "POST", 
      body: data instanceof FormData ? data : JSON.stringify(data) 
    }),
  createQuestion: (data: Partial<KnowledgeQuestion>) =>
    apiFetch<KnowledgeQuestion>("/knowledge/questions/", { method: "POST", body: JSON.stringify(data) }),
  createAnswer: (data: Partial<KnowledgeAnswer>) =>
    apiFetch<KnowledgeAnswer>("/knowledge/answers/", { method: "POST", body: JSON.stringify(data) }),
};

export const certificatesApi = {
  list: () => list<Certificate>("/certificates/"),
  create: (data: { recipient: number; title: string; event_name: string; template?: number }) =>
    apiFetch<Certificate>("/certificates/", { method: "POST", body: JSON.stringify(data) }),
  verify: (code: string) => apiFetch<CertificateVerify>(`/certificates/verify/?code=${code}`),
};

export const eventsApi = {
  list: () => list<ClubEvent>("/events/"),
  publicList: () => publicFetch<Paginated<ClubEvent> | ClubEvent[]>("/events/?public=true").then(
    (data) => (Array.isArray(data) ? data : data.results ?? [])
  ),
  register: (slug: string) =>
    apiFetch<EventRegistration>(`/events/${slug}/register/`, { method: "POST" }),
};

export const organizationsApi = {
  list: () => list<Organization>("/organizations/"),
  create: (data: Partial<Organization>) =>
    apiFetch<Organization>("/organizations/", { method: "POST", body: JSON.stringify(data) }),
  addMember: (slug: string, userId: number, org_role = "member") =>
    apiFetch(`/organizations/${slug}/members/`, {
      method: "POST",
      body: JSON.stringify({ user: userId, org_role }),
    }),
  public: () => publicFetch<Organization[]>("/organizations/public/"),
};

export const gamificationApi = {
  me: () => apiFetch<GamificationProfile>("/gamification/profiles/me/"),
  leaderboard: () => apiFetch<GamificationProfile[]>("/gamification/profiles/leaderboard/"),
  badges: () => list<Badge>("/gamification/badges/"),
  achievements: () => list<Achievement>("/gamification/achievements/"),
};

export const chatApi = {
  channels: () => list<Channel>("/chat/channels/"),
  channelMessages: (slug: string) => apiFetch<ChannelMessage[]>(`/chat/channels/${slug}/messages/`),
  sendChannelMessage: (slug: string, content: string) =>
    apiFetch<ChannelMessage>(`/chat/channels/${slug}/messages/`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  sendDM: (recipient: number, content: string) =>
    apiFetch<DirectMessage>("/chat/direct/", {
      method: "POST",
      body: JSON.stringify({ recipient, content }),
    }),
  dmConversation: (userId: number) =>
    apiFetch<DirectMessage[]>(`/chat/direct/conversation/?user=${userId}`),
  dmContacts: () => list<User>("/chat/direct/contacts/"),
  friendRequests: () => list<FriendRequest>("/chat/friend-requests/"),
  sendFriendRequest: (receiverId: number) =>
    apiFetch<FriendRequest>("/chat/friend-requests/", {
      method: "POST",
      body: JSON.stringify({ receiver: receiverId }),
    }),
  respondFriendRequest: (requestId: number, action: "accept" | "reject") =>
    apiFetch<FriendRequest>(`/chat/friend-requests/${requestId}/respond/`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),
};

// ── Phase 3 ──
export const aiApi = {
  chat: (message: string, session_id?: string) =>
    apiFetch<{ session_id: string; reply: string }>("/ai/chat/", {
      method: "POST",
      body: JSON.stringify({ message, session_id }),
    }),
  summarize: (type: string, id?: number) =>
    apiFetch<AiInsight>("/ai/summarize/", { method: "POST", body: JSON.stringify({ type, id }) }),
  insights: () => list<AiInsight>("/ai/insights/"),
};

export const calendarApi = {
  events: (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    return apiFetch<{ events: CalendarEvent[] }>(`/calendar/?${params}`);
  },
};

export const searchApi = {
  query: (q: string) => apiFetch<SearchResult>(`/search/?q=${encodeURIComponent(q)}`),
};

export const analyticsApi = {
  dashboard: () => apiFetch<AnalyticsDashboard>("/analytics/dashboard/"),
  trends: () => apiFetch<{ trends: TrendPoint[] }>("/analytics/trends/"),
};

// ── Types ──
export interface Role { id: number; name: string; slug: string; is_leadership: boolean; }
export interface PermissionsPayload {
  role: Role | null;
  permissions: { resource: string; action: string }[];
  is_leadership: boolean;
}
export interface Task {
  id: number; title: string; description: string; status: string; priority: string;
  due_date: string | null; assigned_by?: number; assigned_by_detail?: User;
  assignee?: number | null; assignee_detail?: User;
  assigned_department?: number | null; assigned_team?: number | null;
  project?: number | null; project_detail?: Project;
  linked_phase?: number | null; linked_sub_stage?: number | null; linked_sub_level?: number | null;
  attachments?: TaskAttachment[];
  created_at?: string; updated_at?: string; completed_at?: string | null;
}
export interface TaskAttachment {
  id: number; file: string; uploaded_by: number; uploaded_by_detail?: User; created_at: string;
}
export interface Project {
  id: number; title: string; slug: string; status: string; health: string; completion_percentage: number;
  description?: string; start_date?: string | null; end_date?: string | null;
  owner?: number; owner_detail?: User;
  members?: number[]; members_detail?: User[];
  teams_detail?: Team[]; department?: number; department_detail?: Department;
  phases?: any[];
  task_count?: number; created_at?: string; updated_at?: string;
}
export interface Department {
  id: number; name: string; slug: string; color: string; description?: string; is_active?: boolean;
  head?: number | null; head_detail?: User | null;
  members?: number[]; members_detail?: User[];
  member_count?: number; created_at?: string;
}
export interface Team {
  id: number; name: string; slug: string; description?: string; is_active?: boolean; is_archived?: boolean;
  project?: number; project_detail?: { id: number; title: string; slug: string; status: string; health: string };
  lead?: number | null; lead_detail?: User | null;
  members?: number[]; members_detail?: User[];
  member_count?: number; created_at?: string;
}
export interface DailyUpdate {
  id: number; date: string; work_done: string; hours_worked: number;
  challenges: string; learning: string; tomorrow_plan: string; need_help: string;
}
export interface Meeting {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  meet_link: string;
  agenda?: string;
  description?: string;
  organizer?: number;
  organizer_detail?: User;
  participants?: number[];
  participants_detail?: User[];
  department?: number;
  department_detail?: Department;
  team?: number;
  team_detail?: Team;
}
export interface Announcement { id: number; title: string; content: string; priority: string; is_pinned: boolean; created_at: string; }
export interface Notification { id: number; title: string; message: string; notification_type: string; priority: string; is_read: boolean; link: string; created_at: string; }
export interface NotificationPreference {
  email_task_assigned: boolean;
  in_app_task_assigned: boolean;
  email_task_review: boolean;
  in_app_task_review: boolean;
  email_task_completed: boolean;
  in_app_task_completed: boolean;
  email_task_needs_changes: boolean;
  in_app_task_needs_changes: boolean;
  email_messages: boolean;
  in_app_messages: boolean;
  email_meetings: boolean;
  in_app_meetings: boolean;
}
export interface Report { id: number; title: string; report_type: string; data: Record<string, unknown>; created_at: string; }
export interface AttendanceRecord { id: number; date: string; status: string; method: string; check_in: string | null; notes?: string; user_detail?: User; }
export interface Holiday { id: number; name: string; date: string; description?: string; }
export interface LeaveRequest { id: number; leave_type: string; start_date: string; end_date: string; reason: string; status: string; user_detail?: User; }
export interface Component { id: number; name: string; sku: string; category: string; quantity: number; min_stock: number; location: string; is_low_stock?: boolean; }
export interface Equipment { id: number; name: string; serial_number: string; status: string; }
export interface LabBooking { id: number; lab_name: string; start_time: string; end_time: string; purpose: string; status: string; booked_by_detail?: User; }
export interface KnowledgeAnswer { id: number; question: number; author: number; author_detail?: User; answer_text: string; is_accepted: boolean; created_at: string; updated_at: string; }
export interface KnowledgeQuestion { id: number; article: number; author: number; author_detail?: User; question_text: string; is_resolved: boolean; answers: KnowledgeAnswer[]; created_at: string; updated_at: string; }
export interface KnowledgeArticle { id: number; title: string; slug: string; content: string; article_type: string; material_format?: string; tags: string[]; file_url?: string; file_upload?: string | null; view_count: number; questions?: KnowledgeQuestion[]; author_detail?: User; created_at?: string; updated_at?: string; }
export interface Certificate { id: number; title: string; event_name: string; verification_code: string; issued_at: string; }
export interface CertificateVerify { valid: boolean; title?: string; recipient?: string; event_name?: string; issued_at?: string; }
export interface ClubEvent { id: number; title: string; slug: string; description: string; event_type: string; start_time: string; end_time: string; location: string; is_public: boolean; }
export interface EventRegistration { id: number; event: number; user: number; attended: boolean; }
export interface GamificationProfile { id: number; xp: number; level: number; tasks_completed: number; user_detail?: User; badges?: Badge[]; }
export interface Badge { id: number; name: string; slug: string; description: string; icon: string; xp_required: number; }
export interface Achievement { id: number; title: string; description: string; xp_awarded: number; awarded_at: string; }
export interface Channel { id: number; name: string; slug: string; description: string; }
export interface ChannelMessage { id: number; content: string; author_detail?: User; created_at: string; }
export interface DirectMessage { id: number; content: string; sender_detail?: User; recipient_detail?: User; is_read: boolean; created_at: string; }
export interface FriendRequest {
  id: number;
  sender: number;
  sender_detail: User;
  receiver: number;
  receiver_detail: User;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
}
export interface AiInsight { id: number; insight_type: string; title: string; content: string; created_at: string; }
export interface CalendarEvent { id: string; type: string; title: string; start: string; end: string; color: string; }
export interface SearchResult { query: string; count: number; results: { type: string; id: number; title: string; subtitle: string; url: string }[]; }
export interface AnalyticsDashboard {
  members: number; daily_updates_this_week: number; attendance_rate: number; avg_task_hours: number;
  tasks_by_status: { status: string; count: number }[];
  projects_by_health: { health: string; count: number }[];
  department_stats: { name: string; teams: number; projects: number }[];
}
export interface TrendPoint { date: string; updates: number; tasks_completed: number; }
export interface Organization { id: number; name: string; slug: string; description: string; website: string; }
export interface ComplianceStats { date: string; total_members: number; submitted: number; compliance_rate: number; missing?: { id: number; first_name: string; last_name: string; email: string }[]; }
export interface AuditLog { id: number; action: string; resource: string; user_name: string; created_at: string; }
