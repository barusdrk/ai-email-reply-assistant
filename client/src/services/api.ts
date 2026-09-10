import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(error);
  }
);

export type Tone = "professional" | "friendly" | "formal" | "empathetic" | "concise" | "enthusiastic";
export type ReplyLength = "short" | "medium" | "long";

export interface PolicyCheckResult {
  compliant: boolean;
  score: number;
  violations: string[];
  warnings: string[];
  suggestions: string[];
}

export interface GenerateReplyInput {
  email: string;
  tone?: Tone;
  length?: ReplyLength;
  signature?: string;
}

export interface GenerateReplyResult {
  success: boolean;
  reply: string;
  policyCheck: PolicyCheckResult;
}

export async function generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
  const response = await API.post<GenerateReplyResult>("/reply", input);
  return response.data;
}

export type KnowledgeBaseCategory =
  | "faq"
  | "product"
  | "billing"
  | "refund"
  | "cancellation"
  | "shipping"
  | "account"
  | "technical"
  | "policy"
  | "general";

export interface KnowledgeBaseArticle {
  _id: string;
  userId: string;
  title: string;
  content: string;
  category: KnowledgeBaseCategory;
  tags: string[];
  active: boolean;
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBaseArticleInput {
  title: string;
  content: string;
  category?: KnowledgeBaseCategory;
  tags?: string[];
  active?: boolean;
}

export async function getKnowledgeBaseArticles(): Promise<KnowledgeBaseArticle[]> {
  const response = await API.get("/knowledge-base");
  return response.data.articles ?? [];
}

export async function getKnowledgeBaseArticle(id: string): Promise<KnowledgeBaseArticle> {
  const response = await API.get(`/knowledge-base/${id}`);
  return response.data.article;
}

export async function searchKnowledgeBase(query: string): Promise<KnowledgeBaseArticle[]> {
  const response = await API.get("/knowledge-base/search", {
    params: { q: query },
  });
  return response.data.articles ?? [];
}

export async function createKnowledgeBaseArticle(input: KnowledgeBaseArticleInput): Promise<KnowledgeBaseArticle> {
  const response = await API.post("/knowledge-base", input);
  return response.data.article;
}

export async function updateKnowledgeBaseArticle(id: string, input: KnowledgeBaseArticleInput): Promise<KnowledgeBaseArticle> {
  const response = await API.put(`/knowledge-base/${id}`, input);
  return response.data.article;
}

export async function deleteKnowledgeBaseArticle(id: string): Promise<void> {
  await API.delete(`/knowledge-base/${id}`);
}

export default API;
