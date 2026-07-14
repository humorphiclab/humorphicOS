import React from "react";
import Link from "next/link";
import { Users, FolderGit2, Rocket } from "lucide-react";
import { getImageUrl } from "@/lib/api";


interface User {
  id: number;
  full_name: string;
  avatar: string | null;
  role: string;
}

interface Team {
  id: number;
  name: string;
  slug: string;
  lead_detail: User | null;
  member_count: number;
  members_detail?: User[];
}

interface Project {
  id: number;
  title: string;
  slug: string;
  status: string;
  health: string;
  teams_detail?: Team[];
}

interface ProjectTeamCardProps {
  project: Project;
}

export function ProjectTeamCard({ project }: ProjectTeamCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-400 bg-green-400/10 border-green-400/20";
      case "planning": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "on_hold": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "completed": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
      default: return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  return (
    <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-xl border border-white/10 flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <Rocket size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{project.title}</h3>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border mt-1 ${getStatusColor(project.status)}`}>
              {project.status.replace("_", " ").toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 flex-grow">
        <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-2">Teams</h4>
        
        {project.teams_detail && project.teams_detail.length > 0 ? (
          project.teams_detail.map(team => (
            <div key={team.id} className="group flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all mb-2">
              <div>
                <p className="font-medium text-white group-hover:text-indigo-300 transition-colors">{team.name}</p>
                <p className="text-xs text-white/50 mt-0.5 flex items-center gap-1">
                  <Users size={12} /> {team.member_count} Members
                </p>
              </div>
              
              {/* Avatar Group */}
              <div className="flex -space-x-2">
                {team.members_detail?.slice(0, 3).map((member, i) => (
                  <div key={member.id} className="h-7 w-7 rounded-full border-2 border-[#121214] bg-indigo-900 flex items-center justify-center overflow-hidden z-[1]" style={{ zIndex: 10 - i }}>
                    {member.avatar ? (
                      <img src={getImageUrl(member.avatar) || undefined} alt={member.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-white font-medium">{member.full_name.charAt(0)}</span>
                    )}
                  </div>
                ))}
                {team.member_count > 3 && (
                  <div className="h-7 w-7 rounded-full border-2 border-[#121214] bg-white/10 flex items-center justify-center z-0">
                    <span className="text-[10px] text-white font-medium">+{team.member_count - 3}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 border-dashed text-center">
            <p className="text-sm text-white/40">No teams formed yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
