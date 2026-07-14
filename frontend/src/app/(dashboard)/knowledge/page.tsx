"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { knowledgeApi, getStoredUser, User, getImageUrl, KnowledgeArticle, KnowledgeQuestion } from "@/lib/api";
import { BookOpen, FileText, Video, File, Download, X, MessageSquare, Send, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

function getYoutubeId(url: string) {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/|\/live\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function KnowledgePage() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);
  
  const canManage = currentUser?.is_superuser || (currentUser?.role?.priority ?? 0) >= 80;

  const { data: articles, isLoading } = useQuery({ queryKey: ["knowledge"], queryFn: knowledgeApi.list });

  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Create Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [articleType, setArticleType] = useState("documentation");
  const [materialFormat, setMaterialFormat] = useState("md");
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileUpload, setFileUpload] = useState<File | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => knowledgeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      setIsCreateModalOpen(false);
      setTitle(""); setSlug(""); setContent(""); setFileUrl(""); setFileUpload(null);
      toast.success("Material created successfully");
    },
    onError: () => toast.error("Failed to create material")
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("title", title);
    const finalSlug = slug || `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`;
    formData.append("slug", finalSlug);
    formData.append("article_type", articleType);
    formData.append("material_format", materialFormat);
    formData.append("is_published", "true");
    if (content) formData.append("content", content);
    if (fileUrl) formData.append("file_url", fileUrl);
    if (fileUpload) formData.append("file_upload", fileUpload);
    
    createMutation.mutate(formData);
  };

  // Q&A State
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswers, setNewAnswers] = useState<Record<number, string>>({});

  const askQuestionMutation = useMutation({
    mutationFn: (question_text: string) => knowledgeApi.createQuestion({ article: selectedArticle!.id, question_text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      setNewQuestion("");
      toast.success("Question posted");
    }
  });

  const answerQuestionMutation = useMutation({
    mutationFn: ({ questionId, answer_text }: { questionId: number; answer_text: string }) => 
      knowledgeApi.createAnswer({ question: questionId, answer_text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      setNewAnswers({});
      toast.success("Answer posted");
    }
  });

  // Update selected article when data refreshes
  useEffect(() => {
    if (selectedArticle && articles) {
      const updated = articles.find(a => a.id === selectedArticle.id);
      if (updated) setSelectedArticle(updated);
    }
  }, [articles, selectedArticle]);

  const renderIcon = (format: string) => {
    switch(format) {
      case 'pdf': return <FileText className="h-5 w-5 text-red-400" />;
      case 'youtube': return <Video className="h-5 w-5 text-red-500" />;
      case 'docx': return <File className="h-5 w-5 text-blue-400" />;
      case 'md': return <BookOpen className="h-5 w-5 text-primary" />;
      default: return <BookOpen className="h-5 w-5 text-muted" />;
    }
  };

  return (
    <>
      <TopBar title="Knowledge Base" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Learning Hub</h1>
            <p className="text-sm text-muted">Access lectures, tutorials, and club documentation.</p>
          </div>
          {canManage && (
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-primary hover:bg-primary/90 text-black font-semibold">
              + Create Material
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-muted">Loading...</p>
        ) : !articles?.length ? (
          <Card><p className="text-muted text-center py-8">No materials available yet.</p></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((a) => (
              <Card 
                key={a.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors group"
                onClick={() => setSelectedArticle(a)}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-white/5 p-3 flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                    {renderIcon(a.material_format || 'md')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white truncate">{a.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                        {a.article_type.replace("_", " ")}
                      </span>
                      <span className="text-xs text-muted">{a.view_count} views</span>
                    </div>
                    {a.author_detail && (
                      <p className="text-xs text-muted mt-2 truncate">By {a.author_detail.full_name}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-white/5 sticky top-0 bg-card z-10">
              <h2 className="text-xl font-bold text-white">Create Learning Material</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-muted hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">Title *</label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Introduction to ROS" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">Format *</label>
                  <select 
                    value={materialFormat} 
                    onChange={e => setMaterialFormat(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg h-10 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="md">Markdown (Write below)</option>
                    <option value="pdf">PDF Document</option>
                    <option value="youtube">YouTube Video</option>
                    <option value="docx">Word Document (DOCX)</option>
                    <option value="other">Other Link</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">Category *</label>
                <select 
                  value={articleType} 
                  onChange={e => setArticleType(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg h-10 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="tutorial">Tutorial / Lecture</option>
                  <option value="documentation">Documentation</option>
                  <option value="research">Research Paper</option>
                  <option value="meeting_notes">Meeting Notes</option>
                </select>
              </div>

              {materialFormat === 'md' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">Content (Markdown supported) *</label>
                  <textarea 
                    value={content} 
                    onChange={e => setContent(e.target.value)} 
                    required 
                    rows={8}
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    placeholder="# Main Heading\n\nWrite your content here..."
                  />
                </div>
              )}

              {(materialFormat === 'pdf' || materialFormat === 'docx' || materialFormat === 'other') && (
                <div className="space-y-4 p-4 border border-white/5 rounded-xl bg-white/2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted">Direct File Upload</label>
                    <input 
                      type="file" 
                      onChange={e => setFileUpload(e.target.files?.[0] || null)}
                      className="w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-px bg-white/10 flex-1"></div>
                    <span className="text-xs text-muted uppercase">OR</span>
                    <div className="h-px bg-white/10 flex-1"></div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted">External File URL</label>
                    <Input value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://drive.google.com/..." />
                  </div>
                </div>
              )}

              {materialFormat === 'youtube' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">YouTube Video Link *</label>
                  <Input value={fileUrl} onChange={e => setFileUrl(e.target.value)} required placeholder="https://youtube.com/watch?v=..." />
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-primary text-black">
                  Publish Material
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail & Q&A Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center p-0 md:p-6">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-5xl md:rounded-2xl flex flex-col overflow-hidden max-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center p-4 md:p-6 border-b border-white/5 bg-black/40 shrink-0">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  {renderIcon(selectedArticle.material_format || 'md')}
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white">{selectedArticle.title}</h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                    <span>{selectedArticle.author_detail?.full_name || "Unknown Author"}</span>
                    <span>•</span>
                    <span className="uppercase tracking-wider">{selectedArticle.article_type.replace("_", " ")}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedArticle(null)} className="text-muted hover:text-white p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Content & Q&A Split */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              
              {/* Media/Content Viewer */}
              <div className="flex-1 overflow-y-auto p-6 border-r border-white/5 bg-black/20">
                {selectedArticle.material_format === 'youtube' && selectedArticle.file_url ? (
                  <div className="w-full flex flex-col items-center">
                    {getYoutubeId(selectedArticle.file_url) ? (
                      <div className="aspect-video w-full max-w-4xl rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                        <iframe 
                          src={`https://www.youtube.com/embed/${getYoutubeId(selectedArticle.file_url)}`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                        ></iframe>
                      </div>
                    ) : (
                      <div className="p-8 border border-white/10 rounded-xl bg-white/5 text-center w-full max-w-xl mt-10">
                        <Video className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-50" />
                        <h3 className="text-white font-bold mb-2">Invalid YouTube Link</h3>
                        <p className="text-sm text-muted mb-4 break-all">Could not extract video ID from: {selectedArticle.file_url}</p>
                        <a href={selectedArticle.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-medium">Open link directly in new tab</a>
                      </div>
                    )}
                  </div>
                ) : selectedArticle.material_format === 'pdf' && (selectedArticle.file_upload || selectedArticle.file_url) ? (
                  <div className="w-full h-[70vh] rounded-xl overflow-hidden border border-white/10">
                    <iframe 
                      src={getImageUrl(selectedArticle.file_upload || selectedArticle.file_url)!} 
                      className="w-full h-full bg-white"
                      title={selectedArticle.title}
                    ></iframe>
                  </div>
                ) : selectedArticle.material_format === 'docx' ? (
                  <div className="flex flex-col items-center justify-center h-64 border border-dashed border-white/20 rounded-xl bg-white/5">
                    <File className="h-12 w-12 text-blue-400 mb-4" />
                    <p className="text-white font-medium">Microsoft Word Document</p>
                    <p className="text-sm text-muted mb-6">This file format cannot be rendered directly in the browser.</p>
                    <a 
                      href={getImageUrl(selectedArticle.file_upload || selectedArticle.file_url)!} 
                      download 
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-primary px-4 py-2 rounded-lg text-black font-bold hover:bg-primary/90 transition-colors"
                    >
                      <Download size={16} /> Download DOCX
                    </a>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-primary max-w-none">
                    <ReactMarkdown>{selectedArticle.content || "*No text content provided*"}</ReactMarkdown>
                    {(selectedArticle.file_upload || selectedArticle.file_url) && selectedArticle.material_format !== 'pdf' && selectedArticle.material_format !== 'youtube' && (
                       <a 
                       href={getImageUrl(selectedArticle.file_upload || selectedArticle.file_url)!} 
                       download 
                       target="_blank" rel="noopener noreferrer"
                       className="inline-flex mt-8 items-center gap-2 bg-white/10 px-4 py-2 rounded-lg text-white font-medium hover:bg-white/20 transition-colors"
                     >
                       <Download size={16} /> Download Attached File
                     </a>
                    )}
                  </div>
                )}
              </div>

              {/* Q&A Sidebar */}
              <div className="w-full md:w-96 flex flex-col bg-card shrink-0">
                <div className="p-4 border-b border-white/5 flex items-center gap-2">
                  <MessageSquare size={16} className="text-primary" />
                  <h3 className="font-bold text-sm text-white">Discussion & Q&A</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {!selectedArticle.questions?.length ? (
                    <div className="text-center py-10 opacity-50">
                      <MessageSquare size={32} className="mx-auto mb-3" />
                      <p className="text-sm">No questions asked yet.</p>
                      <p className="text-xs mt-1">Be the first to ask the creator!</p>
                    </div>
                  ) : (
                    selectedArticle.questions.map((q) => (
                      <div key={q.id} className="space-y-3">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <img src={getImageUrl(q.author_detail?.avatar) || "/placeholder-avatar.webp"} className="w-5 h-5 rounded-full object-cover" />
                              <span className="text-xs font-bold text-white">{q.author_detail?.full_name}</span>
                            </div>
                            <span className="text-[10px] text-muted">{new Date(q.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-white/90">{q.question_text}</p>
                        </div>
                        
                        {/* Answers */}
                        {q.answers?.map(a => (
                          <div key={a.id} className="pl-6 border-l-2 border-primary/20 ml-2 relative">
                            <div className="absolute -left-[9px] top-3 w-4 h-px bg-primary/20"></div>
                            <div className="bg-primary/5 rounded-lg p-2.5">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-primary">{a.author_detail?.full_name}</span>
                                {a.author === selectedArticle.author_detail?.id && (
                                  <span className="text-[8px] bg-primary/20 text-primary px-1 rounded uppercase">Author</span>
                                )}
                              </div>
                              <p className="text-xs text-white/80">{a.answer_text}</p>
                            </div>
                          </div>
                        ))}

                        {/* Reply Input */}
                        <div className="pl-8 pt-1">
                          <div className="flex items-center gap-2">
                            <Input 
                              value={newAnswers[q.id] || ""} 
                              onChange={e => setNewAnswers({...newAnswers, [q.id]: e.target.value})}
                              placeholder="Reply..." 
                              className="h-7 text-xs bg-black/20 border-white/5"
                            />
                            <button 
                              onClick={() => {
                                if (newAnswers[q.id]?.trim()) {
                                  answerQuestionMutation.mutate({ questionId: q.id, answer_text: newAnswers[q.id] });
                                }
                              }}
                              className="text-primary hover:text-primary/80 p-1"
                              disabled={answerQuestionMutation.isPending}
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Ask Question Input */}
                <div className="p-4 border-t border-white/5 bg-black/40">
                  <form 
                    onSubmit={e => {
                      e.preventDefault();
                      if (newQuestion.trim()) askQuestionMutation.mutate(newQuestion);
                    }}
                    className="relative"
                  >
                    <Input 
                      value={newQuestion}
                      onChange={e => setNewQuestion(e.target.value)}
                      placeholder="Ask a question about this material..." 
                      className="pr-10 bg-black/40 border-white/10 focus:border-primary/50 text-sm h-10"
                    />
                    <button 
                      type="submit" 
                      disabled={askQuestionMutation.isPending || !newQuestion.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 disabled:opacity-50 p-1"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
