import React from "react";
import Link from "next/link";
import { Users, FolderGit2 } from "lucide-react";

interface User {
  id: number;
  full_name: string;
  avatar: string | null;
  role: string;
}

interface Department {
  id: number;
  name: string;
  slug: string;
  color: string;
  head_detail: User | null;
  member_count: number;
}

interface DepartmentCardProps {
  department: Department;
}

export function DepartmentCard({ department }: DepartmentCardProps) {
  return (
    <div 
      className="group relative overflow-hidden rounded-2xl bg-white/5 p-6 backdrop-blur-xl border border-white/10 transition-all hover:bg-white/10 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10"
      style={{ borderTop: `4px solid ${department.color || "#6366f1"}` }}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
          {department.name}
        </h3>
        <div className="p-2 rounded-lg bg-white/5 text-white/50">
          <Users size={20} />
        </div>
      </div>

      {department.head_detail ? (
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
            {department.head_detail.avatar ? (
              <img src={department.head_detail.avatar} alt={department.head_detail.full_name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-medium text-white">
                {department.head_detail.full_name.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{department.head_detail.full_name}</p>
            <p className="text-xs text-indigo-400">Department Head</p>
          </div>
        </div>
      ) : (
        <div className="h-10 mb-6 flex items-center text-sm text-white/40 italic">
          No head assigned
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-white/50 border-t border-white/10 pt-4 mt-auto">
        <span className="flex items-center gap-1.5">
          <Users size={16} /> {department.member_count} Members
        </span>
      </div>
    </div>
  );
}
