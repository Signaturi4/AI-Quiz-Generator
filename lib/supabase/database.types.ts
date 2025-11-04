export type QuestionPoolStatus = "draft" | "published" | "archived";
export type AssignmentStatus =
  | "pending"
  | "in_progress"
  | "passed"
  | "failed"
  | "overdue";

export interface Database {
  public: {
    Tables: {
        users: {
          Row: {
            id: string;
            email: string;
            username: string | null;
            full_name: string | null;
            avatar_url: string | null;
            phone_number: string | null;
            phone_verified: boolean | null;
            last_ip: string | null;
            last_login: string | null;
            logins_count: number | null;
            blocked: boolean | null;
            created_at: string;
            updated_at: string;
            first_name: string | null;
            last_name: string | null;
            role: string;
            category: string | null;
            assigned_pool_version_id: string | null;
          };
        Insert: {
          id: string;
          email: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          phone_number?: string | null;
          phone_verified?: boolean | null;
          last_ip?: string | null;
          last_login?: string | null;
          logins_count?: number | null;
          blocked?: boolean | null;
          created_at?: string;
          updated_at?: string;
          first_name?: string | null;
          last_name?: string | null;
          role?: string;
          category?: string | null;
          assigned_pool_version_id?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          phone_number?: string | null;
          phone_verified?: boolean | null;
          last_ip?: string | null;
          last_login?: string | null;
          logins_count?: number | null;
          blocked?: boolean | null;
          created_at?: string;
          updated_at?: string;
          first_name?: string | null;
          last_name?: string | null;
          role?: string;
          category?: string | null;
          assigned_pool_version_id?: string | null;
        };
      };
      invitation_codes: {
        Row: {
          code: string;
          role: string;
          category: string | null;
          notes: string | null;
          expires_at: string | null;
          used_at: string | null;
          used_by: string | null;
          created_at: string;
        };
        Insert: {
          code: string;
          role?: string;
          category?: string | null;
          notes?: string | null;
          expires_at?: string | null;
          used_at?: string | null;
          used_by?: string | null;
          created_at?: string;
        };
        Update: {
          code?: string;
          role?: string;
          category?: string | null;
          notes?: string | null;
          expires_at?: string | null;
          used_at?: string | null;
          used_by?: string | null;
          created_at?: string;
        };
      };
      question_pools: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      question_pool_versions: {
        Row: {
          id: string;
          pool_id: string;
          version_number: number;
          status: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          pool_id: string;
          version_number: number;
          status?: QuestionPoolStatus;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          pool_id?: string;
          version_number?: number;
          status?: QuestionPoolStatus;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          published_at?: string | null;
        };
      };
      certifications: {
        Row: {
          id: string;
          code: string;
          title: string;
          description: string | null;
          question_pool_id: string;
          active: boolean;
          duration_minutes: number | null;
          passing_threshold: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          title: string;
          description?: string | null;
          question_pool_id: string;
          active?: boolean;
          duration_minutes?: number | null;
          passing_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          title?: string;
          description?: string | null;
          question_pool_id?: string;
          active?: boolean;
          duration_minutes?: number | null;
          passing_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          pool_version_id: string;
          topic: string;
          prompt: string;
          choices: unknown;
          answer_index: number;
          explanation: string | null;
          difficulty: string | null;
          tags: string[] | null;
          order_index: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pool_version_id: string;
          topic: string;
          prompt: string;
          choices: unknown;
          answer_index: number;
          explanation?: string | null;
          difficulty?: string | null;
          tags?: string[] | null;
          order_index?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pool_version_id?: string;
          topic?: string;
          prompt?: string;
          choices?: unknown;
          answer_index?: number;
          explanation?: string | null;
          difficulty?: string | null;
          tags?: string[] | null;
          order_index?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      assignments: {
        Row: {
          id: string;
          profile_id: string;
          certification_id: string;
          status: string;
          assigned_at: string;
          due_at: string | null;
          last_attempt_at: string | null;
          next_eligible_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          certification_id: string;
          status?: AssignmentStatus;
          assigned_at?: string;
          due_at?: string | null;
          last_attempt_at?: string | null;
          next_eligible_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          certification_id?: string;
          status?: AssignmentStatus;
          assigned_at?: string;
          due_at?: string | null;
          last_attempt_at?: string | null;
          next_eligible_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      attempts: {
        Row: {
          id: string;
          assignment_id: string;
          certification_id: string;
          pool_version_id: string;
          profile_id: string;
          started_at: string;
          submitted_at: string | null;
          score: number | null;
          passed: boolean | null;
          question_count: number;
          correct_count: number;
          responses: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          certification_id: string;
          pool_version_id: string;
          profile_id: string;
          started_at?: string;
          submitted_at?: string | null;
          score?: number | null;
          passed?: boolean | null;
          question_count: number;
          correct_count: number;
          responses: unknown;
          created_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          certification_id?: string;
          pool_version_id?: string;
          profile_id?: string;
          started_at?: string;
          submitted_at?: string | null;
          score?: number | null;
          passed?: boolean | null;
          question_count?: number;
          correct_count?: number;
          responses?: unknown;
          created_at?: string;
        };
      };
    };
    Views: never;
    Functions: never;
    Enums: never;
    CompositeTypes: never;
  };
}

export type Tables = Database["public"]["Tables"];
export type QuestionRecord = Tables["questions"]["Row"];
export type QuestionPoolRecord = Tables["question_pools"]["Row"];
export type QuestionPoolVersionRecord = Tables["question_pool_versions"]["Row"];
export type CertificationRecord = Tables["certifications"]["Row"];
export type AssignmentRecord = Tables["assignments"]["Row"];
export type AttemptRecord = Tables["attempts"]["Row"];
export type UserRecord = Tables["users"]["Row"];
